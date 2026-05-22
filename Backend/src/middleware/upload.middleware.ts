import multer from "multer";
import { env } from "../config/env";

const allowedMediaTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
]);

export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Math.max(env.MAX_UPLOAD_MB, 50) * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMediaTypes.has(file.mimetype)) {
      return callback(new Error("Only jpg, png, webp, gif images and mp4, webm videos are allowed"));
    }
    callback(null, true);
  },
});
