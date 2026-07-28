import { describe, it, expect } from "vitest";
import {
  atWalkoverRisk,
  emptySideLabel,
  WALKOVER_WARNING_HOURS,
} from "./walkoverRisk";

const NOW = Date.parse("2026-07-23T12:00:00.000Z");
const inHours = (h: number) => new Date(NOW + h * 3_600_000).toISOString();

const base = {
  status: "live",
  closesAt: inHours(2),
  forCount: 0,
  againstCount: 3,
  now: NOW,
};

describe("atWalkoverRisk", () => {
  it("warns when a side is empty and the deadline is close", () => {
    expect(atWalkoverRisk(base)).toBe(true);
  });

  it("stays quiet on a young debate, however empty", () => {
    expect(atWalkoverRisk({ ...base, closesAt: inHours(40) })).toBe(false);
  });

  it("fires exactly at the window edge, not a moment before", () => {
    expect(
      atWalkoverRisk({ ...base, closesAt: inHours(WALKOVER_WARNING_HOURS) }),
    ).toBe(true);
    expect(
      atWalkoverRisk({
        ...base,
        closesAt: inHours(WALKOVER_WARNING_HOURS + 0.01),
      }),
    ).toBe(false);
  });

  it("stays quiet when both sides have argued", () => {
    expect(atWalkoverRisk({ ...base, forCount: 1 })).toBe(false);
  });

  it("warns when NEITHER side has argued", () => {
    expect(atWalkoverRisk({ ...base, forCount: 0, againstCount: 0 })).toBe(true);
  });

  it("stays quiet once concluded — nothing left to act on", () => {
    expect(atWalkoverRisk({ ...base, status: "concluded" })).toBe(false);
  });

  it("stays quiet past the deadline, where warning would only taunt", () => {
    expect(atWalkoverRisk({ ...base, closesAt: inHours(-0.5) })).toBe(false);
  });

  it("stays quiet without a usable deadline", () => {
    expect(atWalkoverRisk({ ...base, closesAt: null })).toBe(false);
    expect(atWalkoverRisk({ ...base, closesAt: "not a date" })).toBe(false);
  });
});

describe("emptySideLabel", () => {
  it("names the silent side", () => {
    expect(emptySideLabel(0, 3)).toBe("FOR");
    expect(emptySideLabel(3, 0)).toBe("AGAINST");
  });

  it("names neither when the whole debate is silent", () => {
    expect(emptySideLabel(0, 0)).toBeNull();
  });
});
