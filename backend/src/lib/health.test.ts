import { describe, it, expect, vi } from "vitest";
import { makeHealthHandler } from "./health.js";

function fakeRes() {
  return { sendStatus: vi.fn() } as any;
}

describe("makeHealthHandler", () => {
  it("200 when the ping resolves", async () => {
    const res = fakeRes();
    await makeHealthHandler(async () => {})({} as any, res);
    expect(res.sendStatus).toHaveBeenCalledWith(200);
  });
  it("503 when the ping rejects", async () => {
    const res = fakeRes();
    await makeHealthHandler(async () => {
      throw new Error("db down");
    })({} as any, res);
    expect(res.sendStatus).toHaveBeenCalledWith(503);
  });
});
