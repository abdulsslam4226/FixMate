import type { MetadataRoute } from "next";
import { getCategories } from "@/lib/api";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://fixmate.ng").replace(/\/$/, "");
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, providers] = await Promise.all([
    getCategories().catch(() => []),
    fetch(`${API}/providers`, { next: { revalidate: 3600 } })
      .then((r) => r.json() as Promise<{ id: string }[]>)
      .catch(() => [] as { id: string }[]),
  ]);

  return [
    { url: SITE, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE}/discover`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    ...categories.map((c) => ({
      url: `${SITE}/categories/${c.id}`,
      lastModified: new Date(),
      changeFrequency: "hourly" as const,
      priority: 0.8,
    })),
    ...providers.map((p) => ({
      url: `${SITE}/providers/${p.id}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
