import { describe, expect, it } from "vitest";
import { toVideoAppearances } from "./profile.logic.js";

function row(overrides: Record<string, unknown> = {}) {
  return {
    slug: "applied-learning",
    motion: "Schools should replace final exams with project work.",
    role: "for",
    status: "published",
    final_winner: "for",
    for_round_wins: 3,
    against_round_wins: 2,
    duration_ms: 480_000,
    published_at: "2026-08-01T10:00:00.000Z",
    domains: ["Education", "Economics", "Ethics", "Society", "Technology"],
    user_id: 9,
    media_id: "11111111-2222-4333-8444-555555555555",
    mp4_object_key: "video-debates/11111111-2222-4333-8444-555555555555/for.mp4",
    ...overrides,
  };
}

describe("video debate profile appearances", () => {
  it("maps host, FOR, and AGAINST roles from immutable participant snapshots", () => {
    const mapped = toVideoAppearances([
      row({ role: "host" }),
      row({ role: "for" }),
      row({ role: "against" }),
    ]);

    expect(mapped.map((appearance) => appearance.role)).toEqual(["host", "for", "against"]);
    expect(mapped[0]?.motion).toBe(row().motion);
  });

  it("maps the published winner and round score without converting it to win loss draw", () => {
    const [appearance] = toVideoAppearances([row()]);

    expect(appearance).toMatchObject({
      winner: "for",
      roundScore: { for: 3, against: 2 },
    });
    expect(appearance).not.toHaveProperty("outcome");
    expect(appearance).not.toHaveProperty("isMvp");
  });

  it("marks whether the linked participant side won while host result remains null", () => {
    const [won] = toVideoAppearances([row({ role: "for" })]);
    const [lost] = toVideoAppearances([row({ role: "against" })]);
    const [hosted] = toVideoAppearances([row({ role: "host" })]);

    expect(won?.sideWon).toBe(true);
    expect(lost?.sideWon).toBe(false);
    expect(hosted?.sideWon).toBe(null);
  });

  it("drops unpublished rows defensively even if supplied to the mapper", () => {
    const mapped = toVideoAppearances([
      row({ status: "draft" }),
      row({ status: "validated", slug: "other" }),
      row({ status: "published" }),
    ]);

    expect(mapped).toHaveLength(1);
    expect(mapped[0]?.slug).toBe("applied-learning");
  });

  it("does not expose user id, media id, object keys, or ranked fields", () => {
    const serialized = JSON.stringify(toVideoAppearances([row()]));

    expect(serialized).not.toContain("user_id");
    expect(serialized).not.toContain("media_id");
    expect(serialized).not.toContain("object_key");
    expect(serialized).not.toContain("11111111-2222");
    expect(serialized).not.toMatch(/logic|tier|rank|mvp/i);
  });

  it("refuses a row whose stored shape cannot be narrowed", () => {
    expect(toVideoAppearances([row({ final_winner: "draw" })])).toEqual([]);
    expect(toVideoAppearances([row({ role: "moderator" })])).toEqual([]);
    expect(toVideoAppearances([{}, null, 7])).toEqual([]);
  });
});
