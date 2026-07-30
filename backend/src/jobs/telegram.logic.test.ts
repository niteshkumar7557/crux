import { describe, it, expect } from "vitest";
import { parseDevUpdate, formatRelay } from "./telegram.logic.js";

const DEV_CHAT = "12345";

/** A minimal well-formed update from the developer's own chat. */
function devMessage(
  extra: Record<string, unknown> = {},
  updateId = 100,
): unknown {
  return {
    update_id: updateId,
    message: { chat: { id: 12345 }, text: "hello", ...extra },
  };
}

describe("parseDevUpdate — the chat whitelist", () => {
  // The single most important assertion in this feature. getUpdates returns
  // messages from ANYONE who finds the bot, and bot usernames are public and
  // enumerable. Without this check a stranger posts as the developer into any
  // user's thread by typing "@someone <text>".
  it("drops an update from a foreign chat id", () => {
    const out = parseDevUpdate(
      { update_id: 7, message: { chat: { id: 99999 }, text: "@nitesh hi" } },
      DEV_CHAT,
    );
    expect(out).toEqual({ ok: false, reason: "not_dev_chat", updateId: 7 });
  });

  it("still reports the update id it rejected, so the offset can advance", () => {
    const out = parseDevUpdate(
      { update_id: 42, message: { chat: { id: 1 }, text: "hi" } },
      DEV_CHAT,
    );
    // A rejected update that did not advance the offset would be re-fetched
    // forever, and one stranger could wedge the poller permanently.
    expect(out.ok).toBe(false);
    expect(out.updateId).toBe(42);
  });

  it("compares chat ids as strings, so a numeric id from Telegram matches", () => {
    // Telegram sends chat.id as a JSON number; the env var is a string.
    const out = parseDevUpdate(devMessage({ text: "@nitesh yes" }), DEV_CHAT);
    expect(out.ok).toBe(true);
  });
});

describe("parseDevUpdate — update shapes", () => {
  it("accepts a channel_post exactly like a message", () => {
    // Which one Telegram sends depends on whether the configured chat is a
    // direct chat/group or a broadcast channel. Getting this wrong is an
    // invisible "the bot does nothing" failure.
    const out = parseDevUpdate(
      {
        update_id: 5,
        channel_post: { chat: { id: 12345 }, text: "@nitesh from a channel" },
      },
      DEV_CHAT,
    );
    expect(out).toEqual({
      ok: true,
      updateId: 5,
      target: { kind: "username", username: "nitesh" },
      body: "from a channel",
    });
  });

  it("rejects an update carrying neither", () => {
    const out = parseDevUpdate(
      { update_id: 9, edited_message: { chat: { id: 12345 }, text: "hi" } },
      DEV_CHAT,
    );
    expect(out).toEqual({ ok: false, reason: "not_a_message", updateId: 9 });
  });

  it("rejects junk that is not an object at all", () => {
    expect(parseDevUpdate(null, DEV_CHAT).ok).toBe(false);
    expect(parseDevUpdate("nope", DEV_CHAT).ok).toBe(false);
    expect(parseDevUpdate(undefined, DEV_CHAT).ok).toBe(false);
  });

  it("rejects a photo or sticker with no text", () => {
    const out = parseDevUpdate(
      { update_id: 11, message: { chat: { id: 12345 }, photo: [{}] } },
      DEV_CHAT,
    );
    expect(out).toEqual({ ok: false, reason: "no_text", updateId: 11 });
  });
});

describe("parseDevUpdate — reply context wins", () => {
  it("resolves a swipe-reply to the replied-to message id", () => {
    const out = parseDevUpdate(
      devMessage({
        text: "fixed, thanks",
        reply_to_message: { message_id: 8811 },
      }),
      DEV_CHAT,
    );
    expect(out).toEqual({
      ok: true,
      updateId: 100,
      target: { kind: "reply", tgMessageId: 8811 },
      body: "fixed, thanks",
    });
  });

  it("passes the body through untouched when it is a reply", () => {
    // A leading @ inside a reply is far more likely a mention than a redirect,
    // so nothing is stripped and the reply target still wins.
    const out = parseDevUpdate(
      devMessage({
        text: "@nitesh is right about this",
        reply_to_message: { message_id: 900 },
      }),
      DEV_CHAT,
    );
    expect(out).toEqual({
      ok: true,
      updateId: 100,
      target: { kind: "reply", tgMessageId: 900 },
      body: "@nitesh is right about this",
    });
  });

  it("falls back to the @handle when the reply carries no message id", () => {
    const out = parseDevUpdate(
      devMessage({ text: "@nitesh hi", reply_to_message: {} }),
      DEV_CHAT,
    );
    expect(out).toEqual({
      ok: true,
      updateId: 100,
      target: { kind: "username", username: "nitesh" },
      body: "hi",
    });
  });
});

describe("parseDevUpdate — the @handle fallback", () => {
  it("splits a leading handle from the body", () => {
    const out = parseDevUpdate(devMessage({ text: "@nitesh fixed it" }), DEV_CHAT);
    expect(out).toEqual({
      ok: true,
      updateId: 100,
      target: { kind: "username", username: "nitesh" },
      body: "fixed it",
    });
  });

  it("normalizes the handle and trims the body", () => {
    const out = parseDevUpdate(
      devMessage({ text: "  @Nitesh   fixed it  " }),
      DEV_CHAT,
    );
    expect(out).toEqual({
      ok: true,
      updateId: 100,
      target: { kind: "username", username: "nitesh" },
      body: "fixed it",
    });
  });

  it("keeps newlines inside a multi-line body", () => {
    const out = parseDevUpdate(
      devMessage({ text: "@nitesh line one\nline two" }),
      DEV_CHAT,
    );
    expect(out.ok && out.body).toBe("line one\nline two");
  });

  it("rejects a handle with nothing after it", () => {
    const out = parseDevUpdate(devMessage({ text: "@nitesh" }), DEV_CHAT);
    expect(out).toEqual({ ok: false, reason: "empty_body", updateId: 100 });
  });

  it("rejects a handle followed only by whitespace", () => {
    const out = parseDevUpdate(devMessage({ text: "@nitesh    " }), DEV_CHAT);
    expect(out).toEqual({ ok: false, reason: "empty_body", updateId: 100 });
  });

  it("rejects a bot command with no reply context", () => {
    const out = parseDevUpdate(devMessage({ text: "/start" }), DEV_CHAT);
    expect(out).toEqual({ ok: false, reason: "no_target", updateId: 100 });
  });

  it("rejects plain text with no handle and no reply", () => {
    const out = parseDevUpdate(devMessage({ text: "who is this for?" }), DEV_CHAT);
    expect(out).toEqual({ ok: false, reason: "no_target", updateId: 100 });
  });

  it("rejects a handle over the 20-char username maximum", () => {
    const tooLong = "a".repeat(21);
    const out = parseDevUpdate(
      devMessage({ text: `@${tooLong} hello` }),
      DEV_CHAT,
    );
    expect(out).toEqual({ ok: false, reason: "no_target", updateId: 100 });
  });

  it("rejects a handle containing a character usernames cannot hold", () => {
    // The charset comes from lib/username.logic.ts and must not drift from it.
    for (const bad of ["@ni-tesh hi", "@ni.tesh hi", "@ni!tesh hi", "@ni/tesh hi"]) {
      expect(parseDevUpdate(devMessage({ text: bad }), DEV_CHAT).ok).toBe(false);
    }
  });

  it("accepts a handle too short to be a real username, and lets lookup answer", () => {
    // No minimum is enforced here on purpose, unlike validateUsername: "@ni"
    // resolves to no user and the poller replies "no user @ni" in the chat.
    // Rejecting it in the parser would drop the message silently instead —
    // the one failure mode this feature cannot have.
    const out = parseDevUpdate(devMessage({ text: "@ni tesh hi" }), DEV_CHAT);
    expect(out).toEqual({
      ok: true,
      updateId: 100,
      target: { kind: "username", username: "ni" },
      body: "tesh hi",
    });
  });
});

describe("formatRelay", () => {
  it("puts the handle on its own line above the body", () => {
    // Load-bearing: the handle comes from our own users table, never from user
    // input, so a user writing "@someone_else" as their first line cannot make
    // the developer's reply land in the wrong thread.
    expect(formatRelay("nitesh", "there's a typo in my motion")).toBe(
      "@nitesh\nthere's a typo in my motion",
    );
  });

  it("keeps a multi-line body intact below the handle", () => {
    expect(formatRelay("ana", "one\ntwo")).toBe("@ana\none\ntwo");
  });
});
