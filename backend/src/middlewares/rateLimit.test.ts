import { describe, it, expect } from "vitest";
import {
  clientIp,
  AUTH_LIMIT,
  LLM_LIMIT,
  UPLOAD_LIMIT,
  GLOBAL_LIMIT,
} from "./rateLimit.js";

function fakeReq(headers: Record<string, string>, ip = "10.0.0.9") {
  return { headers, ip } as any;
}

describe("clientIp", () => {
  it("prefers CF-Connecting-IP (set by Cloudflare, unspoofable past it)", () => {
    expect(clientIp(fakeReq({ "cf-connecting-ip": "203.0.113.7" }))).toBe(
      "203.0.113.7",
    );
  });
  it("falls back to req.ip when no Cloudflare header (dev)", () => {
    expect(clientIp(fakeReq({}))).toBe("10.0.0.9");
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
