import { Router } from "express";
import { onboard, getProvider, getDashboard, updateProviderProfile, addPortfolioImage, deletePortfolioImage, updateAvailability, addBlockout, removeBlockout } from "../controllers/provider.controller";
import { requireRole } from "../middleware/auth";

const router = Router();

router.post("/onboard", requireRole("PROVIDER", "CUSTOMER"), onboard);
// /dashboard and /profile must come before /:id to avoid being matched as id params
router.get("/dashboard", requireRole("PROVIDER"), getDashboard);
router.patch("/profile", requireRole("PROVIDER"), updateProviderProfile);
router.post("/portfolio", requireRole("PROVIDER"), addPortfolioImage);
router.delete("/portfolio/:imageId", requireRole("PROVIDER"), deletePortfolioImage);
router.patch("/availability", requireRole("PROVIDER"), updateAvailability);
router.post("/blockouts", requireRole("PROVIDER"), addBlockout);
router.delete("/blockouts/:date", requireRole("PROVIDER"), removeBlockout);
router.get("/:id", getProvider);

export default router;
