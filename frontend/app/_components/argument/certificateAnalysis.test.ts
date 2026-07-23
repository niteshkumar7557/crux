import { describe, it, expect } from "vitest";
import {
  isEmptyAnalysis,
  LEAD_MAX,
  MAX_POINTS,
  parseAnalysis,
  POINT_MAX,
} from "./certificateAnalysis";

// The exact shape the arbiter prompt asks for.
const REAL = `The case in favor holds up under scrutiny.

### Key Points
- Historical precedent shows similar shifts succeeded
- Early adopters and case studies already demonstrate the claim in practice
- The main objections rely on worst-case scenarios, not likely ones`;

describe("parseAnalysis", () => {
  it("splits a real analysis into its lead and its points", () => {
    const a = parseAnalysis(REAL);
    expect(a.lead).toBe("The case in favor holds up under scrutiny.");
    expect(a.points).toHaveLength(3);
    expect(a.points[0]).toBe(
      "Historical precedent shows similar shifts succeeded",
    );
  });

  it("drops the heading — it is a label, not content", () => {
    const a = parseAnalysis(REAL);
    expect(a.lead).not.toContain("Key Points");
    expect(a.points.join(" ")).not.toContain("Key Points");
  });

  it("handles rows whose newlines were stored escaped", () => {
    const escaped =
      "One sharp opening.\\n\\n### Key Points\\n- First point\\n- Second point";
    const a = parseAnalysis(escaped);
    expect(a.lead).toBe("One sharp opening.");
    expect(a.points).toEqual(["First point", "Second point"]);
  });

  it("accepts asterisk bullets too", () => {
    const a = parseAnalysis("Lead.\n\n* Alpha\n* Beta");
    expect(a.points).toEqual(["Alpha", "Beta"]);
  });

  it("strips inline bold, italic and code", () => {
    const a = parseAnalysis(
      "A **strong** lead.\n\n- **Cost** is _underestimated_\n- Uses `pipelines`",
    );
    expect(a.lead).toBe("A strong lead.");
    expect(a.points).toEqual([
      "Cost is underestimated",
      "Uses pipelines",
    ]);
  });

  it("caps the number of points the card can hold", () => {
    const many = `Lead.\n\n${Array.from({ length: 8 }, (_, i) => `- Point ${i}`).join("\n")}`;
    expect(parseAnalysis(many).points).toHaveLength(MAX_POINTS);
  });

  it("truncates a long lead and long points on word boundaries", () => {
    const longLead = "word ".repeat(60).trim();
    const longPoint = "chunk ".repeat(40).trim();
    const a = parseAnalysis(`${longLead}\n\n- ${longPoint}`);
    expect(a.lead.length).toBeLessThanOrEqual(LEAD_MAX + 1);
    expect(a.lead.endsWith("…")).toBe(true);
    expect(a.points[0].length).toBeLessThanOrEqual(POINT_MAX + 1);
    expect(a.points[0].endsWith("…")).toBe(true);
  });

  it("ignores prose that trails the bullets", () => {
    const a = parseAnalysis("Lead.\n\n- A point\n\nSome trailing note.");
    expect(a.lead).toBe("Lead.");
    expect(a.points).toEqual(["A point"]);
  });

  it("survives a missing, empty or non-string analysis", () => {
    for (const bad of [undefined, null, "", "   ", 42, {}]) {
      const a = parseAnalysis(bad);
      expect(a).toEqual({ lead: "", points: [] });
      expect(isEmptyAnalysis(a)).toBe(true);
    }
  });

  it("copes with bullets but no lead", () => {
    const a = parseAnalysis("### Key Points\n- Only a point");
    expect(a.lead).toBe("");
    expect(a.points).toEqual(["Only a point"]);
    expect(isEmptyAnalysis(a)).toBe(false);
  });
});
