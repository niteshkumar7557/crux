import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { alignSegmentBoundsToWords, normalizeTranscriptPackage } from "./normalize-transcript.js";

function word(start: number, end: number, text: string) {
  return { start, end, word: text, probability: 0.9 };
}

describe("alignSegmentBoundsToWords", () => {
  it("widens a segment whose first word begins before the declared start", () => {
    const result = alignSegmentBoundsToWords({
      segments: [{ start: 115.96, end: 116.08, text: " Okay", words: [word(115.75, 116.08, " Okay")] }],
    });

    expect(result?.report.adjusted).toBe(1);
    const segments = (result?.document as { segments: { start: number; end: number }[] }).segments;
    expect(segments[0]?.start).toBe(115.75);
    expect(segments[0]?.end).toBe(116.08);
  });

  it("widens a segment whose last word ends after the declared end", () => {
    const result = alignSegmentBoundsToWords({
      segments: [{ start: 10, end: 11, text: " grown up", words: [word(10, 10.5, " grown"), word(10.5, 11.6, " up")] }],
    });

    const segments = (result?.document as { segments: { start: number; end: number }[] }).segments;
    expect(segments[0]?.start).toBe(10);
    expect(segments[0]?.end).toBe(11.6);
  });

  it("never narrows a segment that already contains its words", () => {
    const result = alignSegmentBoundsToWords({
      segments: [{ start: 4, end: 9, text: " Inside", words: [word(5, 6, " Inside")] }],
    });

    expect(result?.report.adjusted).toBe(0);
    const segments = (result?.document as { segments: { start: number; end: number }[] }).segments;
    expect(segments[0]?.start).toBe(4);
    expect(segments[0]?.end).toBe(9);
  });

  it("leaves a segment without word timestamps untouched", () => {
    const result = alignSegmentBoundsToWords({ segments: [{ start: 1, end: 2, text: " No words" }] });

    expect(result?.report.adjusted).toBe(0);
    expect((result?.document as { segments: unknown[] }).segments[0]).toEqual({ start: 1, end: 2, text: " No words" });
  });

  it("preserves every field whisper wrote beside the timestamps", () => {
    const result = alignSegmentBoundsToWords({
      language: "en",
      segments: [{
        id: 24,
        seek: 10_596,
        start: 115.96,
        end: 116.08,
        text: " Okay",
        tokens: [50_865, 1_033],
        avg_logprob: -0.5,
        words: [word(115.75, 116.08, " Okay")],
      }],
    });

    const document = result?.document as { language: string; segments: Record<string, unknown>[] };
    expect(document.language).toBe("en");
    expect(document.segments[0]).toMatchObject({ id: 24, seek: 10_596, tokens: [50_865, 1_033], avg_logprob: -0.5 });
  });

  it("gives a zero-duration word the smallest span the contract can express", () => {
    const result = alignSegmentBoundsToWords({
      segments: [{ start: 10, end: 12, text: " a b", words: [word(10, 10, " a"), word(10.5, 12, " b")] }],
    });

    expect(result?.report.wordsRepaired).toBe(1);
    const words = (result?.document as { segments: { words: { start: number; end: number }[] }[] })
      .segments[0]!.words;
    expect(words[0]).toMatchObject({ start: 10, end: 10.001 });
    expect(words[1]).toMatchObject({ start: 10.5, end: 12 });
  });

  it("repairs a word whose end precedes its start", () => {
    const result = alignSegmentBoundsToWords({
      segments: [{ start: 10, end: 12, text: " a", words: [word(11, 10.4, " a")] }],
    });

    expect(result?.report.wordsRepaired).toBe(1);
    const words = (result?.document as { segments: { words: { end: number }[] }[] }).segments[0]!.words;
    expect(words[0]?.end).toBe(11.001);
  });

  it("gives a wordless zero-duration segment the minimum span", () => {
    const result = alignSegmentBoundsToWords({ segments: [{ start: 4, end: 4, text: " Hm" }] });

    expect(result?.report.adjusted).toBe(1);
    expect((result?.document as { segments: { start: number; end: number }[] }).segments[0])
      .toMatchObject({ start: 4, end: 4.001 });
  });

  it("is idempotent", () => {
    const once = alignSegmentBoundsToWords({
      segments: [{ start: 115.96, end: 116.08, text: " Okay", words: [word(115.75, 116.08, " Okay")] }],
    });
    const twice = alignSegmentBoundsToWords(once?.document);

    expect(twice?.report.adjusted).toBe(0);
    expect(twice?.document).toEqual(once?.document);
  });

  it("reports an unusable document rather than guessing at its shape", () => {
    expect(alignSegmentBoundsToWords({ text: "no segments" })).toBeNull();
    expect(alignSegmentBoundsToWords(null)).toBeNull();
  });
});

describe("normalizeTranscriptPackage", () => {
  async function packageWith(segments: unknown[]): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), "crux-normalize-"));
    await mkdir(join(root, "transcript/raw"), { recursive: true });
    for (const name of ["host-isolated.json", "for.json", "against.json"]) {
      await writeFile(join(root, "transcript/raw", name), JSON.stringify({ segments }));
    }
    return root;
  }

  it("rewrites all three raw files in place", async () => {
    const root = await packageWith([
      { start: 115.96, end: 116.08, text: " Okay", words: [word(115.75, 116.08, " Okay")] },
    ]);
    try {
      const report = await normalizeTranscriptPackage(root);

      expect(report.adjusted).toBe(3);
      for (const name of ["host-isolated.json", "for.json", "against.json"]) {
        const document = JSON.parse(await readFile(join(root, "transcript/raw", name), "utf8")) as {
          segments: { start: number }[];
        };
        expect(document.segments[0]?.start).toBe(115.75);
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("refuses a package path that is not absolute", async () => {
    await expect(normalizeTranscriptPackage("relative/path")).rejects.toThrow("absolute");
  });
});
