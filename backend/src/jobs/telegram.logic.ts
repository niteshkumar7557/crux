import { USERNAME_MAX, USERNAME_RE, normalizeUsername } from "../lib/username.logic.js";

// The decisions in the Telegram relay that are worth testing, with no I/O in
// sight: which updates are trusted, who a reply is addressed to, and what the
// developer actually reads in Telegram.
//
// Everything here takes `unknown`. This is untrusted external JSON — narrowed
// structurally, never cast.

export type DevReplyTarget =
  | { kind: "reply"; tgMessageId: number }
  | { kind: "username"; username: string };

export type ParseFailure =
  /** An update kind we don't handle (edited_message, callback_query, …). */
  | "not_a_message"
  /** Came from someone who found the bot. See the security note below. */
  | "not_dev_chat"
  /** A photo, sticker, location — no text to relay. */
  | "no_text"
  /** No reply context and no leading @handle (e.g. "/start"). */
  | "no_target"
  /** "@nitesh" with nothing after it. */
  | "empty_body";

export type ParsedUpdate =
  | { ok: true; updateId: number; target: DevReplyTarget; body: string }
  | { ok: false; reason: ParseFailure; updateId: number | null };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/**
 * A leading `@something` and the rest of the line. Deliberately loose — `\S+`
 * grabs whatever the developer typed, and the handle is then validated against
 * `USERNAME_RE` and `USERNAME_MAX` from lib/username.logic.ts. Encoding the
 * charset into this pattern instead would let the two drift silently apart.
 */
const LEADING_HANDLE = /^@(\S+)(?:\s+([\s\S]*))?$/;

/**
 * Parses one `getUpdates` entry into "who is this for, and what does it say".
 *
 * SECURITY: `devChatId` is the whole perimeter. `getUpdates` returns messages
 * from anyone who finds the bot, and bot usernames are public and enumerable —
 * so without the chat check a stranger could post as the developer into any
 * user's thread just by typing `@someone <text>`. Rejected here, in a pure
 * function, before any database access.
 *
 * Failures still carry `updateId` when one was present: the caller advances its
 * offset past every update it saw, including the ones it threw away. An update
 * that never advanced the offset would be re-fetched forever, so one stranger
 * with one sticker could otherwise wedge the poller permanently.
 */
export function parseDevUpdate(update: unknown, devChatId: string): ParsedUpdate {
  if (!isRecord(update)) return { ok: false, reason: "not_a_message", updateId: null };

  const updateId = typeof update.update_id === "number" ? update.update_id : null;

  // Both kinds are accepted, and getUpdates asks for both. Which one Telegram
  // sends depends on whether the configured chat is a direct chat / group
  // (`message`) or a broadcast channel (`channel_post`), and guessing wrong is
  // an invisible "the bot does nothing" failure. One `??` removes the class.
  const msg = update.message ?? update.channel_post;
  if (!isRecord(msg)) return { ok: false, reason: "not_a_message", updateId };

  const chat = isRecord(msg.chat) ? msg.chat : null;
  // Compared as strings: Telegram sends chat.id as a JSON number, the env var
  // is text, and a negative group id has to survive the trip either way.
  if (!chat || String(chat.id) !== String(devChatId)) {
    return { ok: false, reason: "not_dev_chat", updateId };
  }

  if (typeof msg.text !== "string") return { ok: false, reason: "no_text", updateId };
  const text = msg.text.trim();
  if (text.length === 0) return { ok: false, reason: "no_text", updateId };

  // Reply context wins when present. Swipe-replying is a deliberate act bound
  // to one specific message and cannot be ambiguous, whereas a leading `@` in a
  // reply is far more likely a mention than a redirect — so the body is passed
  // through untouched and nothing is stripped.
  const replyTo = isRecord(msg.reply_to_message) ? msg.reply_to_message : null;
  if (replyTo && typeof replyTo.message_id === "number") {
    return {
      ok: true,
      updateId: updateId as number,
      target: { kind: "reply", tgMessageId: replyTo.message_id },
      body: text,
    };
  }

  const m = LEADING_HANDLE.exec(text);
  if (!m) return { ok: false, reason: "no_target", updateId };

  // `?? ""` only satisfies noUncheckedIndexedAccess — group 1 is not optional in
  // the pattern. An empty handle would fail USERNAME_RE below anyway.
  const username = normalizeUsername(m[1] ?? "");
  // No minimum length is enforced, unlike validateUsername. A too-short handle
  // simply resolves to no user, and the caller answers "no user @ni" in the
  // chat — which teaches the developer something. Rejecting it here would drop
  // the message silently instead, the one failure mode this feature can't have.
  if (username.length > USERNAME_MAX || !USERNAME_RE.test(username)) {
    return { ok: false, reason: "no_target", updateId };
  }

  const body = (m[2] ?? "").trim();
  if (body.length === 0) return { ok: false, reason: "empty_body", updateId };

  return {
    ok: true,
    updateId: updateId as number,
    target: { kind: "username", username },
    body,
  };
}

/**
 * The line the developer reads in Telegram: `@username` on its own line, then
 * the message.
 *
 * The handle is always on its own line above the body, and always comes from
 * our own `users` table rather than from anything the user typed — so a user
 * whose first line is "@someone_else" cannot make a swipe-reply land in a
 * stranger's thread.
 */
export function formatRelay(username: string, body: string): string {
  return `@${username}\n${body}`;
}
