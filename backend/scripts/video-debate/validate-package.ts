// Validates an existing local video-debate manifest without network or model calls.

import { pathToFileURL } from "node:url";
import { validateSubmissionV1 } from "../../src/video-debates/manifest.logic.js";
import type { VideoDebateSubmissionV1 } from "../../src/video-debates/manifest.types.js";
import {
  PackageValidationError,
  packageExpectation,
  printPackageIssues,
  readJsonArtifact,
  resolvePackagePaths,
} from "./build-manifest.js";

export async function validateManifestPackage(root: string | undefined): Promise<VideoDebateSubmissionV1> {
  const paths = resolvePackagePaths(root);
  const manifest = await readJsonArtifact(paths.root, paths.manifest, "output/manifest.json");
  const validation = validateSubmissionV1(manifest, await packageExpectation(paths));
  if (!validation.ok) throw new PackageValidationError(validation.errors);
  return validation.value;
}

async function main(): Promise<void> {
  const manifest = await validateManifestPackage(process.argv[2]);
  process.stdout.write(`Validated V${manifest.version} manifest with ${manifest.rounds.length} rounds and ${manifest.transcript.length} transcript segments.\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    printPackageIssues(error);
    process.exitCode = 1;
  });
}
