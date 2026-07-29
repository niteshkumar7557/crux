"use client";
import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Eyebrow, initReveals, Plate, prefersReduced, Section, SectionHead, Serif } from "./ui";

gsap.registerPlugin(useGSAP, ScrollTrigger);

// The §9 tier ladder — names only. The letter grades that used to ride
// alongside are gone from the product (frontend/app/_utils/logicScore.ts), and
// the landing may not advertise something the arena will not show you.
const tiers = [
  { range: "0-99", name: "Beginner" },
  { range: "100-199", name: "Intermediate" },
  { range: "200-299", name: "Skilled" },
  { range: "300-399", name: "Expert" },
  { range: "400+", name: "Master" },
];

const prizes = [
  { rank: "1st", title: "Champion of the Season", frame: "Gold frame" },
  { rank: "2nd", title: "Challenger of the Season", frame: "Silver frame" },
  { rank: "3rd", title: "Contender of the Season", frame: "Bronze frame" },
];

const Climb = () => {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      initReveals(scope.current);
      if (prefersReduced()) return;
      // The debating chamber drifts slowly behind its caption — monumental.
      gsap.fromTo(
        "[data-hall]",
        { y: 60 },
        {
          y: -60,
          ease: "none",
          scrollTrigger: {
            trigger: "[data-hall-zone]",
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
      {/* ------------------------------------------------ your record */}
      <Section band>
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.3fr] lg:gap-20">
          <Plate
            data-reveal
            src="/landing/marble-bust.jpeg"
            alt="Engraving of a marble bust of a philosopher"
            caption="Plate VI · A career in reasoning"
            arch
            className="mx-auto max-w-sm"
          />
          <div>
            <SectionHead
              kicker="What you keep"
              title={<>A record that <Serif>never lies</Serif></>}
            />
            <div className="mt-7 flex flex-col gap-5 font-headline text-lg leading-relaxed text-ink-soft">
              <p data-reveal>
                Your profile carries a <strong className="text-ink">logic score</strong>{" "}
                that only ever rises, a permanent{" "}
                <strong className="text-ink">win–loss–draw record</strong> from
                every concluded debate, and your MVP count. Reputation here is
                earned by reasoning — not followers, not volume, not seniority.
              </p>
              <p data-reveal>
                Losses cost season points, never career points. Arguing the
                unpopular side you actually believe in is never punished on the
                record of who you are.
              </p>
            </div>
            {/* `w-fit`: with the grades gone the rules ran the full column
                width past two short words. They now stop at the longest tier
                name, which is what they are measuring. */}
            <ul
              data-reveal
              className="mt-8 w-fit divide-y divide-ink-faint border-y border-ink-faint"
            >
              {tiers.map((t) => (
                <li
                  key={t.name}
                  className="flex items-baseline gap-6 py-2.5 px-3 font-body text-sm"
                >
                  <span className="w-20 shrink-0 font-label text-[0.7rem] tracking-[0.14em] text-ink-soft">
                    {t.range}
                  </span>
                  <span className="font-medium text-ink">{t.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------ seasons */}
      <Section id="seasons">
        <div className="grid items-center gap-12 lg:grid-cols-[1.3fr_1fr] lg:gap-20">
          <div>
            <SectionHead
              kicker="The month is the game"
              title={<>Anyone can win <Serif>a season</Serif></>}
            />
            <div className="mt-7 flex flex-col gap-5 font-headline text-lg leading-relaxed text-ink-soft">
              <p data-reveal>
                The season board ranks logic earned{" "}
                <em className="italic">this calendar month</em> — and on the 1st
                it resets to zero for everyone. A newcomer can top the board in
                their first week; no veteran sits on an unbeatable pile of
                points.
              </p>
              <p data-reveal>
                The top three finishers keep something forever:
              </p>
            </div>
            <ul data-reveal className="mt-6 flex flex-col divide-y divide-ink-faint border-y border-ink-faint">
              {prizes.map((p) => (
                <li key={p.rank} className="flex items-baseline gap-5 py-3.5">
                  <span className="display-type w-12 text-2xl text-laurel">
                    {p.rank}
                  </span>
                  <span className="grow font-headline text-lg italic text-ink">
                    {p.title}
                  </span>
                  <span className="font-label text-[0.66rem] uppercase tracking-[0.2em] text-ink-soft">
                    {p.frame}
                  </span>
                </li>
              ))}
            </ul>
            <p data-reveal className="mt-6 font-body text-sm leading-relaxed text-ink-soft">
              Titles and avatar frames are permanent, they stack season after
              season, and they grant no advantage — a season&rsquo;s prize is
              proof you won a month. Your all-time score lives on the{" "}
              <strong className="text-ink">Legends</strong> board, which never
              resets.
            </p>
          </div>
          <Plate
            data-reveal
            src="/landing/medals-trio.jpeg"
            alt="Engraving of three award medals on ribbons"
            caption="Plate VII · Champion · Challenger · Contender"
            className="mx-auto max-w-md"
          />
        </div>
      </Section>

      {/* ------------------------------------------------ the stage */}
      <section id="stage" data-hall-zone className="relative overflow-hidden bg-plate">
        {/* The chamber is scaled up so the parallax has room to drift, so it
            has to be clipped to a band of its own — left unclipped it spilled
            over the copy below and the eyebrow landed on the benches. */}
        <div className="relative aspect-[2048/878] overflow-hidden">
          <Image
            data-hall
            src="/landing/amphitheater-hall.jpeg"
            alt="Engraving of a grand debating chamber, benches facing each other"
            width={2048}
            height={878}
            sizes="100vw"
            className="engraving h-full w-full scale-125 object-cover"
          />
        </div>
        <div className="mx-auto max-w-3xl px-6 pt-20 pb-20 text-center md:pt-28 md:pb-28">
          <Eyebrow className="justify-center">Where debates get found</Eyebrow>
          <h2
            data-reveal
            className="display-type mt-5 text-[clamp(2.2rem,5.4vw,4.2rem)] text-plate-ink"
          >
            One stage, <Serif>every eye on it</Serif>
          </h2>
          <div className="mt-7 flex flex-col gap-5 text-left font-headline text-lg leading-relaxed text-plate-ink/80 md:text-center">
            <p data-reveal>
              Each day one live debate is crowned{" "}
              <strong className="text-plate-ink">Motion of the Day</strong>, with
              the <strong className="text-plate-ink">Main Stage</strong> holding a
              handful more beneath it — so you never land on a dead debate with
              nobody to argue against.
            </p>
            <p data-reveal>
              The stage is picked by <em className="italic">heat</em>: argument
              velocity × how evenly the sides are contesting. A 50–50 fight
              outranks a pile-on twice its size, and every featured debate wears
              its label in the open. Everything else stays fully browsable —
              newest, twelve domains, and search.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Climb;
