import { mediaService } from "../services/media.service";
import { asyncHandler } from "../utils/async-handler";
import { sendSuccess } from "../utils/api-response";

export const mediaController = {
  upload: asyncHandler(async (req, res) => {
    const media = await mediaService.upload(req.user!.id, req.file, req.body.kind ?? "POST");
    return sendSuccess(res, 201, "Media uploaded", media);
  }),
};
