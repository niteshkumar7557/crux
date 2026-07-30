import { describe, it, expect } from "vitest";
import { debateJsonLd, type DebateJsonLdInput } from "./debateJsonLd";

const base: DebateJsonLdInput = {
  claim: "Remote work makes junior engineers worse.",
  url: "https://crux.example/debate/remote-work-CRX-12-A",
  status: "live",
  verdictText: null,
  authorUsername: "sokrates",
  authorUrl: "https://crux.example/profile/sokrates",
  createdAt: "2026-07-23T12:00:00.000Z",
  argumentCount: 7,
};

describe("debateJsonLd", () => {
  it("publishes a live debate as a forum thread", () => {
    const ld = debateJsonLd(base);
    expect(ld["@type"]).toBe("DiscussionForumPosting");
    expect(ld.headline).toBe(base.claim);
    expect(ld.datePublished).toBe("2026-07-23T12:00:00.000Z");
    expect(ld.author).toMatchObject({ "@type": "Person", name: "sokrates" });
  });

  it("counts arguments as interactions", () => {
    const ld = debateJsonLd(base);
    expect(ld.interactionStatistic).toMatchObject({
      userInteractionCount: 7,
    });
  });

  it("never emits a negative interaction count", () => {
    const ld = debateJsonLd({ ...base, argumentCount: -3 });
    expect(ld.interactionStatistic).toMatchObject({
      userInteractionCount: 0,
    });
  });

  it("becomes a QAPage once the verdict lands", () => {
    const ld = debateJsonLd({
      ...base,
      status: "concluded",
      verdictText: "The affirmative carried the burden.",
    });
    expect(ld["@type"]).toBe("QAPage");
    const question = ld.mainEntity as Record<string, unknown>;
    expect(question.answerCount).toBe(1);
    expect(question.acceptedAnswer).toMatchObject({
      "@type": "Answer",
      text: "The affirmative carried the burden.",
    });
  });

  // The bug this module exists to prevent: a QAPage with nothing to answer.
  it("stays a forum thread for a walkover, which has no verdict", () => {
    const ld = debateJsonLd({ ...base, status: "concluded", verdictText: "" });
    expect(ld["@type"]).toBe("DiscussionForumPosting");
    expect(ld.mainEntity).toBeUndefined();
  });

  it("treats whitespace-only verdict text as no verdict", () => {
    const ld = debateJsonLd({
      ...base,
      status: "concluded",
      verdictText: "   \n ",
    });
    expect(ld["@type"]).toBe("DiscussionForumPosting");
  });

  it("omits fields it cannot source rather than emitting empty ones", () => {
    const ld = debateJsonLd({
      ...base,
      authorUsername: null,
      authorUrl: null,
      createdAt: null,
    });
    expect(ld.author).toBeUndefined();
    expect(ld.datePublished).toBeUndefined();
  });

  it("omits an unparseable timestamp", () => {
    const ld = debateJsonLd({ ...base, createdAt: "not a date" });
    expect(ld.datePublished).toBeUndefined();
  });
});
