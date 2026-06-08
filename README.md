# FixMate — Phase 1

Local home-service marketplace MVP. Monorepo: `backend` (Express + Prisma + PostgreSQL)
and `frontend` (Next.js App Router + Tailwind + shadcn/ui).

## Backend

```bash
cd backend
npx prisma dev          # spins up a local Postgres for development (keep running)
npm run prisma:migrate  # apply the Module 2 schema (use prisma:migrate against a real Supabase/Neon DB)
npm run prisma:seed     # seeds the four Phase 1 categories (Plumbing, Electrical, AC & Cooling, Carpentry)
npm run dev             # http://localhost:4000
```

Set `DATABASE_URL`, `AUTH_SECRET`, `N8N_AUTOMATION_SECRET`, `N8N_REGISTRATION_WEBHOOK_URL`,
`N8N_BOOKING_WEBHOOK_URL`, `FRONTEND_URL` and the `SMTP_*` vars in `backend/.env`. Routes
follow the Module 3.3 map exactly, all under `/api/v1`.

Auth (Module 1.1) is real: self-hosted Auth.js (NextAuth v5) on the frontend with a
Credentials provider backed by `POST /auth/login` + bcrypt password hashes; on every
sign-in it mints a small HS256 "bridge" JWT (shared `AUTH_SECRET`) that the Express
`attachSession` middleware verifies to recover `{ id, role }` — see `src/middleware/auth.ts`
and `frontend/src/lib/auth.ts`.

Email verification & password reset are real too: `POST /auth/register` issues a
single-use `EMAIL_VERIFICATION` token (`src/lib/tokens.ts`, hashed at rest) and mails
a confirmation link via `src/lib/email.ts`; `POST /auth/forgot-password` /
`POST /auth/reset-password` cover the recovery loop (the forgot-password response is
identical whether or not the email is on file, so it can't be used to enumerate
accounts). `lib/email.ts` mirrors `lib/n8n.ts`'s graceful-degradation pattern — with no
`SMTP_*` configured it logs the message instead of sending it, so the flow stays
testable without real credentials. Frontend pages: `/verify-email`, `/forgot-password`,
`/reset-password` (and a "Forgot password?" link on `/login`).

n8n automation (Module 3.2-C) is wired for real: `src/lib/n8n.ts` fires
`user.registered`/`booking.created` webhooks, and `POST /automation/bookings/:id/expire`
(guarded by `N8N_AUTOMATION_SECRET`) is the callback n8n's 2-hour `Wait` timer hits to
atomically expire a still-PENDING booking. Importable workflow JSON + setup notes live in
`backend/n8n-workflows/`.

## Frontend

```bash
cd frontend
npm run dev             # http://localhost:3000
```

`NEXT_PUBLIC_API_URL` in `frontend/.env.local` points at the backend. All backend calls
go through `src/lib/api.ts` and types live in `src/lib/types.ts` — redesign the UI freely
without touching those contracts.

## What's built (Phase 1 only, per the masterplan)

- Prisma schema exactly matching Module 2, Phase 2 blocks left commented out
- All Module 3.3 REST routes (`/auth/register`, `/auth/login`, `/auth/verify-email`,
  `/auth/forgot-password`, `/auth/reset-password`, `/providers/onboard`, `/categories`,
  `/categories/:id/providers`, `/bookings`, `/bookings/mine`, `/bookings/:id/status`,
  `/admin/verification-queue`, `/admin/providers/:id/verify`,
  `/automation/bookings/:id/expire`)
- Real Auth.js authentication (Module 1.1) with role-aware sessions end to end
- Email verification on sign-up + a full forgot/reset-password loop, with single-use
  hashed tokens and an enumeration-safe `forgot-password` response
- n8n automation (Module 3.2-C): live webhook dispatch + an importable, runnable
  2-hour SLA engine workflow (`backend/n8n-workflows/`)
- Categorical discovery dashboard with a violet/dark theme and verified-provider badges
