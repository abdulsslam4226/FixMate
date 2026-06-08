import { Router } from "express";
import { getVerificationQueue, setVerificationStatus } from "../controllers/admin.controller";
import { requireRole } from "../middleware/auth";

const router = Router();

router.use(requireRole("ADMIN"));

router.get("/verification-queue", getVerificationQueue);
router.patch("/providers/:id/verify", setVerificationStatus);

export default router;
