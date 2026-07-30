"use client";

// Landing: the stage, fair-by-design, the doors, the seal.

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PiArrowRight } from "react-icons/pi";
import { LogoMark } from "../ui/Logo";
import {
  Eyebrow,
  initReveals,
  PillButton,
  Plate,
  prefersReduced,
  Section,
  SectionHead,
  Serif,
} from "./ui";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const defenses = [
  {
    title: "Reply to score high",
    body: "A language model can write a polished essay about anything. It cannot read the room, pick the most vulnerable live argument, and dismantle that. Standalones cap at 7; replies reach 10 — the game's best move is the one that's hardest to automate.",
  },
  {
    title: "Sharp beats loud",
    body: "A post with no argument in it — bare agreement, bare disagreement — is refused outright and never appears. A point already made on your side scores the floor, however it is reworded. Volume earns nothing on its own.",
  },
  {
    title: "Pick a side, publicly",
    body: "The side lock means you cannot hedge both outcomes. Commitment is what makes the camps real — and the verdict worth something.",
  },
];

const bench = [
  ["The Arbiter", "Reads every motion before it goes live; rejects the unarguable, always with a sharper rewrite."],
  ["The Opening Brief", "Names what each side must prove the moment a motion passes — the terrain, never the arguments."],
  ["The Judge", "Screens each argument, scores it 2–10, rewrites the side's running case, and moves the live split — in one ruling."],
  ["The Verdict Judge", "Reads everything at lock and rules: winner, margin, MVP, and the closing in writing."],
];

const Closing = () => {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      initReveals(scope.current);
      if (prefersReduced()) return;
      gsap.fromTo(
        "[data-doors]",
        { scale: 0.92 },
        {
          scale: 1.06,
          ease: "none",
          scrollTrigger: {
            trigger: "[data-doors-zone]",
            start: "top 85%",
            end: "bottom 40%",
            scrub: 0.8,
          },
        },
      );
    },
    { scope },
  );

  return (
    <div ref={scope}>
      <Section id="fair" band>
        <SectionHead
          center
          kicker="Integrity"
          title={<>Impossible to game, <Serif>by design</Serif></>}
        />
        <p
          data-reveal
          className="mx-auto mt-6 max-w-2xl text-center font-headline text-lg leading-relaxed text-ink-soft"
        >
          Crux runs no AI-text detector — they are unreliable, and they falsely
          flag exactly the people a reasoning platform should protect. The game
          defends itself with structure instead:
        </p>
        <div className="mt-14 grid gap-10 md:grid-cols-3">
          {defenses.map((d, i) => (
            <article
              key={d.title}
              data-reveal
              data-reveal-delay={i * 0.12}
              className="border-t-2 border-laurel pt-5"
            >
              <h3 className="display-type text-xl text-ink">{d.title}</h3>
              <p className="mt-3 font-body text-sm leading-relaxed text-ink-soft">
                {d.body}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-24 grid items-center gap-12 border-t border-ink-faint pt-20 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
          <Plate
            data-reveal
            src="/landing/herald-proclamation.jpeg"
            alt="Engraving of a herald reading a proclamation"
            caption="Plate VIII · The ruling, proclaimed"
            arch
            className="mx-auto max-w-xs"
          />
          <div>
            <Eyebrow>The bench</Eyebrow>
            <h3
              data-reveal
              className="display-type mt-4 text-[clamp(1.8rem,4vw,3rem)] text-ink"
            >
              Five officers <Serif>of the court</Serif>
            </h3>
            <p data-reveal className="mt-4 font-headline text-lg leading-relaxed text-ink-soft">
              Every AI in Crux is a named role with one job. None of them argue
              for you — they referee, score, and rule.
            </p>
            <ol data-reveal className="mt-7 divide-y divide-ink-faint border-y border-ink-faint">
              {bench.map(([name, job], i) => (
                <li key={name} className="flex gap-5 py-3.5">
                  <span className="font-headline text-xl italic text-laurel">
                    {["i", "ii", "iii", "iv", "v"][i]}
                  </span>
                  <div>
                    <p className="font-label text-[0.72rem] uppercase tracking-[0.2em] text-ink">
                      {name}
                    </p>
                    <p className="mt-1 font-body text-sm leading-relaxed text-ink-soft">
                      {job}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Section>

      <section data-doors-zone className="overflow-hidden px-6 py-24 md:py-32">
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <div
            data-reveal
            className="w-full max-w-2xl overflow-hidden border border-[#24413440] bg-plate"
          >
            <Image
              data-doors
              src="/landing/arena-doors.jpeg"
              alt="Engraving of grand classical doors standing open onto light"
              width={2048}
              height={1152}
              sizes="(min-width: 768px) 42rem, 90vw"
              className="engraving w-full"
            />
          </div>
          <h2
            data-reveal
            className="display-type mt-16 text-[clamp(2.6rem,7vw,5.6rem)] text-ink md:mt-20"
          >
            The doors are open.
            <br />
            <Serif>Bring an opinion.</Serif>
          </h2>
          <p data-reveal className="mt-6 max-w-xl font-headline text-lg leading-relaxed text-ink-soft">
            Season 0 is live now, the board is winnable from zero, and the next
            48-hour clock starts the moment your claim clears the Arbiter.
          </p>
          <div data-reveal className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <PillButton href="/register">
              Claim your name <PiArrowRight />
            </PillButton>
            <PillButton href="/arena" variant="outline">
              Watch a live debate first
            </PillButton>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-faint px-6 py-14">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-8">
          <div className="relative flex size-36 items-center justify-center overflow-hidden rounded-full border border-[#24413440] bg-plate">
            <Image
              src="/landing/laurel-wreath.jpeg"
              alt=""
              aria-hidden
              width={280}
              height={280}
              sizes="9rem"
              className="engraving absolute inset-0 h-full w-full scale-110"
            />
            <span className="relative flex flex-col items-center gap-1 text-plate-ink">
              <LogoMark size={26} />
              <span className="font-headline text-xl italic tracking-tighter leading-none">
                Crux
              </span>
            </span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {[
              ["Arena", "/arena"],
              ["Rules", "/rules"],
              ["Leaderboard", "/leaderboard"],
              ["Archive", "/archive"],
              ["About", "/about"],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="font-label text-[0.68rem] uppercase tracking-[0.24em] text-ink-soft transition-colors hover:text-ink"
              >
                {label}
              </Link>
            ))}
          </nav>
          <p className="text-center font-headline text-sm italic text-ink-soft">
            Built for people who argue in good faith — and finish what they start.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Closing;
