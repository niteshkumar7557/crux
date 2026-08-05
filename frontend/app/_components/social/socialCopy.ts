// The copy an admin edits before anything is exported, and what it degrades to
// when the AI is unavailable.
//
// The AI writes the hook, the six words and the three captions. It never writes,
// rewrites or condenses an argument — that content is the referee's, and it is
// already on the debate page. See the spec, §4.2.

import { truncate } from "@/app/_components/motion/verdictCard";

export const HOOK_MAX = 90;
export const WORD_MAX = 16;
// Instagram's caption limit, the tightest of the three, applied to all of them.
export const CAPTION_MAX = 2200;

export interface SocialCopy {
  hook: string;
  words: { for: string[]; against: string[] };
  captions: { instagram: string; linkedin: string; x: string };
}

export function hostOf(siteUrl: string): string {
  try {
    return new URL(siteUrl).host.replace(/^www\./, "");
  } catch {
    return siteUrl;
  }
}

export function defaultCopy(motion: string, url: string): SocialCopy {
  const host = hostOf(url);
  return {
    hook: truncate(motion, HOOK_MAX),
    words: { for: ["", "", ""], against: ["", "", ""] },
    captions: {
      instagram: `${motion}\n\nThree arguments a side, judged by an AI referee. The full verdict is at ${host}.`,
      linkedin: `${motion}\n\nCrux is a debate platform where an AI referee scores every argument and rules on the motion. Both cases and the ruling: ${host}`,
      x: `${motion}\n\nBoth cases, one verdict. ${host}`,
    },
  };
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function obj(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

// Three slots per side, always. A missing word leaves an empty string and the
// slide collapses its slot rather than rendering a gap.
function threeWords(value: unknown): string[] {
  const list = Array.isArray(value) ? value : [];
  return [0, 1, 2].map((i) => {
    const word = str(list[i]);
    return word ? truncate(word, WORD_MAX).toUpperCase() : "";
  });
}

export function normaliseCopy(raw: unknown, motion: string, url: string): SocialCopy {
  const fallback = defaultCopy(motion, url);
  const source = obj(raw);
  const words = obj(source.words);
  const captions = obj(source.captions);

  const hook = str(source.hook);
  const pick = (key: "instagram" | "linkedin" | "x") => {
    const value = str(captions[key]);
    return value ? truncate(value, CAPTION_MAX) : fallback.captions[key];
  };

  return {
    hook: hook ? truncate(hook, HOOK_MAX) : fallback.hook,
    words: { for: threeWords(words.for), against: threeWords(words.against) },
    captions: {
      instagram: pick("instagram"),
      linkedin: pick("linkedin"),
      x: pick("x"),
    },
  };
}
