"use client";

// Concluded debates, newest first.

import Link from "next/link";
import { LuStar } from "react-icons/lu";
import type { HistoryRow } from "@/app/profile/types";
import { debateSlug } from "@/app/_utils/slugify";

const OUTCOME = {
  win: "text-laurel",
  loss: "text-ink-soft",
  draw: "text-ink-soft",
} as const;

const when = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const CareerHistory = ({ history }: { history: HistoryRow[] }) => (
  <section className="mt-12">
    <div className="flex items-baseline gap-3 mb-6 border-b border-ink-faint pb-3">
      <h2 className="font-headline text-3xl font-bold italic">Career</h2>
      <span className="font-label text-[10px] uppercase tracking-widest text-ink-soft">
        Concluded debates
      </span>
    </div>

    {history.length === 0 ? (
      <p className="font-body text-sm text-ink-soft italic py-8">
        No concluded debates yet.
      </p>
    ) : (
      <div className="space-y-px">
        {history.map((r, i) => (
          <Link
            key={r.motionId}
            href={`/debate/${debateSlug(r.claim, r.motionId)}`}
            className={`grid grid-cols-12 items-center gap-3 px-5 py-5 ${
              i % 2 === 0 ? "bg-band" : "bg-paper"
            } hover:bg-band transition-colors border-l-2 border-transparent hover:border-ink`}
          >
            <span
              className={`col-span-4 md:col-span-2 font-label text-sm font-bold uppercase tracking-widest ${OUTCOME[r.outcome]}`}
            >
              {r.outcome}
            </span>
            <span className="col-span-8 md:col-span-2 flex items-center gap-2">
              {r.isMvp && (
                <span className="flex items-center gap-1 font-label text-[10px] uppercase tracking-widest px-2 py-0.5 border border-laurel/40 text-laurel">
                  <LuStar aria-hidden="true" /> MVP
                </span>
              )}
            </span>
            <span className="col-span-12 md:col-span-5 font-body text-sm text-ink min-w-0 line-clamp-2">
              {r.claim}
            </span>
            <span className="col-span-6 md:col-span-2 font-label text-[10px] uppercase tracking-widest text-ink-soft">
              {r.side}
              {r.margin !== null && ` · ${r.margin} pt`}
            </span>
            <span className="col-span-6 md:col-span-1 font-label text-[10px] uppercase tracking-widest text-ink-soft md:text-right">
              {when(r.concludedAt)}
            </span>
          </Link>
        ))}
      </div>
    )}
  </section>
);

export default CareerHistory;
