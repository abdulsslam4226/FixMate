"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createBooking } from "@/lib/api";

// Customer-facing booking request — POST /api/v1/bookings (Module 3.3). Fires
// the n8n 2-hour SLA workflow on the backend once submitted (Module 3.2-C).
export default function BookProviderPage() {
  const params = useParams<{ providerId: string }>();
  const searchParams = useSearchParams();
  const categoryId = searchParams.get("categoryId") ?? "";

  const { data: session, status: sessionStatus } = useSession();
  const [bookingDate, setBookingDate] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;

    setStatus("loading");
    setError(null);

    try {
      await createBooking(
        {
          providerId: params.providerId,
          categoryId,
          bookingDate: new Date(bookingDate).toISOString(),
          notes,
        },
        session.apiToken,
      );
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
        <h1 className="font-heading text-headline-lg-mobile font-bold">Sign up to request a booking</h1>
        <p className="text-muted-foreground text-body-md">
          Create a free FixMate account first — it only takes a minute, and lets us match you with this artisan.
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
        <h1 className="font-heading text-headline-lg-mobile font-bold">Booking requested!</h1>
        <p className="text-muted-foreground text-body-md">
          We&apos;ve sent your request to the artisan on WhatsApp. They have a 2-hour window to accept —
          if they don&apos;t respond in time, we&apos;ll automatically cancel and help you find someone else.
        </p>
        <Button
          nativeButton={false}
          render={<Link href="/bookings">Track my bookings</Link>}
          className="gradient-violet mx-auto w-fit border-0 text-primary-foreground"
        />
      </main>
    );
  }

  return (
    <main className="industrial-texture mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground font-mono text-label-sm uppercase tracking-[0.2em]">Request a booking</span>
        <h1 className="font-heading text-headline-lg-mobile font-bold">Tell us what you need done</h1>
        <p className="text-muted-foreground text-body-md">
          We&apos;ll send the artisan an instant WhatsApp ping. They have 2 hours to accept before we
          automatically look for someone else.
        </p>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="font-heading text-base">Booking details</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bookingDate">Preferred date &amp; time</Label>
              <Input
                id="bookingDate"
                name="bookingDate"
                type="datetime-local"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">What do you need help with?</Label>
              <Textarea
                id="notes"
                name="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Kitchen sink is leaking and the cabinet underneath is flooding."
                required
              />
            </div>

            {status === "error" && <p className="text-destructive text-sm">{error}</p>}

            <Button type="submit" disabled={status === "loading"} className="gradient-violet border-0 text-primary-foreground">
              {status === "loading" ? "Sending request…" : "Send booking request"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
