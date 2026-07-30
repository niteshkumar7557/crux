import { describe, it, expect } from "vitest";
import {
  resolveClientIp,
  UNVERIFIED_KEY,
  AUTH_LIMIT,
  LLM_LIMIT,
  UPLOAD_LIMIT,
  GLOBAL_LIMIT,
} from "./rateLimit.js";

function fakeReq(headers: Record<string, string>, ip = "10.0.0.9") {
  return { headers, ip } as any;
}

const SECRET = "s3cret-from-the-edge";
const edge = { production: true, edgeSecret: SECRET };
const stamped = (headers: Record<string, string>) =>
  fakeReq({ "x-edge-secret": SECRET, ...headers });

describe("clientIp — development", () => {
  it("uses req.ip, because there is no CDN in front locally", () => {
    expect(
      resolveClientIp(fakeReq({}), { production: false, edgeSecret: SECRET }),
    ).toBe("10.0.0.9");
  });
  it("never returns an empty key — that would bucket everyone together", () => {
    expect(
      resolveClientIp({ headers: {} } as any, { production: false }),
    ).toBe("unknown");
  });
});

describe("clientIp — verified edge traffic", () => {
  it("uses CF-Connecting-IP when the edge secret matches", () => {
    expect(
      resolveClientIp(stamped({ "cf-connecting-ip": "203.0.113.7" }), edge),
    ).toBe("203.0.113.7");
  });
  it("gives two different clients two different keys", () => {
    const a = resolveClientIp(stamped({ "cf-connecting-ip": "203.0.113.7" }), edge);
    const b = resolveClientIp(stamped({ "cf-connecting-ip": "198.51.100.4" }), edge);
    expect(a).not.toBe(b);
  });
});

describe("clientIp — bypass attempts fail closed", () => {
  it("a forged CF-Connecting-IP without the secret is NOT trusted", () => {
    expect(
      resolveClientIp(fakeReq({ "cf-connecting-ip": "203.0.113.7" }), edge),
    ).toBe(UNVERIFIED_KEY);
  });
  it("a wrong secret is not trusted", () => {
    expect(
      resolveClientIp(
        fakeReq({ "x-edge-secret": "wrong", "cf-connecting-ip": "203.0.113.7" }),
        edge,
      ),
    ).toBe(UNVERIFIED_KEY);
  });
  it("X-Forwarded-For is never consulted — proxies append, so the client controls it", () => {
    expect(
      resolveClientIp(fakeReq({ "x-forwarded-for": "203.0.113.7" }), edge),
    ).toBe(UNVERIFIED_KEY);
    expect(
      resolveClientIp(stamped({ "x-forwarded-for": "203.0.113.7" }), edge),
    ).toBe(UNVERIFIED_KEY);
  });
  it("rotating a forged IP per request cannot mint new identities", () => {
    const keys = ["1.1.1.1", "2.2.2.2", "3.3.3.3"].map((ip) =>
      resolveClientIp(fakeReq({ "cf-connecting-ip": ip }), edge),
    );
    expect(new Set(keys).size).toBe(1);
    expect(keys[0]).toBe(UNVERIFIED_KEY);
  });
});

describe("clientIp — no edge secret configured", () => {
  it("still trusts CF-Connecting-IP, so an unconfigured deploy keeps working", () => {
    expect(
      resolveClientIp(fakeReq({ "cf-connecting-ip": "203.0.113.7" }), {
        production: true,
      }),
    ).toBe("203.0.113.7");
  });
  it("but a request with no CF header is unverified, never req.ip", () => {
    expect(resolveClientIp(fakeReq({}), { production: true })).toBe(
      UNVERIFIED_KEY,
    );
  });
});

describe("limit tiers match the spec", () => {
  it("auth: 10 / 15 min", () =>
    expect(AUTH_LIMIT).toEqual({ windowMs: 15 * 60_000, limit: 10 }));
  it("llm: 6 / min", () =>
    expect(LLM_LIMIT).toEqual({ windowMs: 60_000, limit: 6 }));
  it("upload: 3 / min", () =>
    expect(UPLOAD_LIMIT).toEqual({ windowMs: 60_000, limit: 3 }));
  it("global: 300 / min", () =>
    expect(GLOBAL_LIMIT).toEqual({ windowMs: 60_000, limit: 300 }));
});
