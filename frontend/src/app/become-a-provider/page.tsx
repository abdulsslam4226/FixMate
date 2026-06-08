"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getCategories, onboardProvider } from "@/lib/api";
import type { ServiceCategory } from "@/lib/types";

const FIELD_LABELS = {
  bio: "Tell customers about your work",
  idNumber: "NIN or BVN",
  selfieUrl: "Verification selfie link",
  guarantorName: "Guarantor's full name",
  guarantorPhone: "Guarantor's phone number",
};

// Provider onboarding — POST /api/v1/providers/onboard (Module 3.3). Captures
// the Localized Trust Engine fields (Module 3.2-A): ID number, selfie link,
// and a physical guarantor, plus the geospatial coordinates the discovery
// dashboard matches against. An admin reviews and verifies the profile
// afterwards (see /admin/verification-queue).
export default function BecomeAProviderPage() {
  const { data: session, status: sessionStatus, update } = useSession();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [bio, setBio] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [selfieUrl, setSelfieUrl] = useState("");
  const [guarantorName, setGuarantorName] = useState("");
  const [guarantorPhone, setGuarantorPhone] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [operatingRadiusKm, setOperatingRadiusKm] = useState("10");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;

    setStatus("loading");
    setError(null);

    try {
      await onboardProvider(
        {
          bio,
          categoryId,
          idNumber,
          selfieUrl,
          guarantorName,
          guarantorPhone,
          latitude: Number(latitude),
          longitude: Number(longitude),
          operatingRadiusKm: Number(operatingRadiusKm),
        },
        session.apiToken,
      );
      // Onboarding promotes the account to PROVIDER on the backend — refresh
      // the Auth.js session so the bridge JWT (and header/booking views)
      // reflect the new role (see the jwt callback's "update" trigger).
      await update({ role: "PROVIDER" });
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  if (sessionStatus === "loading") {
    return null;
  }

  if (!session) {
    return (
      <main className="industrial-texture mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16 text-center">
        <h1 className="font-heading text-headline-lg-mobile font-bold">Sign up to register as a provider</h1>
        <p className="text-muted-foreground text-body-md">
          Create a free FixMate account first, then come back here to submit your verification details.
        </p>
        <Button
          nativeButton={false}
          render={<Link href="/sign-up">Create a free account</Link>}
          className="gradient-violet mx-auto w-fit border-0 text-primary-foreground"
        />
      </main>
    );
  }

  if (status === "success") {
    return (
      <main className="industrial-texture mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16 text-center">
        <h1 className="font-heading text-headline-lg-mobile font-bold">Verification details submitted!</h1>
        <p className="text-muted-foreground text-body-md">
          Our admin team reviews every NIN/BVN, selfie and guarantor before a profile goes live with the
          violet verified badge. We&apos;ll notify you on WhatsApp the moment you&apos;re approved.
        </p>
        <Button
          nativeButton={false}
          render={<Link href="/bookings">View my job requests</Link>}
          className="gradient-violet mx-auto w-fit border-0 text-primary-foreground"
        />
      </main>
    );
  }

  return (
    <main className="industrial-texture mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground font-mono text-label-sm uppercase tracking-[0.2em]">For artisans</span>
        <h1 className="font-heading text-headline-lg-mobile font-bold">Get listed as a verified FixMate artisan</h1>
        <p className="text-muted-foreground text-body-md">
          FixMate&apos;s Localized Trust Engine checks every provider&apos;s identity and a physical guarantor
          before they appear in search — that&apos;s what earns the violet verified badge customers trust.
        </p>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="font-heading text-base">Your verification details</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="categoryId">Service category</Label>
              <select
                id="categoryId"
                name="categoryId"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="border-input bg-input/30 focus-visible:ring-ring/50 focus-visible:border-ring h-8 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"
              >
                <option value="" disabled>
                  Select the service you provide
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bio">{FIELD_LABELS.bio}</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="e.g. 10 years installing and repairing residential AC units across Lekki and Ajah."
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="idNumber">{FIELD_LABELS.idNumber}</Label>
                <Input id="idNumber" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="11-digit number" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="selfieUrl">{FIELD_LABELS.selfieUrl}</Label>
                <Input
                  id="selfieUrl"
                  type="url"
                  value={selfieUrl}
                  onChange={(e) => setSelfieUrl(e.target.value)}
                  placeholder="https://…"
                  required
                />
              </div>
            </div>

            <div className="border-border/60 flex flex-col gap-4 rounded-lg border border-dashed p-4">
              <p className="text-muted-foreground font-mono text-label-sm uppercase tracking-[0.15em]">
                Physical guarantor — Module 3.2-A trust check
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="guarantorName">{FIELD_LABELS.guarantorName}</Label>
                  <Input id="guarantorName" value={guarantorName} onChange={(e) => setGuarantorName(e.target.value)} placeholder="Mrs. Bisi Adelaja" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="guarantorPhone">{FIELD_LABELS.guarantorPhone}</Label>
                  <Input id="guarantorPhone" type="tel" value={guarantorPhone} onChange={(e) => setGuarantorPhone(e.target.value)} placeholder="+234 800 000 0000" required />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="latitude">Latitude</Label>
                <Input id="latitude" type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="6.5244" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="longitude">Longitude</Label>
                <Input id="longitude" type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="3.3792" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="operatingRadiusKm">Operating radius (km)</Label>
                <Input
                  id="operatingRadiusKm"
                  type="number"
                  min="1"
                  value={operatingRadiusKm}
                  onChange={(e) => setOperatingRadiusKm(e.target.value)}
                  required
                />
              </div>
            </div>
            <p className="text-muted-foreground -mt-2 font-mono text-xs">
              Enter the coordinates of where you&apos;re based — this is how we match you to nearby customers.
            </p>

            {status === "error" && <p className="text-destructive text-sm">{error}</p>}

            <Button type="submit" disabled={status === "loading"} className="gradient-violet border-0 text-primary-foreground">
              {status === "loading" ? "Submitting…" : "Submit for verification"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
