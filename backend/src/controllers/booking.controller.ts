import { Response } from "express";
import { prisma } from "../lib/prisma";
import { triggerBookingSLAWebhook } from "../lib/n8n";
import { createNotification } from "../lib/notify";
import { sendNewBookingEmail, sendBookingStatusEmail, sendProviderBookingCancelledEmail } from "../lib/email";
import { initiateTransfer, createTransferRecipient, refundTransaction } from "../lib/paystack";
import { AuthenticatedRequest } from "../middleware/auth";

const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT ?? "10");

const TRANSITIONABLE_STATUSES = ["ACCEPTED", "AWAITING_CONFIRMATION", "CANCELLED"] as const;

// Shared relation shape the frontend renders (customer/provider names +
// category) — kept in one place so list and status-update responses match.
const BOOKING_DISPLAY_INCLUDE = {
  customer: { select: { fullName: true } },
  provider: { select: { user: { select: { fullName: true } }, pricePerJobKobo: true } },
  category: { select: { name: true } },
  review: { select: { id: true, rating: true, comment: true, createdAt: true } },
  payment: { select: { id: true, amountKobo: true, reference: true, status: true, paidAt: true, createdAt: true } },
  dispute: { select: { id: true, status: true, reason: true, resolution: true, createdAt: true } },
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

  const requestedDate = new Date(bookingDate);
  if (isNaN(requestedDate.getTime()) || requestedDate <= new Date()) {
    return res.status(400).json({ error: "bookingDate must be a valid future date" });
  }

  // Check provider availability
  const [availability, blockouts] = await Promise.all([
    prisma.providerAvailability.findUnique({ where: { providerId } }),
    prisma.providerBlockout.findMany({
      where: {
        providerId,
        blockedDate: {
          gte: new Date(`${requestedDate.toISOString().slice(0, 10)}T00:00:00.000Z`),
          lte: new Date(`${requestedDate.toISOString().slice(0, 10)}T23:59:59.999Z`),
        },
      },
    }),
  ]);

  const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
  if (availability) {
    const dayKey = DAY_KEYS[requestedDate.getUTCDay()];
    if (!availability[dayKey]) {
      return res.status(400).json({ error: "The provider is not available on that day of the week" });
    }
  }

  if (blockouts.length > 0) {
    return res.status(400).json({ error: "The provider has marked that date as unavailable" });
  }

  const booking = await prisma.booking.create({
    data: {
      customerId,
      providerId,
      categoryId,
      bookingDate: requestedDate,
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

  // Notify the provider that a new job has arrived
  const [providerProfile, customer, category] = await Promise.all([
    prisma.providerProfile.findUnique({
      where: { id: providerId },
      select: { userId: true, user: { select: { fullName: true, email: true } } },
    }),
    prisma.user.findUnique({ where: { id: customerId }, select: { fullName: true, email: true } }),
    prisma.serviceCategory.findUnique({ where: { id: categoryId }, select: { name: true } }),
  ]);
  if (providerProfile) {
    const catName = category?.name ?? "service";
    const custName = customer?.fullName ?? "A customer";
    await createNotification(
      providerProfile.userId,
      "New booking request",
      `${custName} has requested your ${catName} on ${new Date(bookingDate).toLocaleDateString("en-NG", { dateStyle: "medium" })}.`,
    );
    await sendNewBookingEmail(
      { email: providerProfile.user.email, fullName: providerProfile.user.fullName },
      { fullName: custName },
      catName,
      new Date(bookingDate),
    );
  }

  res.status(201).json(booking);
}

// PATCH /api/v1/bookings/:id/status — Provider only
// Toggles dynamic tracking states (ACCEPTED/COMPLETED/CANCELLED) (Module 3.3)
export async function updateBookingStatus(req: AuthenticatedRequest, res: Response) {
  const id = String(req.params.id);
  const { status } = req.body;
  const { id: userId } = req.user!;

  if (!TRANSITIONABLE_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${TRANSITIONABLE_STATUSES.join(", ")}` });
  }

  const existing = await prisma.booking.findUnique({
    where: { id },
    include: { provider: { select: { userId: true } } },
  });

  if (!existing) return res.status(404).json({ error: "Booking not found" });
  if (existing.provider.userId !== userId) return res.status(403).json({ error: "Not your booking" });

  const booking = await prisma.booking.update({
    where: { id },
    data: { status },
    include: BOOKING_DISPLAY_INCLUDE,
  });

  // Provider payout on completion (cash model: never triggers since payment.status is never PAID)
  if (status === "COMPLETED" && booking.payment?.status === "PAID") {
    const providerProfile = await prisma.providerProfile.findUnique({
      where: { id: booking.providerId },
      include: { user: { select: { fullName: true } } },
    });
    if (providerProfile?.bankCode && providerProfile.accountNumber) {
      try {
        let recipientCode = providerProfile.recipientCode;
        if (!recipientCode) {
          recipientCode = await createTransferRecipient(
            providerProfile.user.fullName,
            providerProfile.bankCode,
            providerProfile.accountNumber,
          );
          if (recipientCode) {
            await prisma.providerProfile.update({
              where: { id: providerProfile.id },
              data: { recipientCode },
            });
          }
        }
        if (recipientCode) {
          const providerAmountKobo = Math.round(
            booking.payment.amountKobo * (1 - PLATFORM_FEE_PERCENT / 100),
          );
          const transferCode = await initiateTransfer(
            providerAmountKobo,
            recipientCode,
            `FixMate payout — booking ${booking.id}`,
          );
          if (transferCode) {
            await prisma.payment.update({
              where: { bookingId: booking.id },
              data: { transferCode },
            });
          }
        }
      } catch (err) {
        console.error("[paystack] Payout failed for booking", booking.id, err);
      }
    }
  }

  // Refund on cancellation if the booking was paid
  if (status === "CANCELLED" && booking.payment?.status === "PAID") {
    try {
      await refundTransaction(booking.payment.reference);
      await prisma.payment.update({
        where: { bookingId: booking.id },
        data: { status: "REFUNDED" },
      });
    } catch (err) {
      console.error("[paystack] Refund failed for booking", booking.id, err);
    }
  }

  // Notify the customer whenever their booking status changes
  const providerName = booking.provider.user.fullName;
  const categoryName = booking.category.name;
  const CUSTOMER_MESSAGES: Partial<Record<typeof status, { title: string; message: string }>> = {
    ACCEPTED: {
      title: "Booking accepted!",
      message: `${providerName} accepted your ${categoryName} booking. They're on the way!`,
    },
    AWAITING_CONFIRMATION: {
      title: "Artisan marked job as done",
      message: `${providerName} says the ${categoryName} job is complete. Please confirm in your bookings.`,
    },
    CANCELLED: {
      title: "Booking cancelled",
      message: `Your ${categoryName} booking has been cancelled.`,
    },
  };
  const notif = CUSTOMER_MESSAGES[status];
  if (notif) {
    await createNotification(booking.customerId, notif.title, notif.message);
    const customerUser = await prisma.user.findUnique({
      where: { id: booking.customerId },
      select: { email: true, fullName: true },
    });
    if (customerUser && (status === "ACCEPTED" || status === "CANCELLED")) {
      await sendBookingStatusEmail(
        customerUser,
        { fullName: providerName },
        categoryName,
        status,
      );
    }
  }

  res.json(booking);
}

// POST /api/v1/bookings/:id/confirm-complete — Customer only
// Customer confirms the job is done after the provider marks AWAITING_CONFIRMATION.
// This sets status to COMPLETED and unlocks the review form.
export async function confirmCompletion(req: AuthenticatedRequest, res: Response) {
  const bookingId = String(req.params.id);
  const customerId = req.user!.id;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: BOOKING_DISPLAY_INCLUDE,
  });

  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (booking.customerId !== customerId) return res.status(403).json({ error: "Not your booking" });
  if (booking.status !== "AWAITING_CONFIRMATION") {
    return res.status(400).json({ error: "Booking is not awaiting confirmation" });
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "COMPLETED" },
    include: BOOKING_DISPLAY_INCLUDE,
  });

  const categoryName = updated.category.name;
  const providerName = updated.provider.user.fullName;

  const [providerProfile, customerUser] = await Promise.all([
    prisma.providerProfile.findUnique({ where: { id: booking.providerId }, select: { userId: true } }),
    prisma.user.findUnique({ where: { id: customerId }, select: { email: true, fullName: true } }),
  ]);

  await Promise.all([
    providerProfile
      ? createNotification(
          providerProfile.userId,
          "Job confirmed complete!",
          `Great work! The customer confirmed your ${categoryName} job is done.`,
        )
      : Promise.resolve(),
    customerUser
      ? sendBookingStatusEmail(customerUser, { fullName: providerName }, categoryName, "COMPLETED")
      : Promise.resolve(),
  ]);

  res.json(updated);
}

// POST /api/v1/bookings/:id/review — Customer only
// Submits a 1–5 star rating + comment for a COMPLETED booking. One review per
// booking is enforced by the schema's @unique(bookingId) constraint.
export async function submitReview(req: AuthenticatedRequest, res: Response) {
  const bookingId = String(req.params.id);
  const customerId = req.user!.id;
  const { rating, comment } = req.body;

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "rating must be an integer between 1 and 5" });
  }
  if (!comment || typeof comment !== "string" || !comment.trim()) {
    return res.status(400).json({ error: "comment is required" });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { review: true },
  });

  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (booking.customerId !== customerId) return res.status(403).json({ error: "Only the customer who made this booking can review it" });
  if (booking.status !== "COMPLETED") return res.status(400).json({ error: "You can only review a completed booking" });
  if (booking.review) return res.status(409).json({ error: "This booking has already been reviewed" });

  const [review, customer, providerProfile] = await Promise.all([
    prisma.review.create({
      data: { bookingId, customerId, providerId: booking.providerId, rating, comment: comment.trim() },
    }),
    prisma.user.findUnique({ where: { id: customerId }, select: { fullName: true } }),
    prisma.providerProfile.findUnique({ where: { id: booking.providerId }, select: { userId: true } }),
  ]);

  if (providerProfile) {
    const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
    await createNotification(
      providerProfile.userId,
      "New review received",
      `${customer?.fullName ?? "A customer"} left you a ${rating}-star review ${stars}.`,
    );
  }

  res.status(201).json(review);
}

// POST /api/v1/bookings/:id/cancel — Customer only
// Lets the customer cancel a booking they created, as long as it hasn't been
// completed yet. Triggers a Paystack refund if the booking was already paid.
export async function cancelBooking(req: AuthenticatedRequest, res: Response) {
  const bookingId = String(req.params.id);
  const customerId = req.user!.id;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payment: true, provider: { include: { user: { select: { fullName: true } } } }, category: { select: { name: true } } },
  });

  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (booking.customerId !== customerId) return res.status(403).json({ error: "Not your booking" });
  if (booking.status === "COMPLETED") return res.status(400).json({ error: "Cannot cancel a completed booking — raise a dispute instead" });
  if (booking.status === "CANCELLED") return res.status(400).json({ error: "Booking is already cancelled" });

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" },
    include: BOOKING_DISPLAY_INCLUDE,
  });

  // Refund if paid
  if (booking.payment?.status === "PAID") {
    try {
      await refundTransaction(booking.payment.reference);
      await prisma.payment.update({ where: { bookingId }, data: { status: "REFUNDED" } });
    } catch (err) {
      console.error("[paystack] Refund failed for customer cancel", bookingId, err);
    }
  }

  // Notify provider
  const providerProfile = await prisma.providerProfile.findUnique({
    where: { id: booking.providerId },
    select: { userId: true, user: { select: { email: true, fullName: true } } },
  });
  if (providerProfile) {
    await createNotification(
      providerProfile.userId,
      "Booking cancelled",
      `${booking.category.name} booking from a customer has been cancelled.`,
    );
    await sendProviderBookingCancelledEmail(
      { email: providerProfile.user.email, fullName: providerProfile.user.fullName },
      booking.category.name,
    );
  }

  res.json(updated);
}

// POST /api/v1/bookings/:id/dispute — Customer only
// Raises a dispute on a COMPLETED booking. One dispute per booking.
// Admin reviews via GET /admin/disputes and resolves via PATCH /admin/disputes/:id/resolve.
export async function raiseDispute(req: AuthenticatedRequest, res: Response) {
  const bookingId = String(req.params.id);
  const customerId = req.user!.id;
  const { reason } = req.body;

  if (!reason || typeof reason !== "string" || !reason.trim()) {
    return res.status(400).json({ error: "reason is required" });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { dispute: true },
  });

  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (booking.customerId !== customerId) return res.status(403).json({ error: "Not your booking" });
  if (booking.status !== "COMPLETED") return res.status(400).json({ error: "Disputes can only be raised on completed bookings" });
  if (booking.dispute) return res.status(409).json({ error: "A dispute has already been raised for this booking" });

  const dispute = await prisma.dispute.create({
    data: { bookingId, raisedById: customerId, reason: reason.trim() },
  });

  // Notify admins via the first admin user (simple MVP approach)
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (admin) {
    await createNotification(
      admin.id,
      "New dispute raised",
      `A customer raised a dispute on booking ${bookingId.slice(0, 8)}… — please review in the admin panel.`,
    );
  }

  res.status(201).json(dispute);
}
