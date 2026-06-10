"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { AdminNav } from "@/components/admin-nav";
import { VerificationQueue } from "@/components/verification-queue";
import { getVerificationQueue } from "@/lib/api";
import type { VerificationQueueItem } from "@/lib/types";

// GET /api/v1/admin/verification-queue — Admin (Module 3.3 / 3.2-A "secure
// backend workspace view" for the Localized Trust Engine). Gated by role —
// the backend itself enforces requireRole("ADMIN"), this just keeps
// non-admins from landing on an empty/forbidden screen.
export default function VerificationQueuePage() {
  const { data: session, status: sessionStatus } = useSession();
  const [queue, setQueue] = useState<VerificationQueueItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || session.user.role !== "ADMIN") return;

    getVerificationQueue(session.apiToken)
      .then(setQueue)
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load the verification queue."));
  }, [session]);

  if (sessionStatus === "loading") {
    return null;
  }

  if (!session || session.user.role !== "ADMIN") {
    return (
      <main className="industrial-texture mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16 text-center">
        <h1 className="font-heading text-headline-lg-mobile font-bold">Admins only</h1>
        <p className="text-muted-foreground text-body-md">
          The verification queue is part of FixMate&apos;s admin workspace — sign in with an admin account to
          review pending provider profiles.
        </p>
        <Button
          nativeButton={false}
          render={<Link href="/discover">Browse services instead</Link>}
          variant="outline"
          className="mx-auto w-fit"
        />
      </main>
    );
  }

  return (
    <main className="industrial-texture mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
      <div className="mb-6 flex flex-col gap-1">
        <span className="text-muted-foreground font-mono text-label-sm uppercase tracking-[0.2em]">Admin workspace</span>
        <h1 className="font-heading text-headline-md sm:text-headline-lg font-bold">Provider verification queue</h1>
      </div>

      <AdminNav />

      <header className="flex flex-col gap-2">
        <p className="text-muted-foreground max-w-2xl text-body-md">
          Review each artisan&apos;s NIN/BVN, selfie and physical guarantor before they go live with the
          verified badge.
        </p>
      </header>

      {error && <p className="text-destructive text-sm">{error}</p>}
      {!error && !queue && <p className="text-muted-foreground text-sm">Loading the queue…</p>}
      {queue && <VerificationQueue queue={queue} session={session} />}
    </main>
  );
}
