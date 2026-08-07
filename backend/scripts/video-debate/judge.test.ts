import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { judgePackage } from "./judge.js";
import { callJson } from "./provider.js";

describe("judgePackage", () => {
  it("uses an injected provider and writes redacted attempts before the sanitized judgment", async () => {
    const root = await fixturePackage();
    const ceilings: number[] = [];
    let roundOneCalls = 0;
    try {
      const output = await judgePackage(root, async (request) => {
        ceilings.push(request.maxTokens);
        const input: unknown = JSON.parse(request.user);
        if (isClosing(input)) return providerResponse({
          crux: "Whether application outweighs consistent comparison.",
          verdict: "FOR carried the five-domain comparison.",
        });
        if (isRound(input) && input.domain === "Domain 1" && roundOneCalls++ < 2) {
          return providerResponse({ ...validRound(), for_score: 50, against_score: 50 });
        }
        return providerResponse(validRound());
      });

      expect(output.rounds).toHaveLength(5);
      expect(ceilings).toEqual([3_000, 3_000, 3_000, 3_000, 3_000, 3_000, 3_000, 1_000]);
      await expect(readJson(join(root, "judgment/judgment.json"))).resolves.toEqual(output);
      await expect(readJson(join(root, "judgment/raw/round-01-normal-01.json"))).resolves.toMatchObject({
        round: 1,
        kind: "normal",
        issues: [{ code: "round_draw" }],
        usage: { prompt_tokens: 100, completion_tokens: 50 },
      });
      await expect(readJson(join(root, "judgment/raw/round-01-tiebreak-01.json"))).resolves.toMatchObject({
        round: 1,
        kind: "tiebreak",
        issues: [],
      });
      const attempt = await readJson(join(root, "judgment/raw/round-01-normal-01.json"));
      expect(Object.keys(attempt as Record<string, unknown>)).toEqual([
        "round", "kind", "timestamp", "duration_ms", "raw", "parsed", "issues", "usage",
      ]);
      expect(JSON.stringify(attempt)).not.toContain("Authorization");
      expect(JSON.stringify(attempt)).not.toContain("api_key");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects an invalid transcript before calling the provider or replacing an existing judgment", async () => {
    const root = await fixturePackage();
    const judgmentPath = join(root, "judgment/judgment.json");
    let calls = 0;
    try {
      const transcript = await readJson(join(root, "transcript/transcript.json")) as Array<Record<string, unknown>>;
      transcript[1] = { ...transcript[1], judged: false };
      await writeFile(join(root, "transcript/transcript.json"), JSON.stringify(transcript));
      await mkdir(join(root, "judgment"), { recursive: true });
      await writeFile(judgmentPath, "prior judgment\n");

      await expect(judgePackage(root, async () => {
        calls += 1;
        return providerResponse(validRound());
      })).rejects.toThrow("transcript_scope");
      expect(calls).toBe(0);
      await expect(readFile(judgmentPath, "utf8")).resolves.toBe("prior judgment\n");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("atomically logs one safe thrown-provider attempt and writes no sanitized judgment", async () => {
    const root = await fixturePackage();
    try {
      const unsafeBody = "SENTINEL_API_KEY SENTINEL_ENDPOINT SENTINEL_MODEL Authorization SENTINEL_SYSTEM_PROMPT SENTINEL_USER_BODY";
      await expect(judgePackage(root, (request) => callJson(request, {
        llm: {
          base_url: "https://SENTINEL_ENDPOINT.invalid/v1",
          api_key: "SENTINEL_API_KEY",
          model: "SENTINEL_MODEL",
          timeout_ms: 1_000,
          temperature: 0.2,
        },
        fetch: async () => new Response(unsafeBody, { status: 503 }),
      }))).rejects.toThrow("Judgment provider call failed.");

      await expect(readdir(join(root, "judgment/raw"))).resolves.toEqual(["round-01-normal-01.json"]);
      const attempt = await readJson(join(root, "judgment/raw/round-01-normal-01.json"));
      expect(attempt).toMatchObject({
        round: 1,
        kind: "normal",
        raw: "",
        parsed: null,
        issues: [{ code: "provider_error", path: "provider", message: "Judgment provider call failed." }],
        usage: null,
      });
      expect(JSON.stringify(attempt)).not.toMatch(/SENTINEL|Authorization/);
      await expect(readFile(join(root, "judgment/judgment.json"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects a symlinked transcript terminal before calling the provider", async () => {
    const root = await fixturePackage();
    const external = await mkdtemp(join(tmpdir(), "crux-video-judge-external-"));
    let calls = 0;
    try {
      const externalTranscript = join(external, "transcript.json");
      await writeFile(externalTranscript, await readFile(join(root, "transcript/transcript.json"), "utf8"));
      await rm(join(root, "transcript/transcript.json"));
      await symlink(externalTranscript, join(root, "transcript/transcript.json"));

      await expect(judgePackage(root, async () => {
        calls += 1;
        return providerResponse(validRound());
      })).rejects.toThrow("package_path transcript/transcript.json");
      expect(calls).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(external, { recursive: true, force: true });
    }
  });
});

async function fixturePackage(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "crux-video-judge-"));
  await mkdir(join(root, "metadata"), { recursive: true });
  await mkdir(join(root, "transcript"), { recursive: true });
  await writeFile(join(root, "metadata/debate.json"), JSON.stringify({
    version: 1,
    draft_id: "draft-1",
    media_id: "media-1",
    motion: "Coursework should replace final examinations.",
    slug: "coursework-final-exams",
    participants: [
      { role: "host", display_name: "Host", avatar_url: null },
      { role: "for", display_name: "FOR", avatar_url: null },
      { role: "against", display_name: "AGAINST", avatar_url: null },
    ],
    rounds: Array.from({ length: 5 }, (_, index) => ({
      number: index + 1,
      domain_id: index + 1,
      domain: `Domain ${index + 1}`,
      opener: index % 2 === 0 ? "for" : "against",
    })),
  }));

  const rounds = Array.from({ length: 5 }, (_, index) => boundaryRound(index + 1, 30_000 + index * 85_000));
  await writeFile(join(root, "metadata/boundaries.json"), JSON.stringify({
    version: 1,
    duration_ms: 480_000,
    intro: { start_ms: 0, end_ms: 30_000 },
    rounds,
    outro: { start_ms: 455_000, end_ms: 480_000 },
  }));
  await writeFile(join(root, "transcript/transcript.json"), JSON.stringify([
    nonRoundSegment("host-intro", 1_000, "intro"),
    ...rounds.flatMap((round) => [
      segment(`for-${round.number}`, "for", round.for.start_ms + 1_000, round.number),
      segment(`against-${round.number}`, "against", round.against.start_ms + 1_000, round.number),
    ]),
    nonRoundSegment("host-outro", 456_000, "outro"),
  ]));
  return root;
}

function boundaryRound(number: number, start_ms: number) {
  const opener = number % 2 === 0 ? "against" : "for";
  const first = { start_ms, end_ms: start_ms + 30_000 };
  const second = { start_ms: start_ms + 30_000, end_ms: start_ms + 60_000 };
  return {
    number,
    domain: `Domain ${number}`,
    opener,
    for: opener === "for" ? first : second,
    against: opener === "against" ? first : second,
    grace: { start_ms: start_ms + 60_000, end_ms: start_ms + 85_000 },
  };
}

function segment(id: string, speaker: "for" | "against", start_ms: number, round: number) {
  return {
    id,
    speaker,
    start_ms,
    end_ms: start_ms + 1_000,
    text: `${speaker.toUpperCase()} round ${round}.`,
    phase: "judged",
    round,
    judged: true,
  };
}

function nonRoundSegment(id: string, start_ms: number, phase: "intro" | "outro") {
  return {
    id,
    speaker: "host",
    start_ms,
    end_ms: start_ms + 1_000,
    text: phase === "intro" ? "Welcome to the debate." : "Thank you both.",
    phase,
    round: null,
    judged: false,
  };
}

function validRound() {
  return {
    for_decoded_claim: "FOR's domain claim.",
    against_decoded_claim: "AGAINST's domain claim.",
    comparison: "The material domain comparison.",
    for_score: 60,
    against_score: 40,
    winner: "for",
    ruling: "FOR made the stronger domain case.",
    points: { for: [], against: [] },
  };
}

function providerResponse(parsed: unknown) {
  return {
    raw: JSON.stringify(parsed),
    parsed,
    usage: { prompt_tokens: 100, completion_tokens: 50 },
  };
}

function isRound(value: unknown): value is { domain: string } {
  return typeof value === "object" && value !== null && !Array.isArray(value) && typeof Object.fromEntries(Object.entries(value)).domain === "string";
}

function isClosing(value: unknown): boolean {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Object.fromEntries(Object.entries(value)).computed !== undefined;
}

async function readJson(path: string): Promise<any> {
  return JSON.parse(await readFile(path, "utf8"));
}
