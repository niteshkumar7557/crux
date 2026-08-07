import { describe, expect, it } from "vitest";
import { videoDebateJsonLd, videoDebateMetadata, isoDuration } from "./videoMetadata";
import { videoDebateFixture } from "./videoDebate.fixture";

const SITE = "https://cruxdebate.site";
const detail = videoDebateFixture;

describe("video debate metadata", () => {
  it("uses the immutable motion as title and a concise editorial description", () => {
    const metadata = videoDebateMetadata(detail, SITE);

    expect(metadata.title).toContain(detail.debate.motion);
    expect(String(metadata.description)).toContain(detail.manifest.final.crux);
    expect(String(metadata.description).length).toBeLessThanOrEqual(320);
  });

  it("uses the poster as the Open Graph and Twitter image", () => {
    const metadata = videoDebateMetadata(detail, SITE);

    expect(metadata.openGraph?.images).toEqual([detail.debate.posterUrl]);
    expect(metadata.twitter?.images).toEqual([detail.debate.posterUrl]);
  });

  it("sets canonical to /video-debates/[slug]", () => {
    const metadata = videoDebateMetadata(detail, SITE);

    expect(metadata.alternates?.canonical).toBe(`/video-debates/${detail.debate.slug}`);
  });

  it.each([
    [480_000, "PT8M"],
    [600_000, "PT10M"],
    [599_999, "PT9M59S"],
    [95_000, "PT1M35S"],
    [45_000, "PT45S"],
  ])("builds ISO 8601 duration from %s ms without rounding past ten minutes", (ms, expected) => {
    expect(isoDuration(ms)).toBe(expected);
  });

  it("VideoObject uses uploadDate, thumbnailUrl, contentUrl, participant names, and no fabricated live date", () => {
    const jsonLd = videoDebateJsonLd(detail, `${SITE}/video-debates/${detail.debate.slug}`);

    expect(jsonLd["@type"]).toBe("VideoObject");
    expect(jsonLd.uploadDate).toBe(detail.debate.publishedAt);
    expect(jsonLd.thumbnailUrl).toBe(detail.debate.posterUrl);
    expect(jsonLd.contentUrl).toBe(detail.debate.media.host);
    expect(jsonLd.actor?.map((entry) => entry.name)).toEqual(
      detail.debate.participants.map((participant) => participant.displayName),
    );
    expect(jsonLd).not.toHaveProperty("publication");
    expect(jsonLd).not.toHaveProperty("startDate");
  });

  it("lists only the audible host programme, never three separate videos", () => {
    const serialized = JSON.stringify(
      videoDebateJsonLd(detail, `${SITE}/video-debates/${detail.debate.slug}`),
    );

    expect(serialized).toContain(detail.debate.media.host);
    expect(serialized).not.toContain(detail.debate.media.for);
    expect(serialized).not.toContain(detail.debate.media.against);
  });

  it("does not describe the result as an Arena record or ranked win", () => {
    const metadata = videoDebateMetadata(detail, SITE);
    const jsonLd = videoDebateJsonLd(detail, `${SITE}/video-debates/${detail.debate.slug}`);
    const text = `${metadata.title} ${metadata.description} ${JSON.stringify(jsonLd)}`;

    // Word boundaries on purpose: "unranked" is exactly what this copy should say.
    expect(text).not.toMatch(/logic score|leaderboard|\branked\b|\btier\b|arena record/i);
    expect(String(metadata.description)).toMatch(/unranked|editorial/i);
  });
});
