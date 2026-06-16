import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

// GET /api/v1/categories — Public
// Returns array of home service industry categories (Module 3.3)
export async function listCategories(_req: Request, res: Response) {
  const categories = await prisma.serviceCategory.findMany();
  res.json(categories);
}

// GET /api/v1/stats — Public
// Returns lightweight platform trust stats for the landing page.
export async function getPublicStats(_req: Request, res: Response) {
  const [verifiedProviders, completedBookings, totalCategories] = await Promise.all([
    prisma.providerProfile.count({ where: { verificationStatus: "VERIFIED" } }),
    prisma.booking.count({ where: { status: "COMPLETED" } }),
    prisma.serviceCategory.count(),
  ]);
  res.json({ verifiedProviders, completedBookings, totalCategories });
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
// Fetches verified category artisans with optional geo, text, rating and price filtering.
export async function listProvidersByCategory(req: Request, res: Response) {
  const id = String(req.params.id);
  const { lat, lng, q, minRating, sortBy } = req.query;

  const textFilter = typeof q === "string" && q.trim()
    ? {
        OR: [
          { user: { fullName: { contains: q.trim(), mode: "insensitive" as const } } },
          { bio: { contains: q.trim(), mode: "insensitive" as const } },
        ],
      }
    : {};

  const priceOrder =
    sortBy === "price_asc" ? ({ pricePerJobKobo: "asc" } as const) :
    sortBy === "price_desc" ? ({ pricePerJobKobo: "desc" } as const) :
    undefined;

  const providers = await prisma.providerProfile.findMany({
    where: { categoryId: id, verificationStatus: "VERIFIED", ...textFilter },
    include: {
      user: { select: { id: true, fullName: true } },
      reviewsReceived: { select: { rating: true } },
    },
    ...(priceOrder && { orderBy: priceOrder }),
  });

  // Geo filter (if coordinates provided)
  const geoFiltered = lat != null && lng != null
    ? providers.filter((p) => distanceKm(Number(lat), Number(lng), Number(p.latitude), Number(p.longitude)) <= p.operatingRadiusKm)
    : providers;

  // Compute averageRating per provider
  const withRating = geoFiltered.map((p) => {
    const ratings = p.reviewsReceived.map((r) => r.rating);
    const avg = ratings.length ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)) : null;
    const { reviewsReceived: _, ...rest } = p;
    return { ...rest, averageRating: avg, reviewCount: ratings.length };
  });

  // Rating filter
  const minR = minRating != null ? Number(minRating) : 0;
  const ratingFiltered = minR > 0 ? withRating.filter((p) => p.averageRating != null && p.averageRating >= minR) : withRating;

  // Rating sort (applied after geo/rating filter)
  if (sortBy === "rating_desc") {
    ratingFiltered.sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0));
  }

  res.json(ratingFiltered);
}
