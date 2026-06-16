import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest } from "../middleware/auth";
import { checkIdentity, IdType } from "../lib/identity";
import { triggerGuarantorPingWebhook } from "../lib/n8n";

// Full provider detail shape returned to admin queue and public profile page
const PROVIDER_INCLUDE = {
  user: { select: { id: true, fullName: true, email: true, phoneNumber: true, createdAt: true } },
  category: true,
} as const;

// POST /api/v1/providers/onboard — Module 3.2-A
// Validates NIN/BVN format (and calls the external identity API if configured),
// stores the profile as PENDING for admin review, then fires a guarantor
// WhatsApp ping via n8n.
export async function onboard(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!.id;
  const {
    bio,
    categoryId,
    idNumber,
    idType,
    selfieUrl,
    guarantorName,
    guarantorPhone,
    latitude,
    longitude,
    operatingRadiusKm,
    pricePerJobKobo,
    bankCode,
    accountNumber,
  } = req.body;

  if (
    !bio ||
    !categoryId ||
    !idNumber ||
    !idType ||
    !selfieUrl ||
    !guarantorName ||
    !guarantorPhone ||
    latitude == null ||
    longitude == null
  ) {
    return res.status(400).json({ error: "Missing required onboarding fields" });
  }

  if (idType !== "NIN" && idType !== "BVN") {
    return res.status(400).json({ error: "idType must be NIN or BVN" });
  }

  // REJECTED providers may resubmit; any other existing profile is a conflict
  const existing = await prisma.providerProfile.findUnique({ where: { userId } });
  if (existing && existing.verificationStatus !== "REJECTED") {
    return res.status(409).json({ error: "A provider profile already exists for this account" });
  }

  // NIN/BVN validation — format + optional external API
  const identityResult = await checkIdentity(idNumber, idType as IdType);
  if (!identityResult.valid) {
    return res.status(400).json({ error: identityResult.message });
  }

  const profileData = {
    bio,
    categoryId,
    idNumber,
    selfieUrl,
    guarantorName,
    guarantorPhone,
    latitude,
    longitude,
    operatingRadiusKm: operatingRadiusKm ?? undefined,
    pricePerJobKobo: pricePerJobKobo ? Number(pricePerJobKobo) : undefined,
    bankCode: bankCode || undefined,
    accountNumber: accountNumber || undefined,
  };

  let profile;
  if (existing) {
    // Resubmission — reset to PENDING so admin reviews the updated documents
    profile = await prisma.providerProfile.update({
      where: { userId },
      data: { ...profileData, verificationStatus: "PENDING" },
      include: PROVIDER_INCLUDE,
    });
  } else {
    profile = await prisma.providerProfile.create({
      data: { userId, ...profileData },
      include: PROVIDER_INCLUDE,
    });
    await prisma.user.update({ where: { id: userId }, data: { role: "PROVIDER" } });
  }

  // Fire guarantor WhatsApp ping — graceful no-op if n8n not configured
  await triggerGuarantorPingWebhook({
    providerId: profile.id,
    providerName: profile.user.fullName,
    guarantorName,
    guarantorPhone,
  });

  res.status(existing ? 200 : 201).json({
    profile,
    identityCheck: identityResult,
  });
}

const NINETY_DAYS = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

// GET /api/v1/providers/dashboard — Provider auth
// Returns the authenticated provider's stats, recent bookings, and editable
// profile fields in one request so the dashboard page only makes one round-trip.
export async function getDashboard(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!.id;

  const profile = await prisma.providerProfile.findUnique({
    where: { userId },
    include: {
      category: { select: { name: true } },
      portfolioImages: { orderBy: { createdAt: "asc" } },
      availability: true,
      blockouts: {
        where: { blockedDate: { gte: new Date() } },
        orderBy: { blockedDate: "asc" },
      },
    },
  });
  if (!profile) {
    return res.status(404).json({ error: "Provider profile not found. Complete onboarding first." });
  }

  const [bookings, totalPaidAgg, pendingPayoutAgg] = await Promise.all([
    prisma.booking.findMany({
      where: { providerId: profile.id },
      include: {
        customer: { select: { fullName: true, phoneNumber: true } },
        category: { select: { name: true } },
        payment: { select: { id: true, amountKobo: true, reference: true, status: true, paidAt: true, createdAt: true } },
        review: { select: { rating: true, comment: true, createdAt: true } },
      },
      orderBy: { bookingDate: "desc" },
      take: 50,
    }),
    prisma.payment.aggregate({
      where: { booking: { providerId: profile.id }, status: "PAID" },
      _sum: { amountKobo: true },
    }),
    prisma.payment.aggregate({
      where: { booking: { providerId: profile.id, status: "ACCEPTED" }, status: "PAID" },
      _sum: { amountKobo: true },
    }),
  ]);

  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === "PENDING").length,
    accepted: bookings.filter((b) => b.status === "ACCEPTED").length,
    completed: bookings.filter((b) => b.status === "COMPLETED").length,
    cancelled: bookings.filter((b) => b.status === "CANCELLED").length,
    totalEarningsKobo: totalPaidAgg._sum.amountKobo ?? 0,
    pendingPayoutKobo: pendingPayoutAgg._sum.amountKobo ?? 0,
  };

  res.json({ profile, bookings, stats });
}

// PATCH /api/v1/providers/profile — Provider auth
// Updates the mutable fields on the provider's profile. Fields omitted from
// the body are left unchanged.
export async function updateProviderProfile(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!.id;
  const { bio, pricePerJobKobo, bankCode, accountNumber, operatingRadiusKm } = req.body;

  const existing = await prisma.providerProfile.findUnique({ where: { userId } });
  if (!existing) return res.status(404).json({ error: "Provider profile not found" });

  const updated = await prisma.providerProfile.update({
    where: { userId },
    data: {
      ...(bio !== undefined && { bio }),
      ...(pricePerJobKobo !== undefined && { pricePerJobKobo: Number(pricePerJobKobo) }),
      ...(bankCode !== undefined && { bankCode: bankCode || null }),
      ...(accountNumber !== undefined && { accountNumber: accountNumber || null }),
      ...(operatingRadiusKm !== undefined && { operatingRadiusKm: Number(operatingRadiusKm) }),
    },
    include: { category: { select: { name: true } } },
  });

  res.json(updated);
}

// POST /api/v1/providers/portfolio — Provider only
// Adds a portfolio image to the authenticated provider's profile. Capped at 6
// images so profiles stay focused.
export async function addPortfolioImage(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!.id;
  const { imageUrl, caption } = req.body;

  if (!imageUrl || typeof imageUrl !== "string") {
    return res.status(400).json({ error: "imageUrl is required" });
  }

  const profile = await prisma.providerProfile.findUnique({ where: { userId } });
  if (!profile) return res.status(404).json({ error: "Provider profile not found" });

  const count = await prisma.portfolioImage.count({ where: { providerId: profile.id } });
  if (count >= 6) {
    return res.status(400).json({ error: "Maximum of 6 portfolio images allowed" });
  }

  const image = await prisma.portfolioImage.create({
    data: {
      providerId: profile.id,
      imageUrl,
      caption: typeof caption === "string" && caption.trim() ? caption.trim() : null,
    },
  });

  res.status(201).json(image);
}

// DELETE /api/v1/providers/portfolio/:imageId — Provider only
// Removes a portfolio image — only the owning provider can delete their own images.
export async function deletePortfolioImage(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!.id;
  const imageId = String(req.params.imageId);

  const profile = await prisma.providerProfile.findUnique({ where: { userId } });
  if (!profile) return res.status(404).json({ error: "Provider profile not found" });

  const image = await prisma.portfolioImage.findUnique({ where: { id: imageId } });
  if (!image) return res.status(404).json({ error: "Image not found" });
  if (image.providerId !== profile.id) return res.status(403).json({ error: "Not your image" });

  await prisma.portfolioImage.delete({ where: { id: imageId } });
  res.json({ ok: true });
}

// PATCH /api/v1/providers/availability — Provider only
// Upserts the provider's weekly working-day schedule (7 boolean flags).
export async function updateAvailability(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!.id;
  const { mon, tue, wed, thu, fri, sat, sun } = req.body;

  const profile = await prisma.providerProfile.findUnique({ where: { userId } });
  if (!profile) return res.status(404).json({ error: "Provider profile not found" });

  const data = {
    ...(mon !== undefined && { mon: Boolean(mon) }),
    ...(tue !== undefined && { tue: Boolean(tue) }),
    ...(wed !== undefined && { wed: Boolean(wed) }),
    ...(thu !== undefined && { thu: Boolean(thu) }),
    ...(fri !== undefined && { fri: Boolean(fri) }),
    ...(sat !== undefined && { sat: Boolean(sat) }),
    ...(sun !== undefined && { sun: Boolean(sun) }),
  };

  const availability = await prisma.providerAvailability.upsert({
    where: { providerId: profile.id },
    update: data,
    create: { providerId: profile.id, ...data },
  });

  res.json(availability);
}

// POST /api/v1/providers/blockouts — Provider only
// Adds a specific blocked-out date (YYYY-MM-DD) to the provider's calendar.
export async function addBlockout(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!.id;
  const { date } = req.body;

  if (!date || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "date must be YYYY-MM-DD" });
  }

  const blockedDate = new Date(`${date}T00:00:00.000Z`);
  if (isNaN(blockedDate.getTime()) || blockedDate < new Date()) {
    return res.status(400).json({ error: "date must be a valid future date" });
  }

  const profile = await prisma.providerProfile.findUnique({ where: { userId } });
  if (!profile) return res.status(404).json({ error: "Provider profile not found" });

  const blockout = await prisma.providerBlockout.upsert({
    where: { providerId_blockedDate: { providerId: profile.id, blockedDate } },
    update: {},
    create: { providerId: profile.id, blockedDate },
  });

  res.status(201).json({ ...blockout, blockedDate: date });
}

// DELETE /api/v1/providers/blockouts/:date — Provider only
// Removes a blocked-out date from the provider's calendar.
export async function removeBlockout(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!.id;
  const date = String(req.params.date);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "date must be YYYY-MM-DD" });
  }

  const profile = await prisma.providerProfile.findUnique({ where: { userId } });
  if (!profile) return res.status(404).json({ error: "Provider profile not found" });

  const blockedDate = new Date(`${date}T00:00:00.000Z`);
  await prisma.providerBlockout.deleteMany({
    where: { providerId: profile.id, blockedDate },
  });

  res.json({ ok: true });
}

// GET /api/v1/providers — Public
// Returns minimal ID list of all verified providers — used by the frontend sitemap generator.
export async function getAllVerifiedProviders(_req: AuthenticatedRequest, res: Response) {
  const providers = await prisma.providerProfile.findMany({
    where: { verificationStatus: "VERIFIED" },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  res.json(providers);
}

// GET /api/v1/providers/:id — Public
// Returns a single provider's full public profile (for the customer-facing
// provider page). Only VERIFIED providers are visible to the public.
export async function getProvider(req: AuthenticatedRequest, res: Response) {
  const id = String(req.params.id);

  const profile = await prisma.providerProfile.findUnique({
    where: { id },
    include: {
      ...PROVIDER_INCLUDE,
      reviewsReceived: {
        include: { customer: { select: { fullName: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      portfolioImages: { orderBy: { createdAt: "asc" } },
      availability: true,
      blockouts: {
        where: { blockedDate: { gte: new Date(), lte: NINETY_DAYS } },
        orderBy: { blockedDate: "asc" },
        select: { blockedDate: true },
      },
    },
  });

  if (!profile || profile.verificationStatus !== "VERIFIED") {
    return res.status(404).json({ error: "Provider not found" });
  }

  const [avgResult, countResult] = await Promise.all([
    prisma.review.aggregate({
      where: { providerId: id },
      _avg: { rating: true },
    }),
    prisma.review.count({ where: { providerId: id } }),
  ]);

  res.json({
    ...profile,
    averageRating: avgResult._avg.rating != null ? Number(avgResult._avg.rating.toFixed(1)) : null,
    reviewCount: countResult,
  });
}
