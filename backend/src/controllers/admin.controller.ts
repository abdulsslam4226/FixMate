import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { refundTransaction, initiateTransfer, createTransferRecipient } from "../lib/paystack";
import { createNotification } from "../lib/notify";
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
      resolvedRefund: (disputeMap["RESOLVED_REFUND"] ?? 0),
      resolvedRelease: (disputeMap["RESOLVED_RELEASE"] ?? 0),
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
export async function setVerificationStatus(req: Request, res: Response) {
  const id = String(req.params.id);
  const { verificationStatus } = req.body;

  if (!VERIFY_STATUSES.includes(verificationStatus)) {
    return res.status(400).json({ error: `verificationStatus must be one of ${VERIFY_STATUSES.join(", ")}` });
  }

  const profile = await prisma.providerProfile.update({
    where: { id },
    data: { verificationStatus },
    include: ADMIN_INCLUDE,
  });

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
// Resolves a dispute: REFUND triggers a Paystack refund to the customer;
// RELEASE initiates a transfer to the provider (minus platform fee).
export async function resolveDispute(req: AuthenticatedRequest, res: Response) {
  const id = String(req.params.id);
  const adminId = req.user!.id;
  const { outcome, resolution } = req.body;

  if (outcome !== "REFUND" && outcome !== "RELEASE") {
    return res.status(400).json({ error: "outcome must be REFUND or RELEASE" });
  }
  if (!resolution || typeof resolution !== "string" || !resolution.trim()) {
    return res.status(400).json({ error: "resolution note is required" });
  }

  const dispute = await prisma.dispute.findUnique({
    where: { id },
    include: {
      booking: {
        include: {
          payment: true,
          provider: { include: { user: { select: { fullName: true } } } },
          customer: { select: { id: true, fullName: true } },
          category: { select: { name: true } },
        },
      },
    },
  });

  if (!dispute) return res.status(404).json({ error: "Dispute not found" });
  if (dispute.status !== "OPEN") return res.status(409).json({ error: "Dispute is already resolved" });

  const newStatus = outcome === "REFUND" ? "RESOLVED_REFUND" : "RESOLVED_RELEASE";
  const payment = dispute.booking.payment;

  if (outcome === "REFUND" && payment?.status === "PAID") {
    try {
      await refundTransaction(payment.reference);
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED" } });
    } catch (err) {
      console.error("[paystack] Refund failed during dispute resolution", id, err);
    }
  }

  if (outcome === "RELEASE" && payment?.status === "PAID" && !payment.transferCode) {
    const provider = dispute.booking.provider;
    if (provider.bankCode && provider.accountNumber) {
      try {
        let recipientCode = provider.recipientCode;
        if (!recipientCode) {
          recipientCode = await createTransferRecipient(
            provider.user.fullName,
            provider.bankCode,
            provider.accountNumber,
          );
          if (recipientCode) {
            await prisma.providerProfile.update({ where: { id: provider.id }, data: { recipientCode } });
          }
        }
        if (recipientCode) {
          const amountKobo = Math.round(payment.amountKobo * (1 - PLATFORM_FEE_PERCENT / 100));
          const transferCode = await initiateTransfer(amountKobo, recipientCode, `FixMate dispute release — ${id}`);
          if (transferCode) {
            await prisma.payment.update({ where: { id: payment.id }, data: { transferCode } });
          }
        }
      } catch (err) {
        console.error("[paystack] Transfer failed during dispute resolution", id, err);
      }
    }
  }

  const resolved = await prisma.dispute.update({
    where: { id },
    data: { status: newStatus, resolution: resolution.trim(), resolvedById: adminId },
    include: DISPUTE_INCLUDE,
  });

  const { booking } = dispute;
  const categoryName = booking.category.name;
  await Promise.all([
    createNotification(
      booking.customerId,
      outcome === "REFUND" ? "Dispute resolved — refund issued" : "Dispute resolved",
      outcome === "REFUND"
        ? `Your dispute for the ${categoryName} booking has been resolved. A refund is on its way.`
        : `Your dispute for the ${categoryName} booking has been reviewed. Payment was released to the provider.`,
    ),
    createNotification(
      booking.provider.userId,
      outcome === "RELEASE" ? "Dispute resolved — payment released" : "Dispute resolved",
      outcome === "RELEASE"
        ? `A dispute on your ${categoryName} booking was resolved in your favour. Payment will be transferred shortly.`
        : `A dispute on your ${categoryName} booking has been resolved. The customer has been refunded.`,
    ),
  ]);

  res.json(resolved);
}
