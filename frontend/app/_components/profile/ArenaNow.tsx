"use client";

// Live debates this user is in, and the side they locked. Spec: game-theory.md §5

import Link from "next/link";
import type { LiveDebate } from "@/app/profile/types";
import Button from "@/app/_components/ui/Button";
import Countdown from "@/app/_components/motion/Countdown";
import { useUser } from "@/app/_hooks/useUser";
import { debateSlug } from "@/app/_utils/slugify";

const SIDE_BADGE = {
  for: "text-side-for border-side-for/40",
  against: "text-side-against border-side-against/40",
} as const;

const ArenaNow = ({
  live,
  profileId,
}: {
  live: LiveDebate[];
  profileId: number;
}) => {
  const user = useUser();
  const isOwner = user?.id === profileId;

  return (
    <section className="mt-6">
      <div className="flex items-baseline gap-3 mb-6 border-b border-ink-faint pb-3">
        <h2 className="font-headline text-3xl font-bold italic">In The Arena</h2>
        <span className="font-label text-[10px] uppercase tracking-widest text-ink-soft">
          Live right now
        </span>
      </div>

      {live.length === 0 ? (
        <div className="bg-band border-l-2 border-ink-faint p-8">
          <p className="font-body text-sm text-ink-soft italic mb-6">
            {isOwner
              ? "Nothing live. Stake a claim."
              : "Not in the arena right now."}
          </p>
          {isOwner && <Button href="/motion/new">Start a Debate</Button>}
        </div>
      ) : (
        <ul className="space-y-px">
          {live.map((d) => (
            <li key={d.id}>
              <Link
                href={`/debate/${debateSlug(d.claim, d.id)}`}
                className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6 bg-paper hover:bg-band transition-colors border-l-2 border-transparent hover:border-ink p-5"
              >
                <span className="flex items-center gap-2 shrink-0">
                  {d.isAuthor && (
                    <span className="font-label text-[10px] uppercase tracking-widest px-2 py-0.5 border border-laurel/40 text-laurel">
                      Your motion
                    </span>
                  )}
                  {d.side && (
                    <span
                      className={`font-label text-[10px] uppercase tracking-widest px-2 py-0.5 border ${SIDE_BADGE[d.side]}`}
                    >
                      Arguing {d.side}
                    </span>
                  )}
                </span>
                <span className="font-body text-ink grow min-w-0 line-clamp-2">
                  {d.claim}
                </span>
                <span className="shrink-0">
                  <Countdown closesAt={d.closesAt} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default ArenaNow;
