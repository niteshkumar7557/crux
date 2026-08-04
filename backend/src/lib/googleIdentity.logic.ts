// What Google told us, narrowed, and what to do about it. Pure — the SQL and the
// HTTP live in googleOAuth.ts and the controller.
// Spec: game-theory.md §13

// §13: asked at most three times, a week apart, then never again.
export const GOOGLE_PROMPT_MAX_DISMISSALS = 3;
export const GOOGLE_PROMPT_SNOOZE_DAYS = 7;

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

// The ID token payload is untrusted input and arrives as `unknown`. Coerced field
// by field, never cast — `email_verified` in particular comes back as a boolean
// from some Google endpoints and the string "true" from others, and a bare cast
// would make the string truthy on the path where the boolean is false.
export function narrowGoogleProfile(payload: unknown): GoogleProfile | null {
  if (typeof payload !== "object" || payload === null) return null;
  const p = payload as Record<string, unknown>;

  const sub = str(p.sub);
  const email = str(p.email);
  if (sub === null || email === null) return null;

  return {
    sub,
    email: email.toLowerCase(),
    emailVerified: p.email_verified === true || p.email_verified === "true",
    name: str(p.name),
    picture: str(p.picture),
  };
}

// Belt and braces. The token came from Google's own endpoint over TLS in a
// request we originated, which is why its signature is not checked — but these
// four claims are free to check and they are what a stolen or replayed token
// fails on. The nonce in particular is the one that makes a replay useless.
export function idTokenClaimsValid(
  payload: unknown,
  expected: { clientId: string; nonce: string; now: number },
): boolean {
  if (typeof payload !== "object" || payload === null) return false;
  const p = payload as Record<string, unknown>;

  if (p.aud !== expected.clientId) return false;
  if (p.iss !== "accounts.google.com" && p.iss !== "https://accounts.google.com") {
    return false;
  }
  if (typeof p.exp !== "number" || p.exp * 1000 <= expected.now) return false;
  if (typeof p.nonce !== "string" || p.nonce !== expected.nonce) return false;

  return true;
}

export interface LinkCandidate {
  id: number;
  googleSub: string | null;
}

export type IdentityDecision =
  | { kind: "sign_in"; userId: number }
  | { kind: "link"; userId: number }
  | { kind: "create" }
  | { kind: "refuse"; reason: string };

// bySub  — the account already carrying this Google subject id, if any.
// byEmail — the account holding this address, if any.
export function decideIdentity(
  profile: GoogleProfile,
  bySub: LinkCandidate | null,
  byEmail: LinkCandidate | null,
): IdentityDecision {
  // An unverified Google address proves nothing: anyone can attach an arbitrary
  // address to a Google account and leave it unconfirmed. Trusting one would let
  // a stranger claim any Crux account by typing its owner's email into Google.
  // This is the whole trust boundary of the feature, so it is checked first and
  // it is never softened.
  if (!profile.emailVerified) {
    return { kind: "refuse", reason: "google_email_unverified" };
  }

  if (bySub) return { kind: "sign_in", userId: bySub.id };

  if (byEmail) {
    // §13: this is the migration path. An existing account whose verified email
    // matches links itself the first time its owner presses the button.
    if (byEmail.googleSub === null) return { kind: "link", userId: byEmail.id };
    // Same address, different Google account. Rather than move the link, refuse
    // and say so — silently repointing an account at a new identity is how one
    // gets taken over.
    return { kind: "refuse", reason: "email_linked_elsewhere" };
  }

  return { kind: "create" };
}

export type LinkDecision =
  | { kind: "link"; userId: number }
  | { kind: "already_linked"; userId: number }
  | { kind: "refuse"; reason: string };

// The signed-in case, which is NOT decideIdentity: here we already know who the
// user is, so the only question is whether this Google account is free. Matching
// on email would be wrong — a user linking a work Google account whose address
// differs from their Crux one is doing something entirely legitimate.
export function decideLink(
  profile: GoogleProfile,
  bySub: LinkCandidate | null,
  currentUserId: number,
): LinkDecision {
  if (!profile.emailVerified) {
    return { kind: "refuse", reason: "google_email_unverified" };
  }
  // Someone else already holds this Google identity. Moving it would leave that
  // account with no way back in.
  if (bySub && bySub.id !== currentUserId) {
    return { kind: "refuse", reason: "google_account_in_use" };
  }
  if (bySub) return { kind: "already_linked", userId: currentUserId };
  return { kind: "link", userId: currentUserId };
}

export interface PromptState {
  googleSub: string | null;
  dismissals: number;
  snoozedUntil: Date | null;
}

// Whether to put the link prompt in front of a signed-in user right now.
export function shouldPromptGoogleLink(state: PromptState, now: Date): boolean {
  if (state.googleSub !== null) return false;
  if (state.dismissals >= GOOGLE_PROMPT_MAX_DISMISSALS) return false;
  if (state.snoozedUntil !== null && state.snoozedUntil.getTime() > now.getTime()) {
    return false;
  }
  return true;
}

export function nextSnoozeUntil(now: Date): Date {
  return new Date(now.getTime() + GOOGLE_PROMPT_SNOOZE_DAYS * 24 * 60 * 60 * 1000);
}
