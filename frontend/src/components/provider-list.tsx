import Link from "next/link";
import { BadgeCheck, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProviderSummary } from "@/lib/types";

// Provider profiles focus on proximity coordinates, working rates and a
// high-visibility violet verified badge — Module 3.2-B.
export function ProviderList({ providers, categoryId }: { providers: ProviderSummary[]; categoryId: string }) {
  if (providers.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No verified artisans found nearby for this category yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {providers.map((provider) => (
        <Card
          key={provider.id}
          className={
            provider.verificationStatus === "VERIFIED"
              ? "verified-glow border-0"
              : "border-border/60"
          }
        >
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <CardTitle className="font-heading text-base">{provider.user.fullName}</CardTitle>
            {provider.verificationStatus === "VERIFIED" && (
              <Badge className="gradient-violet gap-1 border-0 font-mono text-primary-foreground shadow-md shadow-primary/30">
                <BadgeCheck className="h-3.5 w-3.5" />
                Verified
              </Badge>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-muted-foreground text-sm line-clamp-3">{provider.bio}</p>
            <span className="text-muted-foreground flex items-center gap-1 font-mono text-xs">
              <MapPin className="h-3.5 w-3.5" />
              Operates within {provider.operatingRadiusKm} km
            </span>
            <Button
              nativeButton={false}
              render={<Link href={`/book/${provider.id}?categoryId=${categoryId}`}>Book this artisan</Link>}
              size="sm"
              className="gradient-violet w-fit border-0 text-primary-foreground"
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
