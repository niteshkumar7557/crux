import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { writeJsonAtomic, writeTextAtomic } from "./io.js";
import {
  assertPackageInputPath,
  assertPackageOutputPath,
  packagePaths,
} from "./paths.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("video debate package files", () => {
  it("resolves only the known package children beneath an absolute root", () => {
    const paths = packagePaths("/tmp/video-debate-package");

    expect(paths.root).toBe("/tmp/video-debate-package");
    expect(paths.host).toBe("/tmp/video-debate-package/publish/host.mp4");
    expect(paths.for).toBe("/tmp/video-debate-package/publish/for.mp4");
    expect(paths.against).toBe("/tmp/video-debate-package/publish/against.mp4");
    expect(paths.poster).toBe("/tmp/video-debate-package/publish/poster.webp");
    expect(paths.debate).toBe("/tmp/video-debate-package/metadata/debate.json");
    expect(paths.boundaries).toBe("/tmp/video-debate-package/metadata/boundaries.json");
    expect(paths.mediaProbes).toBe("/tmp/video-debate-package/metadata/media-probes.json");
    expect(paths.transcript).toBe("/tmp/video-debate-package/transcript/transcript.json");
    expect(paths.judgment).toBe("/tmp/video-debate-package/judgment/judgment.json");
    expect(paths.manifest).toBe("/tmp/video-debate-package/output/manifest.json");
    expect(() => packagePaths("relative-package")).toThrow("absolute");
  });

  it("writes JSON through a sibling temporary file before replacing the destination", async () => {
    const directory = await mkdtemp(join(tmpdir(), "crux-video-debate-"));
    temporaryDirectories.push(directory);
    const destination = join(directory, "metadata", "media-probes.json");

    await writeJsonAtomic(destination, { version: 1, host: { duration_ms: 480_000 } });

    await expect(readFile(destination, "utf8")).resolves.toBe('{\n  "version": 1,\n  "host": {\n    "duration_ms": 480000\n  }\n}\n');
  });

  it("preserves the last known-good JSON when a write cannot complete", async () => {
    const directory = await mkdtemp(join(tmpdir(), "crux-video-debate-"));
    temporaryDirectories.push(directory);
    const destination = join(directory, "metadata", "media-probes.json");
    await writeJsonAtomic(destination, { version: 1 });

    await expect(writeJsonAtomic(destination, { invalid: 1n })).rejects.toThrow("BigInt");
    await expect(readFile(destination, "utf8")).resolves.toBe('{\n  "version": 1\n}\n');
  });

  it("writes caption text through a sibling temporary file before replacing the destination", async () => {
    const directory = await mkdtemp(join(tmpdir(), "crux-video-debate-"));
    temporaryDirectories.push(directory);
    const destination = join(directory, "output", "captions.vtt");

    await writeTextAtomic(destination, "WEBVTT\n");

    await expect(readFile(destination, "utf8")).resolves.toBe("WEBVTT\n");
  });

  it("does not follow a pre-existing sibling temporary-file symlink", async () => {
    const directory = await mkdtemp(join(tmpdir(), "crux-video-debate-"));
    const external = await mkdtemp(join(tmpdir(), "crux-video-debate-external-"));
    temporaryDirectories.push(directory, external);
    const destination = join(directory, "output", "manifest.json");
    const externalFile = join(external, "outside.json");
    await mkdir(join(directory, "output"), { recursive: true });
    await writeFile(externalFile, "outside stays unchanged\n");
    await symlink(externalFile, join(directory, "output", ".manifest.json.tmp"));

    await writeJsonAtomic(destination, { version: 1 });

    await expect(readFile(destination, "utf8")).resolves.toBe('{\n  "version": 1\n}\n');
    await expect(readFile(externalFile, "utf8")).resolves.toBe("outside stays unchanged\n");
  });

  it("rejects symbolic links at both an input terminal and an input ancestor", async () => {
    const directory = await mkdtemp(join(tmpdir(), "crux-video-debate-"));
    const external = await mkdtemp(join(tmpdir(), "crux-video-debate-external-"));
    temporaryDirectories.push(directory, external);
    await mkdir(join(directory, "metadata"), { recursive: true });
    await writeFile(join(external, "debate.json"), "{}\n");
    await symlink(join(external, "debate.json"), join(directory, "metadata", "debate.json"));

    await expect(assertPackageInputPath(
      directory,
      join(directory, "metadata", "debate.json"),
      "metadata/debate.json",
    )).rejects.toMatchObject({
      issue: { code: "package_path", path: "metadata/debate.json" },
    });

    await rm(join(directory, "metadata"), { recursive: true, force: true });
    await symlink(external, join(directory, "metadata"), "dir");
    await expect(assertPackageInputPath(
      directory,
      join(directory, "metadata", "debate.json"),
      "metadata/debate.json",
    )).rejects.toMatchObject({
      issue: { code: "package_path", path: "metadata/debate.json" },
    });
  });

  it("allows a missing output terminal while rejecting a symbolic-link output ancestor", async () => {
    const directory = await mkdtemp(join(tmpdir(), "crux-video-debate-"));
    const external = await mkdtemp(join(tmpdir(), "crux-video-debate-external-"));
    temporaryDirectories.push(directory, external);

    await expect(assertPackageOutputPath(
      directory,
      join(directory, "output", "manifest.json"),
      "output/manifest.json",
    )).resolves.toBeUndefined();

    await symlink(external, join(directory, "output"), "dir");
    await expect(assertPackageOutputPath(
      directory,
      join(directory, "output", "manifest.json"),
      "output/manifest.json",
    )).rejects.toMatchObject({
      issue: { code: "package_path", path: "output/manifest.json" },
    });
  });

  it("does not delete an occupied temporary candidate it did not create", async () => {
    const directory = await mkdtemp(join(tmpdir(), "crux-video-debate-"));
    temporaryDirectories.push(directory);
    const destination = join(directory, "manifest.json");
    const occupied = join(directory, ".manifest.json.occupied.tmp");
    await writeFile(occupied, "owned by another invocation\n");

    await expect(writeTextAtomic(destination, "replacement\n", () => "occupied"))
      .rejects.toMatchObject({ code: "EEXIST" });
    await expect(readFile(occupied, "utf8")).resolves.toBe("owned by another invocation\n");
    await expect(readFile(destination, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });
});
