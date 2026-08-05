import { describe, expect, it } from "vitest";
import {
  CAPTION_MAX,
  HOOK_MAX,
  WORD_MAX,
  defaultCopy,
  hostOf,
  normaliseCopy,
} from "./socialCopy";

const MOTION = "Remote work has permanently damaged how junior engineers learn";
const URL = "https://cruxdebate.site";

describe("hostOf", () => {
  it("reduces a site url to its bare host", () => {
    expect(hostOf("https://cruxdebate.site")).toBe("cruxdebate.site");
    expect(hostOf("https://www.cruxdebate.site/motion/1")).toBe("cruxdebate.site");
    expect(hostOf("http://localhost:3000")).toBe("localhost:3000");
  });

  it("falls back to the raw string when it is not a url", () => {
    expect(hostOf("cruxdebate.site")).toBe("cruxdebate.site");
  });
});

describe("defaultCopy", () => {
  // The tool is never blocked by the optional half of its content: with the LLM
  // down, every field still has something honest in it.
  it("falls back to the motion itself as the hook", () => {
    expect(defaultCopy(MOTION, URL).hook).toBe(MOTION);
  });

  it("leaves the six words empty so their slot collapses", () => {
    const { words } = defaultCopy(MOTION, URL);
    expect(words.for).toEqual(["", "", ""]);
    expect(words.against).toEqual(["", "", ""]);
  });

  it("puts the link in every caption", () => {
    const { captions } = defaultCopy(MOTION, URL);
    for (const caption of Object.values(captions)) {
      expect(caption).toContain("cruxdebate.site");
    }
  });
});

describe("normaliseCopy", () => {
  it("keeps good fields and fills missing ones", () => {
    const copy = normaliseCopy(
      { hook: "Two people argued this to a verdict.", words: { for: ["WATCHING"] } },
      MOTION,
      URL,
    );
    expect(copy.hook).toBe("Two people argued this to a verdict.");
    expect(copy.words.for).toEqual(["WATCHING", "", ""]);
    expect(copy.words.against).toEqual(["", "", ""]);
    expect(copy.captions.x).toContain("cruxdebate.site");
  });

  it("survives every shape of garbage without throwing", () => {
    for (const raw of [null, undefined, 42, "text", [], { words: 7 }]) {
      expect(() => normaliseCopy(raw, MOTION, URL)).not.toThrow();
      expect(normaliseCopy(raw, MOTION, URL).hook).toBe(MOTION);
    }
  });

  it("truncates every field to its cap at a word boundary", () => {
    const long = "word ".repeat(600).trim();
    const copy = normaliseCopy(
      { hook: long, words: { for: [long, "", ""] }, captions: { x: long } },
      MOTION,
      URL,
    );
    expect(copy.hook.length).toBeLessThanOrEqual(HOOK_MAX + 1);
    expect(copy.words.for[0].length).toBeLessThanOrEqual(WORD_MAX + 1);
    expect(copy.captions.x.length).toBeLessThanOrEqual(CAPTION_MAX + 1);
    expect(copy.hook.endsWith("…")).toBe(true);
  });

  it("uppercases the words, because the slide sets them tracked and bold", () => {
    const copy = normaliseCopy({ words: { for: ["watching", "", ""] } }, MOTION, URL);
    expect(copy.words.for[0]).toBe("WATCHING");
  });
});
