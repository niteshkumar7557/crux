import { describe, expect, it } from "vitest";
import {
  SLIDES_PER_SIDE,
  assetFilename,
  assetsFor,
  buildPayloads,
  buildSlides,
  canExportLive,
  liveHoursLeft,
  type RawArgument,
} from "./socialAssets";
import { defaultCopy } from "./socialCopy";
import type { Analysis } from "@/app/motion/types";

const arg = (id: number, side: "for" | "against", likes: number): RawArgument => ({
  argument_id: id,
  username: `user${id}`,
  side,
  content: `The full argument number ${id}, as its author actually wrote it.`,
  likes,
});

const analysis = (ids: (number | null)[]): Analysis => ({
  lead: "The side's strongest case, synthesised.",
  points: ids.map((argumentId, i) => ({
    argumentId,
    author: argumentId === null ? null : `user${argumentId}`,
    text: `Condensed point ${i + 1}`,
  })),
});

const COPY = defaultCopy("A motion", "https://cruxdebate.site");

describe("buildSlides", () => {
  it("interleaves for, against, for, against, for, against", () => {
    const slides = buildSlides({
      forAnalysis: analysis([1, 2, 3]),
      againstAnalysis: analysis([4, 5, 6]),
      args: [1, 2, 3].map((i) => arg(i, "for", 0)).concat([4, 5, 6].map((i) => arg(i, "against", 0))),
      copy: COPY,
    });
    expect(slides.map((s) => s.side)).toEqual([
      "for", "against", "for", "against", "for", "against",
    ]);
  });

  it("pairs the referee's line with the author's verbatim argument", () => {
    const [slide] = buildSlides({
      forAnalysis: analysis([1]),
      againstAnalysis: analysis([]),
      args: [arg(1, "for", 5)],
      copy: COPY,
    });
    expect(slide.line).toBe("Condensed point 1");
    expect(slide.quote).toContain("as its author actually wrote it");
    expect(slide.handle).toBe("@user1");
    expect(slide.fallback).toBe(false);
  });

  // A side with fewer than three points fills from its top-liked arguments,
  // condensed by truncation rather than by a second model.
  it("fills a thin side from its top-liked arguments and marks them", () => {
    const slides = buildSlides({
      forAnalysis: analysis([1]),
      againstAnalysis: analysis([]),
      args: [arg(1, "for", 1), arg(7, "for", 90), arg(8, "for", 40)],
      copy: COPY,
    });
    const forSlides = slides.filter((s) => s.side === "for");
    expect(forSlides).toHaveLength(SLIDES_PER_SIDE);
    expect(forSlides[0].fallback).toBe(false);
    expect(forSlides[1].fallback).toBe(true);
    expect(forSlides[1].handle).toBe("@user7"); // most-liked first
    expect(forSlides[2].handle).toBe("@user8");
  });

  it("never repeats an argument already used by the analysis", () => {
    const slides = buildSlides({
      forAnalysis: analysis([1]),
      againstAnalysis: analysis([]),
      args: [arg(1, "for", 99)],
      copy: COPY,
    });
    expect(slides.filter((s) => s.side === "for")).toHaveLength(1);
  });

  it("renders fewer slides rather than blank ones", () => {
    const slides = buildSlides({
      forAnalysis: analysis([]),
      againstAnalysis: analysis([]),
      args: [],
      copy: COPY,
    });
    expect(slides).toEqual([]);
  });

  it("takes the handle from the analysis when the argument is gone", () => {
    const [slide] = buildSlides({
      forAnalysis: analysis([99]),
      againstAnalysis: analysis([]),
      args: [],
      copy: COPY,
    });
    expect(slide.handle).toBe("@user99");
    expect(slide.quote).toBe("");
  });

  it("assigns the words in slide order per side", () => {
    const copy = { ...COPY, words: { for: ["ONE", "TWO", "THREE"], against: ["A", "B", "C"] } };
    const slides = buildSlides({
      forAnalysis: analysis([1, 2, 3]),
      againstAnalysis: analysis([4, 5, 6]),
      args: [1, 2, 3].map((i) => arg(i, "for", 0)).concat([4, 5, 6].map((i) => arg(i, "against", 0))),
      copy,
    });
    expect(slides.map((s) => s.word)).toEqual(["ONE", "A", "TWO", "B", "THREE", "C"]);
  });
});

describe("assetsFor", () => {
  it("gives a concluded motion the carousel, the story and both one-pagers", () => {
    expect(assetsFor("concluded")).toEqual([
      "ig-cover", "ig-argument", "ig-verdict", "ig-story", "li-verdict", "x-verdict",
    ]);
  });

  it("gives a live motion only the two live posters", () => {
    expect(assetsFor("live")).toEqual(["ig-live", "x-live"]);
  });
});

describe("liveHoursLeft", () => {
  const now = Date.parse("2026-08-04T12:00:00Z");

  it("floors the hours remaining", () => {
    expect(liveHoursLeft("2026-08-04T19:30:00Z", now)).toBe(7);
  });

  it("is zero once the clock is out", () => {
    expect(liveHoursLeft("2026-08-04T11:00:00Z", now)).toBe(0);
  });

  it("is null without a closing time", () => {
    expect(liveHoursLeft(null, now)).toBe(null);
  });
});

describe("canExportLive", () => {
  // The countdown is baked into the PNG, so a poster is only honest for as long
  // as the hours it prints.
  it("refuses a debate with under an hour left", () => {
    expect(canExportLive(0)).toBe(false);
    expect(canExportLive(null)).toBe(false);
    expect(canExportLive(1)).toBe(true);
  });
});

describe("buildPayloads", () => {
  const base = {
    id: 412,
    motion: "Remote work has permanently damaged how junior engineers learn",
    keyword: "damaged",
    status: "concluded" as const,
    winner: "against" as const,
    split: { for: 43, against: 57 },
    margin: 14,
    verdictText: "The negative's documentation case went unanswered.",
    mvpUsername: "rhea",
    closesAt: null,
    forAnalysis: analysis([1, 2, 3]),
    againstAnalysis: analysis([4, 5, 6]),
    args: [1, 2, 3].map((i) => arg(i, "for", 0)).concat([4, 5, 6].map((i) => arg(i, "against", 0))),
    copy: COPY,
    siteUrl: "https://cruxdebate.site",
    now: Date.parse("2026-08-04T12:00:00Z"),
  };

  it("numbers eight carousel assets when both sides are full", () => {
    const carousel = buildPayloads(base).filter((p) =>
      p.template.startsWith("ig-c") || p.template === "ig-argument" || p.template === "ig-verdict",
    );
    expect(carousel).toHaveLength(8);
    expect(carousel.map((p) => p.slideNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(carousel.every((p) => p.slideTotal === 8)).toBe(true);
  });

  it("renumbers when a side is thin", () => {
    const payloads = buildPayloads({
      ...base,
      forAnalysis: analysis([1]),
      againstAnalysis: analysis([4]),
      args: [arg(1, "for", 0), arg(4, "against", 0)],
    });
    const carousel = payloads.filter((p) => p.slideTotal !== null);
    expect(carousel).toHaveLength(4);
    expect(carousel.every((p) => p.slideTotal === 4)).toBe(true);
  });

  it("carries the bare host, never the full url", () => {
    expect(buildPayloads(base)[0].domain).toBe("cruxdebate.site");
  });

  it("gives a live motion two posters with the hours baked in", () => {
    const payloads = buildPayloads({
      ...base,
      status: "live",
      winner: null,
      verdictText: null,
      mvpUsername: null,
      closesAt: "2026-08-05T19:00:00Z",
    });
    expect(payloads.map((p) => p.template)).toEqual(["ig-live", "x-live"]);
    expect(payloads[0].closesInHours).toBe(31);
  });
});

describe("assetFilename", () => {
  const at = new Date("2026-08-04T14:20:00Z");

  it("numbers carousel slides so upload order is post order", () => {
    const payload = buildPayloads({
      ...{
        id: 412,
        motion: "M", keyword: "M", status: "concluded" as const, winner: "against" as const,
        split: { for: 43, against: 57 }, margin: 14, verdictText: "v", mvpUsername: null,
        closesAt: null, forAnalysis: analysis([1]), againstAnalysis: analysis([4]),
        args: [arg(1, "for", 0), arg(4, "against", 0)], copy: COPY,
        siteUrl: "https://cruxdebate.site", now: Date.parse("2026-08-04T12:00:00Z"),
      },
    })[1];
    expect(assetFilename(payload, at)).toBe("02-for.png");
  });

  it("stamps a live poster with the hour it was generated", () => {
    const payload = buildPayloads({
      id: 488, motion: "M", keyword: "M", status: "live", winner: null,
      split: { for: 51, against: 49 }, margin: null, verdictText: null, mvpUsername: null,
      closesAt: "2026-08-05T19:00:00Z", forAnalysis: analysis([]), againstAnalysis: analysis([]),
      args: [], copy: COPY, siteUrl: "https://cruxdebate.site",
      now: Date.parse("2026-08-04T12:00:00Z"),
    })[0];
    expect(assetFilename(payload, at)).toBe("crux-live-0488-2026-08-04-14h.png");
  });
});
