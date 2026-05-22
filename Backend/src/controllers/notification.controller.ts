import { notificationService } from "../services/notification.service";
import { asyncHandler } from "../utils/async-handler";
import { sendSuccess } from "../utils/api-response";

export const notificationController = {
  list: asyncHandler(async (req, res) => {
    const result = await notificationService.list(req.user!.id, req.query);
    return sendSuccess(res, 200, "Notifications fetched", result.items, result.meta);
  }),

  markRead: asyncHandler(async (req, res) => {
    await notificationService.markRead(req.user!.id, req.params.id);
    return sendSuccess(res, 200, "Notification marked as read");
  }),

  markAllRead: asyncHandler(async (req, res) => {
    await notificationService.markAllRead(req.user!.id);
    return sendSuccess(res, 200, "All notifications marked as read");
  }),
};
