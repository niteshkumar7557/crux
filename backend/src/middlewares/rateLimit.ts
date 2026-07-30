// Five limit tiers, all keyed off clientIp() — which is about PROVENANCE, not about
// finding an IP. Return the same value for everyone and every tier collapses into
// one site-wide budget; return an attacker-chosen value and no limit binds at all,
// including the guard on login.
//
// So the CDN stamps a shared secret and the IP header is trusted only when it
// matches. Anything unverified fails CLOSED into one shared bucket: throttling a
// stranger too hard is recoverable, not throttling an attacker is not.
// X-Forwarded-For is deliberately never read — proxies APPEND to it, so its leftmost
// entry is whatever the client sent.
//
// resolveClientIp takes its trust configuration as an argument so the tests assert
// real behaviour without depending on anyone's .env.

import { rateLimit } from "express-rate-limit";
import type { Request } from "express";
import { timingSafeEqual } from "crypto";

export const AUTH_LIMIT = { windowMs: 15 * 60_000, limit: 10 };
export const LLM_LIMIT = { windowMs: 60_000, limit: 6 };
export const UPLOAD_LIMIT = { windowMs: 60_000, limit: 3 };
export const GLOBAL_LIMIT = { windowMs: 60_000, limit: 300 };
export const DM_LIMIT = { windowMs: 60_000, limit: 5 };

export const UNVERIFIED_KEY = "unverified";

function secretMatches(presented: string, expected: string): boolean {
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on a length mismatch, and comparing lengths first
  // leaks only the length of a random secret.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function header(req: Pick<Request, "headers">, name: string): string | undefined {
  const raw = req.headers[name];
  return Array.isArray(raw) ? raw[0] : raw;
}

export function resolveClientIp(
  req: Pick<Request, "headers" | "ip">,
  opts: { production: boolean; edgeSecret?: string | undefined },
): string {
  if (!opts.production) return req.ip ?? "unknown";

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
    // Own key derivation below; the library's IP validations do not apply to it.
    validate: false,
    keyGenerator: (req: Request) =>
      opts.byUser && req.user ? `u:${req.user.id}` : `ip:${clientIp(req)}`,
    handler: (_req, res) => {
      // §19: a limit a user can hit must explain itself.
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
