"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ProviderDashboard } from "@/components/provider-dashboard";
import { getProviderDashboard } from "@/lib/api";
import type { ProviderDashboardData } from "@/lib/types";

export default function DashboardPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [data, setData] = useState<ProviderDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    getProviderDashboard(session.apiToken)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load dashboard"));
  }, [session]);

  if (sessionStatus === "loading") return null;

  if (!session) {
    return (
      <main className="industrial-texture mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16 text-center">
        <h1 className="font-heading text-headline-lg-mobile font-bold">Sign in to view your dashboard</h1>
        <Button
          nativeButton={false}
          render={<Link href="/login">Log in</Link>}
          className="gradient-violet mx-auto w-fit border-0 text-primary-foreground"
        />
      </main>
    );
  }

  if (session.user.role !== "PROVIDER") {
    return (
      <main className="industrial-texture mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16 text-center">
        <h1 className="font-heading text-headline-lg-mobile font-bold">Provider dashboard</h1>
        <p className="text-muted-foreground text-body-md">
          This page is for verified artisans. Want to list your services on FixMate?
        </p>
        <Button
          nativeButton={false}
          render={<Link href="/become-a-provider">Become a provider</Link>}
          className="gradient-violet mx-auto w-fit border-0 text-primary-foreground"
        />
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-16">
        <p className="text-destructive text-sm">{error}</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-12">
        <div className="bg-card/40 h-24 animate-pulse rounded-xl" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card/40 h-24 animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="bg-card/40 h-64 animate-pulse rounded-xl" />
      </main>
    );
  }

  return (
    <main className="industrial-texture mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <ProviderDashboard
        data={data}
        session={session}
        onDataChange={setData}
      />
    </main>
  );
}
