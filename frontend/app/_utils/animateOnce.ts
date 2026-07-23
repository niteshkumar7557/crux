"use client";

// Entrance animations are an introduction, not a feature of the page. Playing
// the leaderboard's stagger again every time somebody comes back to it turns a
// flourish into a toll on the content. So each page introduces itself ONCE per
// session and is instant afterwards.
//
// sessionStorage, not localStorage, is deliberate: the ceiling is one session.
// A new tab or a fresh visit tomorrow gets the introduction again.

const PREFIX = "crux:seen:";

/** The slice of Storage this needs — so the decision logic can be tested. */
export interface SeenStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * True the first time a key is claimed, false forever after (within the
 * session). Pure apart from the store it is handed.
 */
export function claimOnce(store: SeenStore, key: string): boolean {
  const storageKey = `${PREFIX}${key}`;
  try {
    if (store.getItem(storageKey) !== null) return false;
    store.setItem(storageKey, "1");
    return true;
  } catch {
    // Safari private mode throws on write, and a disabled-storage browser
    // throws on read. Motion is decoration — degrade to always animating
    // rather than never.
    return true;
  }
}

// One page renders many animated components (every feed card has a score bar),
// and they must all reach the SAME verdict — otherwise the first bar animates
// and the rest sit still. They mount in one commit, so the decision is memoised
// across that commit and released immediately after it.
const batch = new Map<string, boolean>();

function memoise(key: string, decide: () => boolean): boolean {
  const cached = batch.get(key);
  if (cached !== undefined) return cached;
  const allow = decide();
  batch.set(key, allow);
  // After the current task — i.e. once every layout effect in this commit has
  // run — the memo is dropped, so a later visit re-reads the session record.
  queueMicrotask(() => batch.delete(key));
  return allow;
}

/**
 * Should this surface play its entrance animation now?
 *
 * `key` identifies the surface — normally the pathname, so each page is judged
 * on its own. Call it from inside an effect; it touches sessionStorage and
 * must not run during render or on the server.
 */
export function shouldAnimate(key: string): boolean {
  if (typeof window === "undefined") return false;
  return memoise(key, () => claimOnce(window.sessionStorage, key));
}
