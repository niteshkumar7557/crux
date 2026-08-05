import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { crc32, zipStore } from "./zipStore";

const bytes = (text: string) => new TextEncoder().encode(text);
const u32 = (b: Uint8Array, at: number) =>
  new DataView(b.buffer, b.byteOffset, b.byteLength).getUint32(at, true);
const u16 = (b: Uint8Array, at: number) =>
  new DataView(b.buffer, b.byteOffset, b.byteLength).getUint16(at, true);

describe("crc32", () => {
  it("matches the standard check vector", () => {
    expect(crc32(bytes("123456789"))).toBe(0xcbf43926);
  });

  it("is zero for empty input", () => {
    expect(crc32(new Uint8Array(0))).toBe(0);
  });
});

describe("zipStore", () => {
  const archive = zipStore([
    { name: "01-cover.png", data: bytes("pretend png") },
    { name: "caption.txt", data: bytes("hello") },
  ]);

  it("starts with a local file header", () => {
    expect(u32(archive, 0)).toBe(0x04034b50);
  });

  it("stores rather than deflates", () => {
    expect(u16(archive, 8)).toBe(0);
  });

  it("ends with an end-of-central-directory record naming both entries", () => {
    const eocd = archive.length - 22;
    expect(u32(archive, eocd)).toBe(0x06054b50);
    expect(u16(archive, eocd + 8)).toBe(2);
    expect(u16(archive, eocd + 10)).toBe(2);
  });

  it("records each entry's real crc and size", () => {
    const data = bytes("pretend png");
    expect(u32(archive, 14)).toBe(crc32(data));
    expect(u32(archive, 18)).toBe(data.length);
    expect(u32(archive, 22)).toBe(data.length);
  });

  it("produces an archive unzip accepts and can list", () => {
    const dir = mkdtempSync(join(tmpdir(), "crux-zip-"));
    const path = join(dir, "kit.zip");
    writeFileSync(path, archive);

    expect(() => execFileSync("unzip", ["-t", path], { stdio: "pipe" })).not.toThrow();
    const listing = execFileSync("unzip", ["-Z1", path], { encoding: "utf8" });
    expect(listing).toContain("01-cover.png");
    expect(listing).toContain("caption.txt");
  });
});
