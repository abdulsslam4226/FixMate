import { Response } from "express";
import { prisma } from "../lib/prisma";
import { triggerBookingSLAWebhook } from "../lib/n8n";
import { AuthenticatedRequest } from "../middleware/auth";

const TRANSITIONABLE_STATUSES = ["ACCEPTED", "COMPLETED", "CANCELLED"] as const;

// Shared relation shape the frontend renders (customer/provider names +
// category) — kept in one place so list and status-update responses match.
const BOOKING_DISPLAY_INCLUDE = {
  customer: { select: { fullName: true } },
  provider: { include: { user: { select: { fullName: true } } } },
  category: { select: { name: true } },
} as const;

// GET /api/v1/bookings/mine — Private
// Lists the authenticated user's bookings — customers see jobs they requested,
// providers see jobs assigned to them. Fills the gap left by the Module 3.3
// routing map so the booking loop (request → track → action) is browsable.
export async function getMyBookings(req: AuthenticatedRequest, res: Response) {
  const { id, role } = req.user!;
  const include = BOOKING_DISPLAY_INCLUDE;

  if (role === "PROVIDER") {
    const profile = await prisma.providerProfile.findUnique({ where: { userId: id } });
    if (!profile) {
      return res.json([]);
    }
    const bookings = await prisma.booking.findMany({
      where: { providerId: profile.id },
      include,
      orderBy: { bookingDate: "desc" },
    });
    return res.json(bookings);
  }

  const bookings = await prisma.booking.findMany({
    where: { customerId: id },
    include,
    orderBy: { bookingDate: "desc" },
  });
  res.json(bookings);
}

// POST /api/v1/bookings — Customer
// Creates booking and triggers the external n8n webhook (Module 3.3 / 3.2-C)
export async function createBooking(req: AuthenticatedRequest, res: Response) {
  const customerId = req.user!.id;
  const { providerId, categoryId, bookingDate, notes } = req.body;

  if (!providerId || !categoryId || !bookingDate || !notes) {
    return res.status(400).json({ error: "providerId, categoryId, bookingDate and notes are required" });
  }

  const booking = await prisma.booking.create({
    data: {
      customerId,
      providerId,
      categoryId,
      bookingDate: new Date(bookingDate),
      notes,
    },
  });

  // Module 3.2-C: fires the 2-hour SLA workflow — n8n pings the artisan on
  // WhatsApp and auto-cancels (setting status to CANCELLED) if it goes unaccepted.
  await triggerBookingSLAWebhook({
    id: booking.id,
    providerId: booking.providerId,
    customerId: booking.customerId,
    bookingDate: booking.bookingDate,
  });

  res.status(201).json(booking);
}

// PATCH /api/v1/bookings/:id/status — Private
// Toggles dynamic tracking states (ACCEPTED/COMPLETED/CANCELLED) (Module 3.3)
export async function updateBookingStatus(req: AuthenticatedRequest, res: Response) {
  const id = String(req.params.id);
  const { status } = req.body;

  if (!TRANSITIONABLE_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${TRANSITIONABLE_STATUSES.join(", ")}` });
  }

  const booking = await prisma.booking.update({
    where: { id },
    data: { status },
    include: BOOKING_DISPLAY_INCLUDE,
  });

  res.json(booking);
}
