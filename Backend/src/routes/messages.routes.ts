import { Router } from "express";
import { messageController } from "../controllers/message.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { idParamSchema } from "../validators/common.validator";
import { sendMessageSchema, startConversationSchema } from "../validators/message.validator";

const router = Router();

router.get("/conversations", requireAuth, messageController.conversations);
router.post("/conversations", requireAuth, validate({ body: startConversationSchema }), messageController.start);
router.get("/conversations/:id/messages", requireAuth, validate({ params: idParamSchema }), messageController.messages);
router.post(
  "/conversations/:id/messages",
  requireAuth,
  validate({ params: idParamSchema, body: sendMessageSchema }),
  messageController.send,
);

export default router;
