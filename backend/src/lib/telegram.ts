// The Telegram HTTP surface: send one message, long-poll for updates.

import config from "../config/index.js";

const API_BASE = "https://api.telegram.org";

export function isTelegramConfigured(): boolean {
  return Boolean(config.telegram.bot_token && config.telegram.dev_chat_id);
}

function endpoint(method: string): string {
  return `${API_BASE}/bot${config.telegram.bot_token}/${method}`;
}

interface TelegramEnvelope {
  ok: boolean;
  result?: unknown;
  description?: string;
}

async function call(
  method: string,
  body: Record<string, unknown>,
  timeoutMs: number,
): Promise<unknown> {
  const res = await fetch(endpoint(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const json = (await res.json()) as TelegramEnvelope;
  if (!json.ok) {
    throw new Error(
      `telegram ${method} failed: ${res.status} ${json.description ?? "unknown"}`,
    );
  }
  return json.result;
}

export async function sendMessage(text: string): Promise<number | null> {
  if (!isTelegramConfigured()) return null;
  const result = await call(
    "sendMessage",
    {
      chat_id: config.telegram.dev_chat_id,
      text,
      link_preview_options: { is_disabled: true },
    },
    15_000,
  );
  const id = (result as { message_id?: unknown } | null)?.message_id;
  return typeof id === "number" ? id : null;
}

export async function getUpdates(offset: number | null): Promise<unknown[]> {
  if (!isTelegramConfigured()) return [];
  const timeout = config.telegram.poll_timeout_s;
  const result = await call(
    "getUpdates",
    {
      ...(offset === null ? {} : { offset }),
      timeout,
      allowed_updates: ["message", "channel_post"],
    },
    (timeout + 10) * 1000,
  );
  return Array.isArray(result) ? result : [];
}
