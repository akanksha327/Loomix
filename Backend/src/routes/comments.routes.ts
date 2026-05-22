import { Router } from "express";
import { commentController } from "../controllers/comment.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { idParamSchema } from "../validators/common.validator";
import { commentQuerySchema, createCommentSchema, updateCommentSchema } from "../validators/comment.validator";

const router = Router();

router.post("/", requireAuth, validate({ body: createCommentSchema }), commentController.create);
router.get("/post/:id", validate({ params: idParamSchema, query: commentQuerySchema }), commentController.byPost);
router.patch("/:id", requireAuth, validate({ params: idParamSchema, body: updateCommentSchema }), commentController.update);
router.delete("/:id", requireAuth, validate({ params: idParamSchema }), commentController.remove);

export default router;
