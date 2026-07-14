import type { Metadata } from "next";
import Button from "@/app/_components/ui/Button";

export const metadata: Metadata = {
  title: "Arena Rules",
};

const RULES = [
  {
    title: "Attack the argument, never the person",
    body: "Ad hominem, passive aggression, and abuse are flagged before they reach the arena — and they cost you Logic Score.",
  },
  {
    title: "Steel-man your opponent",
    body: "Represent the other side at its strongest, not its weakest. The arena rewards debaters who engage the best version of the counter-case.",
  },
  {
    title: "Evidence over volume",
    body: "The probability bar moves on rigor and logical consistency, not on how often or how loudly you post.",
  },
  {
    title: "Pick a side",
    body: "Every argument supports the affirmative or the negative. There is no neutral ground in the arena.",
  },
  {
    title: "The Arbiter scores, the arena decides",
    body: "Crux AI checks every claim for eligibility and every argument for fallacies. Its verdicts feed the debate — the debate settles it.",
  },
  {
    title: "Your reputation is earned, not claimed",
    body: "Logic Score rises with sound arguments and falls with fallacies and flags. Grades from B to M are recalculated as you debate.",
  },
];

const Rules = () => {
  return (
    <div className="max-w-4xl mx-auto px-6 md:px-8 py-12">
      <div className="mb-12 border-l-4 border-secondary pl-6">
        <span className="font-label text-secondary text-xs uppercase tracking-[0.3em] mb-2 block">
          ARENA RULES
        </span>
        <h1 className="font-headline italic text-5xl md:text-6xl text-on-background tracking-tight">
          Rules of Engagement
        </h1>
        <p className="mt-4 text-on-surface-variant font-body text-lg max-w-xl">
          Six rules keep the arena sharp. Break them and the Arbiter breaks
          you.
        </p>
      </div>

      <ol className="space-y-4">
        {RULES.map((rule, i) => (
          <li
            key={rule.title}
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

      <div className="mt-12 bg-surface-container border border-outline-variant/10 p-10 text-center">
        <p className="font-headline italic text-2xl text-on-surface mb-6">
          Agreed? Then say something worth fighting over.
        </p>
        <Button href="/statement" size="lg">
          Start a Debate
        </Button>
      </div>
    </div>
  );
};

export default Rules;
