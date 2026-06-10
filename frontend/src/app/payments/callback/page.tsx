"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { verifyPayment } from "@/lib/api";
import type { Payment } from "@/lib/types";

function PaymentResult() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");
  const isStub = searchParams.get("stub") === "true";

  const [status, setStatus] = useState<"loading" | "success" | "failed" | "error">("loading");
  const [payment, setPayment] = useState<Payment | null>(null);

  useEffect(() => {
    if (!reference) {
      setStatus("error");
      return;
    }
    verifyPayment(reference)
      .then((p) => {
        setPayment(p);
        setStatus(p.status === "PAID" ? "success" : "failed");
      })
      .catch(() => setStatus("error"));
  }, [reference]);

  return (
    <>
      {status === "loading" && (
        <>
          <Loader2 className="text-muted-foreground h-10 w-10 animate-spin" />
          <p className="text-muted-foreground font-mono text-sm">Verifying payment…</p>
        </>
      )}

      {status === "success" && (
        <>
          <CheckCircle2 className="h-12 w-12 text-emerald-400" />
          <h1 className="font-heading text-2xl font-bold">Payment confirmed!</h1>
          <p className="text-muted-foreground max-w-sm text-sm">
            {payment
              ? `₦${(payment.amountKobo / 100).toLocaleString("en-NG")} received — your booking is secured.`
              : "Your payment has been received and your booking is secured."}
            {isStub && (
              <span className="mt-1 block font-mono text-xs text-amber-400">
                (Dev stub — Paystack not configured)
              </span>
            )}
          </p>
          <Button
            nativeButton={false}
            render={<Link href="/bookings">View my bookings</Link>}
            className="gradient-violet border-0 text-primary-foreground"
          />
        </>
      )}

      {status === "failed" && (
        <>
          <XCircle className="text-destructive h-12 w-12" />
          <h1 className="font-heading text-2xl font-bold">Payment unsuccessful</h1>
          <p className="text-muted-foreground max-w-sm text-sm">
            Your payment was not completed. Your booking is still held — you can try again from your
            bookings page.
          </p>
          <Button
            nativeButton={false}
            render={<Link href="/bookings">Back to bookings</Link>}
            variant="outline"
          />
        </>
      )}

      {status === "error" && (
        <>
          <XCircle className="text-destructive h-12 w-12" />
          <h1 className="font-heading text-2xl font-bold">Something went wrong</h1>
          <p className="text-muted-foreground max-w-sm text-sm">
            We couldn&apos;t verify your payment. If money left your account, please contact support with
            reference: <span className="font-mono">{reference ?? "—"}</span>
          </p>
          <Button
            nativeButton={false}
            render={<Link href="/bookings">Back to bookings</Link>}
            variant="outline"
          />
        </>
      )}
    </>
  );
}

export default function PaymentCallbackPage() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 py-20 text-center">
      <Suspense
        fallback={
          <>
            <Loader2 className="text-muted-foreground h-10 w-10 animate-spin" />
            <p className="text-muted-foreground font-mono text-sm">Loading…</p>
          </>
        }
      >
        <PaymentResult />
      </Suspense>
    </main>
  );
}
