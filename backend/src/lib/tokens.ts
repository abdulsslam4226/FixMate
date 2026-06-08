// Email verification & password reset tokens (Module 1.1 follow-up)
// Raw tokens are emailed to the user; only their SHA-256 hash is stored, so a
// database leak can't be replayed into an account takeover.

import crypto from "crypto";
import { prisma } from "./prisma";
import { TokenPurpose } from "@prisma/client";

const TOKEN_BYTES = 32;
const TTL_HOURS: Record<TokenPurpose, number> = {
  EMAIL_VERIFICATION: 24,
  PASSWORD_RESET: 1,
};

function hashToken(rawToken: string) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

// Issues a fresh token for the given purpose, replacing any outstanding one
// (so an old, leaked link can't be used alongside a freshly requested one).
export async function issueToken(userId: string, purpose: TokenPurpose) {
  const rawToken = crypto.randomBytes(TOKEN_BYTES).toString("hex");
  const expiresAt = new Date(Date.now() + TTL_HOURS[purpose] * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { userId, purpose } }),
    prisma.verificationToken.create({
      data: { userId, purpose, expiresAt, tokenHash: hashToken(rawToken) },
    }),
  ]);

  return rawToken;
}

// Verifies and consumes (single-use) a raw token for the given purpose.
// Returns the owning user on success, or null if the token is missing,
// expired, or was issued for a different purpose.
export async function consumeToken(rawToken: string, purpose: TokenPurpose) {
  const record = await prisma.verificationToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { user: true },
  });

  if (!record || record.purpose !== purpose) {
    return null;
  }

  await prisma.verificationToken.delete({ where: { id: record.id } });

  if (record.expiresAt < new Date()) {
    return null;
  }

  return record.user;
}
