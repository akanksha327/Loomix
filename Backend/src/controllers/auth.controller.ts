import type { Request, Response } from "express";
import { authService } from "../services/auth.service";
import { asyncHandler } from "../utils/async-handler";
import { sendSuccess } from "../utils/api-response";

function sessionInput(req: Request) {
  return {
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip,
  };
}

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie("accessToken", accessToken, authService.accessCookieOptions());
  res.cookie("refreshToken", refreshToken, authService.refreshCookieOptions());
}

export const authController = {
  firebaseSync: asyncHandler(async (req, res) => {
    const result = await authService.firebaseSync(req.body, sessionInput(req));
    setAuthCookies(res, result.accessToken, result.refreshToken);
    return sendSuccess(res, 200, "Firebase user synced", result);
  }),

  signup: asyncHandler(async (req, res) => {
    const result = await authService.signup(req.body, sessionInput(req));
    setAuthCookies(res, result.accessToken, result.refreshToken);
    return sendSuccess(res, 201, "Account created", result);
  }),

  login: asyncHandler(async (req, res) => {
    const result = await authService.login(req.body, sessionInput(req));
    setAuthCookies(res, result.accessToken, result.refreshToken);
    return sendSuccess(res, 200, "Logged in", result);
  }),

  refresh: asyncHandler(async (req, res) => {
    const result = await authService.refresh(req.body.refreshToken ?? req.cookies?.refreshToken, sessionInput(req));
    setAuthCookies(res, result.accessToken, result.refreshToken);
    return sendSuccess(res, 200, "Token refreshed", result);
  }),

  logout: asyncHandler(async (req, res) => {
    await authService.logout(req.cookies?.refreshToken ?? req.body.refreshToken);
    res.clearCookie("accessToken", authService.accessCookieOptions());
    res.clearCookie("refreshToken", authService.refreshCookieOptions());
    return sendSuccess(res, 200, "Logged out");
  }),

  me: asyncHandler(async (req, res) => {
    const user = await authService.me(req.user!.id);
    return sendSuccess(res, 200, "Current user fetched", user);
  }),

  changePassword: asyncHandler(async (req, res) => {
    await authService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
    res.clearCookie("accessToken", authService.accessCookieOptions());
    res.clearCookie("refreshToken", authService.refreshCookieOptions());
    return sendSuccess(res, 200, "Password changed");
  }),

  requestPasswordReset: asyncHandler(async (req, res) => {
    const result = await authService.requestPasswordReset(req.body.email);
    return sendSuccess(res, 200, "Password reset instructions generated", result);
  }),

  resetPassword: asyncHandler(async (req, res) => {
    await authService.resetPassword(req.body.token, req.body.newPassword);
    return sendSuccess(res, 200, "Password reset complete");
  }),
};
