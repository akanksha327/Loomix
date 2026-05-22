import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { authRateLimiter } from "../middleware/security.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  changePasswordSchema,
  loginSchema,
  refreshSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  signupSchema,
  firebaseSyncSchema,
} from "../validators/auth.validator";

const router = Router();

router.post("/firebase-sync", validate({ body: firebaseSyncSchema }), authController.firebaseSync);
router.post("/signup", authRateLimiter, validate({ body: signupSchema }), authController.signup);
router.post("/login", authRateLimiter, validate({ body: loginSchema }), authController.login);
router.post("/refresh", validate({ body: refreshSchema }), authController.refresh);
router.post("/logout", authController.logout);
router.get("/me", requireAuth, authController.me);
router.patch("/password", requireAuth, validate({ body: changePasswordSchema }), authController.changePassword);
router.post("/password/forgot", authRateLimiter, validate({ body: requestPasswordResetSchema }), authController.requestPasswordReset);
router.post("/password/reset", authRateLimiter, validate({ body: resetPasswordSchema }), authController.resetPassword);

export default router;
