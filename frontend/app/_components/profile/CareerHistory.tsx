"use client";
import Link from "next/link";
import { LuStar } from "react-icons/lu";
import type { HistoryRow } from "@/app/profile/types";
import { debateSlug } from "@/app/_utils/slugify";

// The concluded debates behind the W-L-D. debate_results existed from the
// start and the profile never read it, so the record had nothing under it.
//
// Outcome colours stay off `secondary`: red means AGAINST (working rule 4),
// not "you lost".
const OUTCOME = {
  win: "text-primary",
  loss: "text-on-surface-variant",
  draw: "text-outline",
} as const;

const when = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const CareerHistory = ({ history }: { history: HistoryRow[] }) => (
  <section className="mt-12">
    <div className="flex items-baseline gap-3 mb-6 border-b border-outline-variant/30 pb-3">
      <h2 className="font-headline text-3xl font-bold italic">Career</h2>
      <span className="font-label text-[10px] uppercase tracking-widest text-outline">
        Concluded debates
      </span>
    </div>

    {history.length === 0 ? (
      <p className="font-body text-sm text-outline italic py-8">
        No concluded debates yet.
      </p>
    ) : (
      <div className="space-y-px">
        {history.map((r, i) => (
          <Link
            key={r.argumentId}
            href={`/debate/${debateSlug(r.claim, r.argumentId)}`}
            className={`grid grid-cols-12 items-center gap-3 px-5 py-5 ${
              i % 2 === 0 ? "bg-surface" : "bg-surface-container-lowest"
            } hover:bg-surface-container-low transition-colors border-l-2 border-transparent hover:border-primary`}
          >
            <span
              className={`col-span-4 md:col-span-2 font-label text-sm font-bold uppercase tracking-widest ${OUTCOME[r.outcome]}`}
            >
              {r.outcome}
            </span>
            <span className="col-span-8 md:col-span-2 flex items-center gap-2">
              {r.isMvp && (
                <span className="flex items-center gap-1 font-label text-[10px] uppercase tracking-widest px-2 py-0.5 border border-tertiary/40 text-tertiary">
                  <LuStar aria-hidden="true" /> MVP
                </span>
              )}
            </span>
            <span className="col-span-12 md:col-span-5 font-body text-sm text-on-surface min-w-0 line-clamp-2">
              {r.claim}
            </span>
            <span className="col-span-6 md:col-span-2 font-label text-[10px] uppercase tracking-widest text-outline">
              {r.side}
              {r.margin !== null && ` · ${r.margin} pt`}
            </span>
            <span className="col-span-6 md:col-span-1 font-label text-[10px] uppercase tracking-widest text-outline md:text-right">
              {when(r.concludedAt)}
            </span>
          </Link>
        ))}
      </div>
    )}
  </section>
);

export default CareerHistory;
