import { describe, it, expect } from "vitest";
import {
  verdictMessage,
  oppositionMessage,
  replyMessage,
  seasonAwardMessage,
} from "./messages.js";

describe("verdictMessage", () => {
  it("flags an MVP win above a plain win", () => {
    expect(verdictMessage("win", true)).toContain("MVP");
    expect(verdictMessage("win", false)).toContain("won the debate");
  });
  it("covers loss and draw", () => {
    expect(verdictMessage("loss", false)).toContain("lost");
    expect(verdictMessage("draw", false)).toContain("draw");
  });
});

describe("oppositionMessage", () => {
  it("names the actor", () => {
    expect(oppositionMessage("ada")).toBe("@ada joined the opposing side of your debate.");
  });
});

describe("replyMessage", () => {
  it("names the actor who replied", () => {
    expect(replyMessage("ada")).toBe("@ada replied directly to your argument.");
  });
});

describe("seasonAwardMessage", () => {
  it("names the placing and the title, and says it is permanent", () => {
    expect(seasonAwardMessage("Champion of Season 0", 1)).toBe(
      'You finished #1 last season — "Champion of Season 0" is yours, permanently.',
    );
  });
});
