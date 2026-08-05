// One motion becomes a list of render payloads.
//
// The six argument slides come from the referee's own stored analysis — the
// argument judge already condensed each side's strongest points at judging time
// and they are already published on the debate page. That is a better source
// than likes-ranking, and it means nothing on a poster was invented by a
// marketing model. See the spec, §4.1.

import { truncate } from "@/app/_components/motion/verdictCard";
import type { Analysis } from "@/app/motion/types";
import type { TemplateName } from "./socialTokens";
import { hostOf, type SocialCopy } from "./socialCopy";
import { isSizeStep, type SizeStep } from "./socialFit";

export const SLIDES_PER_SIDE = 3;
export const LINE_MAX = 96;
export const QUOTE_MAX = 220;
// The ruling was the one field with no cap, and a 400-character verdict is what
// pushed the CTA band on top of the story's text. Auto-fit handles the rest.
export const RULING_MAX = 260;

export interface RawArgument {
  argument_id: number;
  username: string;
  side: "for" | "against";
  content: string;
  likes: number;
}

export interface SlidePayload {
  side: "for" | "against";
  word: string;
  line: string;
  quote: string;
  handle: string;
  fallback: boolean;
}

// An editor's overrides, one preset per element. Everything left `auto` is sized
// from the content by socialFit; anything else is a deliberate override that may
// overflow, which is the editor's call.
export interface SocialSizes {
  headline: SizeStep; // the Anton display line
  motion: SizeStep; // the serif motion
  body: SizeStep; // quotes and rulings
  word: SizeStep; // the plain-English word above an argument
  plate: SizeStep; // the engraving
  pad: SizeStep; // the frame's inner padding — the "box"
}

export const DEFAULT_SIZES: SocialSizes = {
  headline: "auto",
  motion: "auto",
  body: "auto",
  word: "auto",
  plate: "auto",
  pad: "auto",
};

export function normaliseSizes(raw: unknown): SocialSizes {
  const source =
    typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const out = { ...DEFAULT_SIZES };
  for (const key of Object.keys(DEFAULT_SIZES) as (keyof SocialSizes)[]) {
    if (isSizeStep(source[key])) out[key] = source[key];
  }
  return out;
}

export interface SocialPayload {
  template: TemplateName;
  sizes: SocialSizes;
  reference: string;
  motionId: number;
  motion: string;
  keyword: string;
  status: "live" | "concluded";
  winner: "for" | "against" | "draw" | "walkover" | null;
  split: { for: number; against: number } | null;
  margin: number | null;
  verdictText: string | null;
  mvpUsername: string | null;
  closesInHours: number | null;
  hook: string;
  slide: SlidePayload | null;
  slideNumber: number | null;
  slideTotal: number | null;
  domain: string;
}

export interface BuildInput {
  id: number;
  motion: string;
  keyword: string;
  status: "live" | "concluded";
  winner: "for" | "against" | "draw" | "walkover" | null;
  split: { for: number; against: number } | null;
  margin: number | null;
  verdictText: string | null;
  mvpUsername: string | null;
  closesAt: string | null;
  forAnalysis: Analysis | null;
  againstAnalysis: Analysis | null;
  args: RawArgument[];
  copy: SocialCopy;
  siteUrl: string;
  now: number;
  /** Omitted means every element sizes itself from the content. */
  sizes?: SocialSizes;
}

function sideSlides(
  side: "for" | "against",
  analysis: Analysis | null,
  args: RawArgument[],
  words: string[],
): SlidePayload[] {
  const byId = new Map(args.map((a) => [a.argument_id, a]));
  const used = new Set<number>();
  const out: SlidePayload[] = [];

  for (const point of analysis?.points ?? []) {
    if (out.length >= SLIDES_PER_SIDE) break;
    const arg = point.argumentId !== null ? byId.get(point.argumentId) : undefined;
    if (arg) used.add(arg.argument_id);
    out.push({
      side,
      word: words[out.length] ?? "",
      line: truncate(point.text, LINE_MAX),
      quote: arg ? truncate(arg.content, QUOTE_MAX) : "",
      handle: arg ? `@${arg.username}` : point.author ? `@${point.author}` : "",
      fallback: false,
    });
  }

  // Thin side: fill from its own top-liked arguments, condensed by truncation.
  const spare = args
    .filter((a) => a.side === side && !used.has(a.argument_id))
    .sort((a, b) => b.likes - a.likes || a.argument_id - b.argument_id);

  for (const arg of spare) {
    if (out.length >= SLIDES_PER_SIDE) break;
    out.push({
      side,
      word: words[out.length] ?? "",
      line: truncate(arg.content, LINE_MAX),
      quote: truncate(arg.content, QUOTE_MAX),
      handle: `@${arg.username}`,
      fallback: true,
    });
  }

  return out;
}

export function buildSlides(input: {
  forAnalysis: Analysis | null;
  againstAnalysis: Analysis | null;
  args: RawArgument[];
  copy: SocialCopy;
}): SlidePayload[] {
  const forSlides = sideSlides("for", input.forAnalysis, input.args, input.copy.words.for);
  const againstSlides = sideSlides(
    "against",
    input.againstAnalysis,
    input.args,
    input.copy.words.against,
  );

  const out: SlidePayload[] = [];
  for (let i = 0; i < Math.max(forSlides.length, againstSlides.length); i++) {
    if (forSlides[i]) out.push(forSlides[i]);
    if (againstSlides[i]) out.push(againstSlides[i]);
  }
  return out;
}

export function assetsFor(status: "live" | "concluded"): TemplateName[] {
  return status === "live"
    ? ["ig-live", "x-live"]
    : ["ig-cover", "ig-argument", "ig-verdict", "ig-story", "li-verdict", "x-verdict"];
}

export function liveHoursLeft(closesAt: string | null, now: number): number | null {
  if (!closesAt) return null;
  const msLeft = Date.parse(closesAt) - now;
  if (!Number.isFinite(msLeft)) return null;
  return msLeft <= 0 ? 0 : Math.floor(msLeft / 3_600_000);
}

export function canExportLive(hours: number | null): boolean {
  return hours !== null && hours >= 1;
}

const pad4 = (n: number) => String(n).padStart(4, "0");

export function buildPayloads(input: BuildInput): SocialPayload[] {
  const domain = hostOf(input.siteUrl);
  const reference = `MOTION No. ${pad4(input.id)}`;
  const closesInHours = liveHoursLeft(input.closesAt, input.now);

  const common = {
    sizes: input.sizes ?? DEFAULT_SIZES,
    reference,
    motionId: input.id,
    motion: input.motion,
    keyword: input.keyword,
    status: input.status,
    winner: input.winner,
    split: input.split,
    margin: input.margin,
    verdictText: input.verdictText ? truncate(input.verdictText, RULING_MAX) : null,
    mvpUsername: input.mvpUsername,
    closesInHours,
    hook: input.copy.hook,
    domain,
  };

  if (input.status === "live") {
    return (["ig-live", "x-live"] as const).map((template) => ({
      ...common,
      template,
      slide: null,
      slideNumber: null,
      slideTotal: null,
    }));
  }

  const slides = buildSlides({
    forAnalysis: input.forAnalysis,
    againstAnalysis: input.againstAnalysis,
    args: input.args,
    copy: input.copy,
  });

  // Cover + slides + verdict. A thin debate renumbers rather than printing
  // "02 / 08" on a carousel with four slides in it.
  const total = slides.length + 2;

  const carousel: SocialPayload[] = [
    { ...common, template: "ig-cover", slide: null, slideNumber: 1, slideTotal: total },
    ...slides.map((slide, i) => ({
      ...common,
      template: "ig-argument" as const,
      slide,
      slideNumber: i + 2,
      slideTotal: total,
    })),
    { ...common, template: "ig-verdict", slide: null, slideNumber: total, slideTotal: total },
  ];

  const onePagers: SocialPayload[] = (["ig-story", "li-verdict", "x-verdict"] as const).map(
    (template) => ({ ...common, template, slide: null, slideNumber: null, slideTotal: null }),
  );

  return [...carousel, ...onePagers];
}

function stamp(at: Date): string {
  const iso = at.toISOString();
  return `${iso.slice(0, 10)}-${iso.slice(11, 13)}h`;
}

export function assetFilename(payload: SocialPayload, generatedAt: Date): string {
  const n = pad4(payload.motionId);

  if (payload.template === "ig-live" || payload.template === "x-live") {
    const platform = payload.template === "ig-live" ? "live" : "live-x";
    return `crux-${platform}-${n}-${stamp(generatedAt)}.png`;
  }

  if (payload.slideNumber !== null) {
    const index = String(payload.slideNumber).padStart(2, "0");
    if (payload.template === "ig-cover") return `${index}-cover.png`;
    if (payload.template === "ig-verdict") return `${index}-verdict.png`;
    return `${index}-${payload.slide?.side ?? "argument"}.png`;
  }

  const suffix =
    payload.template === "ig-story" ? "story" : payload.template === "li-verdict" ? "linkedin" : "x";
  return `crux-${suffix}-${n}.png`;
}
