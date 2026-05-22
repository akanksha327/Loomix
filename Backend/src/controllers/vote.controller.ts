import { voteService } from "../services/vote.service";
import { asyncHandler } from "../utils/async-handler";
import { sendSuccess } from "../utils/api-response";

export const voteController = {
  post: asyncHandler(async (req, res) => {
    const result = await voteService.votePost(req.user!.id, req.params.id, req.body.value);
    return sendSuccess(res, 200, "Post vote updated", result);
  }),

  comment: asyncHandler(async (req, res) => {
    const result = await voteService.voteComment(req.user!.id, req.params.id, req.body.value);
    return sendSuccess(res, 200, "Comment vote updated", result);
  }),
};
