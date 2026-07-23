"use client";
import Link from "next/link";
import type { CraftStats } from "@/app/profile/types";
import { debateSlug } from "@/app/_utils/slugify";

// §13's integrity design in one number: the reply rate. Standalone comments
// cap at 5 logic and replies reach 8, so a high reply rate is what a sharp
// debater actually looks like. §14 says a rule that changes an outcome owes
// itself a surface — so the rule that produced this number is printed under it.
const ArgumentPattern = ({ craft }: { craft: CraftStats }) => {
  const replyRate = craft.arguments > 0 ? craft.replies / craft.arguments : 0;

  return (
    <div className="bg-surface-container-low p-8 flex flex-col h-full">
      <h2 className="font-headline text-3xl font-bold mb-1 italic">
        Argument Pattern
      </h2>
      <span className="font-label text-[10px] text-outline uppercase tracking-widest mb-8">
        How this record was earned
      </span>

      <dl className="space-y-6 mb-8">
        <div>
          <dt className="font-label text-[10px] text-outline uppercase tracking-widest">
            Arguments posted
          </dt>
          <dd className="font-label text-3xl font-bold text-on-background">
            {craft.arguments}
            <span className="text-sm text-outline">
              {" "}
              · {craft.statements} statements
            </span>
          </dd>
        </div>

        <div>
          <dt className="font-label text-[10px] text-outline uppercase tracking-widest">
            Replies
          </dt>
          <dd className="font-label text-3xl font-bold text-primary">
            {Math.round(replyRate * 100)}%
          </dd>
          <div className="w-full h-1 bg-surface-container-highest mt-2">
            <div
              className="h-full bg-primary"
              style={{ width: `${replyRate * 100}%` }}
            />
          </div>
        </div>

        <div>
          <dt className="font-label text-[10px] text-outline uppercase tracking-widest">
            Average logic
          </dt>
          <dd className="font-label text-3xl font-bold text-on-background">
            {craft.avgLogic}
          </dd>
        </div>
      </dl>

      {craft.best && (
        <div className="mt-auto border-t border-outline-variant/30 pt-6">
          <span className="font-label text-[10px] text-outline uppercase tracking-widest block mb-2">
            Best argument · {craft.best.points} logic
          </span>
          <Link
            href={`/debate/${debateSlug(craft.best.claim, craft.best.argumentId)}`}
            className="font-body text-sm text-on-surface hover:text-primary transition-colors line-clamp-2"
          >
            {craft.best.claim}
          </Link>
        </div>
      )}

      <p className="font-label text-[10px] uppercase tracking-widest text-outline mt-6">
        Standalone comments cap at 5 logic. Replies reach 8.
      </p>
    </div>
  );
};

export default ArgumentPattern;
