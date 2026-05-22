import { commentService } from "../services/comment.service";
import { asyncHandler } from "../utils/async-handler";
import { sendSuccess } from "../utils/api-response";

export const commentController = {
  create: asyncHandler(async (req, res) => {
    const comment = await commentService.create(req.user!.id, req.body);
    return sendSuccess(res, 201, "Comment created", comment);
  }),

  byPost: asyncHandler(async (req, res) => {
    const result = await commentService.listByPost(req.params.id, req.query);
    return sendSuccess(res, 200, "Comments fetched", result.items, result.meta);
  }),

  update: asyncHandler(async (req, res) => {
    const comment = await commentService.update(req.user!.id, req.params.id, req.body.body);
    return sendSuccess(res, 200, "Comment updated", comment);
  }),

  remove: asyncHandler(async (req, res) => {
    await commentService.remove(req.user!.id, req.params.id);
    return sendSuccess(res, 200, "Comment deleted");
  }),
};
