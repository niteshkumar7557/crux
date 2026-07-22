import "dotenv/config";

// The ONE place the backend reads process.env. Everything tunable without a
// code change is defined here, with its default, and imported from here — so
// `.env.example` and this file together are the complete list of knobs.
//
// Two deliberate exceptions:
//   * `economy/season.logic.ts` reads CRUX_SEASON_ZERO itself. It is a pure
//     module and must not import this one — importing it runs `dotenv/config`
//     as a side effect, which would make the season tests depend on your .env.
//   * The GAME RULES are not here. Score ranges, payouts, the draw threshold,
//     the Main Stage size and so on live in the four `*.logic.ts` modules and
//     are fixed by §15 of docs/game-theory.md. They are asserted by unit tests
//     and printed to users on /rules, so an env var that silently changed one
//     would make the product lie to its users. Change those in the spec and
//     the code together.

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
  // ── Server ────────────────────────────────────────────────────────────────
  server_port: num("SERVER_PORT", 8000),
  client_url: process.env.CLIENT_URL,
  node_env: process.env.NODE_ENV,

  db: {
    url: process.env.DB_URL,
  },

  // ── Auth ──────────────────────────────────────────────────────────────────
  jwt_secret: process.env.JWT_SECRET,
  /** Access-token lifetime — any span string jsonwebtoken accepts. */
  access_token_ttl: str("ACCESS_TOKEN_TTL", "15m"),
  /** Refresh-token lifetime in days; used to build a Postgres interval. */
  refresh_token_days: num("REFRESH_TOKEN_DAYS", 7),
  /** bcrypt cost factor. Higher is slower and safer. */
  bcrypt_rounds: num("BCRYPT_ROUNDS", 10),

  // ── LLM provider ──────────────────────────────────────────────────────────
  llm: {
    base_url: str("LLM_BASE_URL", "https://api.groq.com/openai/v1"),
    api_key: process.env.LLM_API_KEY ?? process.env.GROQ_API_KEY,
    model_smart: str("LLM_MODEL_SMART", "openai/gpt-oss-120b"),
    model_fast: str("LLM_MODEL_FAST", "llama-3.3-70b-versatile"),
    /** Per-request abort, in ms. */
    timeout_ms: num("LLM_TIMEOUT_MS", 30_000),
    /** Attempts after the first one fails. */
    retries: num("LLM_RETRIES", 2),
    temperature: num("LLM_TEMPERATURE", 0.2),
    max_tokens: num("LLM_MAX_TOKENS", 3000),
  },

  // ── Background jobs (in-process setInterval pollers) ──────────────────────
  jobs: {
    /** How often to sweep for debates past closes_at. */
    conclusion_tick_ms: num("CONCLUSION_TICK_MS", 60_000),
    /** Max debates concluded per conclusion tick. */
    conclusion_batch: num("CONCLUSION_BATCH", 20),
    /** How often heat, the Main Stage and the DotD are recomputed. */
    featuring_tick_ms: num("FEATURING_TICK_MS", 5 * 60_000),
    /** How often to check whether a season has closed. */
    season_rollover_tick_ms: num("SEASON_ROLLOVER_TICK_MS", 60 * 60_000),
  },

  // ── Limits ────────────────────────────────────────────────────────────────
  limits: {
    /** Comments handed to the Verdict Judge. Caps prompt size and cost. */
    verdict_comments: num("VERDICT_MAX_COMMENTS", 40),
    /** Rows returned by the leaderboard endpoints. */
    leaderboard_rows: num("LEADERBOARD_ROWS", 50),
    /** URLs in the generated sitemap. */
    sitemap_rows: num("SITEMAP_ROWS", 5000),
    /** Max avatar upload, in megabytes. */
    avatar_upload_mb: num("AVATAR_UPLOAD_MB", 5),
  },
};

export default config;
