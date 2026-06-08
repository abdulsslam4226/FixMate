"use client";

import { useState } from "react";
import { CalendarClock, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateBookingStatus } from "@/lib/api";
import type { Booking, BookingStatus } from "@/lib/types";
import type { Session } from "next-auth";

const STATUS_VARIANT: Record<BookingStatus, string> = {
  PENDING: "outline",
  ACCEPTED: "secondary",
  COMPLETED: "default",
  CANCELLED: "destructive",
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });

// Renders the authenticated user's bookings — providers get accept/complete/
// cancel actions (PATCH /bookings/:id/status, Module 3.3); customers get a
// read-only status trail driven by the same n8n SLA engine (Module 3.2-C).
export function BookingList({ bookings, session }: { bookings: Booking[]; session: Session }) {
  const [items, setItems] = useState(bookings);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const isProvider = session.user.role === "PROVIDER";

  async function handleStatusChange(id: string, status: BookingStatus) {
    setPendingId(id);
    try {
      const updated = await updateBookingStatus(id, status, session.apiToken);
      setItems((prev) => prev.map((b) => (b.id === id ? updated : b)));
    } finally {
      setPendingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        {isProvider
          ? "No booking requests yet — they'll show up here as soon as a customer reaches out."
          : "You haven't requested a booking yet. Browse a service category to find a verified artisan."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((booking) => (
        <Card key={booking.id} className="border-border/60">
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <CardTitle className="font-heading text-base">{booking.category.name}</CardTitle>
              <span className="text-muted-foreground flex items-center gap-1 font-mono text-xs">
                <CalendarClock className="h-3.5 w-3.5" />
                {formatDate(booking.bookingDate)}
              </span>
              <span className="text-muted-foreground text-xs">
                {isProvider ? `Customer: ${booking.customer.fullName}` : `Artisan: ${booking.provider.user.fullName}`}
              </span>
            </div>
            <Badge
              variant={STATUS_VARIANT[booking.status] as "default" | "secondary" | "outline" | "destructive"}
              className={booking.status === "COMPLETED" ? "gradient-violet border-0 text-primary-foreground" : undefined}
            >
              {booking.status}
            </Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-muted-foreground text-sm">{booking.notes}</p>

            {isProvider && booking.status === "PENDING" && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={pendingId === booking.id}
                  onClick={() => handleStatusChange(booking.id, "ACCEPTED")}
                  className="gradient-violet border-0 text-primary-foreground"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pendingId === booking.id}
                  onClick={() => handleStatusChange(booking.id, "CANCELLED")}
                >
                  <XCircle className="h-4 w-4" />
                  Decline
                </Button>
              </div>
            )}

            {isProvider && booking.status === "ACCEPTED" && (
              <Button
                size="sm"
                disabled={pendingId === booking.id}
                onClick={() => handleStatusChange(booking.id, "COMPLETED")}
                className="gradient-violet w-fit border-0 text-primary-foreground"
              >
                <CheckCircle2 className="h-4 w-4" />
                Mark as completed
              </Button>
            )}

            {!isProvider && booking.status === "PENDING" && (
              <p className="text-muted-foreground font-mono text-xs">
                Waiting on the artisan to accept — they have a 2-hour window before we step in.
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
