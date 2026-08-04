// Pulls a remote profile picture in once, at signup, and stores it as our own
// object — so no page render depends on a third party, next/image needs no
// remotePatterns entry, and a rotated Google URL cannot blank an avatar later.
//
// TRUST BOUNDARY: the URL arrives in an ID token claim. Even though that token
// came from Google, this is a server-side fetch of an attacker-influenceable
// address, so the host is checked against a fixed list before anything is
// requested. Widening that list is a security decision, not a config change.

import crypto from "crypto";
import sharp from "sharp";
import { detectImageType } from "./avatars.js";
import type { AvatarStore } from "./avatarStorage.js";

const ALLOWED_HOSTS = new Set([
  "lh3.googleusercontent.com",
  "lh4.googleusercontent.com",
  "lh5.googleusercontent.com",
  "lh6.googleusercontent.com",
]);

const FETCH_TIMEOUT_MS = 8_000;
const MAX_BYTES = 5 * 1024 * 1024;
const AVATAR_SIZE = 256;
const AVATAR_CONTENT_TYPE = "image/webp";

export function isAllowedAvatarSource(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:" && ALLOWED_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

// Returns the stored URL, or null. Never throws: an avatar is the least
// important thing about a new account, and a signup must not fail because a
// picture did not download.
export async function importAvatarFromUrl(
  store: AvatarStore,
  rawUrl: string,
  userId: number,
): Promise<string | null> {
  if (!isAllowedAvatarSource(rawUrl)) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(rawUrl, { signal: controller.signal, redirect: "error" });
    if (!res.ok) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_BYTES) return null;
    // The same magic-byte check an upload gets: a Content-Type header is a claim,
    // not evidence.
    if (!detectImageType(buffer)) return null;

    const processed = await sharp(buffer)
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover", position: "centre" })
      .webp({ quality: 82 })
      .toBuffer();

    const key = `u${userId}-${crypto.randomUUID()}.webp`;
    await store.put(key, processed, AVATAR_CONTENT_TYPE);
    return store.urlFor(key);
  } catch (err) {
    console.error("avatar import failed:", err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
