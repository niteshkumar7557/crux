// Avatar presets and uploads. An upload is re-encoded by sharp, which also strips
// EXIF (it never calls withMetadata), and stored under a fresh UUID — so objects are
// immutable and a replacement never races a reader of the old one.

import type { Request, Response } from "express";
import crypto from "crypto";
import sharp from "sharp";
import pool from "../db/index.js";
import config from "../config/index.js";
import { detectImageType, isCustomAvatar, listPresets } from "../lib/avatars.js";
import { keyFromAvatarUrl, makeAvatarStore } from "../lib/avatarStorage.js";

const AVATAR_SIZE = 256;
const AVATAR_CONTENT_TYPE = "image/webp";

export const avatarStore = makeAvatarStore(config.avatar_storage);

async function removeOldAvatar(avatar: string | null) {
  if (!avatar || !isCustomAvatar(avatar)) return;
  try {
    await avatarStore.remove(keyFromAvatarUrl(avatar));
  } catch (err) {
    console.error("failed to delete old avatar:", err);
  }
}

export async function getAvatarPresets(req: Request, res: Response) {
  try {
    const presets = await listPresets();
    res.status(200).json({ presets });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed to load avatar presets!" });
  }
}

export async function uploadAvatar(req: Request, res: Response) {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: "Please provide an image file!" });
  }

  if (!detectImageType(file.buffer)) {
    return res
      .status(400)
      .json({ error: "Only JPEG, PNG or WebP images are allowed!" });
  }

  let processed: Buffer;
  try {
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

  const key = `u${req.user!.id}-${crypto.randomUUID()}.webp`;
  const avatarUrl = avatarStore.urlFor(key);

  try {
    await avatarStore.put(key, processed, AVATAR_CONTENT_TYPE);
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

    await removeOldAvatar(oldAvatar);

    res.status(200).json({ avatar: avatarUrl });
  } catch (err) {
    console.error(err);
    await avatarStore.remove(key).catch(() => {});
    res.status(500).json({ error: "avatar update failed!" });
  }
}

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

    await removeOldAvatar(oldAvatar);

    res.status(200).json({ avatar: preset.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "avatar update failed!" });
  }
}

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

    await removeOldAvatar(oldAvatar);

    res.status(200).json({ message: "avatar removed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "avatar removal failed!" });
  }
}
