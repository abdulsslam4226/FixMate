"use client";

import { useState } from "react";
import { CalendarClock, CheckCircle2, Star, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { submitReview, updateBookingStatus } from "@/lib/api";
import type { Booking, BookingReview, BookingStatus } from "@/lib/types";
import type { Session } from "next-auth";

const STATUS_VARIANT: Record<BookingStatus, string> = {
  PENDING: "outline",
  ACCEPTED: "secondary",
  COMPLETED: "default",
  CANCELLED: "destructive",
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });

// Interactive star row — controlled by hoveredRating for preview, selected for committed value.
function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <span className="flex gap-1" onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          className="focus:outline-none"
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        >
          <Star
            className={`h-6 w-6 transition-colors ${
              n <= (hovered || value)
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </span>
  );
}

// Read-only star display (for submitted reviews).
function StarRow({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-4 w-4 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </span>
  );
}

// Inline review form shown on COMPLETED bookings that don't yet have a review.
function ReviewForm({
  bookingId,
  providerName,
  apiToken,
  onSubmitted,
}: {
  bookingId: string;
  providerName: string;
  apiToken: string;
  onSubmitted: (review: BookingReview) => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) { setError("Please select a star rating."); return; }
    setStatus("loading");
    setError(null);
    try {
      const review = await submitReview(bookingId, { rating, comment }, apiToken);
      onSubmitted(review);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't submit your review.");
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-border/40 flex flex-col gap-3 rounded-lg border border-dashed p-4">
      <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
        Rate your experience with {providerName}
      </p>
      <StarPicker value={rating} onChange={setRating} />
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="How did the job go? Would you recommend this artisan?"
        rows={3}
        required
      />
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button
        type="submit"
        size="sm"
        disabled={status === "loading"}
        className="gradient-violet w-fit border-0 text-primary-foreground"
      >
        {status === "loading" ? "Submitting…" : "Submit review"}
      </Button>
    </form>
  );
}

// Renders the authenticated user's bookings.
// Providers: accept / complete / cancel actions.
// Customers: read-only status trail + inline review form on COMPLETED bookings.
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

  function handleReviewSubmitted(bookingId: string, review: BookingReview) {
    setItems((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, review } : b)),
    );
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
                {isProvider
                  ? `Customer: ${booking.customer.fullName}`
                  : `Artisan: ${booking.provider.user.fullName}`}
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

            {/* Provider actions */}
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

            {/* Customer: SLA hint */}
            {!isProvider && booking.status === "PENDING" && (
              <p className="text-muted-foreground font-mono text-xs">
                Waiting on the artisan to accept — they have a 2-hour window before we step in.
              </p>
            )}

            {/* Customer: submitted review (read-only) */}
            {!isProvider && booking.status === "COMPLETED" && booking.review && (
              <div className="border-border/40 flex flex-col gap-2 rounded-lg border border-dashed p-4">
                <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Your review</p>
                <StarRow rating={booking.review.rating} />
                <p className="text-muted-foreground text-sm">{booking.review.comment}</p>
              </div>
            )}

            {/* Customer: leave a review */}
            {!isProvider && booking.status === "COMPLETED" && !booking.review && (
              <ReviewForm
                bookingId={booking.id}
                providerName={booking.provider.user.fullName}
                apiToken={session.apiToken}
                onSubmitted={(review) => handleReviewSubmitted(booking.id, review)}
              />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
