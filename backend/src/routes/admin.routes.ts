import { Router } from "express";
import { getAdminStats, getVerificationQueue, getProviderDetail, setVerificationStatus, listDisputes, resolveDispute } from "../controllers/admin.controller";
import { requireRole } from "../middleware/auth";

const router = Router();

router.use(requireRole("ADMIN"));

router.get("/stats", getAdminStats);
router.get("/verification-queue", getVerificationQueue);
router.get("/providers/:id", getProviderDetail);
router.patch("/providers/:id/verify", setVerificationStatus);
router.get("/disputes", listDisputes);
router.patch("/disputes/:id/resolve", resolveDispute);

export default router;
