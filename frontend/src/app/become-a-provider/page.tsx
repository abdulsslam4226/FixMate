"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getCategories, onboardProvider, uploadSelfie } from "@/lib/api";
import type { IdType, ServiceCategory } from "@/lib/types";

// Provider onboarding — Module 3.2-A Localized Trust Engine.
// Captures NIN/BVN (with idType declaration), uploads the verification selfie
// directly to the backend, records a physical guarantor, and geolocates the
// provider via the browser Geolocation API (or manual fallback).
export default function BecomeAProviderPage() {
  const { data: session, status: sessionStatus, update } = useSession();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [bio, setBio] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [idType, setIdType] = useState<IdType>("NIN");
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [guarantorName, setGuarantorName] = useState("");
  const [guarantorPhone, setGuarantorPhone] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [operatingRadiusKm, setOperatingRadiusKm] = useState("10");
  const [pricePerJob, setPricePerJob] = useState("5000");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  function handleSelfieChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelfieFile(file);
    if (file) {
      setSelfiePreview(URL.createObjectURL(file));
    } else {
      setSelfiePreview(null);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setGeoStatus("error");
      return;
    }
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setGeoStatus("done");
      },
      () => setGeoStatus("error"),
      { timeout: 10000 },
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;

    setStatus("loading");
    setError(null);

    try {
      if (!selfieFile) throw new Error("Please select a selfie photo for verification");

      const selfieUrl = await uploadSelfie(selfieFile, session.apiToken);

      await onboardProvider(
        {
          bio,
          categoryId,
          idNumber,
          idType,
          selfieUrl,
          guarantorName,
          guarantorPhone,
          latitude: Number(latitude),
          longitude: Number(longitude),
          operatingRadiusKm: Number(operatingRadiusKm),
          pricePerJobKobo: pricePerJob ? Math.round(Number(pricePerJob) * 100) : undefined,
          bankCode: bankCode || undefined,
          accountNumber: accountNumber || undefined,
        },
        session.apiToken,
      );

      await update({ role: "PROVIDER" });
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  if (sessionStatus === "loading") return null;

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
          violet verified badge. Your guarantor has been sent a WhatsApp confirmation message. We&apos;ll
          notify you once you&apos;re approved.
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

            {/* Category + Bio */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="categoryId">Service category</Label>
              <select
                id="categoryId"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="border-input bg-input/30 focus-visible:ring-ring/50 focus-visible:border-ring h-8 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"
              >
                <option value="" disabled>Select the service you provide</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bio">Tell customers about your work</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="e.g. 10 years installing and repairing residential AC units across Lekki and Ajah."
                required
              />
            </div>

            {/* NIN / BVN */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="idType">ID type</Label>
                <select
                  id="idType"
                  value={idType}
                  onChange={(e) => setIdType(e.target.value as IdType)}
                  className="border-input bg-input/30 focus-visible:ring-ring/50 focus-visible:border-ring h-8 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"
                >
                  <option value="NIN">NIN (National Identity Number)</option>
                  <option value="BVN">BVN (Bank Verification Number)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="idNumber">{idType} number</Label>
                <Input
                  id="idNumber"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="11-digit number"
                  maxLength={11}
                  required
                />
              </div>
            </div>

            {/* Selfie upload */}
            <div className="flex flex-col gap-2">
              <Label>Verification selfie</Label>
              <p className="text-muted-foreground text-xs">
                A clear photo of your face — this is compared against the ID you provided above. JPEG, PNG or WebP, max 5 MB.
              </p>
              <div className="flex items-start gap-4">
                {selfiePreview && (
                  <img
                    src={selfiePreview}
                    alt="Selfie preview"
                    className="h-20 w-20 rounded-lg object-cover ring-1 ring-white/10"
                  />
                )}
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleSelfieChange}
                    className="hidden"
                    id="selfieInput"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-fit text-sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {selfieFile ? "Change photo" : "Choose photo"}
                  </Button>
                  {selfieFile && (
                    <span className="text-muted-foreground text-xs">{selfieFile.name}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Guarantor */}
            <div className="border-border/60 flex flex-col gap-4 rounded-lg border border-dashed p-4">
              <p className="text-muted-foreground font-mono text-label-sm uppercase tracking-[0.15em]">
                Physical guarantor — Module 3.2-A trust check
              </p>
              <p className="text-muted-foreground text-xs">
                Your guarantor will receive a WhatsApp message asking them to confirm they vouch for you.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="guarantorName">Guarantor&apos;s full name</Label>
                  <Input id="guarantorName" value={guarantorName} onChange={(e) => setGuarantorName(e.target.value)} placeholder="Mrs. Bisi Adelaja" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="guarantorPhone">Guarantor&apos;s phone number</Label>
                  <Input id="guarantorPhone" type="tel" value={guarantorPhone} onChange={(e) => setGuarantorPhone(e.target.value)} placeholder="+234 800 000 0000" required />
                </div>
              </div>
            </div>

            {/* Geolocation */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Label>Your location</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="h-7 px-3 text-xs"
                  onClick={useMyLocation}
                  disabled={geoStatus === "loading"}
                >
                  {geoStatus === "loading" ? "Detecting…" : geoStatus === "done" ? "Location set ✓" : "Use my current location"}
                </Button>
              </div>
              {geoStatus === "error" && (
                <p className="text-destructive text-xs">Couldn&apos;t detect location — enter coordinates manually below.</p>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="latitude" className="text-xs">Latitude</Label>
                  <Input id="latitude" type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="6.5244" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="longitude" className="text-xs">Longitude</Label>
                  <Input id="longitude" type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="3.3792" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="operatingRadiusKm" className="text-xs">Operating radius (km)</Label>
                  <Input id="operatingRadiusKm" type="number" min="1" value={operatingRadiusKm} onChange={(e) => setOperatingRadiusKm(e.target.value)} required />
                </div>
              </div>
              <p className="text-muted-foreground font-mono text-xs">
                This is how FixMate matches you to customers nearby.
              </p>
            </div>

            {/* Pricing & bank account */}
            <div className="border-border/60 flex flex-col gap-4 rounded-lg border border-dashed p-4">
              <p className="text-muted-foreground font-mono text-label-sm uppercase tracking-[0.15em]">
                Pricing &amp; payout details
              </p>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pricePerJob">Your price per job (₦)</Label>
                <Input
                  id="pricePerJob"
                  type="number"
                  min="500"
                  step="500"
                  value={pricePerJob}
                  onChange={(e) => setPricePerJob(e.target.value)}
                  placeholder="5000"
                  required
                />
                <p className="text-muted-foreground text-xs">
                  Customers see this when booking. FixMate retains a 10% platform fee; you receive the rest on job completion.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="bankCode">Bank code <span className="text-muted-foreground">(optional)</span></Label>
                  <select
                    id="bankCode"
                    value={bankCode}
                    onChange={(e) => setBankCode(e.target.value)}
                    className="border-input bg-input/30 focus-visible:ring-ring/50 focus-visible:border-ring h-8 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"
                  >
                    <option value="">Select bank</option>
                    <option value="058">GTBank (058)</option>
                    <option value="011">First Bank (011)</option>
                    <option value="057">Zenith Bank (057)</option>
                    <option value="033">UBA (033)</option>
                    <option value="044">Access Bank (044)</option>
                    <option value="050">EcoBank (050)</option>
                    <option value="076">Polaris Bank (076)</option>
                    <option value="221">Stanbic IBTC (221)</option>
                    <option value="035">Wema / ALAT (035)</option>
                    <option value="070">Fidelity Bank (070)</option>
                    <option value="232">Sterling Bank (232)</option>
                    <option value="032">Union Bank (032)</option>
                    <option value="000014">Guaranty Trust Bank Mobile (000014)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="accountNumber">Account number <span className="text-muted-foreground">(optional)</span></Label>
                  <Input
                    id="accountNumber"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="0123456789"
                    maxLength={10}
                  />
                </div>
              </div>
              <p className="text-muted-foreground text-xs">
                Bank details can be added later if you don&apos;t have them handy — they&apos;re needed only for automatic payouts.
              </p>
            </div>

            {status === "error" && <p className="text-destructive text-sm">{error}</p>}

            <Button type="submit" disabled={status === "loading"} className="gradient-violet border-0 text-primary-foreground">
              {status === "loading" ? "Uploading & submitting…" : "Submit for verification"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
