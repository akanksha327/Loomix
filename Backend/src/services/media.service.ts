import type { UploadApiResponse } from "cloudinary";
import { cloudinary, isCloudinaryConfigured } from "../config/cloudinary";
import { db } from "../lib/db";
import { AppError } from "../utils/errors";
import fs from "fs";
import path from "path";

function uploadBuffer(file: Express.Multer.File, folder: string) {
  return new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Upload failed"));
        resolve(result);
      },
    );
    stream.end(file.buffer);
  });
}

export const mediaService = {
  async upload(userId: string, file: Express.Multer.File | undefined, kind: "AVATAR" | "BANNER" | "POST") {
    if (!file) throw new AppError(400, "Media file is required", "FILE_REQUIRED");

    if (!isCloudinaryConfigured) {
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
      const uploadsDir = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const filepath = path.join(uploadsDir, filename);
      await fs.promises.writeFile(filepath, file.buffer);
      const url = `/uploads/${filename}`;

      return db.mediaAsset.create({
        data: {
          provider: "local",
          publicId: filename,
          url,
          mimeType: file.mimetype,
          size: file.size,
          kind,
          uploaderId: userId,
        },
      });
    }

    const uploaded = await uploadBuffer(file, `labmentix/${kind.toLowerCase()}`);
    return db.mediaAsset.create({
      data: {
        provider: "cloudinary",
        publicId: uploaded.public_id,
        url: uploaded.secure_url,
        mimeType: file.mimetype,
        size: file.size,
        kind,
        uploaderId: userId,
      },
    });
  },
};
