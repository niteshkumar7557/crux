import { describe, it, expect } from "vitest";
import {
  shouldHotExtend,
  HOT_WINDOW_HOURS,
  HOT_THRESHOLD,
  HOT_EXTENSION_HOURS,
} from "./hotExtension.logic.js";

describe("shouldHotExtend", () => {
  it("extends when velocity meets the threshold and not yet extended", () => {
    expect(shouldHotExtend(HOT_THRESHOLD, false)).toBe(true);
    expect(shouldHotExtend(HOT_THRESHOLD + 3, false)).toBe(true);
  });

  it("does not extend below the threshold", () => {
    expect(shouldHotExtend(HOT_THRESHOLD - 1, false)).toBe(false);
    expect(shouldHotExtend(0, false)).toBe(false);
  });

  it("never extends twice", () => {
    expect(shouldHotExtend(HOT_THRESHOLD, true)).toBe(false);
    expect(shouldHotExtend(HOT_THRESHOLD + 100, true)).toBe(false);
  });

  it("constants match the approved parameters", () => {
    expect(HOT_WINDOW_HOURS).toBe(2);
    expect(HOT_THRESHOLD).toBe(5);
    expect(HOT_EXTENSION_HOURS).toBe(6);
  });
});
