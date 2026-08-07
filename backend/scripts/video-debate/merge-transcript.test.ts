import { cp, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { mergeTranscriptPackage } from "./merge-transcript.js";

function round(number: number, start_ms: number) {
  return {
    number,
    domain: `Domain ${number}`,
    opener: number % 2 === 0 ? "against" : "for",
    for: number % 2 === 0
      ? { start_ms: start_ms + 10_000, end_ms: start_ms + 20_000 }
      : { start_ms, end_ms: start_ms + 10_000 },
    against: number % 2 === 0
      ? { start_ms, end_ms: start_ms + 10_000 }
      : { start_ms: start_ms + 10_000, end_ms: start_ms + 20_000 },
    grace: { start_ms: start_ms + 20_000, end_ms: start_ms + 25_000 },
  };
}

describe("mergeTranscriptPackage", () => {
  it("rejects overlapping boundaries before replacing an existing transcript", async () => {
    const root = await mkdtemp(join(tmpdir(), "crux-transcript-"));
    const outputPath = join(root, "transcript/transcript.json");
    const captionsPath = join(root, "output/captions.vtt");
    try {
      await mkdir(join(root, "metadata"), { recursive: true });
      await mkdir(join(root, "transcript/raw"), { recursive: true });
      await mkdir(join(root, "transcript"), { recursive: true });
      await mkdir(join(root, "output"), { recursive: true });
      await writeFile(join(root, "metadata/boundaries.json"), JSON.stringify({
        version: 1,
        duration_ms: 160_000,
        intro: { start_ms: 0, end_ms: 12_000 },
        rounds: [
          round(1, 10_000),
          round(2, 35_000),
          round(3, 60_000),
          round(4, 85_000),
          round(5, 110_000),
        ],
        outro: { start_ms: 135_000, end_ms: 160_000 },
      }));
      await writeFile(join(root, "transcript/raw/host-isolated.json"), JSON.stringify({ segments: [] }));
      await writeFile(join(root, "transcript/raw/for.json"), JSON.stringify({ segments: [{ start: 10.5, end: 11, text: "Overlap" }] }));
      await writeFile(join(root, "transcript/raw/against.json"), JSON.stringify({ segments: [] }));
      await writeFile(outputPath, "prior transcript\n");
      await writeFile(captionsPath, "prior captions\n");

      await expect(mergeTranscriptPackage(root)).rejects.toThrow("does not match the V1 boundary shape");
      await expect(readFile(outputPath, "utf8")).resolves.toBe("prior transcript\n");
      await expect(readFile(captionsPath, "utf8")).resolves.toBe("prior captions\n");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("writes the canonical WebVTT captions beside the validated transcript", async () => {
    const root = await mkdtemp(join(tmpdir(), "crux-transcript-"));
    try {
      await cp(join(import.meta.dirname, "fixtures/valid-package"), root, { recursive: true });

      await mergeTranscriptPackage(root);

      await expect(readFile(join(root, "output/captions.vtt"), "utf8")).resolves.toBe(
        "WEBVTT\n\n"
        + "host-0001\n00:00:01.000 --> 00:00:02.000\nHOST: Welcome to the debate.\n\n"
        + "for-0001\n00:00:31.000 --> 00:00:33.000\nFOR: Applied learning improves retention.\n\n"
        + "against-0001\n00:01:01.000 --> 00:01:02.000\nAGAINST: Recall can matter under pressure.\n\n"
        + "against-0002\n00:01:29.000 --> 00:01:30.000\nAGAINST: Closing. \n\n"
        + "against-0003\n00:01:30.000 --> 00:01:31.000\nAGAINST: Thank you.\n\n"
        + "host-0002\n00:01:32.000 --> 00:01:33.000\nHOST: Thank you both.\n\n"
        + "for-0002\n00:02:26.000 --> 00:02:27.000\nFOR: Les examens mesurent aussi la mémorisation.\n",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects a symlinked raw transcript terminal before reading external text", async () => {
    const root = await mkdtemp(join(tmpdir(), "crux-transcript-symlink-"));
    const external = await mkdtemp(join(tmpdir(), "crux-transcript-external-"));
    const transcriptPath = join(root, "transcript/transcript.json");
    const captionsPath = join(root, "output/captions.vtt");
    try {
      await cp(join(import.meta.dirname, "fixtures/valid-package"), root, { recursive: true });
      await rm(transcriptPath, { force: true });
      await rm(captionsPath, { force: true });
      const externalTranscript = join(external, "for.json");
      await writeFile(externalTranscript, await readFile(join(root, "transcript/raw/for.json"), "utf8"));
      await rm(join(root, "transcript/raw/for.json"));
      await symlink(externalTranscript, join(root, "transcript/raw/for.json"));

      await expect(mergeTranscriptPackage(root)).rejects.toThrow(
        "package_path transcript/raw/for.json",
      );
      await expect(readFile(transcriptPath, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
      await expect(readFile(captionsPath, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(external, { recursive: true, force: true });
    }
  });
});
