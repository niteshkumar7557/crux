"use client";

// One clock for the arena. `useNow` returns a ticking timestamp rather than
// letting each caller read Date.now() mid-render, which keeps the predicate pure
// and needs no react-hooks/purity escape hatch. Everything that has to agree
// about "is this debate still open" reads it from here.
// Spec: game-theory.md §4

import { useEffect, useState } from "react";
import { isArenaClosed } from "./arenaClock";

const TICK_MS = 1000;

export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  return now;
}

export function useArenaClosed(
  status: string,
  closesAt: string | null,
): boolean {
  const now = useNow();
  return isArenaClosed({ status, closesAt, now });
}
