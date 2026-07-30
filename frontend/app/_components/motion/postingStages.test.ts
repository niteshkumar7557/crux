import { describe, it, expect } from "vitest";
import { NARROWEST_LABEL, POSTING_STAGES, stageAt } from "./postingStages";

describe("stageAt", () => {
  it("opens on the first stage", () => {
    expect(stageAt(0)).toBe("Posting…");
  });

  it("holds a stage until the next one is due", () => {
    expect(stageAt(1_199)).toBe("Posting…");
    expect(stageAt(1_200)).toBe("Reading…");
  });

  it("walks the pipeline in order", () => {
    expect(stageAt(4_000)).toBe("Weighing…");
    expect(stageAt(7_000)).toBe("Scoring…");
    expect(stageAt(12_000)).toBe("Rewriting…");
  });

  it("rests on the last stage however long the call takes", () => {
    expect(stageAt(16_000)).toBe("Almost…");
    expect(stageAt(120_000)).toBe("Almost…");
  });

  it("survives a clock that reads backwards", () => {
    expect(stageAt(-500)).toBe("Posting…");
  });
});

describe("POSTING_STAGES", () => {
  it("keeps every label inside the narrowest button it overlays", () => {
    for (const stage of POSTING_STAGES) {
      expect(stage.label.length).toBeLessThanOrEqual(NARROWEST_LABEL.length);
    }
  });

  it("is ordered, so a later stage never precedes an earlier one", () => {
    const times = POSTING_STAGES.map((s) => s.at);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });
});
