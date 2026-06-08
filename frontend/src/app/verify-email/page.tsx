"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { verifyEmail } from "@/lib/api";

function VerifyEmailStatus() {
  const token = useSearchParams().get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("This link is missing its verification token.");
      setStatus("error");
      return;
    }

    let cancelled = false;
    verifyEmail(token)
      .then(() => {
        if (!cancelled) setStatus("success");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Couldn't verify this email address.");
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (status === "loading") {
    return <p className="text-body-md">Confirming your email address…</p>;
  }

  if (status === "success") {
    return (
      <p className="text-body-md">
        Your email address is verified. You&apos;re all set —{" "}
        <Link href="/discover" className="text-foreground underline underline-offset-4">
          continue to FixMate
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-destructive text-body-md">{error}</p>
      <p className="text-muted-foreground text-sm">
        Verification links expire after 24 hours. You can still use your account — just{" "}
        <Link href="/login" className="text-foreground underline underline-offset-4">
          log in
        </Link>{" "}
        and request a fresh one if you need to.
      </p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="industrial-texture mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground font-mono text-label-sm uppercase tracking-[0.2em]">Email verification</span>
        <h1 className="font-heading text-headline-lg-mobile font-bold">Confirming your email</h1>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="font-heading text-base">Verification status</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p className="text-body-md">Confirming your email address…</p>}>
            <VerifyEmailStatus />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}
