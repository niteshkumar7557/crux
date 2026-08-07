// Who may see the programme. Pure: every input is passed in, nothing reads env.

import { createHash, timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";

export const VIDEO_PASS_COOKIE = "crux_video_pass";
export const VIDEO_PASS_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const SCOPE = "video-debate";

// Hashing first keeps both operands 32 bytes, so the comparison leaks neither the
// password nor its length. An unset password matches nothing at all.
export function passwordAccepted(presented: unknown, expected: string | undefined): boolean {
  if (typeof presented !== "string" || presented === "") return false;
  if (typeof expected !== "string" || expected === "") return false;
  const a = createHash("sha256").update(presented).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export function issueVideoPass(jwtSecret: string): string {
  return jwt.sign({ scope: SCOPE }, jwtSecret, {
    expiresIn: Math.floor(VIDEO_PASS_MAX_AGE_MS / 1000),
  });
}

// The scope claim is load-bearing: an ordinary user token is signed with the same
// secret, and without this check it would open the programme.
export function videoPassAccepted(token: unknown, jwtSecret: string | undefined): boolean {
  if (typeof token !== "string" || token === "") return false;
  if (typeof jwtSecret !== "string" || jwtSecret === "") return false;
  try {
    const claims = jwt.verify(token, jwtSecret);
    return (
      typeof claims === "object" &&
      claims !== null &&
      (claims as { scope?: unknown }).scope === SCOPE
    );
  } catch {
    return false;
  }
}
