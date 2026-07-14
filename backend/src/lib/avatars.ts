import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// src/lib and dist/lib are both two levels below the backend root,
// so this resolves to backend/public in dev (tsx) and prod (dist) alike.
export const PUBLIC_DIR = path.join(__dirname, "../../public");
export const UPLOADS_DIR = path.join(PUBLIC_DIR, "uploads/avatars");
export const PRESETS_DIR = path.join(PUBLIC_DIR, "avatars/presets");

// values stored in users.avatar are these public URL paths — the prefix
// distinguishes a shared preset from a user's own uploaded file
export const UPLOADS_URL_PREFIX = "/uploads/avatars/";
export const PRESETS_URL_PREFIX = "/avatars/presets/";

const PRESET_FILE_PATTERN = /^(preset-\d{2})\.svg$/;

export async function listPresets() {
  const files = await fs.readdir(PRESETS_DIR);
  return files
    .filter((file) => PRESET_FILE_PATTERN.test(file))
    .sort()
    .map((file) => ({
      id: file.match(PRESET_FILE_PATTERN)![1],
      url: `${PRESETS_URL_PREFIX}${file}`,
    }));
}

export function isCustomAvatar(avatar: string | null) {
  return Boolean(avatar?.startsWith(UPLOADS_URL_PREFIX));
}

// Removes a user's uploaded file; presets are shared and never deleted.
// A missing file is fine — the DB row is the source of truth.
export async function deleteCustomAvatarFile(avatar: string | null) {
  if (!avatar || !isCustomAvatar(avatar)) return;

  const filePath = path.join(UPLOADS_DIR, path.basename(avatar));
  try {
    await fs.unlink(filePath);
  } catch (err: any) {
    if (err?.code !== "ENOENT") {
      console.error("failed to delete old avatar file:", err);
    }
  }
}

// Magic-byte check so a renamed .txt/.exe can't sneak past the MIME filter
export function detectImageType(buffer: Buffer): "jpeg" | "png" | "webp" | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "png";
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }
  return null;
}
