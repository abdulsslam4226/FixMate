import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

const VERIFY_STATUSES = ["PENDING", "VERIFIED", "REJECTED"] as const;

// GET /api/v1/admin/verification-queue — Admin
// Pulls pending provider registration fields (Module 3.3 / 3.2-A)
export async function getVerificationQueue(_req: Request, res: Response) {
  const queue = await prisma.providerProfile.findMany({
    where: { verificationStatus: "PENDING" },
    include: { user: true, category: true },
  });

  res.json(queue);
}

// PATCH /api/v1/admin/providers/:id/verify — Admin
// Updates verification statuses to authorize application access (Module 3.3 / 3.2-A)
export async function setVerificationStatus(req: Request, res: Response) {
  const id = String(req.params.id);
  const { verificationStatus } = req.body;

  if (!VERIFY_STATUSES.includes(verificationStatus)) {
    return res.status(400).json({ error: `verificationStatus must be one of ${VERIFY_STATUSES.join(", ")}` });
  }

  const profile = await prisma.providerProfile.update({
    where: { id },
    data: { verificationStatus },
  });

  res.json(profile);
}
