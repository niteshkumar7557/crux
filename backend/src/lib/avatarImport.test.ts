import { describe, it, expect } from "vitest";
import { isAllowedAvatarSource } from "./avatarImport.js";

// The host allowlist is the whole trust boundary for a server-side fetch of an
// address that arrives in a token claim, so it gets asserted directly.
describe("isAllowedAvatarSource", () => {
  it("accepts Google's picture hosts over https", () => {
    expect(isAllowedAvatarSource("https://lh3.googleusercontent.com/a/ACg8oc")).toBe(true);
    expect(isAllowedAvatarSource("https://lh6.googleusercontent.com/a/x")).toBe(true);
  });

  it("refuses plain http, even on an allowed host", () => {
    expect(isAllowedAvatarSource("http://lh3.googleusercontent.com/a/x")).toBe(false);
  });

  it("refuses any other host", () => {
    expect(isAllowedAvatarSource("https://evil.example.com/a/x")).toBe(false);
    expect(isAllowedAvatarSource("https://googleusercontent.com/a/x")).toBe(false);
  });

  it("is not fooled by an allowed host appearing elsewhere in the URL", () => {
    expect(
      isAllowedAvatarSource("https://evil.example.com/lh3.googleusercontent.com/a/x"),
    ).toBe(false);
    expect(
      isAllowedAvatarSource("https://lh3.googleusercontent.com.evil.example.com/a/x"),
    ).toBe(false);
    expect(
      isAllowedAvatarSource("https://user@lh3.googleusercontent.com.evil.com/a/x"),
    ).toBe(false);
  });

  it("refuses the internal addresses an SSRF would aim at", () => {
    expect(isAllowedAvatarSource("http://169.254.169.254/latest/meta-data/")).toBe(false);
    expect(isAllowedAvatarSource("http://localhost:8000/health")).toBe(false);
    expect(isAllowedAvatarSource("file:///etc/passwd")).toBe(false);
  });

  it("refuses junk rather than throwing", () => {
    expect(isAllowedAvatarSource("not a url")).toBe(false);
    expect(isAllowedAvatarSource("")).toBe(false);
  });
});
