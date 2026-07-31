// What the post button says while it waits. One blocking call judges the argument
// and rewrites that side's case, so nothing reports progress back — these are a
// timed reading of a known pipeline, honest about the order of the work and
// deliberately silent about how long it takes.
//
// Every label has to fit inside the narrowest button it lands in ("Post Reply"),
// because the busy text is overlaid on the real label to hold the width.

export const NARROWEST_LABEL = "Post Reply";

// Retimed when the judge stopped running with reasoning on. The old thresholds
// were paced against a thinking call and now sit far behind the work, which reads
// as a stall rather than as progress.
export const POSTING_STAGES = [
  { at: 0, label: "Posting…" },
  { at: 900, label: "Reading…" },
  { at: 2_200, label: "Weighing…" },
  { at: 4_000, label: "Scoring…" },
  { at: 6_000, label: "Rewriting…" },
  { at: 9_000, label: "Almost…" },
] as const;

export function stageAt(elapsedMs: number): string {
  let label = POSTING_STAGES[0].label as string;
  for (const stage of POSTING_STAGES) {
    if (elapsedMs < stage.at) break;
    label = stage.label;
  }
  return label;
}
