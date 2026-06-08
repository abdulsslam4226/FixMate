"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPassword } from "@/lib/api";

// Always shows the same generic confirmation regardless of whether the email
// is on file — the backend's /auth/forgot-password is enumeration-safe by design.
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    await forgotPassword(email).catch(() => null);
    setStatus("done");
  }

  return (
    <main className="industrial-texture mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground font-mono text-label-sm uppercase tracking-[0.2em]">Account recovery</span>
        <h1 className="font-heading text-headline-lg-mobile font-bold">Reset your password</h1>
        <p className="text-muted-foreground text-body-md">
          Enter the email on your FixMate account and we&apos;ll send a link to set a new password.
        </p>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="font-heading text-base">Forgot password</CardTitle>
        </CardHeader>
        <CardContent>
          {status === "done" ? (
            <p className="text-body-md">
              If an account exists for <span className="font-medium">{email}</span>, we&apos;ve sent a link to reset
              the password. Check the inbox (and spam folder) for a message from FixMate.
            </p>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ada@email.com"
                  required
                />
              </div>

              <Button type="submit" disabled={status === "loading"} className="gradient-violet border-0 text-primary-foreground">
                {status === "loading" ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-center text-sm">
        Remembered it after all?{" "}
        <Link href="/login" className="text-foreground underline underline-offset-4">
          Back to login
        </Link>
      </p>
    </main>
  );
}
