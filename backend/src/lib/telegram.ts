import config from "../config/index.js";

// A thin `fetch` client for the two Bot API methods this feature needs. No SDK:
// two endpoints, no streaming, no uploads — a dependency would be more code to
// audit than the code it replaces.

const API_BASE = "https://api.telegram.org";

/**
 * BOTH the token and the chat id are needed. The token alone can send, but with
 * no trusted chat id there is nothing to check incoming updates against, and
 * `parseDevUpdate` would have to trust every stranger who found the bot. So the
 * relay is either fully configured or fully off — never half-on.
 */
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
  // Telegram holds getUpdates open for as long as it was asked to, so the abort
  // has to outlive the poll rather than cut it off mid-wait.
  const res = await fetch(endpoint(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const json = (await res.json()) as TelegramEnvelope;
  // The Bot API answers 200 with `ok: false` for application errors, so the
  // HTTP status alone is not the check.
  if (!json.ok) {
    throw new Error(
      `telegram ${method} failed: ${res.status} ${json.description ?? "unknown"}`,
    );
  }
  return json.result;
}

/**
 * Sends plain text to the developer's chat. Returns Telegram's message id,
 * which is what makes swipe-reply resolvable later, or null when the relay is
 * switched off.
 *
 * `parse_mode` is deliberately absent. Sending as plain text means nothing a
 * user typed can be read as Telegram markup or entities — which sidesteps
 * escaping entirely rather than trying to get it right.
 */
export async function sendMessage(text: string): Promise<number | null> {
  if (!isTelegramConfigured()) return null;
  const result = await call(
    "sendMessage",
    {
      chat_id: config.telegram.dev_chat_id,
      text,
      // The relay carries no links worth unfurling, and a preview card on every
      // message would bury the messages themselves.
      link_preview_options: { is_disabled: true },
    },
    15_000,
  );
  const id = (result as { message_id?: unknown } | null)?.message_id;
  return typeof id === "number" ? id : null;
}

/**
 * One long poll. Holds for up to `poll_timeout_s` server-side and returns as
 * soon as anything arrives.
 *
 * `offset` doubles as the acknowledgement: asking for `n` tells Telegram every
 * update below `n` was handled and may be forgotten. Anything unconfirmed is
 * retained for ~24h and re-delivered on restart, which is why `dev_messages`
 * carries `tg_update_id UNIQUE` instead of an offset table.
 */
export async function getUpdates(offset: number | null): Promise<unknown[]> {
  if (!isTelegramConfigured()) return [];
  const timeout = config.telegram.poll_timeout_s;
  const result = await call(
    "getUpdates",
    {
      ...(offset === null ? {} : { offset }),
      timeout,
      // Both, for the same reason parseDevUpdate accepts both: a direct chat or
      // group sends `message`, a broadcast channel sends `channel_post`. Asking
      // for only one makes a whole configuration silently do nothing.
      allowed_updates: ["message", "channel_post"],
    },
    // The client must wait out the server's hold, plus room for the round trip.
    (timeout + 10) * 1000,
  );
  return Array.isArray(result) ? result : [];
}
