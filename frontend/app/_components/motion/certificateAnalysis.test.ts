import { describe, it, expect } from "vitest";
import {
  isEmptyAnalysis,
  LEAD_MAX,
  MAX_POINTS,
  parseAnalysis,
  POINT_MAX,
} from "./certificateAnalysis";

const point = (text: string, argumentId: number | null = null) => ({
  author: argumentId === null ? null : "maya",
  argumentId,
  text,
});

const REAL = {
  lead: "The case in favor holds up under scrutiny.",
  points: [
    point("Historical precedent shows similar shifts succeeded", 41),
    point("Early adopters and case studies already demonstrate the claim"),
    point("The main objections rely on worst-case scenarios, not likely ones"),
  ],
};

describe("parseAnalysis", () => {
  it("flattens the structured analysis into a lead and its points", () => {
    expect(parseAnalysis(REAL)).toEqual({
      lead: "The case in favor holds up under scrutiny.",
      points: [
        "Historical precedent shows similar shifts succeeded",
        "Early adopters and case studies already demonstrate the claim",
        "The main objections rely on worst-case scenarios, not likely ones",
      ],
    });
  });

  it("drops attribution — a name per line crowds the card at this size", () => {
    expect(parseAnalysis(REAL).points.join(" ")).not.toContain("maya");
  });

  it("caps the number of points the card can hold", () => {
    const many = {
      lead: "L",
      points: Array.from({ length: MAX_POINTS + 4 }, (_, i) =>
        point(`point ${i}`),
      ),
    };
    expect(parseAnalysis(many).points).toHaveLength(MAX_POINTS);
  });

  it("truncates a long lead and long points", () => {
    const flat = parseAnalysis({
      lead: "lead ".repeat(200),
      points: [point("point ".repeat(200))],
    });
    expect(flat.lead.length).toBeLessThanOrEqual(LEAD_MAX + 1);
    expect(flat.points[0].length).toBeLessThanOrEqual(POINT_MAX + 1);
  });

  it("drops points with no usable text", () => {
    const flat = parseAnalysis({ lead: "L", points: [point("   "), point("real")] });
    expect(flat.points).toEqual(["real"]);
  });

  it.each([
    ["undefined", undefined],
    ["null", null],
    ["a leftover Markdown string", "### Key Points\n- a point"],
    ["a number", 7],
    ["an object with no points", { lead: "L" }],
  ])("yields an empty model for %s", (_label, raw) => {
    const flat = parseAnalysis(raw);
    expect(flat).toEqual({ lead: "", points: [] });
    expect(isEmptyAnalysis(flat)).toBe(true);
  });

  it("copes with points but no lead", () => {
    const flat = parseAnalysis({ points: [point("standing alone")] });
    expect(flat.lead).toBe("");
    expect(flat.points).toEqual(["standing alone"]);
    expect(isEmptyAnalysis(flat)).toBe(false);
  });
});
