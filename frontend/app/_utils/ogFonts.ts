// Loads the on-disk faces for generated images. See design-system.md §3.

import { readFile } from "node:fs/promises";
import { join } from "node:path";

const FONT_DIR = join(process.cwd(), "app", "_fonts");

export const DISPLAY = "Anton";
export const MONO = "Grotesk";
export const SERIF = "Newsreader";
export const BODY = MONO;

function isWoff2(data: Buffer): boolean {
  return data.subarray(0, 4).toString("ascii") === "wOF2";
}

type OgFont = {
  name: string;
  data: Buffer;
  weight: 400 | 700;
  style: "normal" | "italic";
};

type Family = {
  name: string;
  weight: 400 | 700;
  style: "normal" | "italic";
  files: string[];
};

const FAMILIES: Family[] = [
  { name: DISPLAY, weight: 400, style: "normal", files: ["Anton-Regular.woff"] },
  {
    name: SERIF,
    weight: 400,
    style: "italic",
    files: ["Newsreader-Italic.woff"],
  },
  { name: SERIF, weight: 400, style: "normal", files: ["Newsreader-Regular.woff"] },
  { name: MONO, weight: 400, style: "normal", files: ["SpaceGrotesk-Regular.woff"] },
  { name: MONO, weight: 700, style: "normal", files: ["SpaceGrotesk-Bold.woff"] },
];

async function loadFamily(family: Family): Promise<OgFont | null> {
  const unusable: string[] = [];
  for (const file of family.files) {
    let data: Buffer;
    try {
      data = await readFile(join(FONT_DIR, file));
    } catch {
      continue; // not present — try the next container
    }
    if (isWoff2(data)) {
      unusable.push(file);
      continue;
    }
    return { name: family.name, weight: family.weight, style: family.style, data };
  }
  if (unusable.length > 0) {
    console.warn(
      `[og] "${family.name}" has only woff2 (${unusable.join(", ")}), which satori cannot parse — falling back. ` +
        `Convert it:  npx wawoff2 decompress <file>`,
    );
  }
  return null;
}

export async function loadOgFonts(): Promise<OgFont[]> {
  return (await Promise.all(FAMILIES.map(loadFamily))).filter(
    (f): f is OgFont => f !== null,
  );
}
