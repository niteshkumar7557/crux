// The ONE place the backend reads process.env. Every knob is defined here with its
// default and imported from here, so this file and .env.example together are the
// complete list. Never read process.env at a call site.
//
// Two modules read the environment directly instead — season.logic.ts and
// rateLimit.ts — because they must stay pure and importable by tests without
// dragging dotenv/config in as a side effect.
//
// GAME RULES ARE NOT CONFIG. Score ranges, payouts and the rest live in the
// *.logic.ts modules and are fixed by game-theory.md §21: they are asserted by
// unit tests and printed to users, so an env override would make the product lie.

import "dotenv/config";

function str(name: string, fallback: string): string {
  const v = process.env[name];
  return v === undefined || v === "" ? fallback : v;
}

function num(name: string, fallback: number): number {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  const n = Number(v);
  if (!Number.isFinite(n)) {
    throw new Error(`Config: ${name} must be a number, got "${v}"`);
  }
  return n;
}

const config = {
  server_port: num("PORT", num("SERVER_PORT", 8000)),
  client_url: process.env.CLIENT_URL,
  node_env: process.env.NODE_ENV,
  log_level: str("LOG_LEVEL", "info"),
  sentry_dsn: process.env.SENTRY_DSN,
  edge_secret: process.env.EDGE_SECRET,

  db: {
    url: process.env.DB_URL,
  },

  avatar_storage: {
    endpoint: process.env.R2_ENDPOINT,
    bucket: process.env.R2_AVATAR_BUCKET,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    publicUrl: process.env.R2_AVATAR_PUBLIC_URL,
  },

  jwt_secret: process.env.JWT_SECRET,
  access_token_ttl: str("ACCESS_TOKEN_TTL", "15m"),
  refresh_token_days: num("REFRESH_TOKEN_DAYS", 7),
  bcrypt_rounds: num("BCRYPT_ROUNDS", 10),

  llm: {
    base_url: str("LLM_BASE_URL", "https://openrouter.ai/api/v1"),
    api_key: process.env.LLM_API_KEY ?? process.env.OPENROUTER_API_KEY,
    model: str("LLM_MODEL", "deepseek/deepseek-v4-flash"),
    timeout_ms: num("LLM_TIMEOUT_MS", 30_000),
    retries: num("LLM_RETRIES", 2),
    temperature: num("LLM_TEMPERATURE", 0.2),
    max_tokens: num("LLM_MAX_TOKENS", 3000),
    reasoning: str("LLM_REASONING", "off"),
  },

  telegram: {
    bot_token: process.env.TELEGRAM_BOT_TOKEN,
    dev_chat_id: process.env.TELEGRAM_DEV_CHAT_ID,
    poll_timeout_s: num("TELEGRAM_POLL_TIMEOUT_S", 30),
    dev_username: str("DEV_USERNAME", "dev_nitesh"),
  },

  jobs: {
    conclusion_tick_ms: num("CONCLUSION_TICK_MS", 60_000),
    conclusion_batch: num("CONCLUSION_BATCH", 20),
    featuring_tick_ms: num("FEATURING_TICK_MS", 5 * 60_000),
    season_rollover_tick_ms: num("SEASON_ROLLOVER_TICK_MS", 60 * 60_000),
  },

  limits: {
    verdict_arguments: num("VERDICT_MAX_ARGUMENTS", 40),
    leaderboard_rows: num("LEADERBOARD_ROWS", 50),
    sitemap_rows: num("SITEMAP_ROWS", 5000),
    avatar_upload_mb: num("AVATAR_UPLOAD_MB", 5),
    profile_history_rows: num("PROFILE_HISTORY_ROWS", 10),
    profile_live_rows: num("PROFILE_LIVE_ROWS", 6),
    profile_ledger_weeks: num("PROFILE_LEDGER_WEEKS", 12),
    dev_message_chars: num("DEV_MESSAGE_MAX_CHARS", 1000),
  },
};

export default config;
