import { Router } from "express";
import { mediaController } from "../controllers/media.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { uploadImage } from "../middleware/upload.middleware";
import { validate } from "../middleware/validate.middleware";
import { mediaKindSchema } from "../validators/media.validator";

const router = Router();

router.post("/images", requireAuth, uploadImage.single("file"), validate({ body: mediaKindSchema }), mediaController.upload);
router.post("/", requireAuth, uploadImage.single("file"), validate({ body: mediaKindSchema }), mediaController.upload);

export default router;
