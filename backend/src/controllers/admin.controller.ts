import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

const VERIFY_STATUSES = ["PENDING", "VERIFIED", "REJECTED"] as const;

// Full include used for both the queue listing and per-item fetches, so the
// admin UI has everything it needs to make a trust decision in one request.
const ADMIN_INCLUDE = {
  user: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phoneNumber: true,
      createdAt: true,
    },
  },
  category: true,
} as const;

// GET /api/v1/admin/verification-queue — Admin
// Returns all PENDING profiles with full trust-engine fields (NIN, selfie URL,
// guarantor) so the admin can make an informed verification decision (Module 3.2-A).
export async function getVerificationQueue(_req: Request, res: Response) {
  const queue = await prisma.providerProfile.findMany({
    where: { verificationStatus: "PENDING" },
    include: ADMIN_INCLUDE,
    orderBy: { createdAt: "asc" },
  });

  res.json(queue);
}

// GET /api/v1/admin/providers/:id — Admin
// Returns a single provider profile in full detail for focused review.
export async function getProviderDetail(req: Request, res: Response) {
  const id = String(req.params.id);

  const profile = await prisma.providerProfile.findUnique({
    where: { id },
    include: ADMIN_INCLUDE,
  });

  if (!profile) return res.status(404).json({ error: "Provider not found" });
  res.json(profile);
}

// PATCH /api/v1/admin/providers/:id/verify — Admin
// Sets verificationStatus (PENDING / VERIFIED / REJECTED) (Module 3.2-A).
export async function setVerificationStatus(req: Request, res: Response) {
  const id = String(req.params.id);
  const { verificationStatus } = req.body;

  if (!VERIFY_STATUSES.includes(verificationStatus)) {
    return res.status(400).json({ error: `verificationStatus must be one of ${VERIFY_STATUSES.join(", ")}` });
  }

  const profile = await prisma.providerProfile.update({
    where: { id },
    data: { verificationStatus },
    include: ADMIN_INCLUDE,
  });

  res.json(profile);
}
