import { rateLimit } from "express-rate-limit";
import type { Request } from "express";
import { timingSafeEqual } from "crypto";

// ── Spec §2: starting values, adjustable post-launch ─────────────────────────
export const AUTH_LIMIT = { windowMs: 15 * 60_000, limit: 10 };
export const LLM_LIMIT = { windowMs: 60_000, limit: 6 };
export const UPLOAD_LIMIT = { windowMs: 60_000, limit: 3 };
export const GLOBAL_LIMIT = { windowMs: 60_000, limit: 300 };
/**
 * Messages to the developer. Every one of these relays to a Telegram chat one
 * person reads, so the thing being protected is an inbox, not a CPU — five a
 * minute is generous for writing prose and still cannot be used to flood it.
 */
export const DM_LIMIT = { windowMs: 60_000, limit: 5 };

// ── The rate-limit key ───────────────────────────────────────────────────────
//
// Every limiter derives from this one function, which gives it two failure
// modes. If it returns the SAME value for everyone, all four tiers collapse into
// a single site-wide budget. If it returns an ATTACKER-CHOSEN value, they mint a
// fresh identity per request and no limit binds at all. The second is far worse:
// the auth tier (10 per 15 min) is what stands between a stranger and unlimited
// password guesses at /user/login.
//
// So the question is not "which header holds the client IP" but "can this
// request prove where it came from".
//
// Cloudflare overwrites CF-Connecting-IP at its edge, so a client cannot forge
// it *past Cloudflare*. That is the only guarantee we have — and it only covers
// traffic that actually went through Cloudflare. A request that reaches this
// origin directly can set CF-Connecting-IP to whatever it likes, because there
// is no edge in that path to overwrite it. Origin discovery is realistic (DNS
// history predating the CDN, a stray platform hostname), and a PaaS origin
// cannot be IP-restricted to Cloudflare's ranges the way a VPS can.
//
// X-Forwarded-For is worse still and is deliberately not consulted: proxies
// APPEND to it, so its leftmost entry is simply whatever the client sent.
//
// Hence: Cloudflare stamps every request with a shared secret (a Transform Rule
// adding X-Edge-Secret — see RUNBOOK), and the IP header is trusted only when
// that secret matches. Anything unverified fails CLOSED into one shared bucket:
// bypass traffic gets collectively throttled instead of being handed unlimited
// identities. Throttling a stranger too hard is recoverable; not throttling an
// attacker at all is not.

/** Shared bucket for traffic that cannot prove it came through the edge. */
export const UNVERIFIED_KEY = "unverified";

function secretMatches(presented: string, expected: string): boolean {
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on length mismatch, and comparing lengths first
  // leaks only the length of a random secret.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function header(req: Pick<Request, "headers">, name: string): string | undefined {
  const raw = req.headers[name];
  return Array.isArray(raw) ? raw[0] : raw;
}

/**
 * Pure: takes its trust configuration as an argument rather than reading the
 * environment, so the tests below assert on real behaviour without depending on
 * anyone's .env. (Same reason `economy/season.logic.ts` takes a timestamp.)
 */
export function resolveClientIp(
  req: Pick<Request, "headers" | "ip">,
  opts: { production: boolean; edgeSecret?: string | undefined },
): string {
  // Dev and CI have no CDN in front, so the socket address IS the client.
  if (!opts.production) return req.ip ?? "unknown";

  // With a secret configured, provenance is proven or the request is unverified.
  if (opts.edgeSecret) {
    const presented = header(req, "x-edge-secret");
    if (!presented || !secretMatches(presented, opts.edgeSecret)) {
      return UNVERIFIED_KEY;
    }
  }

  return header(req, "cf-connecting-ip") ?? UNVERIFIED_KEY;
}

export function clientIp(req: Request): string {
  return resolveClientIp(req, {
    production: process.env.NODE_ENV === "production",
    edgeSecret: process.env.EDGE_SECRET,
  });
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
export const dmLimiter = makeLimiter({
  ...DM_LIMIT,
  byUser: true,
  message: "That's a lot of messages — give me a minute to read them.",
});
export const globalLimiter = makeLimiter({
  ...GLOBAL_LIMIT,
  message: "Too many requests — slow down.",
});
