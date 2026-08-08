import { describe, expect, it } from "vitest";
import { evaluateDelivery } from "./check-delivery.js";

const ORIGIN = "https://cruxdebate.site";

function headers(overrides: Record<string, string | null> = {}): Headers {
  const base: Record<string, string> = {
    "Content-Range": "bytes 0-0/176007260",
    "Cache-Control": "public, max-age=31536000, immutable",
    "Access-Control-Allow-Origin": ORIGIN,
    "Content-Type": "video/mp4",
  };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null) delete base[key];
    else base[key] = value;
  }
  return new Headers(base);
}

function failing(rules: ReturnType<typeof evaluateDelivery>): string[] {
  return rules.filter((rule) => !rule.ok).map((rule) => rule.rule);
}

describe("evaluateDelivery", () => {
  it("passes a correct R2 response that omits Accept-Ranges", () => {
    expect(failing(evaluateDelivery(206, headers(), ORIGIN, "host", 176_007_260))).toEqual([]);
  });

  it("flags the stale-cache signature: no CORS header and a rewritten cache-control", () => {
    const stale = headers({ "Access-Control-Allow-Origin": null, "Cache-Control": "public, max-age=14400" });

    expect(failing(evaluateDelivery(206, stale, ORIGIN, "host", 176_007_260)))
      .toEqual(["cache_control", "cors_origin"]);
  });

  it("rejects a cache-control that lost immutable", () => {
    const rules = evaluateDelivery(206, headers({ "Cache-Control": "public, max-age=31536000" }), ORIGIN, "host", null);

    expect(failing(rules)).toEqual(["cache_control"]);
  });

  it("accepts a wildcard CORS origin, which is what a static edge rule serves", () => {
    const rules = evaluateDelivery(206, headers({ "Access-Control-Allow-Origin": "*" }), ORIGIN, "host", null);

    expect(failing(rules)).toEqual([]);
  });

  it("rejects a wildcard paired with credentials, which no browser honours", () => {
    const rules = evaluateDelivery(206, headers({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": "true",
    }), ORIGIN, "host", null);

    expect(failing(rules)).toEqual(["cors_origin"]);
  });

  it("rejects an explicit range denial but not an absent header", () => {
    expect(failing(evaluateDelivery(206, headers({ "Accept-Ranges": "none" }), ORIGIN, "host", null)))
      .toEqual(["accept_ranges"]);
    expect(failing(evaluateDelivery(206, headers({ "Accept-Ranges": "bytes" }), ORIGIN, "host", null)))
      .toEqual([]);
  });

  it("reports a non-206 status", () => {
    expect(failing(evaluateDelivery(404, headers(), ORIGIN, "host", null))).toContain("range_status");
  });

  it("compares content-range against the expected total when one is given", () => {
    expect(failing(evaluateDelivery(206, headers(), ORIGIN, "host", 999))).toEqual(["content_range"]);
    expect(failing(evaluateDelivery(206, headers(), ORIGIN, "host", null))).toEqual([]);
  });
});
