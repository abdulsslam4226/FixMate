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

  // Check existing profile
  const existing = await prisma.providerProfile.findUnique({ where: { userId } });
  if (existing) {
    return res.status(409).json({ error: "A provider profile already exists for this account" });
  }

  // NIN/BVN validation — format + optional external API
  const identityResult = await checkIdentity(idNumber, idType as IdType);
  if (!identityResult.valid) {
    return res.status(400).json({ error: identityResult.message });
  }

  const profile = await prisma.providerProfile.create({
    data: {
      userId,
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
    },
    include: PROVIDER_INCLUDE,
  });

  await prisma.user.update({ where: { id: userId }, data: { role: "PROVIDER" } });

  // Fire guarantor WhatsApp ping — graceful no-op if n8n not configured
  await triggerGuarantorPingWebhook({
    providerId: profile.id,
    providerName: profile.user.fullName,
    guarantorName,
    guarantorPhone,
  });

  res.status(201).json({
    profile,
    identityCheck: identityResult,
  });
}

// GET /api/v1/providers/dashboard — Provider auth
// Returns the authenticated provider's stats, recent bookings, and editable
// profile fields in one request so the dashboard page only makes one round-trip.
export async function getDashboard(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!.id;

  const profile = await prisma.providerProfile.findUnique({
    where: { userId },
    include: { category: { select: { name: true } } },
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
        include: {
          customer: { select: { fullName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
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
