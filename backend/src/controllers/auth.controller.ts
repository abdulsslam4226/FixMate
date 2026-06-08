import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { triggerRegistrationWebhook } from "../lib/n8n";
import { sendPasswordResetEmail, sendVerificationEmail } from "../lib/email";
import { consumeToken, issueToken } from "../lib/tokens";

const PASSWORD_MIN_LENGTH = 8;

function publicUser(user: { id: string; fullName: string; email: string; phoneNumber: string; role: string }) {
  return { id: user.id, fullName: user.fullName, email: user.email, phoneNumber: user.phoneNumber, role: user.role };
}

// POST /api/v1/auth/register — Public
// Registers user profile, hashes the chosen password and maps the default
// client role (Module 3.3 / Module 1.1 "Session data injected with User Roles")
export async function register(req: Request, res: Response) {
  const { fullName, email, phoneNumber, password } = req.body;

  if (!fullName || !email || !phoneNumber || !password) {
    return res.status(400).json({ error: "fullName, email, phoneNumber and password are required" });
  }

  if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) {
    return res.status(400).json({ error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` });
  }

  const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { phoneNumber }] } });
  if (existing) {
    return res.status(409).json({ error: "An account with this email or phone number already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { fullName, email, phoneNumber, passwordHash },
  });

  await triggerRegistrationWebhook({
    id: user.id,
    fullName: user.fullName,
    phoneNumber: user.phoneNumber,
    role: user.role,
  });

  const verificationToken = await issueToken(user.id, "EMAIL_VERIFICATION");
  await sendVerificationEmail(user, verificationToken);

  res.status(201).json(publicUser(user));
}

// POST /api/v1/auth/verify-email — Public
// Confirms the email address behind a registration is real and reachable by
// consuming the single-use token mailed out in `register` / `resendVerificationEmail`.
export async function verifyEmail(req: Request, res: Response) {
  const { token } = req.body;

  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "token is required" });
  }

  const user = await consumeToken(token, "EMAIL_VERIFICATION");
  if (!user) {
    return res.status(400).json({ error: "This verification link is invalid or has expired" });
  }

  if (!user.emailVerified) {
    await prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
  }

  res.json({ verified: true });
}

// POST /api/v1/auth/forgot-password — Public
// Always answers with the same generic message regardless of whether the email
// is on file, so the endpoint can't be used to enumerate registered accounts.
export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body;

  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "email is required" });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const resetToken = await issueToken(user.id, "PASSWORD_RESET");
    await sendPasswordResetEmail(user, resetToken);
  }

  res.json({ message: "If an account exists for that email, we've sent a link to reset the password" });
}

// POST /api/v1/auth/reset-password — Public
// Consumes a single-use PASSWORD_RESET token and replaces the account's password hash.
export async function resetPassword(req: Request, res: Response) {
  const { token, password } = req.body;

  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "token is required" });
  }

  if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) {
    return res.status(400).json({ error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` });
  }

  const user = await consumeToken(token, "PASSWORD_RESET");
  if (!user) {
    return res.status(400).json({ error: "This password reset link is invalid or has expired" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  res.json({ message: "Password updated — you can now sign in with your new password" });
}

// POST /api/v1/auth/login — Public
// Verifies credentials for Auth.js's Credentials provider `authorize` callback
// (Module 1.1). Returns the public user shape on success, 401 otherwise.
export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  res.json(publicUser(user));
}
