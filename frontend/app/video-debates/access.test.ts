import { describe, expect, it } from "vitest";
import { VIDEO_PASS_COOKIE, isGateRejection } from "./access";

function axiosLike(status: number) {
  return { isAxiosError: true, response: { status } };
}

describe("recognising the gate", () => {
  it("treats a 401 from the API as the gate, not as a missing programme", () => {
    expect(isGateRejection(axiosLike(401))).toBe(true);
  });

  // A 404 is a real absence and must still reach notFound().
  it("does not treat any other failure as the gate", () => {
    expect(isGateRejection(axiosLike(404))).toBe(false);
    expect(isGateRejection(axiosLike(500))).toBe(false);
    expect(isGateRejection(new Error("socket hang up"))).toBe(false);
    expect(isGateRejection(undefined)).toBe(false);
    expect(isGateRejection(null)).toBe(false);
  });

  it("names the cookie the backend also names", () => {
    expect(VIDEO_PASS_COOKIE).toBe("crux_video_pass");
  });
});
