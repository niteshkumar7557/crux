"use client";

// The live 48h clock. Spec: game-theory.md §4

import { useEffect, useState } from "react";

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
  const target = new Date(closesAt).getTime();
  const [left, setLeft] = useState(() => target - Date.now());

  useEffect(() => {
    const t = setInterval(() => setLeft(target - Date.now()), 1000);
    return () => clearInterval(t);
  }, [target]);

  if (left <= 0) return null;

  return (
    <span className="font-label text-[10px] uppercase tracking-[0.2em] text-laurel px-2 py-0.5 border border-laurel/30">
      Closes in {fmt(left)}
    </span>
  );
};

export default Countdown;
