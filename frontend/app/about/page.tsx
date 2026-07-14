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
    accent: "text-primary",
    border: "border-primary/30",
    title: "Every claim gets both sides",
    body: "Post a statement and the arena splits: the case for, the case against. No echo chambers, no piling on — structured opposition by design.",
  },
  {
    icon: LuGavel,
    accent: "text-tertiary",
    border: "border-tertiary/30",
    title: "AI keeps the debate honest",
    body: "Crux AI screens every claim for debatability and every argument for logical fallacies, then analyzes the strongest case on each side.",
  },
  {
    icon: LuTrendingUp,
    accent: "text-secondary",
    border: "border-secondary/30",
    title: "Logic is the scoreboard",
    body: "The probability bar tracks which side is winning. Debaters earn Logic Score for rigor and lose it for fallacies — reputation you can't buy.",
  },
];

const About = () => {
  return (
    <Reveal className="max-w-4xl mx-auto px-6 md:px-8 py-12">
      <div data-reveal className="mb-12 border-l-4 border-primary pl-6">
        <span className="font-label text-primary text-xs uppercase tracking-[0.3em] mb-2 block">
          ABOUT CRUX
        </span>
        <h1 className="font-headline italic text-5xl md:text-6xl text-on-background tracking-tight">
          Where logic decides.
        </h1>
        <p className="mt-4 text-on-surface-variant font-body text-lg max-w-xl">
          Crux is a digital arena where every statement is tested by
          structured debate and AI adjudication. Stake a claim, argue both
          sides, and let logic decide.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        {PILLARS.map((pillar) => (
          <div
            key={pillar.title}
            data-reveal
            className={`bg-surface-container p-6 border-l ${pillar.border}`}
          >
            <pillar.icon className={`${pillar.accent} text-xl mb-4`} />
            <h2
              className={`font-label text-[10px] uppercase tracking-[0.2em] ${pillar.accent} mb-3`}
            >
              {pillar.title}
            </h2>
            <p className="font-body text-xs text-on-surface-variant leading-relaxed">
              {pillar.body}
            </p>
          </div>
        ))}
      </div>

      <div
        data-reveal
        className="bg-surface-container border border-outline-variant/10 p-10 text-center"
      >
        <p className="font-headline italic text-2xl text-on-surface mb-6">
          The arena is open. Bring an opinion.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button href="/statement" size="lg">
            Start a Debate
          </Button>
          <Button href="/" variant="outline-neutral" size="lg">
            Browse the Arena
          </Button>
        </div>
      </div>
    </Reveal>
  );
};

export default About;
