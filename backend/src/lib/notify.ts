// In-app notification helper — Module: Notifications
// Call createNotification() anywhere in the app to queue a message for a user.
// Silently no-ops rather than throwing so a notification failure never breaks
// the primary action (same pattern as lib/n8n.ts postWebhook).

import { prisma } from "./prisma";

export async function createNotification(
  userId: string,
  title: string,
  message: string,
): Promise<void> {
  try {
    await prisma.notification.create({ data: { userId, title, message } });
  } catch (err) {
    console.error("[notify] Failed to create notification for", userId, err);
  }
}
