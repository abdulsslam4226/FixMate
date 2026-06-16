import { Router } from "express";
import { cancelBooking, createBooking, getMyBookings, raiseDispute, submitReview, updateBookingStatus } from "../controllers/booking.controller";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.get("/mine", requireAuth, getMyBookings);
router.post("/", requireRole("CUSTOMER"), createBooking);
router.patch("/:id/status", requireRole("PROVIDER"), updateBookingStatus);
router.post("/:id/review", requireRole("CUSTOMER"), submitReview);
router.post("/:id/cancel", requireRole("CUSTOMER"), cancelBooking);
router.post("/:id/dispute", requireRole("CUSTOMER"), raiseDispute);

export default router;
