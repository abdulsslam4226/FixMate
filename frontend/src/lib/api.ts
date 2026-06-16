// Thin API client layer — every backend call funnels through here so the
// rest of the frontend stays agnostic about transport details (Module 3.3
// routing map). Swapping UI/frontend frameworks later only means redrawing
// callers of these functions, not re-deriving request shapes.

import {
  AdminDispute,
  AdminStats,
  Booking,
  BookingDispute,
  BookingReview,
  BookingStatus,
  DashboardProfile,
  IdType,
  Notification,
  OnboardedProvider,
  Payment,
  ProviderDashboardData,
  ProviderProfile,
  ProviderSummary,
  RegisteredUser,
  ServiceCategory,
  VerificationQueueItem,
  VerifyStatus,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

// `apiToken` is the short-lived HS256 bridge JWT Auth.js mints on sign-in
// (see lib/auth.ts's jwt callback / session.apiToken) — it carries the
// user's id (sub) and role, which the Express API verifies in
// backend/src/middleware/auth.ts (Module 1.1: "Session data injected with
// User Roles").
function authHeaders(apiToken: string): Record<string, string> {
  return { Authorization: `Bearer ${apiToken}` };
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`FixMate API request failed: ${path} (${res.status})`);
  }

  return res.json() as Promise<T>;
}

async function apiPost<T>(path: string, body: unknown, apiToken?: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(apiToken ? authHeaders(apiToken) : {}) },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new Error(payload?.error ?? `FixMate API request failed: ${path} (${res.status})`);
  }

  return res.json() as Promise<T>;
}

async function apiPatch<T>(path: string, body: unknown, apiToken: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders(apiToken) },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new Error(payload?.error ?? `FixMate API request failed: ${path} (${res.status})`);
  }

  return res.json() as Promise<T>;
}

async function apiGetAuthed<T>(path: string, apiToken: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
    headers: authHeaders(apiToken),
  });

  if (!res.ok) {
    throw new Error(`FixMate API request failed: ${path} (${res.status})`);
  }

  return res.json() as Promise<T>;
}

export function getCategories() {
  return apiGet<ServiceCategory[]>("/categories");
}

export function getProvidersByCategory(
  categoryId: string,
  params?: { lat?: number; lng?: number; q?: string; minRating?: number; sortBy?: string },
) {
  const qs = new URLSearchParams();
  if (params?.lat != null) qs.set("lat", String(params.lat));
  if (params?.lng != null) qs.set("lng", String(params.lng));
  if (params?.q) qs.set("q", params.q);
  if (params?.minRating) qs.set("minRating", String(params.minRating));
  if (params?.sortBy) qs.set("sortBy", params.sortBy);
  const query = qs.toString() ? `?${qs}` : "";
  return apiGet<ProviderSummary[]>(`/categories/${categoryId}/providers${query}`);
}

export function registerUser(input: { fullName: string; email: string; phoneNumber: string; password: string }) {
  return apiPost<RegisteredUser>("/auth/register", input);
}

export function verifyEmail(token: string) {
  return apiPost<{ verified: boolean }>("/auth/verify-email", { token });
}

export function forgotPassword(email: string) {
  return apiPost<{ message: string }>("/auth/forgot-password", { email });
}

export function resetPassword(input: { token: string; password: string }) {
  return apiPost<{ message: string }>("/auth/reset-password", input);
}

export function createBooking(
  input: { providerId: string; categoryId: string; bookingDate: string; notes: string },
  apiToken: string,
) {
  return apiPost<Booking>("/bookings", input, apiToken);
}

export function getMyBookings(apiToken: string) {
  return apiGetAuthed<Booking[]>("/bookings/mine", apiToken);
}

export function updateBookingStatus(id: string, status: BookingStatus, apiToken: string) {
  return apiPatch<Booking>(`/bookings/${id}/status`, { status }, apiToken);
}

export function onboardProvider(
  input: {
    bio: string;
    categoryId: string;
    idNumber: string;
    idType: IdType;
    selfieUrl: string;
    guarantorName: string;
    guarantorPhone: string;
    latitude: number;
    longitude: number;
    operatingRadiusKm: number;
    pricePerJobKobo?: number;
    bankCode?: string;
    accountNumber?: string;
  },
  apiToken: string,
) {
  return apiPost<OnboardedProvider>("/providers/onboard", input, apiToken);
}

export async function uploadSelfie(file: File, apiToken: string): Promise<string> {
  const form = new FormData();
  form.append("selfie", file);
  const res = await fetch(`${API_BASE_URL}/upload/selfie`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiToken}` },
    body: form,
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new Error(payload?.error ?? `Upload failed (${res.status})`);
  }
  const { url } = (await res.json()) as { url: string };
  return url;
}

export function getProvider(id: string) {
  return apiGet<ProviderProfile>(`/providers/${id}`);
}

export function submitReview(
  bookingId: string,
  input: { rating: number; comment: string },
  apiToken: string,
) {
  return apiPost<BookingReview>(`/bookings/${bookingId}/review`, input, apiToken);
}

export function getProviderDashboard(apiToken: string) {
  return apiGetAuthed<ProviderDashboardData>("/providers/dashboard", apiToken);
}

export function updateProviderProfile(
  input: {
    bio?: string;
    pricePerJobKobo?: number;
    bankCode?: string;
    accountNumber?: string;
    operatingRadiusKm?: number;
  },
  apiToken: string,
) {
  return apiPatch<DashboardProfile>("/providers/profile", input, apiToken);
}

export function initializePayment(bookingId: string, apiToken: string) {
  return apiPost<{ authorizationUrl: string; reference: string }>(
    "/payments/initialize",
    { bookingId },
    apiToken,
  );
}

export function verifyPayment(reference: string) {
  return apiGet<Payment>(`/payments/verify?reference=${encodeURIComponent(reference)}`);
}

export function getBookingPayment(bookingId: string, apiToken: string) {
  return apiGetAuthed<Payment>(`/payments/booking/${bookingId}`, apiToken);
}

export function getNotifications(apiToken: string) {
  return apiGetAuthed<Notification[]>("/notifications", apiToken);
}

export function markNotificationRead(id: string, apiToken: string) {
  return apiPatch<Notification>(`/notifications/${id}/read`, {}, apiToken);
}

export function markAllNotificationsRead(apiToken: string) {
  return apiPatch<{ ok: boolean }>("/notifications/read-all", {}, apiToken);
}

export function cancelBooking(bookingId: string, apiToken: string) {
  return apiPost<Booking>(`/bookings/${bookingId}/cancel`, {}, apiToken);
}

export function raiseDispute(bookingId: string, reason: string, apiToken: string) {
  return apiPost<BookingDispute>(`/bookings/${bookingId}/dispute`, { reason }, apiToken);
}

export function listAdminDisputes(apiToken: string) {
  return apiGetAuthed<AdminDispute[]>("/admin/disputes", apiToken);
}

export function resolveDispute(
  disputeId: string,
  input: { outcome: "REFUND" | "RELEASE"; resolution: string },
  apiToken: string,
) {
  return apiPatch<AdminDispute>(`/admin/disputes/${disputeId}/resolve`, input, apiToken);
}

export function getAdminStats(apiToken: string) {
  return apiGetAuthed<AdminStats>("/admin/stats", apiToken);
}

export function getVerificationQueue(apiToken: string) {
  return apiGetAuthed<VerificationQueueItem[]>("/admin/verification-queue", apiToken);
}

export function setProviderVerification(
  id: string,
  verificationStatus: VerifyStatus,
  apiToken: string,
  rejectionReason?: string,
) {
  return apiPatch<VerificationQueueItem>(
    `/admin/providers/${id}/verify`,
    { verificationStatus, ...(rejectionReason ? { rejectionReason } : {}) },
    apiToken,
  );
}
