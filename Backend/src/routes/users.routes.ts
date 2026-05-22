import { Router } from "express";
import { userController } from "../controllers/user.controller";
import { optionalAuth, requireAuth } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { followParamsSchema, updateProfileSchema, updateUsernameSchema, usernameCheckSchema } from "../validators/user.validator";
import { usernameParamSchema } from "../validators/common.validator";

const router = Router();

router.patch("/me", requireAuth, validate({ body: updateProfileSchema }), userController.updateMe);
router.patch("/me/username", requireAuth, validate({ body: updateUsernameSchema }), userController.updateUsername);
router.delete("/me", requireAuth, userController.deleteMe);
router.get("/me/profile", requireAuth, userController.me);
router.get("/me/saved-posts", requireAuth, userController.savedPosts);
router.get("/me/followers", requireAuth, userController.followers);
router.get("/me/following", requireAuth, userController.following);
router.get("/me/sessions", requireAuth, userController.sessions);
router.post("/me/revoke-sessions", requireAuth, userController.revokeSessions);

router.get("/check-username/:username", optionalAuth, validate({ params: usernameCheckSchema }), userController.checkUsername);

router.get("/:username", validate({ params: usernameParamSchema }), userController.profile);
router.get("/:username/posts", validate({ params: usernameParamSchema }), userController.posts);
router.get("/:username/comments", validate({ params: usernameParamSchema }), userController.comments);

router.post("/:userId/follow", requireAuth, validate({ params: followParamsSchema }), userController.follow);
router.delete("/:userId/follow", requireAuth, validate({ params: followParamsSchema }), userController.unfollow);
router.post("/:userId/block", requireAuth, validate({ params: followParamsSchema }), userController.block);
router.delete("/:userId/block", requireAuth, validate({ params: followParamsSchema }), userController.unblock);

export default router;
