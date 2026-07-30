// What Crux is, in prose.

import type { Metadata } from "next";
import { LuGavel, LuScale, LuTrendingUp } from "react-icons/lu";
import Button from "@/app/_components/ui/Button";
import Reveal from "@/app/_components/ui/Reveal";

export const metadata: Metadata = {
  title: "About",
};

const PILLARS = [
  {
    icon: LuScale,
    accent: "text-ink",
    border: "border-ink/30",
    title: "Every claim gets both sides",
    body: "Post a motion and the arena splits: the case for, the case against. No echo chambers, no piling on — structured opposition by design.",
  },
  {
    icon: LuGavel,
    accent: "text-laurel",
    border: "border-laurel/30",
    title: "AI keeps the debate honest",
    body: "Crux AI screens every claim for debatability and every argument for logical fallacies, then analyzes the strongest case on each side.",
  },
  {
    icon: LuTrendingUp,
    accent: "text-side-against",
    border: "border-side-against/30",
    title: "Logic is the scoreboard",
    body: "The probability bar tracks which side is winning. Debaters earn Logic Score for rigor and lose it for fallacies — reputation you can't buy.",
  },
];

const About = () => {
  return (
    <Reveal className="w-full max-w-4xl mx-auto px-6 md:px-8 py-12">
      <div data-reveal className="mb-14">
        <p className="flex items-center gap-3 font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink-soft">
          <span aria-hidden className="h-px w-8 bg-ink-faint" />
          ABOUT CRUX
        </p>
        <h1 className="mt-5 display-type text-[clamp(2.4rem,6vw,4.2rem)] text-ink">
          Where logic decides.
        </h1>
        <p className="mt-4 text-ink-soft font-body text-lg max-w-xl">
          Crux is a digital arena where every motion is tested by
          structured debate and AI adjudication. Stake a claim, argue both
          sides, and let logic decide.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
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
