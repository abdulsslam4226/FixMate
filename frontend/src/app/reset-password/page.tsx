"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setError("This reset link is missing its token. Request a new one from the forgot-password page.");
      setStatus("error");
      return;
    }

    if (password !== confirmPassword) {
      setError("Those passwords don't match.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    try {
      await resetPassword({ token, password });
      setStatus("done");
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't reset your password.");
      setStatus("error");
    }
  }

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="font-heading text-base">Choose a new password</CardTitle>
      </CardHeader>
      <CardContent>
        {status === "done" ? (
          <p className="text-body-md">Password updated — redirecting you to the login page…</p>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {status === "error" && <p className="text-destructive text-sm">{error}</p>}

            <Button type="submit" disabled={status === "loading"} className="gradient-violet border-0 text-primary-foreground">
              {status === "loading" ? "Updating…" : "Update password"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="industrial-texture mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground font-mono text-label-sm uppercase tracking-[0.2em]">Account recovery</span>
        <h1 className="font-heading text-headline-lg-mobile font-bold">Set a new password</h1>
        <p className="text-muted-foreground text-body-md">
          Pick something memorable — at least 8 characters.
        </p>
      </div>

      <Suspense>
        <ResetPasswordForm />
      </Suspense>

      <p className="text-muted-foreground text-center text-sm">
        <Link href="/login" className="text-foreground underline underline-offset-4">
          Back to login
        </Link>
      </p>
    </main>
  );
}
