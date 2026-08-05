import { describe, expect, it } from "vitest";
import { access } from "node:fs/promises";
import { join } from "node:path";
import {
  PLATE_SOURCES,
  MAX_BOX_DRIFT,
  plateBox,
  plateDataUri,
  type PlateName,
} from "./socialPlates";

const NAMES = Object.keys(PLATE_SOURCES) as PlateName[];

describe("plate geometry", () => {
  // The rule that produced this: verdict-scales.jpeg is 2048x2048, and forcing a
  // square engraving into a 4.5:1 band with object-fit cover discards 78% of it.
  it("keeps every box within MAX_BOX_DRIFT of its source ratio", () => {
    for (const name of NAMES) {
      const { ratio, boxRatio } = PLATE_SOURCES[name];
      expect(Math.abs(boxRatio - ratio) / ratio).toBeLessThanOrEqual(MAX_BOX_DRIFT);
    }
  });

  it("gives square subjects the arch and landscape subjects a band", () => {
    expect(plateBox("scales", 270).arch).toBe(true);
    expect(plateBox("hourglass", 230).arch).toBe(true);
    expect(plateBox("duel", 856).arch).toBe(false);
  });

  it("derives height from the box ratio", () => {
    expect(plateBox("scales", 270)).toEqual({ width: 270, height: 300, arch: true });
    expect(plateBox("duel", 856)).toEqual({ width: 856, height: 357, arch: false });
  });
});

describe("plate assets", () => {
  it("has every source file on disk", async () => {
    for (const name of NAMES) {
      const path = join(process.cwd(), "public", "landing", PLATE_SOURCES[name].file);
      await expect(access(path)).resolves.toBeUndefined();
    }
  });

  it("reads a plate as a jpeg data uri", async () => {
    const uri = await plateDataUri("scales");
    expect(uri.startsWith("data:image/jpeg;base64,")).toBe(true);
    expect(uri.length).toBeGreaterThan(1000);
  });
});
