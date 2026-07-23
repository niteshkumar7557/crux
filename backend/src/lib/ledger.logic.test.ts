import { describe, it, expect } from "vitest";
import { fillLedgerWeeks } from "./ledger.logic.js";

// A Thursday, so the week's Monday is 2026-07-20.
const NOW = new Date("2026-07-23T12:00:00Z");

describe("fillLedgerWeeks", () => {
  it("always returns exactly `weeks` entries, oldest first", () => {
    const out = fillLedgerWeeks([], 12, NOW);
    expect(out).toHaveLength(12);
    expect(out[0]!.weekStart).toBe("2026-05-04");
    expect(out[11]!.weekStart).toBe("2026-07-20");
  });

  it("zero-fills weeks with no events", () => {
    const out = fillLedgerWeeks([], 3, NOW);
    expect(out).toEqual([
      { weekStart: "2026-07-06", amount: 0 },
      { weekStart: "2026-07-13", amount: 0 },
      { weekStart: "2026-07-20", amount: 0 },
    ]);
  });

  it("places rows on their own week", () => {
    const out = fillLedgerWeeks(
      [
        { weekStart: "2026-07-06", amount: 12 },
        { weekStart: "2026-07-20", amount: 7 },
      ],
      3,
      NOW,
    );
    expect(out.map((w) => w.amount)).toEqual([12, 0, 7]);
  });

  it("keeps a negative week negative (the season-only loss penalty)", () => {
    const out = fillLedgerWeeks([{ weekStart: "2026-07-13", amount: -5 }], 3, NOW);
    expect(out.map((w) => w.amount)).toEqual([0, -5, 0]);
  });

  it("ignores rows older than the window", () => {
    const out = fillLedgerWeeks([{ weekStart: "2020-01-06", amount: 99 }], 3, NOW);
    expect(out.map((w) => w.amount)).toEqual([0, 0, 0]);
  });

  it("anchors on Monday even when `now` is itself a Monday", () => {
    const monday = new Date("2026-07-20T00:00:00Z");
    const out = fillLedgerWeeks([], 2, monday);
    expect(out.map((w) => w.weekStart)).toEqual(["2026-07-13", "2026-07-20"]);
  });
});
