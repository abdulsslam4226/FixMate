import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, MapPin, Phone, Star, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getProvider as _getProvider } from "@/lib/api";

// Deduplicate within a single request so generateMetadata and the page
// component share one fetch rather than making two backend calls.
const getProvider = cache(_getProvider);

export const revalidate = 3600; // rebuild provider pages hourly in the background

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const provider = await getProvider(id);
    const name = provider.user.fullName;
    const category = provider.category.name;
    const bio = provider.bio.slice(0, 150) + (provider.bio.length > 150 ? "…" : "");
    return {
      title: `${name} — ${category}`,
      description: `${bio} Verified artisan on FixMate. Pay cash when the job is done.`,
      openGraph: {
        title: `${name} — ${category} | FixMate`,
        description: bio,
        ...(provider.selfieUrl ? { images: [{ url: provider.selfieUrl, alt: name }] } : {}),
        type: "profile",
      },
      twitter: {
        card: "summary",
        title: `${name} — ${category} | FixMate`,
        description: bio,
      },
    };
  } catch {
    return { title: "Artisan profile" };
  }
}

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-4 w-4 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </span>
  );
}

export default async function ProviderProfilePage({ params }: Props) {
  const { id } = await params;

  let provider;
  try {
    provider = await getProvider(id);
  } catch {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: provider.category.name,
    description: provider.bio,
    provider: {
      "@type": "Person",
      name: provider.user.fullName,
      ...(provider.user.phoneNumber ? { telephone: provider.user.phoneNumber } : {}),
      ...(provider.selfieUrl ? { image: provider.selfieUrl } : {}),
    },
    areaServed: { "@type": "Country", name: "Nigeria" },
    offers: {
      "@type": "Offer",
      priceCurrency: "NGN",
      price: (provider.pricePerJobKobo / 100).toFixed(0),
      description: "Cash payment upon job completion",
    },
    ...(provider.averageRating != null
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: provider.averageRating,
            reviewCount: provider.reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };

  return (
    <main className="industrial-texture mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
        {provider.selfieUrl && (
          <img
            src={provider.selfieUrl}
            alt={provider.user.fullName}
            className="h-28 w-28 shrink-0 rounded-2xl object-cover ring-2 ring-orange-500/40"
          />
        )}
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-headline-lg-mobile font-bold">{provider.user.fullName}</h1>
            {provider.verificationStatus === "VERIFIED" && (
              <Badge className="gradient-violet border-0 text-primary-foreground gap-1">
                <BadgeCheck className="h-3 w-3" />
                Verified
              </Badge>
            )}
          </div>

          <span className="text-muted-foreground font-mono text-label-sm uppercase tracking-[0.15em]">
            {provider.category.name}
          </span>

          {provider.averageRating != null ? (
            <div className="flex items-center gap-2">
              <StarRow rating={Math.round(provider.averageRating)} />
              <span className="text-sm font-medium">{provider.averageRating.toFixed(1)}</span>
              <span className="text-muted-foreground text-sm">
                ({provider.reviewCount} {provider.reviewCount === 1 ? "review" : "reviews"})
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">No reviews yet</span>
          )}

          <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>Serves within {provider.operatingRadiusKm} km of their location</span>
          </div>

          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <Tag className="text-muted-foreground h-4 w-4 shrink-0" />
            <span>₦{(provider.pricePerJobKobo / 100).toLocaleString("en-NG")} per job</span>
            <span className="text-muted-foreground font-normal">· paid directly after work is done</span>
          </div>

          {provider.user.phoneNumber && (
            <a
              href={`tel:${provider.user.phoneNumber}`}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm transition-colors"
            >
              <Phone className="h-4 w-4 shrink-0" />
              {provider.user.phoneNumber}
            </a>
          )}
        </div>
      </div>

      {/* Book CTA */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          nativeButton={false}
          render={<Link href={`/book/${provider.id}`}>Book {provider.user.fullName.split(" ")[0]}</Link>}
          className="gradient-violet border-0 text-primary-foreground"
        />
        <span className="text-muted-foreground text-sm">
          Free to request — pay ₦{(provider.pricePerJobKobo / 100).toLocaleString("en-NG")} in cash when the job is done
        </span>
      </div>

      <Separator className="opacity-20" />

      {/* About */}
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-semibold">About</h2>
        <p className="text-muted-foreground leading-relaxed">{provider.bio}</p>
        <p className="text-muted-foreground text-sm">{provider.category.description}</p>
      </section>

      {/* Portfolio */}
      {provider.portfolioImages.length > 0 && (
        <>
          <Separator className="opacity-20" />
          <section className="flex flex-col gap-4">
            <h2 className="font-heading text-lg font-semibold">Portfolio</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {provider.portfolioImages.map((img) => (
                <div key={img.id} className="flex flex-col gap-1">
                  <img
                    src={img.imageUrl}
                    alt={img.caption ?? "Portfolio photo"}
                    className="h-40 w-full rounded-xl object-cover ring-1 ring-white/10"
                  />
                  {img.caption && (
                    <p className="text-muted-foreground font-mono text-xs">{img.caption}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <Separator className="opacity-20" />

      {/* Reviews */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-heading text-lg font-semibold">
            Customer reviews
            {provider.reviewCount > 0 && (
              <span className="text-muted-foreground ml-2 font-normal text-base">({provider.reviewCount})</span>
            )}
          </h2>
          {provider.averageRating != null && (
            <div className="flex items-center gap-2">
              <StarRow rating={Math.round(provider.averageRating)} />
              <span className="font-semibold">{provider.averageRating.toFixed(1)}</span>
              <span className="text-muted-foreground text-sm">/ 5</span>
            </div>
          )}
        </div>

        {provider.reviewsReceived.length === 0 ? (
          <div className="border-border/40 rounded-xl border border-dashed p-6 text-center">
            <p className="text-muted-foreground text-sm">No reviews yet.</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Be the first to book {provider.user.fullName.split(" ")[0]} and leave a review after the job.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {provider.reviewsReceived.map((review) => (
              <Card key={review.id} className="border-border/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{review.customer.fullName}</CardTitle>
                    <span className="text-muted-foreground text-xs">
                      {new Date(review.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                  <StarRow rating={review.rating} />
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">{review.comment}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
