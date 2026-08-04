import { describe, it, expect } from "vitest";
import {
  decideIdentity,
  decideLink,
  idTokenClaimsValid,
  narrowGoogleProfile,
  nextSnoozeUntil,
  shouldPromptGoogleLink,
  GOOGLE_PROMPT_MAX_DISMISSALS,
  GOOGLE_PROMPT_SNOOZE_DAYS,
  type GoogleProfile,
} from "./googleIdentity.logic.js";

const profile = (over: Partial<GoogleProfile> = {}): GoogleProfile => ({
  sub: "11726",
  email: "nitesh@gmail.com",
  emailVerified: true,
  name: "Nitesh",
  picture: "https://lh3.googleusercontent.com/a/x",
  ...over,
});

describe("narrowGoogleProfile", () => {
  it("takes the fields it needs from a well-formed payload", () => {
    expect(
      narrowGoogleProfile({
        sub: "11726",
        email: "Nitesh@Gmail.com",
        email_verified: true,
        name: "Nitesh",
        picture: "https://lh3.googleusercontent.com/a/x",
        aud: "ignored",
      }),
    ).toEqual({
      sub: "11726",
      email: "nitesh@gmail.com",
      emailVerified: true,
      name: "Nitesh",
      picture: "https://lh3.googleusercontent.com/a/x",
    });
  });

  it("accepts email_verified as the string Google sometimes sends", () => {
    expect(narrowGoogleProfile({ sub: "1", email: "a@b.c", email_verified: "true" })
      ?.emailVerified).toBe(true);
  });

  it("does not treat the string 'false' as verified", () => {
    expect(narrowGoogleProfile({ sub: "1", email: "a@b.c", email_verified: "false" })
      ?.emailVerified).toBe(false);
  });

  it("defaults to unverified when the claim is missing entirely", () => {
    expect(narrowGoogleProfile({ sub: "1", email: "a@b.c" })?.emailVerified).toBe(false);
  });

  it("rejects a payload with no subject or no email", () => {
    expect(narrowGoogleProfile({ email: "a@b.c", email_verified: true })).toBeNull();
    expect(narrowGoogleProfile({ sub: "1", email_verified: true })).toBeNull();
    expect(narrowGoogleProfile({ sub: "", email: "a@b.c" })).toBeNull();
  });

  it("rejects anything that is not an object", () => {
    for (const junk of [null, undefined, 7, "sub", [], true]) {
      expect(narrowGoogleProfile(junk)).toBeNull();
    }
  });

  it("nulls optional fields rather than inventing them", () => {
    const p = narrowGoogleProfile({ sub: "1", email: "a@b.c", email_verified: true });
    expect(p?.name).toBeNull();
    expect(p?.picture).toBeNull();
  });
});

describe("decideIdentity", () => {
  it("refuses an unverified address before anything else", () => {
    const unverified = profile({ emailVerified: false });
    // Even with a perfectly good existing link, the refusal wins.
    expect(decideIdentity(unverified, { id: 4, googleSub: "11726" }, null)).toEqual({
      kind: "refuse",
      reason: "google_email_unverified",
    });
  });

  it("signs in an account already carrying this subject id", () => {
    expect(decideIdentity(profile(), { id: 4, googleSub: "11726" }, null)).toEqual({
      kind: "sign_in",
      userId: 4,
    });
  });

  it("links an existing password account on a matching verified email", () => {
    expect(decideIdentity(profile(), null, { id: 9, googleSub: null })).toEqual({
      kind: "link",
      userId: 9,
    });
  });

  it("refuses when the address belongs to a different Google account", () => {
    expect(decideIdentity(profile(), null, { id: 9, googleSub: "other-sub" })).toEqual({
      kind: "refuse",
      reason: "email_linked_elsewhere",
    });
  });

  it("creates when nothing matches", () => {
    expect(decideIdentity(profile(), null, null)).toEqual({ kind: "create" });
  });

  it("prefers the subject match over the email match", () => {
    // A user who changed their Crux email to someone else's old address must not
    // drag that other account along.
    expect(
      decideIdentity(profile(), { id: 4, googleSub: "11726" }, { id: 9, googleSub: null }),
    ).toEqual({ kind: "sign_in", userId: 4 });
  });
});

describe("idTokenClaimsValid", () => {
  const now = Date.parse("2026-08-04T12:00:00.000Z");
  const claims = (over: Record<string, unknown> = {}) => ({
    aud: "client-123",
    iss: "https://accounts.google.com",
    exp: Math.floor(now / 1000) + 600,
    nonce: "nonce-abc",
    ...over,
  });
  const expected = { clientId: "client-123", nonce: "nonce-abc", now };

  it("accepts a well-formed token for this client", () => {
    expect(idTokenClaimsValid(claims(), expected)).toBe(true);
  });

  it("accepts the bare issuer form Google also uses", () => {
    expect(idTokenClaimsValid(claims({ iss: "accounts.google.com" }), expected)).toBe(true);
  });

  it("rejects a token minted for a different client", () => {
    expect(idTokenClaimsValid(claims({ aud: "someone-else" }), expected)).toBe(false);
  });

  it("rejects an unexpected issuer", () => {
    expect(idTokenClaimsValid(claims({ iss: "https://evil.example.com" }), expected)).toBe(false);
  });

  it("rejects an expired token", () => {
    expect(idTokenClaimsValid(claims({ exp: Math.floor(now / 1000) - 1 }), expected)).toBe(false);
  });

  it("rejects a replayed token whose nonce is not the one we issued", () => {
    expect(idTokenClaimsValid(claims({ nonce: "some-old-nonce" }), expected)).toBe(false);
    expect(idTokenClaimsValid(claims({ nonce: undefined }), expected)).toBe(false);
  });

  it("rejects junk rather than throwing", () => {
    for (const junk of [null, undefined, 7, "token", []]) {
      expect(idTokenClaimsValid(junk, expected)).toBe(false);
    }
  });
});

describe("decideLink", () => {
  it("links a Google account nobody holds to the signed-in user", () => {
    expect(decideLink(profile(), null, 9)).toEqual({ kind: "link", userId: 9 });
  });

  it("is a no-op when the user already holds this Google account", () => {
    expect(decideLink(profile(), { id: 9, googleSub: "11726" }, 9)).toEqual({
      kind: "already_linked",
      userId: 9,
    });
  });

  it("refuses to move a Google account off someone else", () => {
    expect(decideLink(profile(), { id: 4, googleSub: "11726" }, 9)).toEqual({
      kind: "refuse",
      reason: "google_account_in_use",
    });
  });

  it("refuses an unverified address", () => {
    expect(decideLink(profile({ emailVerified: false }), null, 9)).toEqual({
      kind: "refuse",
      reason: "google_email_unverified",
    });
  });

  it("does not require the Google address to match the account's own", () => {
    // Linking a work Google account to a personal Crux address is legitimate.
    expect(decideLink(profile({ email: "nitesh@work.com" }), null, 9)).toEqual({
      kind: "link",
      userId: 9,
    });
  });
});

describe("shouldPromptGoogleLink", () => {
  const now = new Date("2026-08-04T12:00:00.000Z");
  const state = (over: Partial<Parameters<typeof shouldPromptGoogleLink>[0]> = {}) => ({
    googleSub: null,
    dismissals: 0,
    snoozedUntil: null,
    ...over,
  });

  it("asks an unlinked account that has never dismissed", () => {
    expect(shouldPromptGoogleLink(state(), now)).toBe(true);
  });

  it("never asks an account that is already linked", () => {
    expect(shouldPromptGoogleLink(state({ googleSub: "11726" }), now)).toBe(false);
  });

  it("stays quiet while the snooze is running", () => {
    const snoozedUntil = new Date("2026-08-06T12:00:00.000Z");
    expect(shouldPromptGoogleLink(state({ dismissals: 1, snoozedUntil }), now)).toBe(false);
  });

  it("asks again once the snooze has lapsed", () => {
    const snoozedUntil = new Date("2026-08-03T12:00:00.000Z");
    expect(shouldPromptGoogleLink(state({ dismissals: 1, snoozedUntil }), now)).toBe(true);
  });

  it("gives up for good after the third dismissal", () => {
    expect(
      shouldPromptGoogleLink(state({ dismissals: GOOGLE_PROMPT_MAX_DISMISSALS }), now),
    ).toBe(false);
    // And a lapsed snooze does not revive it.
    expect(
      shouldPromptGoogleLink(
        state({
          dismissals: GOOGLE_PROMPT_MAX_DISMISSALS,
          snoozedUntil: new Date("2026-01-01T00:00:00.000Z"),
        }),
        now,
      ),
    ).toBe(false);
  });

  it("holds the documented ceiling", () => {
    expect(GOOGLE_PROMPT_MAX_DISMISSALS).toBe(3);
    expect(GOOGLE_PROMPT_SNOOZE_DAYS).toBe(7);
  });
});

describe("nextSnoozeUntil", () => {
  it("pushes the prompt out by exactly the documented week", () => {
    const now = new Date("2026-08-04T12:00:00.000Z");
    expect(nextSnoozeUntil(now).toISOString()).toBe("2026-08-11T12:00:00.000Z");
  });
});
