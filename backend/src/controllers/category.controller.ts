import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

// GET /api/v1/categories — Public
// Returns array of home service industry categories (Module 3.3)
export async function listCategories(_req: Request, res: Response) {
  const categories = await prisma.serviceCategory.findMany();
  res.json(categories);
}

// Haversine distance in km — used for the proximity matching described in
// Module 2 ("Geospatial Discovery (Decimal formatted for radius matching)").
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// GET /api/v1/categories/:id/providers — Public
// Fetches verified category artisans within geographic bounds (Module 3.3)
export async function listProvidersByCategory(req: Request, res: Response) {
  const id = String(req.params.id);
  const { lat, lng } = req.query;

  const providers = await prisma.providerProfile.findMany({
    where: { categoryId: id, verificationStatus: "VERIFIED" },
    include: { user: true },
  });

  if (lat == null || lng == null) {
    return res.json(providers);
  }

  const originLat = Number(lat);
  const originLng = Number(lng);

  const withinBounds = providers.filter((provider) => {
    const distance = distanceKm(originLat, originLng, Number(provider.latitude), Number(provider.longitude));
    return distance <= provider.operatingRadiusKm;
  });

  res.json(withinBounds);
}
