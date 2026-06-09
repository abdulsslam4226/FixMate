// Webhook-Driven State Management — Module 3.2-C
// Express stays decoupled from n8n: it only fires the event payload.
// n8n owns the WhatsApp/Twilio messaging and the 2-hour SLA cancellation logic.

async function postWebhook(url: string | undefined, payload: Record<string, unknown>) {
  if (!url) {
    console.warn("[n8n] Webhook URL not configured — skipping dispatch", payload);
    return;
  }

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("[n8n] Failed to dispatch webhook", url, err);
  }
}

export function triggerRegistrationWebhook(user: { id: string; fullName: string; phoneNumber: string; role: string }) {
  return postWebhook(process.env.N8N_REGISTRATION_WEBHOOK_URL, {
    event: "user.registered",
    user,
  });
}

export function triggerBookingSLAWebhook(booking: { id: string; providerId: string; customerId: string; bookingDate: Date }) {
  return postWebhook(process.env.N8N_BOOKING_WEBHOOK_URL, {
    event: "booking.created",
    booking,
    slaWindowHours: 2,
  });
}

// Module 3.2-A — Localized Trust Engine
// Notifies the guarantor via WhatsApp that they've been named as a reference for
// a FixMate provider application, asking them to confirm they vouch for the person.
export function triggerGuarantorPingWebhook(payload: {
  providerId: string;
  providerName: string;
  guarantorName: string;
  guarantorPhone: string;
}) {
  return postWebhook(process.env.N8N_GUARANTOR_WEBHOOK_URL, {
    event: "provider.guarantor_ping",
    ...payload,
  });
}
