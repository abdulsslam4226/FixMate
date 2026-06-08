import { Router } from "express";
import { expireStaleBooking } from "../controllers/automation.controller";
import { requireAutomationSecret } from "../middleware/automation";

const router = Router();

router.post("/bookings/:id/expire", requireAutomationSecret, expireStaleBooking);

export default router;
