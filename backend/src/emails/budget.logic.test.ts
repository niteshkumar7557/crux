import { describe, it, expect } from "vitest";
import {
  decideSend,
  isDead,
  isEmailCategory,
  isRationed,
  nextAttemptDelayMs,
  preferenceColumn,
  EMAIL_CATEGORIES,
  EMAIL_RATION,
  MAX_ATTEMPTS,
  type EmailCategory,
  type SendConditions,
} from "./budget.logic.js";

const conditions = (over: Partial<SendConditions> = {}): SendConditions => ({
  category: "reply",
  suppressed: false,
  globallyEnabled: true,
  categoryEnabled: true,
  sentInWindow: 0,
  ...over,
});

describe("decideSend", () => {
  it("sends an ordinary wanted email", () => {
    expect(decideSend(conditions())).toEqual({ send: true });
  });

  it("refuses a suppressed address before anything else", () => {
    expect(decideSend(conditions({ suppressed: true }))).toEqual({
      send: false,
      reason: "suppressed",
    });
  });

  it("refuses a suppressed address even for transactional mail", () => {
    // A hard bounce means the mailbox is gone; a complaint means they asked us to
    // stop. Neither is overridden by the message being a welcome.
    expect(decideSend(conditions({ category: "welcome", suppressed: true }))).toEqual({
      send: false,
      reason: "suppressed",
    });
  });

  it("honours the global switch", () => {
    expect(decideSend(conditions({ globallyEnabled: false }))).toEqual({
      send: false,
      reason: "unsubscribed",
    });
  });

  it("honours the per-category switch", () => {
    expect(decideSend(conditions({ categoryEnabled: false }))).toEqual({
      send: false,
      reason: "unsubscribed",
    });
  });

  it("sends the welcome regardless of preferences, which cannot exist yet", () => {
    expect(
      decideSend(
        conditions({ category: "welcome", globallyEnabled: false, categoryEnabled: false }),
      ),
    ).toEqual({ send: true });
  });

  it("stops a rationed category at the ceiling", () => {
    expect(decideSend(conditions({ sentInWindow: EMAIL_RATION - 1 }))).toEqual({ send: true });
    expect(decideSend(conditions({ sentInWindow: EMAIL_RATION }))).toEqual({
      send: false,
      reason: "over_ration",
    });
    expect(decideSend(conditions({ sentInWindow: 99 }))).toEqual({
      send: false,
      reason: "over_ration",
    });
  });

  it("lets the payoff categories through a full ration", () => {
    for (const category of ["verdict", "season", "welcome", "announcement"] as const) {
      expect(decideSend(conditions({ category, sentInWindow: 99 }))).toEqual({ send: true });
    }
  });

  it("rations exactly reply and opponent", () => {
    expect(isRationed("reply")).toBe(true);
    expect(isRationed("opponent")).toBe(true);
    for (const category of ["welcome", "verdict", "season", "announcement"] as const) {
      expect(isRationed(category)).toBe(false);
    }
  });

  it("holds the documented ration", () => {
    expect(EMAIL_RATION).toBe(4);
  });
});

describe("preferenceColumn", () => {
  it("gives welcome no opt-out, because it is transactional", () => {
    expect(preferenceColumn("welcome")).toBeNull();
  });

  it("gives every other category a column", () => {
    for (const category of EMAIL_CATEGORIES) {
      if (category === "welcome") continue;
      expect(preferenceColumn(category)).toMatch(/^email_/);
    }
  });

  it("names a distinct column per category, so one toggle cannot mute two", () => {
    const columns = EMAIL_CATEGORIES.map(preferenceColumn).filter(
      (c): c is string => c !== null,
    );
    expect(new Set(columns).size).toBe(columns.length);
  });
});

describe("isEmailCategory", () => {
  it("accepts every shipped category", () => {
    for (const category of EMAIL_CATEGORIES) {
      expect(isEmailCategory(category)).toBe(true);
    }
  });

  it("rejects anything else", () => {
    for (const junk of ["", "digest", "Verdict", "reply ", "drop table"]) {
      expect(isEmailCategory(junk)).toBe(false);
    }
  });
});

describe("retry schedule", () => {
  it("backs off further each time rather than hammering", () => {
    const delays = [1, 2, 3, 4].map(nextAttemptDelayMs);
    expect(delays).toEqual([60_000, 240_000, 540_000, 960_000]);
    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]!).toBeGreaterThan(delays[i - 1]!);
    }
  });

  it("gives up at the documented ceiling", () => {
    expect(isDead(MAX_ATTEMPTS - 1)).toBe(false);
    expect(isDead(MAX_ATTEMPTS)).toBe(true);
    expect(MAX_ATTEMPTS).toBe(5);
  });
});

describe("category list", () => {
  it("matches the six the spec names", () => {
    expect([...EMAIL_CATEGORIES]).toEqual([
      "welcome",
      "verdict",
      "reply",
      "opponent",
      "season",
      "announcement",
    ]);
  });

  it("types every category exhaustively", () => {
    const seen: EmailCategory[] = [...EMAIL_CATEGORIES];
    expect(seen).toHaveLength(6);
  });
});
