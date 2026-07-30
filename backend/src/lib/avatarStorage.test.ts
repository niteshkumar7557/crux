import { describe, it, expect } from "vitest";
import { keyFromAvatarUrl, makeAvatarStore } from "./avatarStorage.js";
import { isCustomAvatar } from "./avatars.js";

const R2 = {
  endpoint: "https://acct.r2.cloudflarestorage.com",
  bucket: "crux-avatars",
  accessKeyId: "key",
  secretAccessKey: "secret",
  publicUrl: "https://avatars.example.com",
};

describe("store selection", () => {
  it("uses object storage when every credential is present", () => {
    expect(makeAvatarStore(R2).kind).toBe("r2");
  });

  it("falls back to local disk when any one is missing", () => {
    expect(makeAvatarStore({}).kind).toBe("local");
    for (const key of Object.keys(R2) as (keyof typeof R2)[]) {
      const partial = { ...R2, [key]: undefined };
      expect(makeAvatarStore(partial).kind, `missing ${key}`).toBe("local");
    }
  });

  it("does not half-configure: a missing public URL must not yield r2 URLs", () => {
    const store = makeAvatarStore({ ...R2, publicUrl: undefined });
    expect(store.urlFor("u1-abc.webp")).toBe("/uploads/avatars/u1-abc.webp");
  });
});

describe("urlFor", () => {
  it("object storage yields an absolute URL under the public host", () => {
    expect(makeAvatarStore(R2).urlFor("u7-abc.webp")).toBe(
      "https://avatars.example.com/avatars/u7-abc.webp",
    );
  });

  it("tolerates a trailing slash on the configured public URL", () => {
    const store = makeAvatarStore({ ...R2, publicUrl: "https://cdn.example.com/" });
    expect(store.urlFor("u7-abc.webp")).toBe(
      "https://cdn.example.com/avatars/u7-abc.webp",
    );
  });

  it("local disk yields the relative path the /api rewrite serves", () => {
    expect(makeAvatarStore({}).urlFor("u7-abc.webp")).toBe(
      "/uploads/avatars/u7-abc.webp",
    );
  });
});

describe("keyFromAvatarUrl", () => {
  it("recovers the key from an object-storage URL", () => {
    expect(
      keyFromAvatarUrl("https://avatars.example.com/avatars/u7-abc.webp"),
    ).toBe("u7-abc.webp");
  });

  it("recovers the key from a local path", () => {
    expect(keyFromAvatarUrl("/uploads/avatars/u7-abc.webp")).toBe("u7-abc.webp");
  });

  it("cannot be walked out of its directory", () => {
    expect(keyFromAvatarUrl("/uploads/avatars/../../../etc/passwd")).toBe(
      "passwd",
    );
  });
});

describe("isCustomAvatar", () => {
  it("a preset is not a custom upload, and is never deleted", () => {
    expect(isCustomAvatar("/avatars/presets/preset-01.svg")).toBe(false);
  });

  it("recognises an upload in either storage mode", () => {
    expect(isCustomAvatar("https://avatars.example.com/avatars/u7-abc.webp")).toBe(true);
    expect(isCustomAvatar("/uploads/avatars/u7-abc.webp")).toBe(true);
  });

  it("null is not a custom upload", () => {
    expect(isCustomAvatar(null)).toBe(false);
  });
});
