import { Router } from "express";
import { onboard, getProvider, getDashboard, updateProviderProfile } from "../controllers/provider.controller";
import { requireRole } from "../middleware/auth";

const router = Router();

router.post("/onboard", requireRole("PROVIDER", "CUSTOMER"), onboard);
// /dashboard and /profile must come before /:id to avoid being matched as id params
router.get("/dashboard", requireRole("PROVIDER"), getDashboard);
router.patch("/profile", requireRole("PROVIDER"), updateProviderProfile);
router.get("/:id", getProvider);

export default router;
