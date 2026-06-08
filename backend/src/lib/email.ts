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
