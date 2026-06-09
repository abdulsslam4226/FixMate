import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, MapPin, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getProvider } from "@/lib/api";

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

export default async function ProviderProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let provider;
  try {
    provider = await getProvider(id);
  } catch {
    notFound();
  }

  return (
    <main className="industrial-texture mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">

      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
        {provider.selfieUrl && (
          <img
            src={provider.selfieUrl}
            alt={provider.user.fullName}
            className="h-28 w-28 shrink-0 rounded-2xl object-cover ring-2 ring-violet-500/40"
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
        </div>
      </div>

      {/* Book CTA */}
      <Button
        nativeButton={false}
        render={<Link href={`/book/${provider.id}`}>Book {provider.user.fullName.split(" ")[0]}</Link>}
        className="gradient-violet w-fit border-0 text-primary-foreground"
      />

      <Separator className="opacity-20" />

      {/* About */}
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-semibold">About</h2>
        <p className="text-muted-foreground leading-relaxed">{provider.bio}</p>
        <p className="text-muted-foreground text-sm">{provider.category.description}</p>
      </section>

      <Separator className="opacity-20" />

      {/* Reviews */}
      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-lg font-semibold">
          Reviews {provider.reviewCount > 0 && <span className="text-muted-foreground font-normal text-base">({provider.reviewCount})</span>}
        </h2>

        {provider.reviewsReceived.length === 0 ? (
          <p className="text-muted-foreground text-sm">No reviews yet — be the first to book and leave one.</p>
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
