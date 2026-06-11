"use client";

import { useState } from "react";
import { BadgeCheck, Briefcase, CheckCircle2, Clock, Star, TrendingUp, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateBookingStatus, updateProviderProfile } from "@/lib/api";
import type {
  BookingStatus,
  DashboardBooking,
  DashboardProfile,
  ProviderDashboardData,
} from "@/lib/types";
import type { Session } from "next-auth";

const VERIFY_BADGE: Record<string, { label: string; cls: string }> = {
  VERIFIED: { label: "Verified", cls: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  PENDING: { label: "Pending review", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  REJECTED: { label: "Rejected", cls: "bg-destructive/15 text-destructive border-destructive/30" },
};

const STATUS_BADGE: Record<BookingStatus, string> = {
  PENDING: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  ACCEPTED: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  COMPLETED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  CANCELLED: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });

const naira = (kobo: number) => `₦${(kobo / 100).toLocaleString("en-NG")}`;

// ─── Stat card ──────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <Card className="border-border/60">
      <CardContent className="flex flex-col gap-1 pt-5">
        <Icon className="text-muted-foreground h-4 w-4" />
        <span className="font-heading text-2xl font-bold">{value}</span>
        <span className="text-muted-foreground font-mono text-xs uppercase tracking-wide">{label}</span>
        {sub && <span className="text-muted-foreground text-xs">{sub}</span>}
      </CardContent>
    </Card>
  );
}

// ─── Job card ────────────────────────────────────────────────────────────────

function JobCard({
  booking,
  apiToken,
  onUpdated,
}: {
  booking: DashboardBooking;
  apiToken: string;
  onUpdated: (updated: DashboardBooking) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function act(status: BookingStatus) {
    setBusy(true);
    try {
      const updated = await updateBookingStatus(booking.id, status, apiToken);
      // updateBookingStatus returns a Booking; remap to DashboardBooking shape
      onUpdated({ ...booking, status: updated.status, payment: updated.payment });
    } finally {
      setBusy(false);
    }
  }

  const badge = VERIFY_BADGE; void badge; // silence unused warning

  return (
    <div className="border-border/60 flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold">{booking.customer.fullName}</span>
          <span className="text-muted-foreground text-xs">{booking.category.name} · {fmt(booking.bookingDate)}</span>
          {booking.customer.phoneNumber && (
            <a
              href={`tel:${booking.customer.phoneNumber}`}
              className="text-muted-foreground hover:text-foreground font-mono text-xs transition-colors"
            >
              {booking.customer.phoneNumber}
            </a>
          )}
        </div>
        <span className={`border font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_BADGE[booking.status]}`}>
          {booking.status}
        </span>
      </div>

      {booking.notes && (
        <p className="text-muted-foreground border-border/40 rounded-lg border border-dashed p-3 text-sm">
          {booking.notes}
        </p>
      )}

      {booking.review && (
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className={`h-3.5 w-3.5 ${n <= booking.review!.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
            />
          ))}
          <span className="text-muted-foreground text-xs">{booking.review.comment}</span>
        </div>
      )}

      {booking.status === "PENDING" && (
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={busy}
            onClick={() => act("ACCEPTED")}
            className="gradient-violet border-0 text-primary-foreground"
          >
            <CheckCircle2 className="h-4 w-4" /> Accept
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => act("CANCELLED")}>
            <XCircle className="h-4 w-4" /> Decline
          </Button>
        </div>
      )}

      {booking.status === "ACCEPTED" && (
        <Button
          size="sm"
          disabled={busy}
          onClick={() => act("COMPLETED")}
          className="gradient-violet w-fit border-0 text-primary-foreground"
        >
          <CheckCircle2 className="h-4 w-4" /> Mark as completed
        </Button>
      )}
    </div>
  );
}

// ─── Profile editor ───────────────────────────────────────────────────────────

function ProfileEditor({
  profile,
  apiToken,
  onSaved,
}: {
  profile: DashboardProfile;
  apiToken: string;
  onSaved: (updated: DashboardProfile) => void;
}) {
  const [bio, setBio] = useState(profile.bio);
  const [price, setPrice] = useState(String(profile.pricePerJobKobo / 100));
  const [bankCode, setBankCode] = useState(profile.bankCode ?? "");
  const [accountNumber, setAccountNumber] = useState(profile.accountNumber ?? "");
  const [radiusKm, setRadiusKm] = useState(String(profile.operatingRadiusKm));
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveState("saving");
    setSaveError(null);
    try {
      const updated = await updateProviderProfile(
        {
          bio,
          pricePerJobKobo: Math.round(Number(price) * 100),
          bankCode: bankCode || undefined,
          accountNumber: accountNumber || undefined,
          operatingRadiusKm: Number(radiusKm),
        },
        apiToken,
      );
      onSaved(updated);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
      setSaveState("error");
    }
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="price">Price per job (₦)</Label>
          <Input
            id="price"
            type="number"
            min="500"
            step="500"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="radius">Operating radius (km)</Label>
          <Input
            id="radius"
            type="number"
            min="1"
            value={radiusKm}
            onChange={(e) => setRadiusKm(e.target.value)}
            required
          />
        </div>
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

      {saveError && <p className="text-destructive text-sm">{saveError}</p>}

      <Button
        type="submit"
        disabled={saveState === "saving"}
        className="gradient-violet w-fit border-0 text-primary-foreground"
      >
        {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved ✓" : "Save changes"}
      </Button>
    </form>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export function ProviderDashboard({
  data,
  session,
  onDataChange,
}: {
  data: ProviderDashboardData;
  session: Session;
  onDataChange: (d: ProviderDashboardData) => void;
}) {
  const { profile, bookings, stats } = data;
  const [tab, setTab] = useState<"jobs" | "profile">("jobs");

  const verifyInfo = VERIFY_BADGE[profile.verificationStatus] ?? VERIFY_BADGE.PENDING;

  const pending = bookings.filter((b) => b.status === "PENDING");
  const accepted = bookings.filter((b) => b.status === "ACCEPTED");
  const history = bookings.filter(
    (b) => b.status === "COMPLETED" || b.status === "CANCELLED",
  );

  function handleJobUpdated(updated: DashboardBooking) {
    const next = bookings.map((b) => (b.id === updated.id ? updated : b));
    // Recompute stats locally so the page updates without a refetch
    const newStats = {
      total: next.length,
      pending: next.filter((b) => b.status === "PENDING").length,
      accepted: next.filter((b) => b.status === "ACCEPTED").length,
      completed: next.filter((b) => b.status === "COMPLETED").length,
      cancelled: next.filter((b) => b.status === "CANCELLED").length,
      totalEarningsKobo: stats.totalEarningsKobo,
      pendingPayoutKobo: next
        .filter((b) => b.status === "ACCEPTED" && b.payment?.status === "PAID")
        .reduce((sum, b) => sum + (b.payment?.amountKobo ?? 0), 0),
    };
    onDataChange({ profile, bookings: next, stats: newStats });
  }

  function handleProfileSaved(updated: DashboardProfile) {
    onDataChange({ profile: updated, bookings, stats });
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground font-mono text-label-sm uppercase tracking-[0.2em]">
            Provider dashboard
          </span>
          <h1 className="font-heading text-headline-lg-mobile font-bold">
            Welcome back, {session.user.name?.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground text-sm">{profile.category.name}</p>
        </div>
        <span className={`flex items-center gap-1.5 border px-3 py-1 rounded-full font-mono text-xs ${verifyInfo.cls}`}>
          <BadgeCheck className="h-3.5 w-3.5" />
          {verifyInfo.label}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={Briefcase} label="Total jobs" value={stats.total} />
        <StatCard icon={Clock} label="Pending" value={stats.pending} sub={`${stats.accepted} accepted`} />
        <StatCard icon={CheckCircle2} label="Completed" value={stats.completed} />
        <StatCard
          icon={TrendingUp}
          label="Price per job"
          value={naira(profile.pricePerJobKobo)}
          sub="Paid directly by customer"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border/60">
        {(["jobs", "profile"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 font-mono text-xs uppercase tracking-widest transition-colors ${
              tab === t
                ? "border-b-2 border-orange-500 text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "jobs" ? "Jobs" : "Profile & Payout"}
          </button>
        ))}
      </div>

      {/* Jobs tab */}
      {tab === "jobs" && (
        <div className="flex flex-col gap-6">
          {pending.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                Awaiting your response ({pending.length})
              </h2>
              {pending.map((b) => (
                <JobCard key={b.id} booking={b} apiToken={session.apiToken} onUpdated={handleJobUpdated} />
              ))}
            </section>
          )}

          {accepted.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5 text-sky-400" />
                In progress ({accepted.length})
              </h2>
              {accepted.map((b) => (
                <JobCard key={b.id} booking={b} apiToken={session.apiToken} onUpdated={handleJobUpdated} />
              ))}
            </section>
          )}

          {pending.length === 0 && accepted.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No active jobs right now. New booking requests will appear here.
            </p>
          )}

          {history.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                History ({history.length})
              </h2>
              {history.slice(0, 10).map((b) => (
                <JobCard key={b.id} booking={b} apiToken={session.apiToken} onUpdated={handleJobUpdated} />
              ))}
            </section>
          )}
        </div>
      )}

      {/* Profile tab */}
      {tab === "profile" && (
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="font-heading text-base">Profile &amp; payout settings</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileEditor
              profile={profile}
              apiToken={session.apiToken}
              onSaved={handleProfileSaved}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
