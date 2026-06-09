// Mirrors the Phase 1 slices of the Prisma schema (Module 2) that the
// frontend needs to render. Kept minimal and separate from the API client so
// the UI layer can be reshaped later without touching the data contracts.

export type VerifyStatus = "PENDING" | "VERIFIED" | "REJECTED";
export type BookingStatus = "PENDING" | "ACCEPTED" | "COMPLETED" | "CANCELLED";

export interface ServiceCategory {
  id: string;
  name: string;
  iconName: string;
  description: string;
}

export interface RegisteredUser {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: "CUSTOMER" | "PROVIDER" | "ADMIN";
}

export interface ProviderSummary {
  id: string;
  bio: string;
  verificationStatus: VerifyStatus;
  latitude: string;
  longitude: string;
  operatingRadiusKm: number;
  user: {
    fullName: string;
  };
}

export interface OnboardedProvider {
  id: string;
  userId: string;
  categoryId: string;
  verificationStatus: VerifyStatus;
}

export interface VerificationQueueItem {
  id: string;
  bio: string;
  verificationStatus: VerifyStatus;
  idNumber: string;
  selfieUrl: string;
  guarantorName: string;
  guarantorPhone: string;
  latitude: string;
  longitude: string;
  operatingRadiusKm: number;
  createdAt: string;
  user: { fullName: string; email: string; phoneNumber: string; createdAt: string };
  category: { name: string };
}

export interface ProviderProfile {
  id: string;
  bio: string;
  verificationStatus: VerifyStatus;
  selfieUrl: string;
  latitude: string;
  longitude: string;
  operatingRadiusKm: number;
  averageRating: number | null;
  reviewCount: number;
  user: { fullName: string; phoneNumber: string };
  category: { name: string; description: string };
  reviewsReceived: Array<{
    id: string;
    rating: number;
    comment: string;
    createdAt: string;
    customer: { fullName: string };
  }>;
}

export type IdType = "NIN" | "BVN";

export interface BookingReview {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Booking {
  id: string;
  status: BookingStatus;
  bookingDate: string;
  notes: string;
  customer: { fullName: string };
  provider: { user: { fullName: string } };
  category: { name: string };
  review: BookingReview | null;
}
