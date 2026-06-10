"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { listAdminDisputes, resolveDispute } from "@/lib/api";
import { AdminNav } from "@/components/admin-nav";
import type { AdminDispute, DisputeStatus } from "@/lib/types";

const STATUS_CONFIG: Record<DisputeStatus, { label: string; cls: string }> = {
  OPEN: { label: "Open", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  RESOLVED_REFUND: { label: "Refunded", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  RESOLVED_RELEASE: { label: "Released", cls: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });

const naira = (kobo: number) => `₦${(kobo / 100).toLocaleString("en-NG")}`;

function ResolvePanel({
  dispute,
  apiToken,
  onResolved,
}: {
  dispute: AdminDispute;
  apiToken: string;
  onResolved: (updated: AdminDispute) => void;
}) {
  const [resolution, setResolution] = useState("");
  const [busy, setBusy] = useState<"REFUND" | "RELEASE" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handle(outcome: "REFUND" | "RELEASE") {
    if (!resolution.trim()) { setError("Please add a resolution note."); return; }
    setBusy(outcome);
    setError(null);
    try {
      const updated = await resolveDispute(dispute.id, { outcome, resolution }, apiToken);
      onResolved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resolve dispute.");
      setBusy(null);
    }
  }

  return (
    <div className="border-border/40 flex flex-col gap-3 rounded-lg border border-dashed p-4">
      <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Resolve dispute</p>
      <Textarea
        value={resolution}
        onChange={(e) => setResolution(e.target.value)}
        placeholder="Add an internal note explaining your decision…"
        rows={2}
      />
      {error && <p className="text-destructive text-sm">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={!!busy}
          onClick={() => handle("REFUND")}
          className="border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/20"
          variant="outline"
        >
          <XCircle className="h-4 w-4" />
          {busy === "REFUND" ? "Processing…" : "Refund customer"}
        </Button>
        <Button
          size="sm"
          disabled={!!busy}
          onClick={() => handle("RELEASE")}
          className="gradient-violet border-0 text-primary-foreground"
        >
          <CheckCircle2 className="h-4 w-4" />
          {busy === "RELEASE" ? "Processing…" : "Release to provider"}
        </Button>
      </div>
    </div>
  );
}

function DisputeCard({
  dispute,
  apiToken,
  onResolved,
}: {
  dispute: AdminDispute;
  apiToken: string;
  onResolved: (updated: AdminDispute) => void;
}) {
  const cfg = STATUS_CONFIG[dispute.status];
  const payment = dispute.booking.payment;

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <CardTitle className="font-heading text-base">
            {dispute.booking.category.name} — {dispute.booking.customer.fullName}
          </CardTitle>
          <span className="text-muted-foreground font-mono text-xs">
            Raised by {dispute.raisedBy.fullName} · {fmt(dispute.createdAt)}
          </span>
        </div>
        <span className={`border font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${cfg.cls}`}>
          {cfg.label}
        </span>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Parties */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="border-border/40 rounded-lg border p-3">
            <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-wide">Customer</p>
            <p className="text-sm font-medium">{dispute.booking.customer.fullName}</p>
            <p className="text-muted-foreground text-xs">{dispute.booking.customer.email}</p>
            <p className="text-muted-foreground text-xs">{dispute.booking.customer.phoneNumber}</p>
          </div>
          <div className="border-border/40 rounded-lg border p-3">
            <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-wide">Provider</p>
            <p className="text-sm font-medium">{dispute.booking.provider.user.fullName}</p>
            <p className="text-muted-foreground text-xs">{dispute.booking.provider.user.email}</p>
          </div>
        </div>

        {/* Booking details */}
        <div className="border-border/40 rounded-lg border p-3 text-sm">
          <p className="text-muted-foreground text-xs">Booking date: {fmt(dispute.booking.bookingDate)}</p>
          <p className="text-muted-foreground text-xs">Notes: {dispute.booking.notes}</p>
          {payment && (
            <p className="mt-1 text-xs">
              Payment:{" "}
              <span className="font-semibold">{naira(payment.amountKobo)}</span>
              {" · "}
              <span className="font-mono">{payment.status}</span>
            </p>
          )}
        </div>

        {/* Dispute reason */}
        <div className="border-amber-500/20 bg-amber-500/5 rounded-lg border p-3">
          <p className="text-muted-foreground mb-1 font-mono text-[10px] uppercase tracking-wide">
            Customer&apos;s complaint
          </p>
          <p className="text-sm">{dispute.reason}</p>
        </div>

        {/* Resolution (resolved disputes) */}
        {dispute.resolution && (
          <div className="border-border/40 rounded-lg border p-3">
            <p className="text-muted-foreground mb-1 font-mono text-[10px] uppercase tracking-wide">
              Resolution note
            </p>
            <p className="text-sm">{dispute.resolution}</p>
            {dispute.resolvedBy && (
              <p className="text-muted-foreground mt-1 text-xs">
                Resolved by {dispute.resolvedBy.fullName}
              </p>
            )}
          </div>
        )}

        {/* Resolve panel (open only) */}
        {dispute.status === "OPEN" && (
          <ResolvePanel dispute={dispute} apiToken={apiToken} onResolved={onResolved} />
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminDisputesPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [disputes, setDisputes] = useState<AdminDispute[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    listAdminDisputes(session.apiToken)
      .then(setDisputes)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load disputes"));
  }, [session]);

  if (sessionStatus === "loading") return null;
  if (!session || session.user.role !== "ADMIN") {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16 text-center">
        <p className="text-muted-foreground text-sm">Admin access required.</p>
      </main>
    );
  }

  const open = disputes?.filter((d) => d.status === "OPEN") ?? [];
  const resolved = disputes?.filter((d) => d.status !== "OPEN") ?? [];

  function handleResolved(updated: AdminDispute) {
    setDisputes((prev) => prev?.map((d) => (d.id === updated.id ? updated : d)) ?? null);
  }

  return (
    <main className="industrial-texture mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <div className="mb-6 flex flex-col gap-1">
        <span className="text-muted-foreground font-mono text-label-sm uppercase tracking-[0.2em]">
          Admin workspace
        </span>
        <h1 className="font-heading text-headline-lg-mobile font-bold">Disputes</h1>
      </div>

      <AdminNav />

      {disputes && (
          <p className="text-muted-foreground text-sm">
            {open.length} open · {resolved.length} resolved
          </p>
        )}

      {error && <p className="text-destructive text-sm">{error}</p>}

      {!disputes && !error && (
        <div className="flex flex-col gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card/40 h-48 animate-pulse rounded-xl" />
          ))}
        </div>
      )}

      {disputes && disputes.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-400" />
          <p className="text-muted-foreground text-sm">No disputes — all clear.</p>
        </div>
      )}

      {open.length > 0 && (
        <section className="mb-8 flex flex-col gap-4">
          <h2 className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            Needs attention ({open.length})
          </h2>
          {open.map((d) => (
            <DisputeCard key={d.id} dispute={d} apiToken={session.apiToken} onResolved={handleResolved} />
          ))}
        </section>
      )}

      {resolved.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Resolved ({resolved.length})
          </h2>
          {resolved.map((d) => (
            <DisputeCard key={d.id} dispute={d} apiToken={session.apiToken} onResolved={handleResolved} />
          ))}
        </section>
      )}
    </main>
  );
}
