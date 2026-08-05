// The engravings, as data URIs, with a box whose aspect is chosen from the
// file's real dimensions.
//
// Satori has no mix-blend-mode, so .engraving's trick does not survive here: a
// plate is a cream panel with the image drawn straight onto it. Source cream and
// --paper-plate are about 2% apart and the hairline already declares the edge.
// If a rendered plate ever reads dirty, pre-flatten the sources with sharp
// (resolvable at 0.34.5) rather than reaching for a blend mode.
//
// See design-system.md §4.

import { readFile } from "node:fs/promises";
import { join } from "node:path";

const DIR = join(process.cwd(), "public", "landing");

export type PlateName = "duel" | "scales" | "hourglass";

// boxRatio is chosen per source, not computed, so a bad one is visible in review
// rather than buried in a formula. The test holds it within MAX_BOX_DRIFT.
export const MAX_BOX_DRIFT = 0.35;

export const PLATE_SOURCES: Record<
  PlateName,
  { file: string; ratio: number; boxRatio: number; caption: string }
> = {
  duel: {
    file: "duel-fencers.jpeg",
    ratio: 3024 / 1694,
    boxRatio: 2.4,
    caption: "PLATE I · THE DUEL",
  },
  scales: {
    file: "verdict-scales.jpeg",
    ratio: 1,
    boxRatio: 0.9,
    caption: "PLATE II · THE SCALES",
  },
  hourglass: {
    file: "clock-hourglass.jpeg",
    ratio: 1,
    boxRatio: 0.9,
    caption: "PLATE III · THE CLOCK",
  },
};

// Portrait and square subjects get arched tops — the arena-door arch, the
// system's signature shape. Landscape subjects are rectangles.
const ARCH_BELOW = 1.2;

export interface PlateBox {
  width: number;
  height: number;
  arch: boolean;
}

export function plateBox(name: PlateName, width: number): PlateBox {
  const { boxRatio } = PLATE_SOURCES[name];
  return {
    width,
    height: Math.round(width / boxRatio),
    arch: boxRatio < ARCH_BELOW,
  };
}

// Read once per process. Satori components cannot be async, so callers resolve
// this before building their element.
const cache = new Map<PlateName, string>();

export async function plateDataUri(name: PlateName): Promise<string> {
  const hit = cache.get(name);
  if (hit) return hit;
  const data = await readFile(join(DIR, PLATE_SOURCES[name].file));
  const uri = `data:image/jpeg;base64,${data.toString("base64")}`;
  cache.set(name, uri);
  return uri;
}
