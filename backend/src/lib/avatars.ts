// Avatar paths, the preset list, and a magic-byte image check so a renamed file
// cannot slip past the MIME filter. Presets are static and shared; uploads are not.
// There are exactly two kinds, and "not a preset" is how an upload is recognised —
// which stays correct whether it lives in object storage or on the local disk.

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PUBLIC_DIR = path.join(__dirname, "../../public");
export const UPLOADS_DIR = path.join(PUBLIC_DIR, "uploads/avatars");
export const PRESETS_DIR = path.join(PUBLIC_DIR, "avatars/presets");

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
  return Boolean(avatar) && !avatar!.startsWith(PRESETS_URL_PREFIX);
}

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
