import { readFile } from "node:fs/promises";
import { join } from "node:path";

// satori (inside next/og) can't use the CSS-loaded webfonts, so every generated
// image ships the raw WOFFs. Shared by the OG card and the verdict certificate
// so the two never drift onto different faces.
const FONT_DIR = join(process.cwd(), "app", "_fonts");

export const MONO = "Grotesk";
export const SERIF = "Newsreader";

export async function loadOgFonts() {
  const [newsreader, grotesk, groteskBold] = await Promise.all([
    readFile(join(FONT_DIR, "Newsreader-Italic.woff")),
    readFile(join(FONT_DIR, "SpaceGrotesk-Regular.woff")),
    readFile(join(FONT_DIR, "SpaceGrotesk-Bold.woff")),
  ]);
  return [
    {
      name: SERIF,
      data: newsreader,
      weight: 400 as const,
      style: "italic" as const,
    },
    {
      name: MONO,
      data: grotesk,
      weight: 400 as const,
      style: "normal" as const,
    },
    {
      name: MONO,
      data: groteskBold,
      weight: 700 as const,
      style: "normal" as const,
    },
  ];
}
