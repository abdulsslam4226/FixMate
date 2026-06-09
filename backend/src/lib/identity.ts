// Localized Trust Engine — Module 3.2-A
// NIN and BVN format validation + a stub for an external identity verification
// API (Smile Identity / VerifyMe / DOJAH etc.).
// Mirrors lib/n8n.ts and lib/email.ts: if the API is not configured, log what
// would have been sent and return a "pending-manual" result so the admin queue
// still gets populated and no onboarding is blocked purely by missing credentials.

export type IdType = "NIN" | "BVN";

export interface IdentityCheckResult {
  valid: boolean;
  idType: IdType;
  /** true = confirmed by external API, false = format-only / manual review needed */
  verified: boolean;
  message: string;
}

// NIN: 11-digit numeric string issued by NIMC
// BVN: 11-digit numeric string issued by CBN/NIBSS
const ID_REGEX: Record<IdType, RegExp> = {
  NIN: /^\d{11}$/,
  BVN: /^\d{11}$/,
};

export function detectIdType(idNumber: string): IdType | null {
  // Both are 11 digits; caller should let the user declare which type they're
  // submitting.  If not declared we can't tell them apart from format alone.
  return null;
}

export function validateIdFormat(idNumber: string, idType: IdType): boolean {
  return ID_REGEX[idType].test(idNumber.trim());
}

async function callVerificationApi(
  idNumber: string,
  idType: IdType,
): Promise<IdentityCheckResult> {
  const { IDENTITY_API_URL, IDENTITY_API_KEY } = process.env;

  if (!IDENTITY_API_URL || !IDENTITY_API_KEY) {
    console.warn(
      `[identity] Verification API not configured — ${idType} ${idNumber} queued for manual admin review`,
    );
    return {
      valid: true,
      idType,
      verified: false,
      message: "Format valid; queued for manual admin review (API not configured)",
    };
  }

  try {
    const res = await fetch(IDENTITY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${IDENTITY_API_KEY}`,
      },
      body: JSON.stringify({ id: idNumber, type: idType }),
    });

    if (!res.ok) {
      console.error(`[identity] API returned ${res.status} for ${idType} ${idNumber}`);
      return {
        valid: true,
        idType,
        verified: false,
        message: `API check failed (${res.status}) — queued for manual review`,
      };
    }

    const data = (await res.json()) as { match: boolean; name?: string };
    return {
      valid: data.match,
      idType,
      verified: data.match,
      message: data.match
        ? `${idType} verified — name on record: ${data.name ?? "n/a"}`
        : `${idType} not found in government records`,
    };
  } catch (err) {
    console.error("[identity] API call failed", err);
    return {
      valid: true,
      idType,
      verified: false,
      message: "API unreachable — queued for manual review",
    };
  }
}

// Primary entry point: validate format first, then call the external API.
export async function checkIdentity(
  idNumber: string,
  idType: IdType,
): Promise<IdentityCheckResult> {
  if (!validateIdFormat(idNumber, idType)) {
    return {
      valid: false,
      idType,
      verified: false,
      message: `${idType} must be exactly 11 digits`,
    };
  }
  return callVerificationApi(idNumber, idType);
}
