import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma";
import {
  initializeTransaction,
  verifyTransaction,
  verifyWebhookSignature,
} from "../lib/paystack";
import { createNotification } from "../lib/notify";
import { AuthenticatedRequest } from "../middleware/auth";

const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";
const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT ?? "10");

// POST /api/v1/payments/initialize — Customer
// Creates a Paystack transaction for an ACCEPTED booking that has no PAID payment yet.
export async function initializePayment(req: AuthenticatedRequest, res: Response) {
  const customerId = req.user!.id;
  const { bookingId } = req.body;

  if (!bookingId) return res.status(400).json({ error: "bookingId is required" });

  const booking = await prisma.booking.findUnique({
    where: { id: String(bookingId) },
    include: {
      payment: true,
      provider: { include: { user: { select: { email: true, fullName: true } } } },
      category: { select: { name: true } },
      customer: { select: { email: true, fullName: true } },
    },
  });

  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (booking.customerId !== customerId) return res.status(403).json({ error: "Not your booking" });
  if (booking.status !== "ACCEPTED") {
    return res.status(400).json({ error: "Booking must be ACCEPTED before payment" });
  }
  if (booking.payment?.status === "PAID") {
    return res.status(409).json({ error: "This booking has already been paid for" });
  }

  const amountKobo = booking.provider.pricePerJobKobo;
  const reference = randomUUID();
  const callbackUrl = `${FRONTEND_URL}/payments/callback?reference=${reference}`;

  const txn = await initializeTransaction(
    booking.customer.email,
    amountKobo,
    reference,
    callbackUrl,
    { bookingId: booking.id, providerName: booking.provider.user.fullName },
  );

  // Upsert: if a PENDING payment already exists (e.g. user retried), replace it
  await prisma.payment.upsert({
    where: { bookingId: booking.id },
    create: { bookingId: booking.id, amountKobo, reference },
    update: { amountKobo, reference, status: "PENDING", paidAt: null },
  });

  res.json({ authorizationUrl: txn.authorization_url, reference });
}

// GET /api/v1/payments/verify?reference=xxx — called from the callback page
// Idempotent: safe to call multiple times for the same reference.
export async function verifyPayment(req: Request, res: Response) {
  const reference = String(req.query.reference ?? "");
  if (!reference) return res.status(400).json({ error: "reference query param is required" });

  const payment = await prisma.payment.findUnique({ where: { reference } });
  if (!payment) return res.status(404).json({ error: "Payment not found" });

  if (payment.status === "PAID") return res.json(payment);

  const txn = await verifyTransaction(reference);

  if (txn.status === "success") {
    const updated = await prisma.payment.update({
      where: { reference },
      data: { status: "PAID", paidAt: new Date(txn.paid_at) },
    });

    // Notify provider
    const booking = await prisma.booking.findUnique({
      where: { id: payment.bookingId },
      include: {
        customer: { select: { fullName: true } },
        provider: { select: { userId: true } },
        category: { select: { name: true } },
      },
    });
    if (booking) {
      const amountNaira = (payment.amountKobo / 100).toLocaleString("en-NG");
      await createNotification(
        booking.provider.userId,
        "Payment received",
        `${booking.customer.fullName} paid ₦${amountNaira} for your ${booking.category.name} booking.`,
      );
    }

    return res.json(updated);
  }

  if (txn.status === "failed") {
    const updated = await prisma.payment.update({
      where: { reference },
      data: { status: "FAILED" },
    });
    return res.json(updated);
  }

  res.json(payment);
}

// POST /api/v1/payments/webhook — Paystack webhook (no auth)
// Body arrives as Buffer (raw) — must be parsed here, not by express.json().
export async function handleWebhook(req: Request, res: Response) {
  const rawBody = (req.body as Buffer).toString("utf8");
  const signature = String(req.headers["x-paystack-signature"] ?? "");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return res.status(400).json({ error: "Invalid signature" });
  }

  // Always respond 200 quickly — Paystack retries on non-2xx
  res.sendStatus(200);

  let event: { event: string; data: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return;
  }

  if (event.event === "charge.success") {
    const reference = String(event.data.reference ?? "");
    const payment = await prisma.payment.findUnique({
      where: { reference },
      include: {
        booking: {
          include: {
            category: { select: { name: true } },
            provider: { select: { userId: true, user: { select: { fullName: true } } } },
          },
        },
      },
    });
    if (payment && payment.status !== "PAID") {
      await prisma.payment.update({
        where: { reference },
        data: { status: "PAID", paidAt: new Date() },
      });
      const { booking } = payment;
      const amountNaira = (payment.amountKobo / 100).toLocaleString("en-NG");
      await Promise.all([
        createNotification(
          booking.customerId,
          "Payment confirmed",
          `Your payment of ₦${amountNaira} for the ${booking.category.name} booking has been received.`,
        ),
        createNotification(
          booking.provider.userId,
          "Payment received",
          `${booking.category.name} booking payment of ₦${amountNaira} has been confirmed.`,
        ),
      ]);
    }
  }
}

// GET /api/v1/payments/booking/:bookingId — Customer or Provider
// Returns the payment record for a booking (so the UI can show status).
export async function getBookingPayment(req: AuthenticatedRequest, res: Response) {
  const bookingId = String(req.params.bookingId);
  const userId = req.user!.id;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      payment: true,
      provider: { select: { userId: true } },
    },
  });

  if (!booking) return res.status(404).json({ error: "Booking not found" });

  // Allow both the customer and the provider to see payment status
  const isCustomer = booking.customerId === userId;
  const isProvider = booking.provider.userId === userId;
  if (!isCustomer && !isProvider) return res.status(403).json({ error: "Forbidden" });

  if (!booking.payment) return res.status(404).json({ error: "No payment for this booking" });

  res.json(booking.payment);
}

export { PLATFORM_FEE_PERCENT };
