import { Router } from "express";
import { settingsController } from "../controllers/settings.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { updateSettingsSchema } from "../validators/settings.validator";

const router = Router();

router.get("/", requireAuth, settingsController.get);
router.patch("/", requireAuth, validate({ body: updateSettingsSchema }), settingsController.update);

export default router;
