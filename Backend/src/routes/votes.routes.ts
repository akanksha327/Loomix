import { Router } from "express";
import { voteController } from "../controllers/vote.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { idParamSchema } from "../validators/common.validator";
import { voteSchema } from "../validators/vote.validator";

const router = Router();

router.put("/posts/:id", requireAuth, validate({ params: idParamSchema, body: voteSchema }), voteController.post);
router.put("/comments/:id", requireAuth, validate({ params: idParamSchema, body: voteSchema }), voteController.comment);

export default router;
