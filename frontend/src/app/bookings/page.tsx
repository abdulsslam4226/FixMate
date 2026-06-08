"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { BookingList } from "@/components/booking-list";
import { getMyBookings } from "@/lib/api";
import type { Booking } from "@/lib/types";

// GET /api/v1/bookings/mine — Private (frontend gap-fill over Module 3.3 so the
// booking loop is browsable: customers track requests, providers action jobs).
export default function MyBookingsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;

    getMyBookings(session.apiToken)
      .then(setBookings)
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load your bookings."));
  }, [session]);

  if (sessionStatus === "loading") {
    return null;
  }

  if (!session) {
    return (
      <main className="industrial-texture mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16 text-center">
        <h1 className="font-heading text-headline-lg-mobile font-bold">Sign up to see your bookings</h1>
        <p className="text-muted-foreground text-body-md">
          Create a free FixMate account to request and track verified-artisan bookings.
        </p>
        <Button
          nativeButton={false}
          render={<Link href="/sign-up">Create a free account</Link>}
          className="gradient-violet mx-auto w-fit border-0 text-primary-foreground"
        />
      </main>
    );
  }

  return (
    <main className="industrial-texture mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
      <header className="flex flex-col gap-2">
        <span className="text-muted-foreground font-mono text-label-sm uppercase tracking-[0.2em]">
          {session.user.role === "PROVIDER" ? "Job requests" : "Your bookings"}
        </span>
        <h1 className="font-heading text-headline-md sm:text-headline-lg font-bold">
          {session.user.role === "PROVIDER" ? "Jobs sent your way" : "Track your service requests"}
        </h1>
      </header>

      {error && <p className="text-destructive text-sm">{error}</p>}
      {!error && !bookings && <p className="text-muted-foreground text-sm">Loading your bookings…</p>}
      {bookings && <BookingList bookings={bookings} session={session} />}
    </main>
  );
}
