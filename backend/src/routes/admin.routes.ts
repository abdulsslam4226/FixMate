import { Router } from "express";
import { getVerificationQueue, getProviderDetail, setVerificationStatus } from "../controllers/admin.controller";
import { requireRole } from "../middleware/auth";

const router = Router();

router.use(requireRole("ADMIN"));

router.get("/verification-queue", getVerificationQueue);
router.get("/providers/:id", getProviderDetail);
router.patch("/providers/:id/verify", setVerificationStatus);

export default router;
