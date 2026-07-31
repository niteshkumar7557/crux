"use client";

// The live 48h clock. Reads the arena's one clock, so the number here and the
// gate that closes the composer can never disagree.
// Spec: game-theory.md §4

import { useNow } from "./useArenaClock";

function fmt(msLeft: number): string {
  const s = Math.max(0, Math.floor(msLeft / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (s >= 3600) return `${h}h ${m}m`;
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

const Countdown = ({ closesAt }: { closesAt: string }) => {
  const now = useNow();
  const left = new Date(closesAt).getTime() - now;

  if (left <= 0) return null;

  return (
    <span className="font-label text-[10px] uppercase tracking-[0.2em] text-laurel px-2 py-0.5 border border-laurel/30">
      Closes in {fmt(left)}
    </span>
  );
};

export default Countdown;
