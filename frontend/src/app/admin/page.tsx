"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  AlertTriangle,
  BadgeCheck,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock,
  Users,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminNav } from "@/components/admin-nav";
import { getAdminStats } from "@/lib/api";
import type { AdminStats, BookingStatus } from "@/lib/types";

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-NG", { dateStyle: "medium" });

const BOOKING_STATUS_CLS: Record<BookingStatus, string> = {
  PENDING: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  ACCEPTED: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  COMPLETED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  CANCELLED: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <Card className={`border-border/60 ${highlight ? "border-primary/40 bg-primary/5" : ""}`}>
      <CardContent className="flex flex-col gap-1 pt-5">
        <Icon className={`h-4 w-4 ${highlight ? "text-primary" : "text-muted-foreground"}`} />
        <span className="font-heading text-2xl font-bold">{value}</span>
        <span className="text-muted-foreground font-mono text-xs uppercase tracking-wide">{label}</span>
        {sub && <span className="text-muted-foreground text-xs">{sub}</span>}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || session.user.role !== "ADMIN") return;
    getAdminStats(session.apiToken)
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load stats"));
  }, [session]);

  if (sessionStatus === "loading") return null;

  if (!session || session.user.role !== "ADMIN") {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16 text-center">
        <p className="text-muted-foreground text-sm">Admin access required.</p>
      </main>
    );
  }

  return (
    <main className="industrial-texture mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <div className="mb-6 flex flex-col gap-1">
        <span className="text-muted-foreground font-mono text-label-sm uppercase tracking-[0.2em]">Admin workspace</span>
        <h1 className="font-heading text-headline-lg-mobile font-bold">Dashboard</h1>
      </div>

      <AdminNav />

      {error && <p className="text-destructive text-sm">{error}</p>}

      {!stats && !error && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-card/40 h-28 animate-pulse rounded-xl" />
          ))}
        </div>
      )}

      {stats && (
        <div className="flex flex-col gap-10">
          {/* Bookings */}
          <section>
            <h2 className="text-muted-foreground mb-4 font-mono text-xs uppercase tracking-widest">Bookings</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <StatCard icon={BookOpen} label="Total" value={stats.bookings.total} />
              <StatCard icon={Clock} label="Pending" value={stats.bookings.pending} />
              <StatCard icon={CalendarClock} label="Accepted" value={stats.bookings.accepted} />
              <StatCard icon={CheckCircle2} label="Completed" value={stats.bookings.completed} />
              <StatCard icon={XCircle} label="Cancelled" value={stats.bookings.cancelled} />
            </div>
          </section>

          {/* Providers & Users */}
          <section>
            <h2 className="text-muted-foreground mb-4 font-mono text-xs uppercase tracking-widest">Platform</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard icon={BadgeCheck} label="Verified providers" value={stats.providers.verified} highlight />
              <StatCard icon={Clock} label="Awaiting review" value={stats.providers.pending} />
              <StatCard icon={Users} label="Customers" value={stats.users.totalCustomers} />
              <StatCard
                icon={AlertTriangle}
                label="Open disputes"
                value={stats.disputes.open}
                sub={`${stats.disputes.resolvedRefund + stats.disputes.resolvedRelease} resolved`}
              />
            </div>
          </section>

          {/* Recent bookings */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-muted-foreground font-mono text-xs uppercase tracking-widest">Recent bookings</h2>
            </div>
            <Card className="border-border/60">
              <div className="divide-border/40 divide-y">
                {stats.recentBookings.length === 0 && (
                  <p className="text-muted-foreground px-4 py-6 text-center text-sm">No bookings yet.</p>
                )}
                {stats.recentBookings.map((b) => (
                  <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="font-semibold text-sm truncate">
                        {b.category.name}
                      </span>
                      <span className="text-muted-foreground font-mono text-xs">
                        {b.customer.fullName} → {b.provider.user.fullName}
                      </span>
                      <span className="text-muted-foreground font-mono text-xs">{fmt(b.bookingDate)}</span>
                    </div>
                    <span className={`border font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${BOOKING_STATUS_CLS[b.status]}`}>
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          {/* Quick links */}
          <section>
            <h2 className="text-muted-foreground mb-4 font-mono text-xs uppercase tracking-widest">Quick actions</h2>
            <div className="flex flex-wrap gap-3">
              {stats.providers.pending > 0 && (
                <Link
                  href="/admin/verification-queue"
                  className="border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 flex items-center gap-2 rounded-lg border px-4 py-2 font-mono text-sm transition-colors"
                >
                  <Clock className="h-4 w-4" />
                  Review {stats.providers.pending} pending provider{stats.providers.pending !== 1 ? "s" : ""}
                </Link>
              )}
              {stats.disputes.open > 0 && (
                <Link
                  href="/admin/disputes"
                  className="border-amber-500/40 bg-amber-500/5 text-amber-500 hover:bg-amber-500/10 flex items-center gap-2 rounded-lg border px-4 py-2 font-mono text-sm transition-colors"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Resolve {stats.disputes.open} open dispute{stats.disputes.open !== 1 ? "s" : ""}
                </Link>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
