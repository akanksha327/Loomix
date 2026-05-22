import { userService } from "../services/user.service";
import { asyncHandler } from "../utils/async-handler";
import { sendSuccess } from "../utils/api-response";

export const userController = {
  profile: asyncHandler(async (req, res) => {
    const user = await userService.getProfile(req.params.username);
    return sendSuccess(res, 200, "User profile fetched", user);
  }),

  updateMe: asyncHandler(async (req, res) => {
    const user = await userService.updateMe(req.user!.id, req.body);
    return sendSuccess(res, 200, "Profile updated", user);
  }),

  updateUsername: asyncHandler(async (req, res) => {
    const result = await userService.updateUsername(req.user!.id, req.body.username);
    return sendSuccess(res, 200, "Username updated", result);
  }),

  checkUsername: asyncHandler(async (req, res) => {
    const result = await userService.checkUsername(req.params.username, req.user?.id);
    return sendSuccess(res, 200, "Username check complete", result);
  }),

  me: asyncHandler(async (req, res) => {
    const user = await userService.getMe(req.user!.id);
    return sendSuccess(res, 200, "Current profile fetched", user);
  }),

  deleteMe: asyncHandler(async (req, res) => {
    await userService.deleteMe(req.user!.id);
    return sendSuccess(res, 200, "Account deleted");
  }),

  posts: asyncHandler(async (req, res) => {
    const result = await userService.listUserPosts(req.params.username, req.query);
    return sendSuccess(res, 200, "User posts fetched", result.items, result.meta);
  }),

  comments: asyncHandler(async (req, res) => {
    const result = await userService.listUserComments(req.params.username, req.query);
    return sendSuccess(res, 200, "User comments fetched", result.items, result.meta);
  }),

  savedPosts: asyncHandler(async (req, res) => {
    const result = await userService.savedPosts(req.user!.id, req.query);
    return sendSuccess(res, 200, "Saved posts fetched", result.items, result.meta);
  }),

  followers: asyncHandler(async (req, res) => {
    const result = await userService.followers(req.user!.id);
    return sendSuccess(res, 200, "Followers fetched", result.map((item) => item.follower));
  }),

  following: asyncHandler(async (req, res) => {
    const result = await userService.following(req.user!.id);
    return sendSuccess(res, 200, "Following fetched", result.map((item) => item.following));
  }),

  follow: asyncHandler(async (req, res) => {
    const follow = await userService.follow(req.user!.id, req.params.userId);
    return sendSuccess(res, 200, "User followed", follow);
  }),

  unfollow: asyncHandler(async (req, res) => {
    await userService.unfollow(req.user!.id, req.params.userId);
    return sendSuccess(res, 200, "User unfollowed");
  }),

  block: asyncHandler(async (req, res) => {
    const block = await userService.block(req.user!.id, req.params.userId);
    return sendSuccess(res, 200, "User blocked", block);
  }),

  unblock: asyncHandler(async (req, res) => {
    await userService.unblock(req.user!.id, req.params.userId);
    return sendSuccess(res, 200, "User unblocked");
  }),

  sessions: asyncHandler(async (req, res) => {
    const sessions = await userService.listSessions(req.user!.id);
    return sendSuccess(res, 200, "Sessions fetched", sessions);
  }),

  revokeSessions: asyncHandler(async (req, res) => {
    await userService.revokeAllSessions(req.user!.id);
    return sendSuccess(res, 200, "All other sessions revoked");
  }),
};
