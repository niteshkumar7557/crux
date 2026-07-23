import { describe, it, expect } from "vitest";
import {
  buildCertificate,
  certificateFilename,
  formatCertDate,
} from "./certificate";
import { TOKENS } from "./verdictCard";
import type { MatchState } from "@/app/argument/types";

const concluded: MatchState = {
  status: "concluded",
  closesAt: null,
  winner: "for",
  margin: 26,
  mvpUsername: "ada",
  verdictText: "The crux held: coordination beats raw incentive.",
  affirmative: 63,
  negative: 37,
};

const source = {
  debateId: 12,
  authorUsername: "kero",
  concludedAt: "2026-07-22T18:04:00.000Z",
};

describe("formatCertDate", () => {
  it("formats in UTC, zero-padded", () => {
    expect(formatCertDate("2026-07-02T23:30:00.000Z")).toBe("02 JUL 2026");
  });
  it("does not shift the day for a late-UTC timestamp", () => {
    expect(formatCertDate("2026-01-31T23:59:59.000Z")).toBe("31 JAN 2026");
  });
  it("returns null for a missing or unparseable date", () => {
    expect(formatCertDate(null)).toBeNull();
    expect(formatCertDate("not a date")).toBeNull();
  });
});

describe("buildCertificate", () => {
  it("refuses a live debate — there is no verdict to certify", () => {
    expect(
      buildCertificate({ ...concluded, status: "live" }, "c", source),
    ).toBeNull();
  });

  it("carries the ruling through from the card model", () => {
    const m = buildCertificate(concluded, "Should X be Y?", source)!;
    expect(m.card.label).toBe("AFFIRMATIVE WINS");
    expect(m.card.accent).toBe(TOKENS.cyan);
    expect(m.card.score).toBe("63–37 · margin 26");
    expect(m.reference).toBe("CRX-12-A");
    expect(m.concludedOn).toBe("22 JUL 2026");
  });

  it("assembles a footer with MVP, author and date", () => {
    const m = buildCertificate(concluded, "c", source)!;
    expect(m.footer).toBe("MVP @ada  ·  OPENED BY @kero  ·  22 JUL 2026");
  });

  it("omits the MVP from the footer when there is none (draw)", () => {
    const m = buildCertificate(
      { ...concluded, winner: "draw", mvpUsername: null },
      "c",
      source,
    )!;
    expect(m.footer).toBe("OPENED BY @kero  ·  22 JUL 2026");
    expect(m.card.label).toBe("DRAW");
  });

  it("omits the date when the row never recorded one", () => {
    const m = buildCertificate(concluded, "c", {
      ...source,
      concludedAt: null,
    })!;
    expect(m.footer).toBe("MVP @ada  ·  OPENED BY @kero");
    expect(m.concludedOn).toBeNull();
  });

  it("walkover: no MVP, no score, author still named", () => {
    const m = buildCertificate(
      { ...concluded, winner: "walkover", mvpUsername: null },
      "c",
      source,
    )!;
    expect(m.card.label).toBe("UNOPPOSED");
    expect(m.card.score).toBeNull();
    expect(m.card.split).toBeNull();
    expect(m.footer).toContain("OPENED BY @kero");
  });

  it("gives the claim more room than the OG card's 90 chars", () => {
    const long = "word ".repeat(40).trim();
    const m = buildCertificate(concluded, long, source)!;
    expect(m.claim.length).toBeGreaterThan(90);
    expect(m.claim.length).toBeLessThanOrEqual(121);
    expect(m.claim.endsWith("…")).toBe(true);
  });
});

describe("buildCertificate analysis", () => {
  const withAnalysis = {
    ...source,
    forAnalysis: "It holds.\n\n### Key Points\n- Precedent exists",
    againstAnalysis: "It does not.\n\n### Key Points\n- Costs bite",
  };

  it("carries both sides when both parse", () => {
    const m = buildCertificate(concluded, "c", withAnalysis)!;
    expect(m.analysis?.for.lead).toBe("It holds.");
    expect(m.analysis?.against.points).toEqual(["Costs bite"]);
  });

  it("drops the whole block when one side is missing — never a lone column", () => {
    const m = buildCertificate(concluded, "c", {
      ...withAnalysis,
      againstAnalysis: "",
    })!;
    expect(m.analysis).toBeNull();
  });

  it("drops the block when the row carries no analysis at all", () => {
    expect(buildCertificate(concluded, "c", source)!.analysis).toBeNull();
  });
});

describe("certificateFilename", () => {
  it("names the file after the debate", () => {
    expect(certificateFilename("CRX-12-A")).toBe("crux-verdict-CRX-12-A.png");
  });
});
