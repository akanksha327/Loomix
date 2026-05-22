import { messageService } from "../services/message.service";
import { asyncHandler } from "../utils/async-handler";
import { sendSuccess } from "../utils/api-response";

export const messageController = {
  conversations: asyncHandler(async (req, res) => {
    const conversations = await messageService.listConversations(req.user!.id);
    return sendSuccess(res, 200, "Conversations fetched", conversations);
  }),

  start: asyncHandler(async (req, res) => {
    const conversation = await messageService.startConversation(req.user!.id, req.body.userId);
    return sendSuccess(res, 200, "Conversation ready", conversation);
  }),

  messages: asyncHandler(async (req, res) => {
    const messages = await messageService.listMessages(req.user!.id, req.params.id);
    return sendSuccess(res, 200, "Messages fetched", messages);
  }),

  send: asyncHandler(async (req, res) => {
    const message = await messageService.sendMessage(req.user!.id, req.params.id, req.body.body);
    return sendSuccess(res, 201, "Message sent", message);
  }),
};
