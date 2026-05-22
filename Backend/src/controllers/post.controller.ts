import { postService } from "../services/post.service";
import { asyncHandler } from "../utils/async-handler";
import { sendSuccess } from "../utils/api-response";

export const postController = {
  create: asyncHandler(async (req, res) => {
    const post = await postService.create(req.user!.id, req.body);
    return sendSuccess(res, 201, "Post created", post);
  }),

  list: asyncHandler(async (req, res) => {
    const result = await postService.list(req.query, req.user?.id);
    return sendSuccess(res, 200, "Posts fetched", result.items, result.meta);
  }),

  trending: asyncHandler(async (req, res) => {
    const result = await postService.list({ ...req.query, sort: "trending" }, req.user?.id);
    return sendSuccess(res, 200, "Trending posts fetched", result.items, result.meta);
  }),

  get: asyncHandler(async (req, res) => {
    const post = await postService.get(req.params.id, req.user?.id);
    return sendSuccess(res, 200, "Post fetched", post);
  }),

  update: asyncHandler(async (req, res) => {
    const post = await postService.update(req.user!.id, req.params.id, req.body);
    return sendSuccess(res, 200, "Post updated", post);
  }),

  remove: asyncHandler(async (req, res) => {
    await postService.remove(req.user!.id, req.params.id);
    return sendSuccess(res, 200, "Post deleted");
  }),

  save: asyncHandler(async (req, res) => {
    const saved = await postService.save(req.user!.id, req.params.id);
    return sendSuccess(res, 200, "Post saved", saved);
  }),

  unsave: asyncHandler(async (req, res) => {
    await postService.unsave(req.user!.id, req.params.id);
    return sendSuccess(res, 200, "Post unsaved");
  }),
};
