import { describe, expect, it } from "vitest";
import {
  VIDEO_PASS_COOKIE,
  issueVideoPass,
  passwordAccepted,
  videoPassAccepted,
} from "./access.logic.js";

const SECRET = "test-jwt-secret";

describe("password acceptance", () => {
  it("accepts the configured password", () => {
    expect(passwordAccepted("open sesame", "open sesame")).toBe(true);
  });

  it("rejects a wrong password, including a prefix of the right one", () => {
    expect(passwordAccepted("open", "open sesame")).toBe(false);
    expect(passwordAccepted("wrong", "open sesame")).toBe(false);
  });

  // Fail closed: no password configured means nobody gets in, in any environment.
  it("rejects everything when no password is configured", () => {
    expect(passwordAccepted("anything", undefined)).toBe(false);
    expect(passwordAccepted("anything", "")).toBe(false);
    expect(passwordAccepted("", "")).toBe(false);
  });

  it("rejects non-string input rather than coercing it", () => {
    expect(passwordAccepted(undefined, "open sesame")).toBe(false);
    expect(passwordAccepted(12345, "open sesame")).toBe(false);
    expect(passwordAccepted({ toString: () => "open sesame" }, "open sesame")).toBe(false);
  });
});

describe("the pass token", () => {
  it("issues a token its own verifier accepts", () => {
    expect(videoPassAccepted(issueVideoPass(SECRET), SECRET)).toBe(true);
  });

  it("refuses an absent, malformed or foreign-signed token", () => {
    expect(videoPassAccepted(undefined, SECRET)).toBe(false);
    expect(videoPassAccepted("", SECRET)).toBe(false);
    expect(videoPassAccepted("not.a.token", SECRET)).toBe(false);
    expect(videoPassAccepted(issueVideoPass("a-different-secret"), SECRET)).toBe(false);
  });

  // An ordinary user token is signed with the same secret. Scope is what stops it
  // from being presented as a pass.
  it("refuses a correctly signed token carrying the wrong scope", async () => {
    const jwt = (await import("jsonwebtoken")).default;
    const foreign = jwt.sign({ id: 1, email: "a@b.test", role: "user" }, SECRET);
    expect(videoPassAccepted(foreign, SECRET)).toBe(false);
  });

  it("refuses everything when no signing secret is configured", () => {
    expect(videoPassAccepted(issueVideoPass(SECRET), undefined)).toBe(false);
    expect(videoPassAccepted(issueVideoPass(SECRET), "")).toBe(false);
  });

  it("names the cookie the frontend also names", () => {
    expect(VIDEO_PASS_COOKIE).toBe("crux_video_pass");
  });
});
