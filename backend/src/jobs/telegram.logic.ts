// Which Telegram updates are trusted, who a reply is addressed to, and what the
// developer reads. Pure. Everything takes `unknown` — this is untrusted external
// JSON, narrowed structurally and never cast.
//
// SECURITY: devChatId is the whole perimeter. getUpdates returns messages from
// anyone who finds the bot, and bot usernames are public — without the chat check a
// stranger could post as the developer into any user's thread.
// Spec: game-theory.md §20

import { USERNAME_MAX, USERNAME_RE, normalizeUsername } from "../lib/username.logic.js";

export type DevReplyTarget =
  | { kind: "reply"; tgMessageId: number }
  | { kind: "username"; username: string };

export type ParseFailure =
  | "not_a_message"
  | "not_dev_chat"
  | "no_text"
  | "no_target"
  | "empty_body";

export type ParsedUpdate =
  | { ok: true; updateId: number; target: DevReplyTarget; body: string }
  | { ok: false; reason: ParseFailure; updateId: number | null };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

const LEADING_HANDLE = /^@(\S+)(?:\s+([\s\S]*))?$/;

export function parseDevUpdate(update: unknown, devChatId: string): ParsedUpdate {
  if (!isRecord(update)) return { ok: false, reason: "not_a_message", updateId: null };

  const updateId = typeof update.update_id === "number" ? update.update_id : null;

  const msg = update.message ?? update.channel_post;
  if (!isRecord(msg)) return { ok: false, reason: "not_a_message", updateId };

  const chat = isRecord(msg.chat) ? msg.chat : null;
  if (!chat || String(chat.id) !== String(devChatId)) {
    return { ok: false, reason: "not_dev_chat", updateId };
  }

  if (typeof msg.text !== "string") return { ok: false, reason: "no_text", updateId };
  const text = msg.text.trim();
  if (text.length === 0) return { ok: false, reason: "no_text", updateId };

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

  const username = normalizeUsername(m[1] ?? "");
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

export function formatRelay(username: string, body: string): string {
  return `@${username}\n${body}`;
}
