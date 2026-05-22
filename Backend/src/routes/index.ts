import { Router } from "express";
import authRoutes from "./auth.routes";
import commentRoutes from "./comments.routes";
import communityRoutes from "./communities.routes";
import mediaRoutes from "./media.routes";
import messageRoutes from "./messages.routes";
import notificationRoutes from "./notifications.routes";
import postRoutes from "./posts.routes";
import searchRoutes from "./search.routes";
import settingsRoutes from "./settings.routes";
import userRoutes from "./users.routes";
import voteRoutes from "./votes.routes";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "Backend is healthy",
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
});

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/communities", communityRoutes);
router.use("/posts", postRoutes);
router.use("/comments", commentRoutes);
router.use("/votes", voteRoutes);
router.use("/notifications", notificationRoutes);
router.use("/search", searchRoutes);
router.use("/settings", settingsRoutes);
router.use("/media", mediaRoutes);
router.use("/messages", messageRoutes);

export default router;
