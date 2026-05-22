import { Router } from "express";
import { communityController } from "../controllers/community.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { slugParamSchema } from "../validators/common.validator";
import { communityQuerySchema, createCommunitySchema, updateCommunitySchema } from "../validators/community.validator";

const router = Router();

router.get("/", validate({ query: communityQuerySchema }), communityController.list);
router.post("/", requireAuth, validate({ body: createCommunitySchema }), communityController.create);
router.get("/trending", communityController.trending);
router.get("/:slug", validate({ params: slugParamSchema }), communityController.get);
router.patch("/:slug", requireAuth, validate({ params: slugParamSchema, body: updateCommunitySchema }), communityController.update);
router.delete("/:slug", requireAuth, validate({ params: slugParamSchema }), communityController.remove);
router.post("/:slug/join", requireAuth, validate({ params: slugParamSchema }), communityController.join);
router.delete("/:slug/join", requireAuth, validate({ params: slugParamSchema }), communityController.leave);

export default router;
