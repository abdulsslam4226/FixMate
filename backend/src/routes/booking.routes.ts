import { Router } from "express";
import { createBooking, getMyBookings, submitReview, updateBookingStatus } from "../controllers/booking.controller";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.get("/mine", requireAuth, getMyBookings);
router.post("/", requireRole("CUSTOMER"), createBooking);
router.patch("/:id/status", requireAuth, updateBookingStatus);
router.post("/:id/review", requireRole("CUSTOMER"), submitReview);

export default router;
