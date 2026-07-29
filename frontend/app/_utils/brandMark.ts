// The Crux mark as a data URI, for generated images.
//
// satori (inside next/og) renders a subset of SVG and does not support masks,
// so the mark cannot be handed to it as JSX the way the React component draws
// it. An <img> pointing at a data URI is a path satori handles completely — it
// decodes and rasterises the SVG itself — so the same geometry survives into
// the OG card and the app icon.
//
// Keep the path data in step with _components/ui/Logo.tsx. There are only four
// numbers-bearing strings and they are duplicated here on purpose: importing a
// TSX component into an edge-runtime image route drags React along with it.

const ARCH_OUTLINE = "M4 21.2V11a8 8 0 0 1 16 0v10.2";
const ARCH_SOLID = "M4 21.4V11a8 8 0 0 1 16 0v10.4z";
const BRACES = "M5.2 20.2L18.4 9.4M18.8 20.2L5.6 9.4";

const encode = (svg: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}`;

/** The outlined mark, in whatever ink you pass. */
export const markOutline = (ink: string) =>
  encode(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <g fill="none" stroke="${ink}" stroke-width="1.7" stroke-linecap="round">
      <path d="${ARCH_OUTLINE}"/><path d="${BRACES}"/>
    </g></svg>`);

/** The filled mark, braces knocked out to the ground colour. */
export const markSolid = (ink: string, ground: string) =>
  encode(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path d="${ARCH_SOLID}" fill="${ink}"/>
    <path d="${BRACES}" stroke="${ground}" stroke-width="2.15" stroke-linecap="round" fill="none"/>
  </svg>`);

/** Light-mode brand inks, spelled out — generated images have no CSS to read. */
export const BRAND = {
  paper: "#f3edda",
  ink: "#244134",
  inkSoft: "#52685b",
  faint: "#c9c0a5",
  for: "#2f6b4f",
  against: "#9c4a34",
  draw: "#857a55",
} as const;
