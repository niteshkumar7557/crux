import { describe, it, expect } from "vitest";
import {
  claimSize,
  verdictSize,
  fits,
  CLAIM_DB_MAX,
  VERDICT_HARD_MAX,
} from "./certificateType";

describe("verdictSize", () => {
  it("sets a short ruling at the top of the ladder", () => {
    expect(verdictSize(120)).toBe(32);
  });

  it("steps down exactly at a boundary, not a character before", () => {
    expect(verdictSize(200)).toBe(32);
    expect(verdictSize(201)).toBe(27);
  });

  it("keeps a 60-word ruling readable", () => {
    expect(verdictSize(400)).toBe(23);
  });

  it("bottoms out rather than running off the page", () => {
    expect(verdictSize(5000)).toBe(14);
  });
});

describe("claimSize", () => {
  it("sets a normal motion at full size", () => {
    expect(claimSize(80)).toBe(56);
  });

  it("steps down exactly at a boundary", () => {
    expect(claimSize(90)).toBe(56);
    expect(claimSize(91)).toBe(46);
  });

  it("bottoms out", () => {
    expect(claimSize(5000)).toBe(20);
  });
});

describe("fits", () => {
  it("fits what the product actually produces", () => {
    expect(fits(120, 400)).toBe(true);
  });

  it("fits the worst case the database can hold", () => {
    expect(fits(CLAIM_DB_MAX, VERDICT_HARD_MAX)).toBe(true);
  });

  it("fits a maximal claim beside a maximal verdict at every step below them", () => {
    for (const claim of [90, 150, 230, 340, 520, CLAIM_DB_MAX]) {
      for (const verdict of [200, 320, 460, 640, 900, VERDICT_HARD_MAX]) {
        expect(fits(claim, verdict)).toBe(true);
      }
    }
  });
});
