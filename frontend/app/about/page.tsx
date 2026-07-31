// What Crux is, in prose. Every number here is a real one from game-theory.md §21
// — this page is read as a promise. Spec: game-theory.md §19; design-system.md §10

import type { Metadata } from "next";
import Link from "next/link";
import { LuGavel, LuScale, LuTrendingUp } from "react-icons/lu";
import Button from "@/app/_components/ui/Button";
import Reveal from "@/app/_components/ui/Reveal";

export const metadata: Metadata = {
  title: "About",
  description:
    "What Crux is and why it works this way: every claim gets both sides, an AI referee scores the argument rather than the writing, and 48 hours later a verdict makes it count.",
  alternates: { canonical: "/about" },
};

const SUPPORT_EMAIL = "help@cruxdebate.site";

const PILLARS = [
  {
    icon: LuScale,
    accent: "text-ink",
    border: "border-ink/30",
    title: "Every claim gets both sides",
    body: "Post a motion and the arena splits in two: the case for, the case against, each written up and kept current as arguments land. Your first argument locks your side, so nobody hedges both ends of the same fight.",
  },
  {
    icon: LuGavel,
    accent: "text-laurel",
    border: "border-laurel/30",
    title: "The AI referees — it doesn't opine",
    body: "It rules on whether a claim can be argued at all, scores each argument 2–10 on how much it moves the debate, and at the deadline names a winner and a margin. It never takes a side of its own.",
  },
  {
    icon: LuTrendingUp,
    accent: "text-side-against",
    border: "border-side-against/30",
    title: "Logic is the only scoreboard",
    body: "No followers, no upvotes, no seniority. A reply that dismantles a specific point earns the full range; a standalone one caps at 7. A loss costs 5 points from the month and nothing else — your all-time score has no way down.",
  },
];

const BEATS = [
  {
    n: "I",
    title: "A claim, checked before it goes live",
    body: "One declarative sentence. An AI referee turns away the vague and the unarguable at the door, always with the reason and a sharper rewrite to try instead — so nobody walks into a debate doomed by a bad question.",
  },
  {
    n: "II",
    title: "Two camps, and a side you commit to",
    body: "FOR and AGAINST, each with a live written case. Your first argument commits you for that debate — confirmed with you before it happens, never discovered afterwards. The lock is per debate: argue FOR today and AGAINST tomorrow.",
  },
  {
    n: "III",
    title: "Forty-eight hours, no extensions",
    body: "The clock is visible everywhere the debate appears. Reply to a named opponent and you can earn the full score; repeat a point your own side already made and you earn the floor. Volume never beats sharpness.",
  },
  {
    n: "IV",
    title: "A verdict that makes it count",
    body: "At zero the arena locks read-only, permanently, and the judge rules: a winner if the margin clears 5 points, the MVP of the winning side, and a written closing naming the crux of the whole fight.",
  },
];

const About = () => {
  return (
    <Reveal className="w-full max-w-4xl mx-auto px-6 md:px-8 py-12">
      <div data-reveal className="mb-14">
        <p className="flex items-center gap-3 font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink-soft">
          <span aria-hidden className="h-px w-8 bg-ink-faint" />
          About Crux
        </p>
        <h1 className="mt-5 display-type text-[clamp(2.4rem,6vw,4.2rem)] text-ink">
          Arguments that end.
        </h1>
        <p className="mt-4 text-ink-soft font-body text-lg max-w-xl">
          Every argument on the internet ends the same way — someone stops
          replying. Crux is the version that finishes. You post a claim, two
          sides form, you argue for 48 hours, and an impartial AI judge rules.
          A winner, a margin, an MVP, and the reasoning in writing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
        {PILLARS.map((pillar) => (
          <div
            key={pillar.title}
            data-reveal
            className={`bg-band p-6 border-l ${pillar.border}`}
          >
            <pillar.icon className={`${pillar.accent} text-xl mb-4`} />
            <h2
              className={`font-label text-[10px] uppercase tracking-[0.2em] ${pillar.accent} mb-3`}
            >
              {pillar.title}
            </h2>
            <p className="font-body text-xs text-ink-soft leading-relaxed">
              {pillar.body}
            </p>
          </div>
        ))}
      </div>

      <div data-reveal className="mb-16">
        <h2 className="font-headline text-2xl italic text-ink mb-2">
          What actually happens
        </h2>
        <p className="font-body text-sm text-ink-soft mb-8 max-w-xl">
          The whole game, in order. Every rule that can cost you something is
          shown before it can bite —{" "}
          <Link href="/rules" className="text-ink hover:underline">
            the full disclosure is on the rules page
          </Link>
          , with its real numbers.
        </p>
        <ol>
          {BEATS.map((beat) => (
            <li
              key={beat.n}
              className="flex gap-6 border-t border-ink-faint py-6 px-3 transition-colors hover:bg-ink-wash"
            >
              <span
                aria-hidden
                className="shrink-0 w-8 font-headline text-2xl italic text-laurel"
              >
                {beat.n}
              </span>
              <div>
                <h3 className="font-headline text-lg text-ink mb-1.5">
                  {beat.title}
                </h3>
                <p className="font-body text-sm text-ink-soft leading-relaxed">
                  {beat.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div data-reveal className="mb-16 border-t border-ink-faint pt-10">
        <p className="flex items-center gap-3 font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink-soft">
          <span aria-hidden className="h-px w-8 bg-ink-faint" />
          The bench
        </p>
        <h2 className="mt-5 font-headline text-2xl italic text-ink">
          Built by one person
        </h2>
        <div className="mt-4 flex flex-col gap-4 font-body text-sm text-ink-soft leading-relaxed max-w-2xl">
          <p>
            Crux is designed, written and run by{" "}
            <strong className="text-ink font-normal">Nitesh Kumar</strong> —
            one developer, no team, no investors. The rules were written before
            the code, and they are published in full rather than summarised,
            because a platform that scores people owes them the arithmetic.
          </p>
          <p>
            There is no support queue and no contact form. Signed in, the{" "}
            <strong className="text-ink font-normal">
              Talk to the developer
            </strong>{" "}
            panel in the navbar is a real inbox that reaches him directly —
            bugs, arguments about the rules, and requests all land in the same
            place. Signed out, or if it concerns your account, mail{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-ink hover:underline"
            >
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </div>
      </div>

      <div
        data-reveal
        className="border border-ink-faint bg-band p-12 text-center"
      >
        <p className="font-headline italic text-2xl text-ink mb-6">
          The arena is open. Bring an opinion.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button href="/motion/new" size="lg">
            Start a Debate
          </Button>
          <Button href="/arena" variant="outline-neutral" size="lg">
            Browse the Arena
          </Button>
        </div>
      </div>
    </Reveal>
  );
};

export default About;
