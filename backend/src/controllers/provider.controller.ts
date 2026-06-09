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
