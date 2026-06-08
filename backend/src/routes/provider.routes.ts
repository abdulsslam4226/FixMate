import { Router } from "express";
import { onboard } from "../controllers/provider.controller";
import { requireRole } from "../middleware/auth";

const router = Router();

router.post("/onboard", requireRole("PROVIDER", "CUSTOMER"), onboard);

export default router;
