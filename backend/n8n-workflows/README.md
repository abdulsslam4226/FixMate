# n8n workflows — Module 3.2-C (Webhook-Driven State Management)

Express stays decoupled: it only fires event payloads (`triggerRegistrationWebhook`,
`triggerBookingSLAWebhook` in `src/lib/n8n.ts`) and exposes one callback endpoint
n8n can use to act on the FixMate database. n8n owns the WhatsApp messaging and
the 2-hour SLA timer.

## Importing

In your n8n instance: **Workflows → Import from File** → pick `registration-welcome.json`
or `booking-sla-engine.json`. Each webhook node's *Production URL* is what you put in
`backend/.env` (`N8N_REGISTRATION_WEBHOOK_URL` / `N8N_BOOKING_WEBHOOK_URL`).

## Environment / credentials to configure inside n8n

| Variable | Purpose |
| --- | --- |
| `WHATSAPP_API_URL`, `WHATSAPP_API_TOKEN` | Your WhatsApp Business / Twilio messaging endpoint + auth. Swap the template names (`fixmate_welcome`, `fixmate_guarantor_confirmation`, `fixmate_application_received`, `fixmate_new_job_request`, `fixmate_booking_expired_customer`, `fixmate_booking_expired_provider`) for your approved templates. |
| `FIXMATE_API_URL` | The Express API's public base URL, e.g. `https://api.fixmate.example/api/v1`. |
| `FIXMATE_AUTOMATION_SECRET` | Must match `N8N_AUTOMATION_SECRET` in `backend/.env` — sent as the `x-automation-secret` header on the SLA-expiry callback. |

## 1. `registration-welcome.json`

`user.registered` → WhatsApp welcome message. One node beyond the webhook trigger.

## 2. `guarantor-ping.json`

`provider.guarantor_ping` → simultaneous WhatsApp messages to (a) the guarantor
asking them to confirm they vouch for the applicant, and (b) the provider confirming
their application is under review (Module 3.2-A Localized Trust Engine).

## 3. `booking-sla-engine.json`

This is the actual 2-hour SLA engine described in the masterplan:

1. **Booking Webhook** — receives `{ booking: { id, providerId, customerId, bookingDate }, slaWindowHours: 2 }`
2. **Ping Artisan: New Job Request** — WhatsApp ping starting the SLA clock
3. **Wait for SLA Window** — n8n's native `Wait` node suspends the execution for
   `slaWindowHours` (2h) without occupying a worker, then resumes automatically
4. **Check & Expire If Stale** — calls back into
   `POST /automation/bookings/:id/expire` (guarded by `x-automation-secret`).
   Express re-checks the deadline and current status server-side and only
   flips `PENDING → CANCELLED` if the artisan genuinely never responded —
   this is what makes the cancellation safe against timing drift or n8n retries.
5. **Was It Actually Cancelled?** — branches on the callback's `expired` flag:
   - `true` → notify the customer ("find someone else") and the artisan
     ("request expired"), using the names/numbers the callback returned
   - `false` → no-op (already accepted/declined/completed, or woke up early)

### Why the callback lives in Express, not n8n

n8n's `Wait` timer is the clock, but the *decision* to cancel — and the actual
`PENDING → CANCELLED` write — has to be atomic against concurrent
`PATCH /bookings/:id/status` calls from the artisan's app. Doing that check in
the database's transaction boundary (Express + Prisma) instead of trusting
n8n's wall-clock keeps the race condition impossible rather than merely unlikely.
