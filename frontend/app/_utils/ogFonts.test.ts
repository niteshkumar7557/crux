import { describe, expect, it } from "vitest";
import { loadOgFonts, DISPLAY, SERIF, MONO } from "./ogFonts";

describe("loadOgFonts", () => {
  it("loads the display face, both serif cuts and both grotesk weights", async () => {
    const fonts = await loadOgFonts();
    const seen = fonts.map((f) => `${f.name}/${f.weight}/${f.style}`);

    expect(seen).toContain(`${DISPLAY}/400/normal`);
    expect(seen).toContain(`${SERIF}/400/italic`);
    expect(seen).toContain(`${SERIF}/400/normal`);
    expect(seen).toContain(`${MONO}/400/normal`);
    expect(seen).toContain(`${MONO}/700/normal`);
  });

  it("hands satori parsable woff, never woff2", async () => {
    const fonts = await loadOgFonts();
    expect(fonts.length).toBeGreaterThan(0);
    for (const font of fonts) {
      expect(font.data.subarray(0, 4).toString("ascii")).not.toBe("wOF2");
    }
  });
});
