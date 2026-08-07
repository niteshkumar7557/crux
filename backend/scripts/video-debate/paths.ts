import { constants } from "node:fs";
import { lstat, open } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

export type VideoDebatePackagePaths = {
  root: string;
  host: string;
  for: string;
  against: string;
  poster: string;
  debate: string;
  boundaries: string;
  mediaProbes: string;
  transcript: string;
  judgment: string;
  manifest: string;
  rawHost: string;
  rawFor: string;
  rawAgainst: string;
  captions: string;
};

export type PackagePathIssue = {
  code: "package_path";
  path: string;
  message: string;
};

export class PackagePathError extends Error {
  readonly issue: PackagePathIssue;

  constructor(path: string, kind: "input" | "output") {
    const message = kind === "input"
      ? "Package input must be a regular file inside the package root without symbolic links."
      : "Package output must stay inside the package root without symbolic links.";
    super(`package_path ${path}: ${message}`);
    this.issue = { code: "package_path", path, message };
  }
}

function knownChild(root: string, child: string): string {
  const resolved = resolve(root, child);
  const pathFromRoot = relative(root, resolved);
  if (pathFromRoot === "" || pathFromRoot === ".." || pathFromRoot.startsWith(`..${String.fromCharCode(47)}`) || isAbsolute(pathFromRoot)) {
    throw new Error(`Package path escapes its root: ${child}`);
  }
  return resolved;
}

export function packageChildPath(root: string, child: string): string {
  return knownChild(root, child);
}

export function packagePaths(root: string): VideoDebatePackagePaths {
  if (!isAbsolute(root)) throw new Error("Video debate package path must be absolute.");
  const resolvedRoot = resolve(root);
  return {
    root: resolvedRoot,
    host: knownChild(resolvedRoot, "publish/host.mp4"),
    for: knownChild(resolvedRoot, "publish/for.mp4"),
    against: knownChild(resolvedRoot, "publish/against.mp4"),
    poster: knownChild(resolvedRoot, "publish/poster.webp"),
    debate: knownChild(resolvedRoot, "metadata/debate.json"),
    boundaries: knownChild(resolvedRoot, "metadata/boundaries.json"),
    mediaProbes: knownChild(resolvedRoot, "metadata/media-probes.json"),
    transcript: knownChild(resolvedRoot, "transcript/transcript.json"),
    judgment: knownChild(resolvedRoot, "judgment/judgment.json"),
    manifest: knownChild(resolvedRoot, "output/manifest.json"),
    rawHost: knownChild(resolvedRoot, "transcript/raw/host-isolated.json"),
    rawFor: knownChild(resolvedRoot, "transcript/raw/for.json"),
    rawAgainst: knownChild(resolvedRoot, "transcript/raw/against.json"),
    captions: knownChild(resolvedRoot, "output/captions.vtt"),
  };
}

function pathParts(root: string, target: string, label: string, kind: "input" | "output"): string[] {
  const pathFromRoot = relative(root, target);
  if (pathFromRoot === ".." || pathFromRoot.startsWith(`..${sep}`) || isAbsolute(pathFromRoot)) {
    throw new PackagePathError(label, kind);
  }
  return pathFromRoot.split(sep).filter((value) => value.length > 0);
}

async function assertAncestors(
  root: string,
  target: string,
  label: string,
  allowMissing: boolean,
): Promise<void> {
  const parts = pathParts(root, target, label, allowMissing ? "output" : "input");
  const terminalIndex = parts.length;
  let current = root;
  for (let index = 0; index <= terminalIndex; index += 1) {
    try {
      const facts = await lstat(current);
      if (facts.isSymbolicLink()) throw new PackagePathError(label, allowMissing ? "output" : "input");
      if ((index < terminalIndex || allowMissing) && !facts.isDirectory()) {
        throw new PackagePathError(label, allowMissing ? "output" : "input");
      }
      if (index === terminalIndex && !allowMissing && !facts.isFile()) {
        throw new PackagePathError(label, "input");
      }
    } catch (error) {
      const missing = typeof error === "object" && error !== null
        && Object.entries(error).some(([key, value]) => key === "code" && value === "ENOENT");
      if (allowMissing && missing && index > 0) return;
      if (error instanceof PackagePathError) throw error;
      throw new PackagePathError(label, allowMissing ? "output" : "input");
    }
    if (index < terminalIndex) {
      current = resolve(current, parts[index]!);
    }
  }
}

export async function assertPackageInputPath(root: string, target: string, label: string): Promise<void> {
  await assertAncestors(root, target, label, false);
}

export async function assertPackageOutputPath(root: string, target: string, label: string): Promise<void> {
  await assertAncestors(root, dirname(target), label, true);
}

export async function readPackageText(root: string, target: string, label: string): Promise<string> {
  await assertPackageInputPath(root, target, label);
  let file: Awaited<ReturnType<typeof open>>;
  try {
    file = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch {
    throw new PackagePathError(label, "input");
  }
  try {
    const facts = await file.stat();
    if (!facts.isFile()) throw new PackagePathError(label, "input");
    return await file.readFile("utf8");
  } catch (error) {
    if (error instanceof PackagePathError) throw error;
    throw new PackagePathError(label, "input");
  } finally {
    await file.close();
  }
}
