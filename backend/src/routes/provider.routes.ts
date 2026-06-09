import { Router } from "express";
import { onboard, getProvider } from "../controllers/provider.controller";
import { requireRole } from "../middleware/auth";

const router = Router();

router.post("/onboard", requireRole("PROVIDER", "CUSTOMER"), onboard);
router.get("/:id", getProvider);

export default router;
