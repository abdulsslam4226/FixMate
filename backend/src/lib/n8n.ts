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
