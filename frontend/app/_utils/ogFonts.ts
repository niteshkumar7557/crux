import { readFile } from "node:fs/promises";
import { join } from "node:path";

// satori (inside next/og) can't use the CSS-loaded webfonts, so every generated
// image ships the raw font files. Shared by the OG card and the verdict
// certificate so the two never drift onto different faces.
//
// Format matters: satori parses ttf/otf/woff and throws "Unsupported OpenType
// signature wOF2" on woff2 — that container is brotli-compressed, and the
// parser reads the table directory straight out of the bytes. Since that throw
// happens at render time it would take a whole image down, each family lists
// its acceptable containers and the first parseable one wins.
const FONT_DIR = join(process.cwd(), "app", "_fonts");

export const MONO = "Grotesk";
export const SERIF = "Newsreader";
// The design system names three faces and Manrope is not one of them any more
// (design-system.md §3). Its natural replacement for body copy is Newsreader,
// but only the italic cut is on disk here and prose set entirely in italic is
// a worse card than prose set in the label face. So generated images set body
// copy in Space Grotesk — which the card is already mostly set in — and BODY
// stays a separate name so a Newsreader-Regular file can claim it later
// without touching a single call site.
export const BODY = MONO;

/** woff2 files start with the ASCII tag `wOF2`. */
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
  /** Filenames to try, best first. */
  files: string[];
};

const FAMILIES: Family[] = [
  {
    name: SERIF,
    weight: 400,
    style: "italic",
    files: ["Newsreader-Italic.woff"],
  },
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
  // BODY currently resolves to MONO, so the Grotesk family below already
  // satisfies it. The alias step that used to graft Grotesk onto a missing
  // Manrope went with Manrope itself; if BODY is ever pointed at its own file,
  // that fallback should come back with it.
  return (await Promise.all(FAMILIES.map(loadFamily))).filter(
    (f): f is OgFont => f !== null,
  );
}
