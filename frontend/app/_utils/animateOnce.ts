"use client";

// An entrance is an introduction, not a feature of the page: each one plays ONCE per
// session and is instant afterwards. sessionStorage, not localStorage — a fresh
// visit tomorrow gets the introduction again. Interaction feedback is never gated.
// See design-system.md §6.

const PREFIX = "crux:seen:";

export interface SeenStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function claimOnce(store: SeenStore, key: string): boolean {
  const storageKey = `${PREFIX}${key}`;
  try {
    if (store.getItem(storageKey) !== null) return false;
    store.setItem(storageKey, "1");
    return true;
  } catch {
    return true;
  }
}

const batch = new Map<string, boolean>();

function memoise(key: string, decide: () => boolean): boolean {
  const cached = batch.get(key);
  if (cached !== undefined) return cached;
  const allow = decide();
  batch.set(key, allow);
  queueMicrotask(() => batch.delete(key));
  return allow;
}

export function shouldAnimate(key: string): boolean {
  if (typeof window === "undefined") return false;
  return memoise(key, () => claimOnce(window.sessionStorage, key));
}
