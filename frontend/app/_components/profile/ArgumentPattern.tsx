"use client";

// Craft stats: how many arguments, how many were replies, how many motions started.

import type { CraftStats } from "@/app/profile/types";

const ArgumentPattern = ({ craft }: { craft: CraftStats }) => {
  const replyRate = craft.arguments > 0 ? craft.replies / craft.arguments : 0;

  return (
    <div className="bg-band p-8 flex flex-col h-full">
      <h2 className="font-headline text-3xl font-bold mb-1 italic">
        Argument Pattern
      </h2>
      <span className="font-label text-[10px] text-ink-soft uppercase tracking-widest mb-8">
        How this record was earned
      </span>

      <dl className="space-y-6 mb-8">
        <div>
          <dt className="font-label text-[10px] text-ink-soft uppercase tracking-widest">
            Arguments posted
          </dt>
          <dd className="font-label text-3xl font-bold text-ink">
            {craft.arguments}
            <span className="text-sm text-ink-soft">
              {" "}
              · {craft.motions} motions
            </span>
          </dd>
        </div>

        <div>
          <dt className="font-label text-[10px] text-ink-soft uppercase tracking-widest">
            Replies
          </dt>
          <dd className="font-label text-3xl font-bold text-ink">
            {Math.round(replyRate * 100)}%
          </dd>
          <div className="w-full h-1 bg-raised mt-2">
            <div
              className="h-full bg-ink"
              style={{ width: `${replyRate * 100}%` }}
            />
          </div>
        </div>

        <div>
          <dt className="font-label text-[10px] text-ink-soft uppercase tracking-widest">
            Average logic
          </dt>
          <dd className="font-label text-3xl font-bold text-ink">
            {craft.avgLogic}
          </dd>
        </div>
      </dl>

      <div className="mt-auto border-t border-ink-faint pt-6">
        <span className="font-label text-[10px] text-ink-soft uppercase tracking-widest block mb-2">
          Motions started
        </span>
        <span className="font-label text-3xl font-bold text-ink">
          {craft.motionsStarted}
        </span>
      </div>

      <p className="font-label text-[10px] uppercase tracking-widest text-ink-soft mt-6">
        Standalone arguments cap at 7 logic. Replies reach 10.
      </p>
    </div>
  );
};

export default ArgumentPattern;
