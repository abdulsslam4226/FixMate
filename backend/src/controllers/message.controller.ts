import { Response } from "express";
import { prisma } from "../lib/prisma";
import { createNotification } from "../lib/notify";
import { AuthenticatedRequest } from "../middleware/auth";

const MESSAGE_SENDER_SELECT = {
  id: true,
  fullName: true,
  role: true,
} as const;

async function verifyParty(bookingId: string, userId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { provider: { select: { userId: true } }, category: { select: { name: true } } },
  });
  if (!booking) return null;
  const isCustomer = booking.customerId === userId;
  const isProvider = booking.provider.userId === userId;
  if (!isCustomer && !isProvider) return null;
  return { booking, isCustomer };
}

// GET /api/v1/bookings/:id/messages
export async function getMessages(req: AuthenticatedRequest, res: Response) {
  const bookingId = String(req.params.id);
  const result = await verifyParty(bookingId, req.user!.id);
  if (!result) return res.status(404).json({ error: "Booking not found or not yours" });

  const messages = await prisma.message.findMany({
    where: { bookingId },
    include: { sender: { select: MESSAGE_SENDER_SELECT } },
    orderBy: { createdAt: "asc" },
  });

  res.json(messages);
}

// POST /api/v1/bookings/:id/messages
export async function sendMessage(req: AuthenticatedRequest, res: Response) {
  const bookingId = String(req.params.id);
  const userId = req.user!.id;
  const { text } = req.body;

  if (!text || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "text is required" });
  }

  const result = await verifyParty(bookingId, userId);
  if (!result) return res.status(404).json({ error: "Booking not found or not yours" });

  const { booking, isCustomer } = result;

  if (booking.status === "CANCELLED") {
    return res.status(400).json({ error: "Cannot send messages on a cancelled booking" });
  }

  const message = await prisma.message.create({
    data: { bookingId, senderId: userId, text: text.trim() },
    include: { sender: { select: MESSAGE_SENDER_SELECT } },
  });

  // Notify the other party
  const senderName = message.sender.fullName;
  const preview = text.trim().slice(0, 80) + (text.trim().length > 80 ? "…" : "");
  const recipientId = isCustomer ? booking.provider.userId : booking.customerId;

  await createNotification(
    recipientId,
    `Message from ${senderName}`,
    `${booking.category.name}: "${preview}"`,
  );

  res.status(201).json(message);
}
