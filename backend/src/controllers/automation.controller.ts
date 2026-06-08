import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

const SLA_WINDOW_HOURS = 2;

const EXPIRY_DISPLAY_INCLUDE = {
  customer: { select: { fullName: true, phoneNumber: true } },
  provider: { include: { user: { select: { fullName: true, phoneNumber: true } } } },
  category: { select: { name: true } },
} as const;

// POST /api/v1/automation/bookings/:id/expire — n8n callback (Module 3.2-C)
//
// n8n schedules this call for `createdAt + 2h` right after dispatching the
// "new job request" WhatsApp ping (see triggerBookingSLAWebhook). Express
// owns the state transition — it re-checks the deadline and current status so
// the cancellation only fires once and only if the artisan genuinely never
// responded, regardless of how n8n's timing drifts. The response carries
// both parties' names/numbers so the workflow's WhatsApp nodes can message
// them without a second lookup.
export async function expireStaleBooking(req: Request, res: Response) {
  const id = String(req.params.id);

  const booking = await prisma.booking.findUnique({ where: { id }, include: EXPIRY_DISPLAY_INCLUDE });
  if (!booking) {
    return res.status(404).json({ error: "Booking not found" });
  }

  if (booking.status !== "PENDING") {
    return res.json({ expired: false, reason: "already-actioned", booking });
  }

  const slaDeadline = new Date(booking.createdAt.getTime() + SLA_WINDOW_HOURS * 60 * 60 * 1000);
  if (new Date() < slaDeadline) {
    return res.json({ expired: false, reason: "not-yet-due", slaDeadline, booking });
  }

  const cancelled = await prisma.booking.update({
    where: { id },
    data: { status: "CANCELLED" },
    include: EXPIRY_DISPLAY_INCLUDE,
  });

  res.json({ expired: true, booking: cancelled });
}
