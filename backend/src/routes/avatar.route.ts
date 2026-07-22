import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import {
  deleteAvatar,
  getAvatarPresets,
  setPresetAvatar,
  uploadAvatar,
} from "../controllers/avatar.controller.js";
import { authMiddleware } from "../middlewares/auth.js";
import config from "../config/index.js";

const UNSUPPORTED_TYPE = "UNSUPPORTED_IMAGE_TYPE";
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Memory storage: the raw upload never touches disk — sharp gets the buffer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.limits.avatar_upload_mb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error(UNSUPPORTED_TYPE));
    }
    cb(null, true);
  },
});

// Wraps multer so its errors come back as user-facing 400s
function uploadAvatarImage(req: Request, res: Response, next: NextFunction) {
  upload.single("avatar")(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ error: "Image is too large — 5MB maximum!" });
    }
    if (err.message === UNSUPPORTED_TYPE) {
      return res
        .status(400)
        .json({ error: "Only JPEG, PNG or WebP images are allowed!" });
    }

    console.error(err);
    return res.status(500).json({ error: "avatar upload failed!" });
  });
}

const avatarRoutes = Router();

avatarRoutes.get("/presets", getAvatarPresets);

// Authorized routes
avatarRoutes.post("/upload", authMiddleware, uploadAvatarImage, uploadAvatar);
avatarRoutes.put("/preset", authMiddleware, setPresetAvatar);
avatarRoutes.delete("/", authMiddleware, deleteAvatar);

export default avatarRoutes;
