import { describe, it, expect } from "vitest";
import { isArenaLocked } from "./arenaLock.js";

describe("isArenaLocked", () => {
  it("lets a live arena through", () => {
    expect(isArenaLocked("live")).toBe(false);
  });

  it("locks a concluded arena", () => {
    expect(isArenaLocked("concluded")).toBe(true);
  });

  it("locks anything it does not recognise, rather than opening it", () => {
    expect(isArenaLocked("")).toBe(true);
    expect(isArenaLocked("archived")).toBe(true);
  });
});
