import { Router } from "express";
import { getPublicStats, listCategories, listProvidersByCategory } from "../controllers/category.controller";

const router = Router();

router.get("/", listCategories);
router.get("/:id/providers", listProvidersByCategory);

export default router;

// Separate top-level stats route — mounted at /api/v1/stats in app.ts
export { getPublicStats };
