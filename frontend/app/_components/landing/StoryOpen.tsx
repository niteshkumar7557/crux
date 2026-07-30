"use client";

// Landing: the problem, and the order of proceedings.

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Eyebrow, initReveals, prefersReduced, Section, Serif } from "./ui";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const steps = [
  {
    numeral: "I",
    title: "Post a motion",
    body: "One bold, arguable sentence. An AI referee checks it can actually be fought over before it goes live.",
  },
  {
    numeral: "II",
    title: "Take a side",
    body: "FOR or AGAINST — your first argument locks you in. For 48 hours, every reply is scored on how well it engages the other side.",
  },
  {
    numeral: "III",
    title: "Hear the verdict",
    body: "At the final second the arena locks and the judge rules: a winner, a margin, an MVP, and the reasoning in writing.",
  },
];

const StoryOpen = () => {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      initReveals(scope.current);
      if (prefersReduced()) return;
      gsap.fromTo(
        "[data-loop-line]",
        { scaleX: 0 },
        {
          scaleX: 1,
          transformOrigin: "left center",
          ease: "none",
          scrollTrigger: {
            trigger: "[data-loop]",
            start: "top 75%",
            end: "bottom 65%",
            scrub: 0.6,
          },
        },
      );
      gsap.fromTo(
        "[data-quarrel]",
        { y: 40 },
        {
          y: -40,
          ease: "none",
          scrollTrigger: {
            trigger: "[data-quarrel]",
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        },
      );
    },
    { scope },
  );

  return (
    <div ref={scope}>
      <Section id="story" band className="!pb-0">
      <div className="mx-auto max-w-3xl text-center">
        <Eyebrow className="justify-center">The problem</Eyebrow>
        <h2
          data-reveal
          className="display-type mt-5 text-[clamp(2.4rem,6vw,4.6rem)] text-ink"
        >
          The internet never <Serif>finishes</Serif> an argument
        </h2>
        <p
          data-reveal
          className="mt-7 font-headline text-lg leading-relaxed text-ink-soft md:text-xl"
        >
          Right now, somewhere, a comment thread is entering its fifth day.
          Nobody is keeping score. Nobody will concede. Nothing will be decided —
          the thread will simply be abandoned, and everyone in it will call that
          winning.
        </p>
        <p data-reveal className="mt-5 font-headline text-lg leading-relaxed text-ink md:text-xl">
          Crux is built on one promise:{" "}
          <em className="italic">every argument here ends</em> — with a ruling,
          a score, and a record.
        </p>
      </div>

      <div
        data-reveal
        className="relative mt-16 aspect-[2048/979] overflow-hidden border border-[#24413440] bg-plate"
      >
        <Image
          data-quarrel
          src="/landing/problem-quarrel.jpeg"
          alt="Engraving of a crowd shouting over each other beneath a hopeless knot of ribbons"
          width={2048}
          height={1152}
          sizes="(min-width: 1024px) 72rem, 100vw"
          className="engraving h-full w-full scale-[1.16] object-cover object-bottom"
        />
      </div>

      <div data-loop id="proceedings" className="border-t border-ink-faint py-24 md:py-32">
        <Eyebrow>Order of proceedings</Eyebrow>
        <h2
          data-reveal
          className="display-type mt-5 max-w-3xl text-[clamp(2.4rem,6vw,4.6rem)] text-ink"
        >
          The whole game, <Serif>in three beats</Serif>
        </h2>
        <div className="relative mt-16">
          <div
            data-loop-line
            aria-hidden
            className="absolute -top-6 left-0 hidden h-px w-full bg-ink-faint md:block"
          />
          <div className="grid gap-12 md:grid-cols-3 md:gap-10">
            {steps.map((s, i) => (
              <article key={s.numeral} data-reveal data-reveal-delay={i * 0.12}>
                <p className="font-headline text-5xl italic text-laurel">
                  {s.numeral}
                </p>
                <h3 className="display-type mt-4 text-2xl text-ink">{s.title}</h3>
                <p className="mt-3 font-headline leading-relaxed text-ink-soft">
                  {s.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
      </Section>
    </div>
  );
};

export default StoryOpen;
