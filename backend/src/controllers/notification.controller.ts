import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest } from "../middleware/auth";

// GET /api/v1/notifications — Private
// Returns the authenticated user's notifications, newest first.
export async function listNotifications(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!.id;

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  res.json(notifications);
}

// PATCH /api/v1/notifications/:id/read — Private
// Marks a single notification as read.
export async function markAsRead(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!.id;
  const id = String(req.params.id);

  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification || notification.userId !== userId) {
    return res.status(404).json({ error: "Notification not found" });
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });

  res.json(updated);
}

// PATCH /api/v1/notifications/read-all — Private
// Marks all of the authenticated user's notifications as read in one shot.
export async function markAllRead(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!.id;

  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  res.json({ ok: true });
}
