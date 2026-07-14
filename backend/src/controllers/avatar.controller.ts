import type { Request, Response } from "express";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import pool from "../db/index.js";
import {
  UPLOADS_DIR,
  UPLOADS_URL_PREFIX,
  deleteCustomAvatarFile,
  detectImageType,
  listPresets,
} from "../lib/avatars.js";

const AVATAR_SIZE = 256;

// Preset list for the picker
export async function getAvatarPresets(req: Request, res: Response) {
  try {
    const presets = await listPresets();
    res.status(200).json({ presets });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed to load avatar presets!" });
  }
}

// Custom upload: multer (memory) already ran; process the buffer with sharp
export async function uploadAvatar(req: Request, res: Response) {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: "Please provide an image file!" });
  }

  // MIME type was checked by multer; verify the actual bytes too
  if (!detectImageType(file.buffer)) {
    return res
      .status(400)
      .json({ error: "Only JPEG, PNG or WebP images are allowed!" });
  }

  let processed: Buffer;
  try {
    // sharp strips EXIF/metadata by default (no .withMetadata() call)
    processed = await sharp(file.buffer)
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover", position: "centre" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch (err) {
    console.error(err);
    return res
      .status(400)
      .json({ error: "Could not process that image. Try a different file!" });
  }

  const filename = `u${req.user!.id}-${crypto.randomUUID()}.webp`;
  const filePath = path.join(UPLOADS_DIR, filename);
  const avatarUrl = `${UPLOADS_URL_PREFIX}${filename}`;

  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    await fs.writeFile(filePath, processed);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "avatar upload failed!" });
  }

  try {
    const { rows } = await pool.query(
      `
        SELECT avatar FROM users WHERE id = $1;
      `,
      [req.user!.id],
    );
    const oldAvatar: string | null = rows[0]?.avatar ?? null;

    await pool.query(
      `
        UPDATE users SET avatar = $1 WHERE id = $2;
      `,
      [avatarUrl, req.user!.id],
    );

    await deleteCustomAvatarFile(oldAvatar);

    res.status(200).json({ avatar: avatarUrl });
  } catch (err) {
    console.error(err);
    // the DB never saw the new file — remove it so nothing orphans
    await fs.unlink(filePath).catch(() => {});
    res.status(500).json({ error: "avatar update failed!" });
  }
}

// Preset select: validate the id server-side, never trust a client path
export async function setPresetAvatar(req: Request, res: Response) {
  const { presetId } = req.body;

  try {
    const presets = await listPresets();
    const preset = presets.find((p) => p.id === presetId);

    if (!preset) {
      return res.status(400).json({ error: "Invalid preset id!" });
    }

    const { rows } = await pool.query(
      `
        SELECT avatar FROM users WHERE id = $1;
      `,
      [req.user!.id],
    );
    const oldAvatar: string | null = rows[0]?.avatar ?? null;

    await pool.query(
      `
        UPDATE users SET avatar = $1 WHERE id = $2;
      `,
      [preset.url, req.user!.id],
    );

    await deleteCustomAvatarFile(oldAvatar);

    res.status(200).json({ avatar: preset.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "avatar update failed!" });
  }
}

// Remove avatar: null the column and drop the custom file if there was one
export async function deleteAvatar(req: Request, res: Response) {
  try {
    const { rows } = await pool.query(
      `
        SELECT avatar FROM users WHERE id = $1;
      `,
      [req.user!.id],
    );
    const oldAvatar: string | null = rows[0]?.avatar ?? null;

    await pool.query(
      `
        UPDATE users SET avatar = NULL WHERE id = $1;
      `,
      [req.user!.id],
    );

    await deleteCustomAvatarFile(oldAvatar);

    res.status(200).json({ message: "avatar removed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "avatar removal failed!" });
  }
}
