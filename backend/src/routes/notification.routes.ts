import { Router } from "express";
import { listNotifications, markAllRead, markAsRead } from "../controllers/notification.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/", listNotifications);
router.patch("/read-all", markAllRead);
router.patch("/:id/read", markAsRead);

export default router;
