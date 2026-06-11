// Transactional email — verification & password-reset links.
// Mirrors lib/n8n.ts's postWebhook: if SMTP isn't configured, log the message
// instead of throwing, so the feature stays testable without real credentials.

import nodemailer, { Transporter } from "nodemailer";

let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD) {
    transporter = null;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
  return transporter;
}

type Mail = { to: string; subject: string; html: string; text: string };

export async function sendEmail({ to, subject, html, text }: Mail) {
  const t = getTransporter();
  if (!t) {
    console.warn(`[email] SMTP not configured — logging instead of sending to ${to}`);
    console.warn(`[email] Subject: ${subject}`);
    console.warn(`[email] ${text}`);
    return;
  }

  try {
    await t.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, html, text });
  } catch (err) {
    console.error("[email] Failed to send", to, err);
  }
}

function frontendUrl(path: string) {
  const base = process.env.FRONTEND_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path}`;
}

export function sendVerificationEmail(user: { email: string; fullName: string }, rawToken: string) {
  const link = frontendUrl(`/verify-email?token=${rawToken}`);
  return sendEmail({
    to: user.email,
    subject: "Verify your FixMate email address",
    text: `Hi ${user.fullName},\n\nWelcome to FixMate! Please confirm this is your email address by visiting the link below:\n\n${link}\n\nThis link expires in 24 hours. If you didn't create a FixMate account, you can ignore this message.`,
    html: `<p>Hi ${user.fullName},</p><p>Welcome to FixMate! Please confirm this is your email address by clicking the link below:</p><p><a href="${link}">${link}</a></p><p>This link expires in 24 hours. If you didn't create a FixMate account, you can ignore this message.</p>`,
  });
}

export function sendPasswordResetEmail(user: { email: string; fullName: string }, rawToken: string) {
  const link = frontendUrl(`/reset-password?token=${rawToken}`);
  return sendEmail({
    to: user.email,
    subject: "Reset your FixMate password",
    text: `Hi ${user.fullName},\n\nWe received a request to reset your FixMate password. Visit the link below to choose a new one:\n\n${link}\n\nThis link expires in 1 hour. If you didn't request this, you can safely ignore this message — your password will stay the same.`,
    html: `<p>Hi ${user.fullName},</p><p>We received a request to reset your FixMate password. Click the link below to choose a new one:</p><p><a href="${link}">${link}</a></p><p>This link expires in 1 hour. If you didn't request this, you can safely ignore this message — your password will stay the same.</p>`,
  });
}

// Booking notification emails

export function sendNewBookingEmail(
  provider: { email: string; fullName: string },
  customer: { fullName: string },
  categoryName: string,
  bookingDate: Date,
) {
  const dateStr = bookingDate.toLocaleDateString("en-NG", { dateStyle: "medium" });
  const link = frontendUrl("/dashboard");
  return sendEmail({
    to: provider.email,
    subject: `New booking request — ${categoryName} on ${dateStr}`,
    text: `Hi ${provider.fullName},\n\n${customer.fullName} has requested your ${categoryName} service on ${dateStr}.\n\nLog in to accept or decline:\n${link}\n\nFixMate — Trusted home services`,
    html: `<p>Hi ${provider.fullName},</p><p><strong>${customer.fullName}</strong> has requested your <strong>${categoryName}</strong> service on ${dateStr}.</p><p><a href="${link}">Accept or decline on FixMate →</a></p><p style="color:#888;font-size:12px">FixMate — Trusted home services</p>`,
  });
}

export function sendBookingStatusEmail(
  customer: { email: string; fullName: string },
  provider: { fullName: string },
  categoryName: string,
  status: "ACCEPTED" | "COMPLETED" | "CANCELLED",
) {
  const bookingsLink = frontendUrl("/bookings");
  const discoverLink = frontendUrl("/discover");
  const CONTENT = {
    ACCEPTED: {
      subject: `Your ${categoryName} booking has been accepted`,
      text: `Hi ${customer.fullName},\n\n${provider.fullName} accepted your ${categoryName} booking. They're on the way!\n\nTrack your booking:\n${bookingsLink}`,
      html: `<p>Hi ${customer.fullName},</p><p><strong>${provider.fullName}</strong> accepted your <strong>${categoryName}</strong> booking. They're on the way!</p><p><a href="${bookingsLink}">Track your booking →</a></p>`,
    },
    COMPLETED: {
      subject: `Your ${categoryName} booking is complete — leave a review`,
      text: `Hi ${customer.fullName},\n\n${provider.fullName} marked your ${categoryName} booking as completed. How did it go?\n\nLeave a review:\n${bookingsLink}`,
      html: `<p>Hi ${customer.fullName},</p><p><strong>${provider.fullName}</strong> marked your <strong>${categoryName}</strong> booking as completed. How did it go?</p><p><a href="${bookingsLink}">Leave a review →</a></p>`,
    },
    CANCELLED: {
      subject: `Your ${categoryName} booking has been cancelled`,
      text: `Hi ${customer.fullName},\n\nYour ${categoryName} booking has been cancelled.\n\nFind another artisan:\n${discoverLink}`,
      html: `<p>Hi ${customer.fullName},</p><p>Your <strong>${categoryName}</strong> booking has been cancelled.</p><p><a href="${discoverLink}">Find another artisan →</a></p>`,
    },
  };
  const { subject, text, html } = CONTENT[status];
  return sendEmail({ to: customer.email, subject, text, html });
}

export function sendProviderBookingCancelledEmail(
  provider: { email: string; fullName: string },
  categoryName: string,
) {
  const link = frontendUrl("/dashboard");
  return sendEmail({
    to: provider.email,
    subject: `A ${categoryName} booking was cancelled`,
    text: `Hi ${provider.fullName},\n\nA customer cancelled their ${categoryName} booking.\n\nView your dashboard:\n${link}`,
    html: `<p>Hi ${provider.fullName},</p><p>A customer cancelled their <strong>${categoryName}</strong> booking.</p><p><a href="${link}">View your dashboard →</a></p>`,
  });
}
