import { Router } from "express";
import { postController } from "../controllers/post.controller";
import { optionalAuth, requireAuth } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { idParamSchema } from "../validators/common.validator";
import { createPostSchema, postFeedQuerySchema, updatePostSchema } from "../validators/post.validator";

const router = Router();

router.get("/", optionalAuth, validate({ query: postFeedQuerySchema }), postController.list);
router.post("/", requireAuth, validate({ body: createPostSchema }), postController.create);
router.get("/trending", optionalAuth, postController.trending);
router.get("/:id", optionalAuth, validate({ params: idParamSchema }), postController.get);
router.patch("/:id", requireAuth, validate({ params: idParamSchema, body: updatePostSchema }), postController.update);
router.delete("/:id", requireAuth, validate({ params: idParamSchema }), postController.remove);
router.post("/:id/save", requireAuth, validate({ params: idParamSchema }), postController.save);
router.delete("/:id/save", requireAuth, validate({ params: idParamSchema }), postController.unsave);

export default router;
