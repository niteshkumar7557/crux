import { describe, it, expect } from "vitest";
import { verdictMessage, oppositionMessage } from "./messages.js";

describe("verdictMessage", () => {
  it("flags an upset win above MVP and plain win", () => {
    expect(verdictMessage("win", true, true)).toContain("Upset");
    expect(verdictMessage("win", true, false)).toContain("MVP");
    expect(verdictMessage("win", false, false)).toContain("won the debate");
  });
  it("covers loss and draw", () => {
    expect(verdictMessage("loss", false, false)).toContain("lost");
    expect(verdictMessage("draw", false, false)).toContain("draw");
  });
});

describe("oppositionMessage", () => {
  it("names the actor", () => {
    expect(oppositionMessage("ada")).toBe("@ada joined the opposing side of your debate.");
  });
});
