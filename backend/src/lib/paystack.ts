import crypto from "crypto";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY ?? "";
const BASE = "https://api.paystack.co";

function paystackHeaders() {
  return {
    Authorization: `Bearer ${PAYSTACK_SECRET}`,
    "Content-Type": "application/json",
  };
}

async function paystackPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: paystackHeaders(),
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { status: boolean; message: string; data: T };
  if (!json.status) throw new Error(`Paystack error: ${json.message}`);
  return json.data;
}

async function paystackGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: paystackHeaders() });
  const json = (await res.json()) as { status: boolean; message: string; data: T };
  if (!json.status) throw new Error(`Paystack error: ${json.message}`);
  return json.data;
}

export interface InitializedTransaction {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export async function initializeTransaction(
  email: string,
  amountKobo: number,
  reference: string,
  callbackUrl: string,
  metadata?: Record<string, unknown>,
): Promise<InitializedTransaction> {
  if (!PAYSTACK_SECRET) {
    console.warn("[paystack] PAYSTACK_SECRET_KEY not set — returning stub authorization URL");
    return {
      authorization_url: `${callbackUrl}?reference=${reference}&stub=true`,
      access_code: "stub",
      reference,
    };
  }
  return paystackPost<InitializedTransaction>("/transaction/initialize", {
    email,
    amount: amountKobo,
    reference,
    callback_url: callbackUrl,
    metadata,
  });
}

export interface VerifiedTransaction {
  status: "success" | "failed" | "abandoned";
  reference: string;
  amount: number;
  paid_at: string;
  customer: { email: string };
}

export async function verifyTransaction(reference: string): Promise<VerifiedTransaction> {
  return paystackGet<VerifiedTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

export async function createTransferRecipient(
  name: string,
  bankCode: string,
  accountNumber: string,
): Promise<string> {
  if (!PAYSTACK_SECRET) {
    console.warn("[paystack] PAYSTACK_SECRET_KEY not set — skipping recipient creation");
    return "";
  }
  const data = await paystackPost<{ recipient_code: string }>("/transferrecipient", {
    type: "nuban",
    name,
    account_number: accountNumber,
    bank_code: bankCode,
    currency: "NGN",
  });
  return data.recipient_code;
}

export async function initiateTransfer(
  amountKobo: number,
  recipientCode: string,
  reason: string,
): Promise<string> {
  if (!PAYSTACK_SECRET) {
    console.warn("[paystack] PAYSTACK_SECRET_KEY not set — skipping transfer");
    return "";
  }
  const data = await paystackPost<{ transfer_code: string }>("/transfer", {
    source: "balance",
    amount: amountKobo,
    recipient: recipientCode,
    reason,
  });
  return data.transfer_code;
}

export async function refundTransaction(
  transactionReference: string,
  amountKobo?: number,
): Promise<void> {
  if (!PAYSTACK_SECRET) {
    console.warn("[paystack] PAYSTACK_SECRET_KEY not set — skipping refund");
    return;
  }
  // Paystack refund takes the transaction id (numeric), so we verify first to get it
  const txn = await verifyTransaction(transactionReference);
  const body: Record<string, unknown> = { transaction: transactionReference };
  if (amountKobo) body.amount = amountKobo;
  await paystackPost("/refund", body);
  void txn; // txn fetched to confirm it exists; refund uses the reference string
}

export function verifyWebhookSignature(rawBody: string, paystackSignature: string): boolean {
  if (!PAYSTACK_SECRET) return false;
  const hash = crypto.createHmac("sha512", PAYSTACK_SECRET).update(rawBody).digest("hex");
  return hash === paystackSignature;
}
