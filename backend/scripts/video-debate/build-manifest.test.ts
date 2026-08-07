import { cp, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { mergeTranscriptPackage } from "./merge-transcript.js";

const expectedManifest = {
  version: 1,
  duration_ms: 480000,
  media: {
    host: {
      duration_ms: 480000,
      byte_length: 150000000,
      video_codec: "h264",
      video_profile: "High",
      width: 1280,
      height: 720,
      pixel_format: "yuv420p",
      frame_rate: "30/1",
      video_bitrate_bps: 2500000,
      max_keyframe_interval_ms: 2000,
      faststart: true,
      audio_codec: "aac",
      audio_sample_rate_hz: 48000,
    },
    for: {
      duration_ms: 480000,
      byte_length: 150000000,
      video_codec: "h264",
      video_profile: "High",
      width: 1280,
      height: 720,
      pixel_format: "yuv420p",
      frame_rate: "30/1",
      video_bitrate_bps: 2500000,
      max_keyframe_interval_ms: 2000,
      faststart: true,
      audio_codec: "aac",
      audio_sample_rate_hz: 48000,
    },
    against: {
      duration_ms: 480000,
      byte_length: 150000000,
      video_codec: "h264",
      video_profile: "High",
      width: 1280,
      height: 720,
      pixel_format: "yuv420p",
      frame_rate: "30/1",
      video_bitrate_bps: 2500000,
      max_keyframe_interval_ms: 2000,
      faststart: true,
      audio_codec: "aac",
      audio_sample_rate_hz: 48000,
    },
    poster: { format: "webp", width: 1600, height: 900, byte_length: 250000 },
  },
  timeline: [
    { type: "intro", start_ms: 0, end_ms: 30000 },
    {
      type: "round", number: 1, domain: "Education", opener: "for",
      for: { start_ms: 30000, end_ms: 60000 },
      against: { start_ms: 60000, end_ms: 90000 },
      grace: { start_ms: 90000, end_ms: 115000 },
    },
    {
      type: "round", number: 2, domain: "Economics & Business", opener: "against",
      for: { start_ms: 145000, end_ms: 175000 },
      against: { start_ms: 115000, end_ms: 145000 },
      grace: { start_ms: 175000, end_ms: 200000 },
    },
    {
      type: "round", number: 3, domain: "Ethics & Philosophy", opener: "for",
      for: { start_ms: 200000, end_ms: 230000 },
      against: { start_ms: 230000, end_ms: 260000 },
      grace: { start_ms: 260000, end_ms: 285000 },
    },
    {
      type: "round", number: 4, domain: "Society & Culture", opener: "against",
      for: { start_ms: 315000, end_ms: 345000 },
      against: { start_ms: 285000, end_ms: 315000 },
      grace: { start_ms: 345000, end_ms: 370000 },
    },
    {
      type: "round", number: 5, domain: "Technology & AI", opener: "for",
      for: { start_ms: 370000, end_ms: 400000 },
      against: { start_ms: 400000, end_ms: 430000 },
      grace: { start_ms: 430000, end_ms: 455000 },
    },
    { type: "outro", start_ms: 455000, end_ms: 480000 },
  ],
  transcript: [
    { id: "host-0001", speaker: "host", start_ms: 1000, end_ms: 2000, text: "Welcome to the debate.", phase: "intro", round: null, judged: false },
    { id: "for-0001", speaker: "for", start_ms: 31000, end_ms: 33000, text: "Applied learning improves retention.", phase: "judged", round: 1, judged: true },
    { id: "against-0001", speaker: "against", start_ms: 61000, end_ms: 62000, text: "Recall can matter under pressure.", phase: "judged", round: 1, judged: true },
    { id: "against-0002", speaker: "against", start_ms: 89000, end_ms: 90000, text: "Closing. ", phase: "judged", round: 1, judged: true },
    { id: "against-0003", speaker: "against", start_ms: 90000, end_ms: 91000, text: "Thank you.", phase: "grace", round: 1, judged: false },
    { id: "host-0002", speaker: "host", start_ms: 92000, end_ms: 93000, text: "Thank you both.", phase: "grace", round: 1, judged: false },
    { id: "for-0002", speaker: "for", start_ms: 146000, end_ms: 147000, text: "Les examens mesurent aussi la mémorisation.", phase: "judged", round: 2, judged: true },
  ],
  rounds: [
    { number: 1, winner: "for", for_score: 61, against_score: 39, ruling: "FOR connected applied learning to durable understanding more directly.", points: { for: [{ segment_id: "for-0001", text: "Applied learning improves retention." }], against: [{ segment_id: "against-0001", text: "Recall can matter under pressure." }] } },
    { number: 2, winner: "against", for_score: 47, against_score: 53, ruling: "AGAINST made the stronger economic comparison.", points: { for: [{ segment_id: "for-0002", text: "Examinations also measure memorisation." }], against: [] } },
    { number: 3, winner: "for", for_score: 58, against_score: 42, ruling: "FOR better addressed the ethical burden of assessment.", points: { for: [], against: [] } },
    { number: 4, winner: "against", for_score: 44, against_score: 56, ruling: "AGAINST gave the more material account of social comparability.", points: { for: [], against: [] } },
    { number: 5, winner: "for", for_score: 63, against_score: 37, ruling: "FOR made the stronger case for technology-supported applied assessment.", points: { for: [], against: [] } },
  ],
  final: {
    winner: "for",
    round_score: { for: 3, against: 2 },
    crux: "Whether applied assessment gives a truer account of durable understanding.",
    verdict: "FOR won three domains by tying coursework to retained knowledge and practical mastery, while AGAINST prevailed on economic and social comparability concerns.",
  },
};

describe("buildManifestPackage", () => {
  it("assembles the valid package into the same canonical V1 JSON on repeated runs", async () => {
    const root = await mkdtemp(join(tmpdir(), "crux-video-manifest-"));
    try {
      await cp(join(import.meta.dirname, "fixtures/valid-package"), root, { recursive: true });
      await mergeTranscriptPackage(root);
      const module = await import("./build-manifest.js");

      await module.buildManifestPackage(root);
      const first = await readFile(join(root, "output/manifest.json"), "utf8");
      await module.buildManifestPackage(root);
      const second = await readFile(join(root, "output/manifest.json"), "utf8");

      const expected = `${JSON.stringify(expectedManifest, null, 2)}\n`;
      expect(first).toBe(expected);
      expect(second).toBe(expected);
      expect(JSON.parse(first)).toEqual(expectedManifest);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("validates the existing local manifest through the shared V1 contract", async () => {
    const root = await mkdtemp(join(tmpdir(), "crux-video-validate-"));
    try {
      await cp(join(import.meta.dirname, "fixtures/valid-package"), root, { recursive: true });
      await mergeTranscriptPackage(root);
      const { buildManifestPackage } = await import("./build-manifest.js");
      await buildManifestPackage(root);
      const module = await import("./validate-package.js");

      await expect(module.validateManifestPackage(root)).resolves.toEqual(expectedManifest);

      const invalid = {
        ...expectedManifest,
        final: { ...expectedManifest.final, decoded_response: "must stay local" },
      };
      await writeFile(join(root, "output/manifest.json"), JSON.stringify(invalid));
      await expect(module.validateManifestPackage(root)).rejects.toMatchObject({
        issues: [{ code: "invalid_shape", path: "final" }],
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("preserves an existing manifest when source validation fails", async () => {
    const root = await mkdtemp(join(tmpdir(), "crux-video-invalid-manifest-"));
    const manifestPath = join(root, "output/manifest.json");
    try {
      await cp(join(import.meta.dirname, "fixtures/valid-package"), root, { recursive: true });
      await mergeTranscriptPackage(root);
      await writeFile(manifestPath, "prior manifest\n");
      await writeFile(join(root, "judgment/judgment.json"), JSON.stringify({
        rounds: [],
        final: expectedManifest.final,
      }));
      const { buildManifestPackage } = await import("./build-manifest.js");

      await expect(buildManifestPackage(root)).rejects.toMatchObject({
        issues: [{ code: "round_sequence", path: "rounds" }],
      });
      await expect(readFile(manifestPath, "utf8")).resolves.toBe("prior manifest\n");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("restores canonical transcript order when validated input is shuffled", async () => {
    const root = await mkdtemp(join(tmpdir(), "crux-video-shuffled-transcript-"));
    try {
      await cp(join(import.meta.dirname, "fixtures/valid-package"), root, { recursive: true });
      await mergeTranscriptPackage(root);
      const transcriptPath = join(root, "transcript/transcript.json");
      const transcript: unknown = JSON.parse(await readFile(transcriptPath, "utf8"));
      if (!Array.isArray(transcript)) throw new TypeError("Fixture transcript must be an array.");
      await writeFile(transcriptPath, JSON.stringify([...transcript].reverse()));
      const { buildManifestPackage } = await import("./build-manifest.js");

      const manifest = await buildManifestPackage(root);

      expect(manifest.transcript).toEqual(expectedManifest.transcript);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects a symlinked output directory that escapes the package root", async () => {
    const root = await mkdtemp(join(tmpdir(), "crux-video-symlink-package-"));
    const external = await mkdtemp(join(tmpdir(), "crux-video-symlink-external-"));
    try {
      await cp(join(import.meta.dirname, "fixtures/valid-package"), root, { recursive: true });
      await mergeTranscriptPackage(root);
      await rm(join(root, "output"), { recursive: true, force: true });
      await symlink(external, join(root, "output"), "dir");
      const { buildManifestPackage } = await import("./build-manifest.js");

      await expect(buildManifestPackage(root)).rejects.toMatchObject({
        issues: [{ code: "package_path", path: "output/manifest.json" }],
      });
      await expect(readFile(join(external, "manifest.json"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(external, { recursive: true, force: true });
    }
  });

  it("rejects a symlinked output directory before validating an external manifest", async () => {
    const root = await mkdtemp(join(tmpdir(), "crux-video-validate-symlink-package-"));
    const external = await mkdtemp(join(tmpdir(), "crux-video-validate-symlink-external-"));
    try {
      await cp(join(import.meta.dirname, "fixtures/valid-package"), root, { recursive: true });
      await mergeTranscriptPackage(root);
      const { buildManifestPackage } = await import("./build-manifest.js");
      const { validateManifestPackage } = await import("./validate-package.js");
      await buildManifestPackage(root);
      const manifest = await readFile(join(root, "output/manifest.json"), "utf8");
      const externalManifest = join(external, "manifest.json");
      await writeFile(externalManifest, manifest);
      await rm(join(root, "output"), { recursive: true, force: true });
      await symlink(external, join(root, "output"), "dir");

      await expect(validateManifestPackage(root)).rejects.toMatchObject({
        issues: [{ code: "package_path", path: "output/manifest.json" }],
      });
      await expect(readFile(externalManifest, "utf8")).resolves.toBe(manifest);
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(external, { recursive: true, force: true });
    }
  });

  it("rejects a symlinked source terminal with a stable package-path issue", async () => {
    const root = await mkdtemp(join(tmpdir(), "crux-video-source-symlink-"));
    const external = await mkdtemp(join(tmpdir(), "crux-video-source-external-"));
    try {
      await cp(join(import.meta.dirname, "fixtures/valid-package"), root, { recursive: true });
      await mergeTranscriptPackage(root);
      await rm(join(root, "output/manifest.json"), { force: true });
      const externalJudgment = join(external, "judgment.json");
      await writeFile(externalJudgment, await readFile(join(root, "judgment/judgment.json"), "utf8"));
      await rm(join(root, "judgment/judgment.json"));
      await symlink(externalJudgment, join(root, "judgment/judgment.json"));
      const { buildManifestPackage } = await import("./build-manifest.js");

      await expect(buildManifestPackage(root)).rejects.toMatchObject({
        issues: [{ code: "package_path", path: "judgment/judgment.json" }],
      });
      await expect(readFile(join(root, "output/manifest.json"), "utf8"))
        .rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(external, { recursive: true, force: true });
    }
  });

  it("rejects a symlinked manifest terminal before validation follows it", async () => {
    const root = await mkdtemp(join(tmpdir(), "crux-video-manifest-symlink-"));
    const external = await mkdtemp(join(tmpdir(), "crux-video-manifest-external-"));
    try {
      await cp(join(import.meta.dirname, "fixtures/valid-package"), root, { recursive: true });
      await mergeTranscriptPackage(root);
      const { buildManifestPackage } = await import("./build-manifest.js");
      const { validateManifestPackage } = await import("./validate-package.js");
      await buildManifestPackage(root);
      const externalManifest = join(external, "manifest.json");
      await writeFile(externalManifest, await readFile(join(root, "output/manifest.json"), "utf8"));
      await rm(join(root, "output/manifest.json"));
      await symlink(externalManifest, join(root, "output/manifest.json"));

      await expect(validateManifestPackage(root)).rejects.toMatchObject({
        issues: [{ code: "package_path", path: "output/manifest.json" }],
      });
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(external, { recursive: true, force: true });
    }
  });
});
