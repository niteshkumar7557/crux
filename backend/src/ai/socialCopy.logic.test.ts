import { describe, expect, it } from "vitest";
import { sanitizeDraft, HOOK_MAX, WORD_MAX } from "./socialCopy.logic.js";

const MOTION = "Remote work has permanently damaged how junior engineers learn";
const HOST = "cruxdebate.site";

describe("sanitizeDraft", () => {
  // A well-formed caption already ends with the host, as the prompt requires —
  // one that does not is the case the next-but-one test covers.
  it("keeps a well-formed draft", () => {
    const draft = sanitizeDraft(
      {
        hook: "Two people argued this to a verdict.",
        words: { for: ["watching", "speed", "retreat"], against: ["writing", "structure", "reach"] },
        captions: {
          instagram: `ig ${HOST}`,
          linkedin: `li ${HOST}`,
          x: `x ${HOST}`,
        },
      },
      MOTION,
      HOST,
    );
    expect(draft.hook).toBe("Two people argued this to a verdict.");
    expect(draft.words.for).toEqual(["WATCHING", "SPEED", "RETREAT"]);
    expect(draft.captions.linkedin).toBe(`li ${HOST}`);
  });

  // Untrusted input is narrowed, never cast. A bad draft degrades; it never throws.
  it("survives every shape of garbage", () => {
    for (const raw of [null, undefined, 0, "text", [], { words: "no" }, { captions: 5 }]) {
      expect(() => sanitizeDraft(raw, MOTION, HOST)).not.toThrow();
      const draft = sanitizeDraft(raw, MOTION, HOST);
      expect(draft.hook.length).toBeGreaterThan(0);
      expect(draft.words.for).toHaveLength(3);
      expect(draft.words.against).toHaveLength(3);
    }
  });

  it("falls back to the motion as the hook", () => {
    expect(sanitizeDraft({}, MOTION, HOST).hook).toBe(MOTION);
  });

  it("pads a short word list to three and drops extras", () => {
    const draft = sanitizeDraft({ words: { for: ["one"], against: ["a", "b", "c", "d"] } }, MOTION, HOST);
    expect(draft.words.for).toEqual(["ONE", "", ""]);
    expect(draft.words.against).toEqual(["A", "B", "C"]);
  });

  it("caps the hook and every word", () => {
    const long = "x".repeat(400);
    const draft = sanitizeDraft({ hook: long, words: { for: [long, "", ""] } }, MOTION, HOST);
    expect(draft.hook.length).toBeLessThanOrEqual(HOOK_MAX);
    expect(draft.words.for[0]!.length).toBeLessThanOrEqual(WORD_MAX);
  });

  it("puts the host in a caption the model left out", () => {
    const draft = sanitizeDraft({ captions: { x: "no link here" } }, MOTION, HOST);
    expect(draft.captions.x).toContain(HOST);
    expect(draft.captions.instagram).toContain(HOST);
  });

  it("takes only the first word when the model writes a phrase", () => {
    const draft = sanitizeDraft({ words: { for: ["the apprenticeship", "", ""] } }, MOTION, HOST);
    expect(draft.words.for[0]).toBe("THE");
  });
});
