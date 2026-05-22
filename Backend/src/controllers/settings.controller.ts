import { settingsService } from "../services/settings.service";
import { asyncHandler } from "../utils/async-handler";
import { sendSuccess } from "../utils/api-response";

export const settingsController = {
  get: asyncHandler(async (req, res) => {
    const settings = await settingsService.get(req.user!.id);
    return sendSuccess(res, 200, "Settings fetched", settings);
  }),

  update: asyncHandler(async (req, res) => {
    const settings = await settingsService.update(req.user!.id, req.body);
    return sendSuccess(res, 200, "Settings updated", settings);
  }),
};
