// Mirror of backend/src/lib/username.logic.ts. The frontend cannot import
// backend modules, so this rule is duplicated on purpose — see
// docs/CODEBASE_GUIDE.md §6a. Change one and you must change the other, or
// the form will accept a handle the server rejects.

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const USERNAME_RE = /^[a-z0-9_]+$/;

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
  if (!/[a-z]/.test(value)) {
    return { ok: false, reason: "Usernames need at least one letter." };
  }
  if (RESERVED.has(value)) {
    return { ok: false, reason: "That username is reserved." };
  }

  return { ok: true, value };
}
