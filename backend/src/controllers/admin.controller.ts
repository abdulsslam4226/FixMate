import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { createNotification } from "../lib/notify";
import { sendVerificationDecisionEmail } from "../lib/email";
import { AuthenticatedRequest } from "../middleware/auth";

const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT ?? "10");

const VERIFY_STATUSES = ["PENDING", "VERIFIED", "REJECTED"] as const;

// Full include used for both the queue listing and per-item fetches, so the
// admin UI has everything it needs to make a trust decision in one request.
const ADMIN_INCLUDE = {
  user: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phoneNumber: true,
      createdAt: true,
    },
  },
  category: true,
} as const;

// GET /api/v1/admin/stats — Admin
// Aggregated platform overview: bookings, revenue, providers, disputes.
export async function getAdminStats(_req: Request, res: Response) {
  const [
    bookingCounts,
    paymentAggs,
    providerCounts,
    customerCount,
    disputeCounts,
    recentBookings,
  ] = await Promise.all([
    prisma.booking.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.payment.groupBy({ by: ["status"], _sum: { amountKobo: true } }),
    prisma.providerProfile.groupBy({ by: ["verificationStatus"], _count: { id: true } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.dispute.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.booking.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { name: true } },
        customer: { select: { fullName: true } },
        provider: { include: { user: { select: { fullName: true } } } },
        payment: { select: { amountKobo: true, status: true } },
      },
    }),
  ]);

  const bookingMap = Object.fromEntries(bookingCounts.map((r) => [r.status, r._count.id]));
  const paymentMap = Object.fromEntries(paymentAggs.map((r) => [r.status, r._sum.amountKobo ?? 0]));
  const providerMap = Object.fromEntries(providerCounts.map((r) => [r.verificationStatus, r._count.id]));
  const disputeMap = Object.fromEntries(disputeCounts.map((r) => [r.status, r._count.id]));

  const totalCollectedKobo = paymentMap["PAID"] ?? 0;
  const platformCommissionKobo = Math.round(totalCollectedKobo * (PLATFORM_FEE_PERCENT / 100));

  res.json({
    bookings: {
      total: Object.values(bookingMap).reduce((a, b) => a + b, 0),
      pending: bookingMap["PENDING"] ?? 0,
      accepted: bookingMap["ACCEPTED"] ?? 0,
      completed: bookingMap["COMPLETED"] ?? 0,
      cancelled: bookingMap["CANCELLED"] ?? 0,
    },
    revenue: {
      totalCollectedKobo,
      platformCommissionKobo,
      refundedKobo: paymentMap["REFUNDED"] ?? 0,
    },
    providers: {
      total: Object.values(providerMap).reduce((a, b) => a + b, 0),
      verified: providerMap["VERIFIED"] ?? 0,
      pending: providerMap["PENDING"] ?? 0,
      rejected: providerMap["REJECTED"] ?? 0,
    },
    users: {
      totalCustomers: customerCount,
    },
    disputes: {
      open: disputeMap["OPEN"] ?? 0,
      resolved: disputeMap["RESOLVED"] ?? 0,
    },
    recentBookings,
  });
}

// GET /api/v1/admin/verification-queue — Admin
// Returns all PENDING profiles with full trust-engine fields (NIN, selfie URL,
// guarantor) so the admin can make an informed verification decision (Module 3.2-A).
export async function getVerificationQueue(_req: Request, res: Response) {
  const queue = await prisma.providerProfile.findMany({
    where: { verificationStatus: "PENDING" },
    include: ADMIN_INCLUDE,
    orderBy: { createdAt: "asc" },
  });

  res.json(queue);
}

// GET /api/v1/admin/providers/:id — Admin
// Returns a single provider profile in full detail for focused review.
export async function getProviderDetail(req: Request, res: Response) {
  const id = String(req.params.id);

  const profile = await prisma.providerProfile.findUnique({
    where: { id },
    include: ADMIN_INCLUDE,
  });

  if (!profile) return res.status(404).json({ error: "Provider not found" });
  res.json(profile);
}

// PATCH /api/v1/admin/providers/:id/verify — Admin
// Sets verificationStatus (PENDING / VERIFIED / REJECTED) (Module 3.2-A).
// Notifies the provider by in-app notification and email on every decision.
export async function setVerificationStatus(req: Request, res: Response) {
  const id = String(req.params.id);
  const { verificationStatus, rejectionReason } = req.body;

  if (!VERIFY_STATUSES.includes(verificationStatus)) {
    return res.status(400).json({ error: `verificationStatus must be one of ${VERIFY_STATUSES.join(", ")}` });
  }

  const profile = await prisma.providerProfile.update({
    where: { id },
    data: {
      verificationStatus,
      // Clear the reason on approval; store it on rejection
      rejectionReason: verificationStatus === "REJECTED"
        ? (typeof rejectionReason === "string" && rejectionReason.trim() ? rejectionReason.trim() : null)
        : null,
    },
    include: ADMIN_INCLUDE,
  });

  if (verificationStatus === "VERIFIED" || verificationStatus === "REJECTED") {
    const { id: userId, fullName, email } = profile.user;
    const notifTitle = verificationStatus === "VERIFIED"
      ? "You're verified on FixMate!"
      : "Verification update";
    const notifBody = verificationStatus === "VERIFIED"
      ? "Your profile is now live. You'll start receiving booking requests from customers near you."
      : "We couldn't verify your profile at this time. Contact support if you'd like to resubmit.";

    await Promise.all([
      createNotification(userId, notifTitle, notifBody),
      sendVerificationDecisionEmail({ email, fullName }, verificationStatus, profile.rejectionReason ?? undefined),
    ]);
  }

  res.json(profile);
}

const DISPUTE_INCLUDE = {
  booking: {
    include: {
      customer: { select: { fullName: true, email: true, phoneNumber: true } },
      provider: {
        include: {
          user: { select: { fullName: true, email: true } },
        },
      },
      category: { select: { name: true } },
      payment: { select: { id: true, amountKobo: true, reference: true, status: true } },
    },
  },
  raisedBy: { select: { fullName: true, email: true } },
  resolvedBy: { select: { fullName: true } },
} as const;

// GET /api/v1/admin/disputes — Admin
// Returns all disputes ordered by status (OPEN first) then createdAt desc.
export async function listDisputes(_req: Request, res: Response) {
  const disputes = await prisma.dispute.findMany({
    include: DISPUTE_INCLUDE,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  res.json(disputes);
}

// PATCH /api/v1/admin/disputes/:id/resolve — Admin
// Marks a dispute as resolved with an admin note. FixMate is a cash-on-delivery
// platform — no refunds or transfers are processed through the app.
export async function resolveDispute(req: AuthenticatedRequest, res: Response) {
  const id = String(req.params.id);
  const adminId = req.user!.id;
  const { resolution } = req.body;

  if (!resolution || typeof resolution !== "string" || !resolution.trim()) {
    return res.status(400).json({ error: "resolution note is required" });
  }

  const dispute = await prisma.dispute.findUnique({
    where: { id },
    include: {
      booking: {
        include: {
          provider: { select: { userId: true } },
          customer: { select: { id: true } },
          category: { select: { name: true } },
        },
      },
    },
  });

  if (!dispute) return res.status(404).json({ error: "Dispute not found" });
  if (dispute.status !== "OPEN") return res.status(409).json({ error: "Dispute is already resolved" });

  const resolved = await prisma.dispute.update({
    where: { id },
    data: { status: "RESOLVED", resolution: resolution.trim(), resolvedById: adminId },
    include: DISPUTE_INCLUDE,
  });

  const categoryName = dispute.booking.category.name;
  await Promise.all([
    createNotification(
      dispute.booking.customerId,
      "Dispute resolved",
      `Your dispute for the ${categoryName} booking has been reviewed and resolved by our team.`,
    ),
    createNotification(
      dispute.booking.provider.userId,
      "Dispute resolved",
      `A dispute on your ${categoryName} booking has been reviewed and resolved by our team.`,
    ),
  ]);

  res.json(resolved);
}
