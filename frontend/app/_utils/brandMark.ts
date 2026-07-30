// The mark as a data URI, because satori has no mask support and cannot read CSS
// variables. Hand-synced with ui/Logo.tsx.

const ARCH_OUTLINE = "M4 21.2V11a8 8 0 0 1 16 0v10.2";
const ARCH_SOLID = "M4 21.4V11a8 8 0 0 1 16 0v10.4z";
const BRACES = "M5.2 20.2L18.4 9.4M18.8 20.2L5.6 9.4";

const encode = (svg: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}`;

export const markOutline = (ink: string) =>
  encode(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <g fill="none" stroke="${ink}" stroke-width="1.7" stroke-linecap="round">
      <path d="${ARCH_OUTLINE}"/><path d="${BRACES}"/>
    </g></svg>`);

export const markSolid = (ink: string, ground: string) =>
  encode(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path d="${ARCH_SOLID}" fill="${ink}"/>
    <path d="${BRACES}" stroke="${ground}" stroke-width="2.15" stroke-linecap="round" fill="none"/>
  </svg>`);

export const BRAND = {
  paper: "#f3edda",
  ink: "#244134",
  inkSoft: "#52685b",
  faint: "#c9c0a5",
  for: "#2f6b4f",
  against: "#9c4a34",
  draw: "#857a55",
} as const;
