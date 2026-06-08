import { Router } from "express";
import { listCategories, listProvidersByCategory } from "../controllers/category.controller";

const router = Router();

router.get("/", listCategories);
router.get("/:id/providers", listProvidersByCategory);

export default router;
