import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  initializePayment,
  verifyPayment,
  handleWebhook,
  getBookingPayment,
} from "../controllers/payment.controller";

const router = Router();

// Webhook is public — Paystack calls it directly (raw body parsing handled in app.ts)
router.post("/webhook", handleWebhook);

// Verify is public — called from the browser after Paystack redirect
router.get("/verify", verifyPayment);

// Authenticated routes
router.post("/initialize", requireRole("CUSTOMER"), initializePayment);
router.get("/booking/:bookingId", requireAuth, getBookingPayment);

export default router;
