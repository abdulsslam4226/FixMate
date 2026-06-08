import { Router } from "express";
import { createBooking, getMyBookings, updateBookingStatus } from "../controllers/booking.controller";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.get("/mine", requireAuth, getMyBookings);
router.post("/", requireRole("CUSTOMER"), createBooking);
router.patch("/:id/status", requireAuth, updateBookingStatus);

export default router;
