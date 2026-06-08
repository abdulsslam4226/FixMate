import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest } from "../middleware/auth";

// POST /api/v1/providers/onboard — Provider
// Appends vital identity verification properties (Module 3.3 / 3.2-A)
export async function onboard(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!.id;
  const {
    bio,
    categoryId,
    idNumber,
    selfieUrl,
    guarantorName,
    guarantorPhone,
    latitude,
    longitude,
    operatingRadiusKm,
  } = req.body;

  if (!bio || !categoryId || !idNumber || !selfieUrl || !guarantorName || !guarantorPhone || latitude == null || longitude == null) {
    return res.status(400).json({ error: "Missing required onboarding fields" });
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
  });

  await prisma.user.update({ where: { id: userId }, data: { role: "PROVIDER" } });

  res.status(201).json(profile);
}
