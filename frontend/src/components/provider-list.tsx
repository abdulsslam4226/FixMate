"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Locate, MapPin, Search, Star, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getProvidersByCategory } from "@/lib/api";
import type { ProviderSummary } from "@/lib/types";

function StarRow({ rating, count }: { rating: number | null; count: number }) {
  if (rating == null) return <span className="text-muted-foreground font-mono text-xs">No reviews yet</span>;
  return (
    <span className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3 w-3 ${n <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
      <span className="text-muted-foreground font-mono text-xs">{rating} ({count})</span>
    </span>
  );
}

const SORT_OPTIONS = [
  { value: "rating_desc", label: "Top rated" },
  { value: "price_asc", label: "Price: low → high" },
  { value: "price_desc", label: "Price: high → low" },
];

const RATING_OPTIONS = [
  { value: 0, label: "Any rating" },
  { value: 4, label: "4★ & above" },
  { value: 3, label: "3★ & above" },
];

export function ProviderList({
  initialProviders,
  categoryId,
}: {
  initialProviders: ProviderSummary[];
  categoryId: string;
}) {
  const [providers, setProviders] = useState(initialProviders);
  const [q, setQ] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState("rating_desc");
  const [loading, setLoading] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "active" | "denied">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetch = useCallback(
    async (query: string, rating: number, sort: string, coords: { lat: number; lng: number } | null) => {
      setLoading(true);
      try {
        const results = await getProvidersByCategory(categoryId, {
          q: query || undefined,
          minRating: rating || undefined,
          sortBy: sort,
          ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
        });
        setProviders(results);
      } finally {
        setLoading(false);
      }
    },
    [categoryId],
  );

  function requestLocation() {
    if (!navigator.geolocation) { setGeoStatus("denied"); return; }
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        setGeoStatus("active");
        fetch(q, minRating, sortBy, coords);
      },
      () => setGeoStatus("denied"),
      { timeout: 10000 },
    );
  }

  function clearLocation() {
    setUserCoords(null);
    setGeoStatus("idle");
    fetch(q, minRating, sortBy, null);
  }

  // Debounce text search; immediate update for selects
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetch(q, minRating, sortBy, userCoords), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => { fetch(q, minRating, sortBy, userCoords); }, [minRating, sortBy, fetch]);  // eslint-disable-line react-hooks/exhaustive-deps

  const hasFilters = q.trim() || minRating > 0 || sortBy !== "rating_desc" || geoStatus === "active";

  function clearFilters() {
    setQ("");
    setMinRating(0);
    setSortBy("rating_desc");
    clearLocation();
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or skill…"
            className="pl-9"
          />
        </div>

        <select
          value={minRating}
          onChange={(e) => setMinRating(Number(e.target.value))}
          className="bg-background border-input text-foreground h-9 rounded-md border px-3 font-mono text-sm"
        >
          {RATING_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-background border-input text-foreground h-9 rounded-md border px-3 font-mono text-sm"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {geoStatus === "active" ? (
          <Button size="sm" variant="outline" onClick={clearLocation} className="gap-1.5 text-primary border-primary/40">
            <Locate className="h-3.5 w-3.5" />
            Near me
            <X className="h-3 w-3 opacity-60" />
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={requestLocation}
            disabled={geoStatus === "loading"}
            className="gap-1.5 text-muted-foreground"
            title={geoStatus === "denied" ? "Location access was denied" : "Show providers near you"}
          >
            <Locate className="h-3.5 w-3.5" />
            {geoStatus === "loading" ? "Locating…" : geoStatus === "denied" ? "Location denied" : "Near me"}
          </Button>
        )}

        {hasFilters && (
          <Button size="sm" variant="ghost" onClick={clearFilters} className="text-muted-foreground gap-1">
            <X className="h-3.5 w-3.5" /> Clear all
          </Button>
        )}
      </div>

      {/* Results */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card/40 h-48 animate-pulse rounded-xl" />
          ))}
        </div>
      )}

      {!loading && providers.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Search className="text-muted-foreground h-10 w-10" />
          <p className="text-muted-foreground text-sm">
            {hasFilters ? "No artisans match your filters — try adjusting the search or rating." : "No verified artisans found for this category yet."}
          </p>
          {hasFilters && (
            <Button size="sm" variant="outline" onClick={clearFilters}>Clear filters</Button>
          )}
        </div>
      )}

      {!loading && providers.length > 0 && (
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
                <p className="text-muted-foreground line-clamp-3 text-sm">{provider.bio}</p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="text-muted-foreground flex items-center gap-1 font-mono text-xs">
                    <MapPin className="h-3.5 w-3.5" />
                    {provider.operatingRadiusKm} km radius
                  </span>
                  <span className="font-mono text-sm font-semibold">
                    ₦{(provider.pricePerJobKobo / 100).toLocaleString("en-NG")}
                    <span className="text-muted-foreground font-normal">/job</span>
                  </span>
                </div>

                <StarRow rating={provider.averageRating} count={provider.reviewCount} />

                <div className="flex flex-wrap gap-2">
                  <Button
                    nativeButton={false}
                    render={<Link href={`/book/${provider.id}?categoryId=${categoryId}`}>Book this artisan</Link>}
                    size="sm"
                    className="gradient-violet border-0 text-primary-foreground"
                  />
                  <Button
                    nativeButton={false}
                    render={<Link href={`/providers/${provider.id}`}>View profile</Link>}
                    size="sm"
                    variant="outline"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && providers.length > 0 && (
        <p className="text-muted-foreground font-mono text-xs">
          {providers.length} artisan{providers.length !== 1 ? "s" : ""} found
        </p>
      )}
    </div>
  );
}
