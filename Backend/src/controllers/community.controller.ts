import { communityService } from "../services/community.service";
import { asyncHandler } from "../utils/async-handler";
import { sendSuccess } from "../utils/api-response";

export const communityController = {
  create: asyncHandler(async (req, res) => {
    const community = await communityService.create(req.user!.id, req.body);
    return sendSuccess(res, 201, "Community created", community);
  }),

  list: asyncHandler(async (req, res) => {
    const result = await communityService.list(req.query);
    return sendSuccess(res, 200, "Communities fetched", result.items, result.meta);
  }),

  trending: asyncHandler(async (_req, res) => {
    const communities = await communityService.trending();
    return sendSuccess(res, 200, "Trending communities fetched", communities);
  }),

  get: asyncHandler(async (req, res) => {
    const community = await communityService.getBySlug(req.params.slug);
    return sendSuccess(res, 200, "Community fetched", community);
  }),

  update: asyncHandler(async (req, res) => {
    const community = await communityService.update(req.user!.id, req.params.slug, req.body);
    return sendSuccess(res, 200, "Community updated", community);
  }),

  remove: asyncHandler(async (req, res) => {
    await communityService.remove(req.user!.id, req.params.slug);
    return sendSuccess(res, 200, "Community deleted");
  }),

  join: asyncHandler(async (req, res) => {
    const membership = await communityService.join(req.user!.id, req.params.slug);
    return sendSuccess(res, 200, "Joined community", membership);
  }),

  leave: asyncHandler(async (req, res) => {
    await communityService.leave(req.user!.id, req.params.slug);
    return sendSuccess(res, 200, "Left community");
  }),
};
