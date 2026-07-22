import type { Metadata } from "next";
import Button from "@/app/_components/ui/Button";
import Reveal from "@/app/_components/ui/Reveal";

export const metadata: Metadata = {
  title: "Arena Rules",
};

// §14: "A rule that is not surfaced is a bug." Every number below is the real
// one, taken from §15 of the game spec. If a number changes there, it changes
// here — this page is a disclosure, not marketing copy.
const RULES = [
  {
    title: "Every debate ends in 48 hours",
    body: "The clock starts the moment a statement passes the Arbiter and goes live. There are no extensions and no early closes. At zero the arena locks read-only and an AI judge delivers a winner, a margin, an MVP, and a written verdict.",
  },
  {
    title: "Your first comment locks your side",
    body: "Comment once and you are committed to that side for the rest of that debate — you cannot argue the other one. Replying locks you too, to the side opposite the comment you answer. The lock is per debate: take FOR in one and AGAINST in the next.",
  },
  {
    title: "Reply to earn the most",
    body: "Every comment is scored 1–8 on how much it moves the argument. A standalone comment is capped at 5, because it engages nothing specific. A reply to a named opponent reaches the full 8. The exception: while the opposing side is still empty there is nothing to reply to, so the cap does not apply.",
  },
  {
    title: "Three comments at full value",
    body: "Your first three comments in a debate score in full. The fourth and every one after is halved, with a floor of 1. Volume never beats sharpness — flooding a debate is a losing strategy by arithmetic.",
  },
  {
    title: "The margin decides it",
    body: "The judge splits the debate into two percentages. More than 5 points apart and that side wins; 5 or less is a draw. The MVP is the single best debater on the winning side — there is no MVP in a draw, because there is no winning side to take one from.",
  },
  {
    title: "Winning pays, losing costs the month",
    body: "MVP earns +25, everyone else on the winning side +10, and the statement's author +5 for producing a real debate. A loss costs 5 points from your season score only — your all-time logic never falls. If one side never argues, the debate concludes unopposed and nobody scores at all.",
  },
];

const Rules = () => {
  return (
    <Reveal className="max-w-4xl mx-auto px-6 md:px-8 py-12">
      <div data-reveal className="mb-12 border-l-4 border-secondary pl-6">
        <span className="font-label text-secondary text-xs uppercase tracking-[0.3em] mb-2 block">
          ARENA RULES
        </span>
        <h1 className="font-headline italic text-5xl md:text-6xl text-on-background tracking-tight">
          Rules of Engagement
        </h1>
        <p className="mt-4 text-on-surface-variant font-body text-lg max-w-xl">
          Six rules, with their real numbers. Nothing here is discovered by
          being penalised by it — you go in knowing exactly what every move is
          worth.
        </p>
      </div>

      <ol className="space-y-4">
        {RULES.map((rule, i) => (
          <li
            key={rule.title}
            data-reveal
            className="bg-surface-container-low border-l-2 border-outline-variant/30 hover:border-primary transition-colors p-6 md:p-8 flex gap-6"
          >
            <span className="font-label text-2xl font-bold text-primary/60 shrink-0">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <h2 className="font-headline italic text-xl md:text-2xl text-on-surface mb-2">
                {rule.title}
              </h2>
              <p className="font-body text-sm text-on-surface-variant leading-relaxed">
                {rule.body}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <div
        data-reveal
        className="mt-12 bg-surface-container border border-outline-variant/10 p-10 text-center"
      >
        <p className="font-headline italic text-2xl text-on-surface mb-6">
          Agreed? Then say something worth fighting over.
        </p>
        <Button href="/statement" size="lg">
          Start a Debate
        </Button>
      </div>
    </Reveal>
  );
};

export default Rules;
