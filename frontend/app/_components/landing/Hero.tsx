"use client";

// Landing hero: the mixed headline, the orator plates, the drifting statues. design-system.md §6

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { PiArrowDown, PiArrowRight } from "react-icons/pi";
import { PillButton, prefersReduced } from "./ui";

gsap.registerPlugin(useGSAP);

const facts = [
  "48-hour debates",
  "Two sides, one verdict",
  "An AI judge rules",
  "The board resets monthly",
];

const Hero = () => {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReduced()) {
        gsap.set("[data-hero]", { autoAlpha: 1 });
        return;
      }
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .fromTo(
          "[data-hero='line']",
          { autoAlpha: 0, y: 60 },
          { autoAlpha: 1, y: 0, duration: 1, stagger: 0.14 },
        )
        .fromTo(
          "[data-hero='orator']",
          { autoAlpha: 0, y: 40 },
          { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.12 },
          "-=0.7",
        )
        .fromTo(
          "[data-hero='rest']",
          { autoAlpha: 0, y: 20 },
          { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08 },
          "-=0.6",
        );
      gsap.to("[data-hero='orator']", {
        y: -14,
        duration: 5,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        delay: 2,
      });
    },
    { scope },
  );

  return (
    <div ref={scope} className="relative overflow-hidden">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-end gap-4 px-6 pt-16 pb-10 md:px-10 lg:grid-cols-[1fr_2.1fr_1fr] lg:pt-20">
        <div
          data-hero="orator"
          className="plate-arch relative hidden aspect-[3/4] overflow-hidden border border-[#24413440] bg-plate lg:block"
        >
          <Image
            src="/landing/hero-orator-left.jpeg"
            alt="Engraving of a classical orator, arm extended in argument"
            fill
            priority
            sizes="(min-width: 1024px) 22vw, 0vw"
            className="engraving object-cover object-[60%_50%]"
          />
        </div>

        <div className="flex flex-col items-center pb-2 text-center">
          <p
            data-hero="rest"
            className="font-label text-[0.7rem] font-medium uppercase tracking-[0.34em] text-ink-soft"
          >
            Crux — the digital debate arena
          </p>
          <h1 className="display-type mt-8 text-ink">
            <span data-hero="line" className="block text-[clamp(3.2rem,9.5vw,8rem)]">
              Every argument
            </span>
            <span
              data-hero="line"
              className="block font-headline text-[clamp(2.2rem,6.5vw,5.4rem)] lowercase italic leading-[1.1] tracking-normal text-ink-soft"
            >
              deserves
            </span>
            <span data-hero="line" className="block text-[clamp(3.2rem,9.5vw,8rem)]">
              a verdict
            </span>
          </h1>
          <p
            data-hero="rest"
            className="mt-8 max-w-xl font-headline text-lg leading-relaxed text-ink-soft md:text-xl"
          >
            Stake a claim. Take a side. Argue it for 48 hours while a live score
            tracks the fight — then an impartial judge names a winner, a margin,
            and the sharpest mind in the room.
          </p>
          <div data-hero="rest" className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <PillButton href="/arena">
              Enter the arena <PiArrowRight />
            </PillButton>
            <PillButton href="#story" variant="outline">
              How it works <PiArrowDown />
            </PillButton>
          </div>
        </div>

        <div
          data-hero="orator"
          className="plate-arch relative hidden aspect-[3/4] overflow-hidden border border-[#24413440] bg-plate lg:block"
        >
          <Image
            src="/landing/hero-orator-right.jpeg"
            alt="Engraving of a classical orator holding a scroll, hand raised in rebuttal"
            fill
            priority
            sizes="(min-width: 1024px) 22vw, 0vw"
            className="engraving object-cover object-[60%_50%]"
          />
        </div>
      </div>

      <div data-hero="rest" className="border-y border-ink-faint">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-2 px-6 py-4">
          {facts.map((f) => (
            <span
              key={f}
              className="font-label text-[0.64rem] uppercase tracking-[0.26em] text-ink-soft"
            >
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Hero;
