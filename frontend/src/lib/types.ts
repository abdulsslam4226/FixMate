// Mirrors the Phase 1 slices of the Prisma schema (Module 2) that the
// frontend needs to render. Kept minimal and separate from the API client so
// the UI layer can be reshaped later without touching the data contracts.

export type VerifyStatus = "PENDING" | "VERIFIED" | "REJECTED";
export type BookingStatus = "PENDING" | "ACCEPTED" | "AWAITING_CONFIRMATION" | "COMPLETED" | "CANCELLED";
export type PaymentStatus = "PENDING" | "PAID" | "REFUNDED" | "FAILED";
export type DisputeStatus = "OPEN" | "RESOLVED";

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
  pricePerJobKobo: number;
  averageRating: number | null;
  reviewCount: number;
  user: {
    id: string;
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
  pricePerJobKobo: number;
  averageRating: number | null;
  reviewCount: number;
  user: { fullName: string; phoneNumber: string };
  category: { name: string; description: string };
  portfolioImages: PortfolioImage[];
  availability: ProviderAvailability | null;
  blockouts: ProviderBlockout[];
  reviewsReceived: Array<{
    id: string;
    rating: number;
    comment: string;
    createdAt: string;
    customer: { fullName: string };
  }>;
}

export interface Payment {
  id: string;
  bookingId: string;
  amountKobo: number;
  reference: string;
  status: PaymentStatus;
  paidAt: string | null;
  createdAt: string;
}

export type IdType = "NIN" | "BVN";

export interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface DashboardStats {
  total: number;
  pending: number;
  accepted: number;
  completed: number;
  cancelled: number;
  totalEarningsKobo: number;
  pendingPayoutKobo: number;
}

export interface ProviderAvailability {
  mon: boolean;
  tue: boolean;
  wed: boolean;
  thu: boolean;
  fri: boolean;
  sat: boolean;
  sun: boolean;
}

export interface ProviderBlockout {
  blockedDate: string; // YYYY-MM-DD
}

export interface PortfolioImage {
  id: string;
  imageUrl: string;
  caption: string | null;
  createdAt: string;
}

export interface DashboardProfile {
  id: string;
  bio: string;
  verificationStatus: VerifyStatus;
  rejectionReason: string | null;
  pricePerJobKobo: number;
  operatingRadiusKm: number;
  bankCode: string | null;
  accountNumber: string | null;
  selfieUrl: string;
  category: { name: string };
  portfolioImages: PortfolioImage[];
  availability: ProviderAvailability | null;
  blockouts: ProviderBlockout[];
}

export interface DashboardBooking {
  id: string;
  status: BookingStatus;
  bookingDate: string;
  notes: string;
  customer: { fullName: string; phoneNumber: string };
  category: { name: string };
  payment: Payment | null;
  review: { rating: number; comment: string; createdAt: string } | null;
}

export interface ProviderDashboardData {
  profile: DashboardProfile;
  bookings: DashboardBooking[];
  stats: DashboardStats;
}

export interface Message {
  id: string;
  bookingId: string;
  senderId: string;
  text: string;
  createdAt: string;
  sender: { id: string; fullName: string; role: string };
}

export interface BookingReview {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface BookingDispute {
  id: string;
  status: DisputeStatus;
  reason: string;
  resolution: string | null;
  createdAt: string;
}

export interface Booking {
  id: string;
  providerId: string;
  categoryId: string;
  status: BookingStatus;
  bookingDate: string;
  notes: string;
  customer: { fullName: string };
  provider: { user: { fullName: string }; pricePerJobKobo: number };
  category: { name: string };
  review: BookingReview | null;
  payment: Payment | null;
  dispute: BookingDispute | null;
}

export interface AdminStats {
  bookings: { total: number; pending: number; accepted: number; completed: number; cancelled: number };
  revenue: { totalCollectedKobo: number; platformCommissionKobo: number; refundedKobo: number };
  providers: { total: number; verified: number; pending: number; rejected: number };
  users: { totalCustomers: number };
  disputes: { open: number; resolved: number };
  recentBookings: Array<{
    id: string;
    status: BookingStatus;
    bookingDate: string;
    category: { name: string };
    customer: { fullName: string };
    provider: { user: { fullName: string } };
    payment: { amountKobo: number; status: PaymentStatus } | null;
  }>;
}

export interface AdminDispute {
  id: string;
  status: DisputeStatus;
  reason: string;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
  raisedBy: { fullName: string; email: string };
  resolvedBy: { fullName: string } | null;
  booking: {
    id: string;
    status: BookingStatus;
    bookingDate: string;
    notes: string;
    category: { name: string };
    customer: { fullName: string; email: string; phoneNumber: string };
    provider: { user: { fullName: string; email: string } };
    payment: { id: string; amountKobo: number; reference: string; status: PaymentStatus } | null;
  };
}
