// Every rule with its real number, taken from game-theory.md §21. This page is a
// DISCLOSURE, not marketing copy — a rule that is not surfaced is a bug.
// Spec: game-theory.md §19

import type { Metadata } from "next";
import Button from "@/app/_components/ui/Button";
import Reveal from "@/app/_components/ui/Reveal";

export const metadata: Metadata = {
  title: "Arena Rules",
};

const RULES = [
  {
    title: "Every debate ends in 48 hours",
    body: "The clock starts the moment a motion passes the Arbiter and goes live. There are no extensions and no early closes. At zero the arena locks read-only and an AI judge delivers a winner, a margin, an MVP, and a written verdict.",
  },
  {
    title: "Your first argument locks your side",
    body: "Argument once and you are committed to that side for the rest of that debate — you cannot argue the other one. Replying locks you too, to the side opposite the argument you answer. The lock is per debate: take FOR in one and AGAINST in the next.",
  },
  {
    title: "Reply to earn the most",
    body: "Every argument is scored 1–8 on how much it moves the argument. A standalone argument is capped at 5, because it engages nothing specific. A reply to a named opponent reaches the full 8. The exception: while the opposing side is still empty there is nothing to reply to, so the cap does not apply.",
  },
  {
    title: "Three arguments at full value",
    body: "Your first three arguments in a debate score in full. The fourth and every one after is halved, with a floor of 1. Reposting an argument word for word is refused outright — yours or anyone else's — and making a point that has already been made on your side scores 1, however it is reworded. Volume never beats sharpness; flooding a debate is a losing strategy by arithmetic.",
  },
  {
    title: "Attack the argument, never the person",
    body: "Hit the reasoning as hard as you like — \"this logic collapses\" and \"that is factually wrong\" are fair play, rough phrasing included. Hit the person and the moderator flags it: the argument is discarded, it never reaches the arena, and it costs you 4 logic. Slurs, threats and spam are judged the same way, in any language.",
  },
  {
    title: "The margin decides it",
    body: "The judge splits the debate into two percentages. More than 5 points apart and that side wins; 5 or less is a draw. The MVP is the single best debater on the winning side — there is no MVP in a draw, because there is no winning side to take one from.",
  },
  {
    title: "Winning pays, losing costs the month",
    body: "MVP earns +25, everyone else on the winning side +10, and the motion's author +5 for producing a real debate. A loss costs 5 points from your season score only — your all-time logic never falls. If one side never argues, the debate concludes unopposed and nobody scores at all.",
  },
];

const Rules = () => {
  return (
    <Reveal className="max-w-4xl mx-auto px-6 md:px-8 py-12">
      <div data-reveal className="mb-14">
        <p className="flex items-center gap-3 font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink-soft">
          <span aria-hidden className="h-px w-8 bg-ink-faint" />
          Arena rules
        </p>
        <h1 className="mt-5 display-type text-[clamp(2.4rem,6vw,4.2rem)] text-ink">
          Rules of Engagement
        </h1>
        <p className="mt-4 text-ink-soft font-body text-lg max-w-xl">
          Seven rules, with their real numbers. Nothing here is discovered by
          being penalised by it — you go in knowing exactly what every move is
          worth.
        </p>
      </div>

      <ol>
        {RULES.map((rule, i) => (
          <li
            key={rule.title}
            data-reveal
            className="flex gap-6 border-t border-ink-faint py-8 transition-colors hover:bg-ink-wash"
          >
            <span className="shrink-0 display-type text-2xl text-laurel tabular-nums">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <h2 className="mb-2 font-headline text-xl text-ink md:text-2xl">
                {rule.title}
              </h2>
              <p className="font-body text-sm text-ink-soft leading-relaxed">
                {rule.body}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <p
        data-reveal
        className="border-t border-ink-faint pt-8 font-body text-sm leading-relaxed text-ink-soft"
      >
        One house rule beyond the seven: posting is rate-limited — a handful of
        motions or arguments per minute per account. It keeps the arena
        human-paced and the judge honest. If you hit it, you&rsquo;ll be told
        exactly how long to wait.
      </p>

      <div
        data-reveal
        className="mt-14 border border-ink-faint bg-band p-12 text-center"
      >
        <p className="mb-7 font-headline text-2xl italic text-ink">
          Agreed? Then say something worth fighting over.
        </p>
        <Button href="/motion/new" size="lg">
          Start a Debate
        </Button>
      </div>
    </Reveal>
  );
};

export default Rules;
