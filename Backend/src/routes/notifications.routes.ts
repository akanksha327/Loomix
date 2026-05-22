import { Router } from "express";
import { notificationController } from "../controllers/notification.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { idParamSchema } from "../validators/common.validator";
import { notificationQuerySchema } from "../validators/notification.validator";

const router = Router();

router.get("/", requireAuth, validate({ query: notificationQuerySchema }), notificationController.list);
router.patch("/read-all", requireAuth, notificationController.markAllRead);
router.patch("/:id/read", requireAuth, validate({ params: idParamSchema }), notificationController.markRead);

export default router;
