import { rateLimit } from "express-rate-limit";
import type { Request } from "express";

// ── Spec §2: starting values, adjustable post-launch ─────────────────────────
export const AUTH_LIMIT = { windowMs: 15 * 60_000, limit: 10 };
export const LLM_LIMIT = { windowMs: 60_000, limit: 6 };
export const UPLOAD_LIMIT = { windowMs: 60_000, limit: 3 };
export const GLOBAL_LIMIT = { windowMs: 60_000, limit: 300 };

// All production traffic arrives through the Cloudflare tunnel, and Cloudflare
// always overwrites CF-Connecting-IP with the real client address — a client
// cannot spoof it past the edge. In dev there is no Cloudflare, so req.ip.
// (This supersedes hop-counted `trust proxy`: the hop chain
// cloudflared -> NPM -> Next proxy is fragile to count, the header is not.)
export function clientIp(req: Request): string {
  const cf = req.headers["cf-connecting-ip"];
  return (Array.isArray(cf) ? cf[0] : cf) ?? req.ip ?? "unknown";
}

function makeLimiter(opts: {
  windowMs: number;
  limit: number;
  message: string;
  byUser?: boolean;
}) {
  return rateLimit({
    windowMs: opts.windowMs,
    limit: opts.limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    // Own key derivation (above); library IP validations don't apply to it.
    validate: false,
    keyGenerator: (req: Request) =>
      opts.byUser && req.user ? `u:${req.user.id}` : `ip:${clientIp(req)}`,
    handler: (_req, res) => {
      // Transparency rule: a limit a user can hit must explain itself.
      res.setHeader("Retry-After", String(Math.ceil(opts.windowMs / 1000)));
      res.status(429).json({ error: "rate_limited", message: opts.message });
    },
  });
}

export const authLimiter = makeLimiter({
  ...AUTH_LIMIT,
  message: "Too many attempts. Try again in a few minutes.",
});
export const llmLimiter = makeLimiter({
  ...LLM_LIMIT,
  byUser: true,
  message: "You're posting fast — take a breath and try again in a minute.",
});
export const uploadLimiter = makeLimiter({
  ...UPLOAD_LIMIT,
  byUser: true,
  message: "Too many uploads — try again in a minute.",
});
export const globalLimiter = makeLimiter({
  ...GLOBAL_LIMIT,
  message: "Too many requests — slow down.",
});
