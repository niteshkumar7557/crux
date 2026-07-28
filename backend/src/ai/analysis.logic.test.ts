import { describe, it, expect } from "vitest";
import {
  EMPTY_ANALYSIS,
  MAX_POINTS,
  POINT_MAX_CHARS,
  isEmptyAnalysis,
  parseLegacyMarkdown,
  readAnalysis,
  renderAnalysisForPrompt,
  renderOwnAnalysisForAnalyst,
  sanitizeAnalysis,
  writeAnalysis,
  type Analysis,
} from "./analysis.logic.js";

const authors = new Map<number, string>([
  [41, "maya"],
  [57, "dev"],
]);

const structured: Analysis = {
  lead: "Scaling is the real obstacle.",
  points: [
    { author: "maya", argumentId: 41, text: "Only nuclear delivers baseload." },
    { author: null, argumentId: null, text: "Grid inertia is unpriced." },
  ],
};

describe("readAnalysis", () => {
  it("reads back what writeAnalysis wrote", () => {
    expect(readAnalysis(writeAnalysis(structured))).toEqual(structured);
  });

  it("treats null, empty and blank columns as no analysis", () => {
    for (const raw of [null, undefined, "", "   "]) {
      expect(readAnalysis(raw)).toEqual(EMPTY_ANALYSIS);
    }
  });

  it("falls back to prose when the JSON is malformed rather than losing it", () => {
    const a = readAnalysis('{"lead": "half a doc');
    expect(a.lead).toContain("half a doc");
  });

  it("caps the point list", () => {
    const many = {
      lead: "L",
      points: Array.from({ length: MAX_POINTS + 5 }, (_, i) => ({
        argumentId: null,
        text: `point ${i}`,
      })),
    };
    expect(readAnalysis(JSON.stringify(many)).points).toHaveLength(MAX_POINTS);
  });

  it("drops points with no usable text", () => {
    const a = readAnalysis(
      JSON.stringify({ lead: "L", points: [{ text: "  " }, { text: "real" }] }),
    );
    expect(a.points).toEqual([
      { author: null, argumentId: null, text: "real" },
    ]);
  });
});

describe("parseLegacyMarkdown", () => {
  const legacy =
    "Nuclear is too slow to scale in time.\n\n### Key Arguments\n- **@arjun** — a single plant takes over 12 years to build\n- **@dev** — France needed a state monopoly";

  it("reads the pre-JSON rows still in the database", () => {
    const a = parseLegacyMarkdown(legacy);
    expect(a.lead).toBe("Nuclear is too slow to scale in time.");
    expect(a.points).toEqual([
      {
        author: "arjun",
        argumentId: null,
        text: "a single plant takes over 12 years to build",
      },
      {
        author: "dev",
        argumentId: null,
        text: "France needed a state monopoly",
      },
    ]);
  });

  it("is reached through readAnalysis for a Markdown column", () => {
    expect(readAnalysis(legacy)).toEqual(parseLegacyMarkdown(legacy));
  });

  it("handles rows whose newlines were escaped", () => {
    expect(parseLegacyMarkdown(legacy.replace(/\n/g, "\\n"))).toEqual(
      parseLegacyMarkdown(legacy),
    );
  });

  it("keeps an unattributed bullet as an unattributed point", () => {
    const a = parseLegacyMarkdown("Lead.\n- just a point");
    expect(a.points).toEqual([
      { author: null, argumentId: null, text: "just a point" },
    ]);
  });

  it("never invents an argument id for legacy text", () => {
    expect(
      parseLegacyMarkdown(legacy).points.every((p) => p.argumentId === null),
    ).toBe(true);
  });
});

describe("sanitizeAnalysis", () => {
  it("resolves the author from the argument id, ignoring what the model claimed", () => {
    const a = sanitizeAnalysis(
      {
        lead: "L",
        points: [{ argumentId: 41, author: "impostor", text: "A point." }],
      },
      authors,
    );
    expect(a.points).toEqual([
      { author: "maya", argumentId: 41, text: "A point." },
    ]);
  });

  it("strips a hallucinated argument id, keeping the point unattributed", () => {
    const a = sanitizeAnalysis(
      { lead: "L", points: [{ argumentId: 9999, text: "A point." }] },
      authors,
    );
    expect(a.points).toEqual([
      { author: null, argumentId: null, text: "A point." },
    ]);
  });

  it("strips an id belonging to the other side", () => {
    // authorByArgumentId only ever holds this side's arguments.
    const a = sanitizeAnalysis(
      { lead: "L", points: [{ argumentId: 77, text: "A point." }] },
      authors,
    );
    expect(a.points[0]?.argumentId).toBeNull();
  });

  it("drops duplicate points the model padded the list with", () => {
    const a = sanitizeAnalysis(
      {
        lead: "L",
        points: [
          { argumentId: 41, text: "Same point." },
          { argumentId: 57, text: "same POINT." },
        ],
      },
      authors,
    );
    expect(a.points).toHaveLength(1);
  });

  it("truncates a point that ran long", () => {
    const a = sanitizeAnalysis(
      { lead: "L", points: [{ argumentId: 41, text: "x".repeat(999) }] },
      authors,
    );
    expect(a.points[0]?.text.length).toBeLessThanOrEqual(POINT_MAX_CHARS + 1);
  });

  // The hot path 500s if this throws, so every wrong shape must degrade.
  it.each([
    ["null", null],
    ["a string", "not an object"],
    ["a number", 7],
    ["points as an object", { lead: "L", points: { nope: true } }],
    ["points of junk", { lead: "L", points: [null, 3, "x"] }],
    ["a missing lead", { points: [{ argumentId: 41, text: "A point." }] }],
  ])("degrades rather than throwing on %s", (_label, raw) => {
    expect(() => sanitizeAnalysis(raw, authors)).not.toThrow();
  });

  it("yields an empty analysis for junk, which the caller reads as no update", () => {
    expect(isEmptyAnalysis(sanitizeAnalysis(null, authors))).toBe(true);
  });

  it("keeps the good points from a partly-broken list", () => {
    const a = sanitizeAnalysis(
      { lead: "L", points: [null, { argumentId: 41, text: "Survives." }, 3] },
      authors,
    );
    expect(a.points).toEqual([
      { author: "maya", argumentId: 41, text: "Survives." },
    ]);
  });
});

describe("renderAnalysisForPrompt", () => {
  it("rebuilds the prose shape the other prompts already expect", () => {
    expect(renderAnalysisForPrompt(structured)).toBe(
      "Scaling is the real obstacle.\n\n### Key Arguments\n- **@maya** — Only nuclear delivers baseload.\n- Grid inertia is unpriced.",
    );
  });

  it("hides argument ids — they are noise to the probability and verdict judges", () => {
    expect(renderAnalysisForPrompt(structured)).not.toContain("#41");
  });

  it("renders nothing for an empty analysis", () => {
    expect(renderAnalysisForPrompt(EMPTY_ANALYSIS)).toBe("");
  });

  it("survives a round trip through storage unchanged", () => {
    const back = readAnalysis(writeAnalysis(structured));
    expect(renderAnalysisForPrompt(back)).toBe(
      renderAnalysisForPrompt(structured),
    );
  });
});

describe("renderOwnAnalysisForAnalyst", () => {
  it("exposes the id so the analyst can carry a kept point's link forward", () => {
    expect(renderOwnAnalysisForAnalyst(structured)).toContain(
      "- [#41] **@maya** — Only nuclear delivers baseload.",
    );
  });

  it("leaves an unattributed point without an id", () => {
    expect(renderOwnAnalysisForAnalyst(structured)).toContain(
      "- Grid inertia is unpriced.",
    );
  });
});
