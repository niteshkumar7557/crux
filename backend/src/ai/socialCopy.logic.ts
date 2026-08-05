// Narrowing and defaults for the social copy draft. Pure.
//
// The model's output arrives as unknown and is coerced field by field. Nothing
// here can throw, because a malformed draft must degrade to something honest
// rather than take the admin console down with it.

export const HOOK_MAX = 90;
export const WORD_MAX = 16;
export const CAPTION_MAX = 2200;

export interface SocialDraft {
  hook: string;
  words: { for: string[]; against: string[] };
  captions: { instagram: string; linkedin: string; x: string };
}

function cut(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max).trimEnd();
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function obj(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

// One word means one word. A phrase gets its first token rather than being
// rejected, because a slot that collapses is worse than a shorter label.
function oneWord(value: unknown): string {
  const raw = str(value);
  if (!raw) return "";
  const first = (raw.split(/\s+/)[0] ?? "").replace(/[^\p{L}\p{N}-]/gu, "");
  return cut(first, WORD_MAX).toUpperCase();
}

function threeWords(value: unknown): string[] {
  const list = Array.isArray(value) ? value : [];
  return [0, 1, 2].map((i) => oneWord(list[i]));
}

function caption(value: unknown, fallback: string, host: string): string {
  const raw = str(value);
  if (!raw) return fallback;
  const capped = cut(raw, CAPTION_MAX);
  return capped.includes(host) ? capped : `${capped}\n\n${host}`;
}

export function sanitizeDraft(raw: unknown, motion: string, host: string): SocialDraft {
  const source = obj(raw);
  const words = obj(source.words);
  const captions = obj(source.captions);

  const hook = str(source.hook);

  return {
    hook: hook ? cut(hook, HOOK_MAX) : cut(motion, HOOK_MAX),
    words: { for: threeWords(words.for), against: threeWords(words.against) },
    captions: {
      instagram: caption(
        captions.instagram,
        `${motion}\n\nThree arguments a side, judged by an AI referee. The full verdict is at ${host}.`,
        host,
      ),
      linkedin: caption(
        captions.linkedin,
        `${motion}\n\nCrux is a debate platform where an AI referee scores every argument and rules on the motion. Both cases and the ruling: ${host}`,
        host,
      ),
      x: caption(captions.x, `${motion}\n\nBoth cases, one verdict. ${host}`, host),
    },
  };
}
