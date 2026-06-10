"use client";

import { useState } from "react";
import { CalendarClock, CheckCircle2, Star, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cancelBooking, initializePayment, raiseDispute, submitReview, updateBookingStatus } from "@/lib/api";
import type { Booking, BookingDispute, BookingReview, BookingStatus, Payment } from "@/lib/types";
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

const PAYMENT_LABEL: Record<string, string> = {
  PENDING: "Awaiting payment",
  PAID: "Paid",
  REFUNDED: "Refunded",
  FAILED: "Payment failed",
};

const PAYMENT_CLASS: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  PAID: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  REFUNDED: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  FAILED: "bg-destructive/15 text-destructive border-destructive/30",
};

function PaymentBadge({ payment }: { payment: Payment }) {
  return (
    <span className={`border font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${PAYMENT_CLASS[payment.status] ?? ""}`}>
      {PAYMENT_LABEL[payment.status] ?? payment.status}
      {payment.status === "PAID" && ` · ₦${(payment.amountKobo / 100).toLocaleString("en-NG")}`}
    </span>
  );
}

// Inline form for raising a dispute on a COMPLETED booking.
function DisputeForm({
  bookingId,
  apiToken,
  onSubmitted,
}: {
  bookingId: string;
  apiToken: string;
  onSubmitted: (dispute: BookingDispute) => void;
}) {
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    try {
      const dispute = await raiseDispute(bookingId, reason, apiToken);
      onSubmitted(dispute);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not raise dispute.");
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-border/40 flex flex-col gap-3 rounded-lg border border-dashed p-4">
      <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
        Raise a dispute
      </p>
      <p className="text-muted-foreground text-xs">
        Describe what went wrong. Our admin team will review and resolve within 48 hours.
      </p>
      <Textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g. The artisan did not complete the work as agreed, and the pipe is still leaking."
        rows={3}
        required
      />
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button
        type="submit"
        size="sm"
        variant="outline"
        disabled={status === "loading"}
        className="w-fit border-destructive/50 text-destructive hover:bg-destructive/10"
      >
        {status === "loading" ? "Submitting…" : "Submit dispute"}
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
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
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

  async function handlePay(bookingId: string) {
    setPayingId(bookingId);
    try {
      const { authorizationUrl } = await initializePayment(bookingId, session.apiToken);
      window.location.href = authorizationUrl;
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not start payment. Please try again.");
      setPayingId(null);
    }
  }

  async function handleCancel(bookingId: string) {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    setCancellingId(bookingId);
    try {
      const updated = await cancelBooking(bookingId, session.apiToken);
      setItems((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not cancel booking.");
    } finally {
      setCancellingId(null);
    }
  }

  function handleDisputeSubmitted(bookingId: string, dispute: BookingDispute) {
    setItems((prev) => prev.map((b) => (b.id === bookingId ? { ...b, dispute } : b)));
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
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={STATUS_VARIANT[booking.status] as "default" | "secondary" | "outline" | "destructive"}
                className={booking.status === "COMPLETED" ? "gradient-violet border-0 text-primary-foreground" : undefined}
              >
                {booking.status}
              </Badge>
              {booking.payment && <PaymentBadge payment={booking.payment} />}
            </div>
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

            {/* Customer: SLA hint + cancel */}
            {!isProvider && booking.status === "PENDING" && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-muted-foreground font-mono text-xs">
                  Waiting on the artisan to accept — they have a 2-hour window before we step in.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={cancellingId === booking.id}
                  onClick={() => handleCancel(booking.id)}
                  className="border-destructive/50 text-destructive hover:bg-destructive/10"
                >
                  <XCircle className="h-4 w-4" />
                  {cancellingId === booking.id ? "Cancelling…" : "Cancel booking"}
                </Button>
              </div>
            )}

            {/* Customer: cancel on ACCEPTED */}
            {!isProvider && booking.status === "ACCEPTED" && (
              <Button
                size="sm"
                variant="outline"
                disabled={cancellingId === booking.id}
                onClick={() => handleCancel(booking.id)}
                className="w-fit border-destructive/50 text-destructive hover:bg-destructive/10"
              >
                <XCircle className="h-4 w-4" />
                {cancellingId === booking.id ? "Cancelling…" : "Cancel booking"}
              </Button>
            )}

            {/* Customer: Pay Now */}
            {!isProvider && booking.status === "ACCEPTED" && booking.payment?.status !== "PAID" && (
              <div className="border-border/40 flex flex-col gap-2 rounded-lg border border-dashed p-4">
                <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                  Payment required
                </p>
                <p className="text-sm">
                  Secure your booking by paying{" "}
                  <span className="font-semibold">
                    ₦{(booking.provider.pricePerJobKobo / 100).toLocaleString("en-NG")}
                  </span>{" "}
                  to {booking.provider.user.fullName}. Funds are held securely and released when the
                  job is completed.
                </p>
                <Button
                  size="sm"
                  disabled={payingId === booking.id}
                  onClick={() => handlePay(booking.id)}
                  className="gradient-violet w-fit border-0 text-primary-foreground"
                >
                  {payingId === booking.id ? "Redirecting…" : `Pay ₦${(booking.provider.pricePerJobKobo / 100).toLocaleString("en-NG")}`}
                </Button>
              </div>
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
            {!isProvider && booking.status === "COMPLETED" && !booking.review && !booking.dispute && (
              <ReviewForm
                bookingId={booking.id}
                providerName={booking.provider.user.fullName}
                apiToken={session.apiToken}
                onSubmitted={(review) => handleReviewSubmitted(booking.id, review)}
              />
            )}

            {/* Customer: open dispute (only if no review and no existing dispute) */}
            {!isProvider && booking.status === "COMPLETED" && !booking.dispute && !booking.review && (
              <DisputeForm
                bookingId={booking.id}
                apiToken={session.apiToken}
                onSubmitted={(dispute) => handleDisputeSubmitted(booking.id, dispute)}
              />
            )}

            {/* Customer: existing dispute status */}
            {!isProvider && booking.dispute && (
              <div className={`border rounded-lg p-3 flex flex-col gap-1 ${
                booking.dispute.status === "OPEN"
                  ? "border-amber-500/30 bg-amber-500/5"
                  : booking.dispute.status === "RESOLVED_REFUND"
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-sky-500/30 bg-sky-500/5"
              }`}>
                <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                  {booking.dispute.status === "OPEN" ? "Dispute under review" : "Dispute resolved"}
                </p>
                <p className="text-sm">{booking.dispute.reason}</p>
                {booking.dispute.resolution && (
                  <p className="text-muted-foreground text-xs">Admin: {booking.dispute.resolution}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
