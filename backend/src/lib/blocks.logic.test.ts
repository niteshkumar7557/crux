import { describe, it, expect } from "vitest";
import { ARGUMENT_LIMIT, effectiveAllowance, shouldBlock } from "./blocks.logic.js";

describe("effectiveAllowance", () => {
  it("is the default ARGUMENT_LIMIT with no prior lift", () => {
    expect(effectiveAllowance(null)).toBe(ARGUMENT_LIMIT);
    expect(ARGUMENT_LIMIT).toBe(5);
  });

  it("is the lifted total when a lift exists", () => {
    expect(effectiveAllowance({ allowance: 8 })).toBe(8);
  });
});

describe("shouldBlock", () => {
  it("blocks once the post-insert count reaches the allowance", () => {
    expect(shouldBlock(5, 5)).toBe(true);
    expect(shouldBlock(4, 5)).toBe(false);
  });

  it("respects a raised allowance from a lift", () => {
    expect(shouldBlock(7, 8)).toBe(false);
    expect(shouldBlock(8, 8)).toBe(true);
  });

  it("never blocks below the allowance regardless of magnitude", () => {
    expect(shouldBlock(1, 5)).toBe(false);
  });
});
