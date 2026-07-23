// A username is a URL segment (`/profile/<username>`), so it is constrained to
// what is unambiguous and safe there. Pure + tested; the frontend mirrors this
// rule in `app/_utils/username.ts` and the two must not drift.

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const USERNAME_RE = /^[a-z0-9_]+$/;

/** Names that would collide with a route or read as system-owned. */
export const RESERVED = new Set([
  "me", "id", "admin", "api", "new", "edit", "settings", "login", "register",
  "logout", "profile", "crux", "root", "support", "help", "about", "rules",
  "null", "undefined",
]);

export function normalizeUsername(raw: string): string {
  return String(raw ?? "").trim().toLowerCase();
}

export type UsernameCheck =
  | { ok: true; value: string }
  | { ok: false; reason: string };

/**
 * Checks run most-specific first, so the message always names the actual
 * problem — "Usernames can't contain spaces." beats a generic charset error
 * for the mistake people actually make.
 */
export function validateUsername(raw: string): UsernameCheck {
  const value = normalizeUsername(raw);

  if (value.length === 0) {
    return { ok: false, reason: "Pick a username." };
  }
  if (/\s/.test(value)) {
    return { ok: false, reason: "Usernames can't contain spaces." };
  }
  if (value.length < USERNAME_MIN || value.length > USERNAME_MAX) {
    return {
      ok: false,
      reason: `Usernames are ${USERNAME_MIN}–${USERNAME_MAX} characters.`,
    };
  }
  if (!USERNAME_RE.test(value)) {
    return { ok: false, reason: "Use letters, numbers and underscores only." };
  }
  // At least one letter is load-bearing: it guarantees an all-digits URL
  // segment is unambiguously a legacy profile id we can redirect.
  if (!/[a-z]/.test(value)) {
    return { ok: false, reason: "Usernames need at least one letter." };
  }
  if (RESERVED.has(value)) {
    return { ok: false, reason: "That username is reserved." };
  }

  return { ok: true, value };
}
