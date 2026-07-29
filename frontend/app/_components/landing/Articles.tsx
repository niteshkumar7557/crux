"use client";
import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  PiArrowBendDownRight,
  PiCheckCircle,
  PiHeart,
  PiLockSimple,
  PiProhibit,
  PiSealCheck,
} from "react-icons/pi";
import { Eyebrow, initReveals, Plate, prefersReduced, Section, Serif } from "./ui";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/* ------------------------------------------------------------- shell */

const Article = ({
  numeral,
  kicker,
  title,
  children,
}: {
  numeral: string;
  kicker: string;
  title: ReactNode;
  children: ReactNode;
}) => (
  <article className="border-t border-ink-faint py-20 md:py-28">
    <div className="flex items-baseline gap-6">
      <span
        aria-hidden
        className="font-headline text-6xl italic text-laurel md:text-7xl"
      >
        {numeral}
      </span>
      <div>
        <Eyebrow>{kicker}</Eyebrow>
        <h3
          data-reveal
          className="display-type mt-3 text-[clamp(2rem,4.6vw,3.6rem)] text-ink"
        >
          {title}
        </h3>
      </div>
    </div>
    <div className="mt-12 grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
      {children}
    </div>
  </article>
);

const Body = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-col gap-5 font-headline text-lg leading-relaxed text-ink-soft">
    {children}
  </div>
);

/** A rule the game will hold you to — surfaced here exactly as it is in play. */
const Rule = ({ children }: { children: ReactNode }) => (
  <p
    data-reveal
    className="border-l-2 border-laurel py-1 pl-4 font-body text-[0.92rem] leading-relaxed text-ink"
  >
    {children}
  </p>
);

/* ------------------------------------------------------------- exhibits */

// Exhibits are documents, not engravings, so they sit on `raised` — the same
// cream as a plate in light, but a dark surface at night. `plate` is reserved
// for sheets that actually carry an engraving.
const MotionExhibit = () => (
  <div data-reveal className="flex flex-col gap-4">
    <div className="border border-ink-faint bg-raised p-5">
      <p className="font-label text-[0.62rem] uppercase tracking-[0.26em] text-ink-soft">
        Submitted motion
      </p>
      <p className="mt-2 font-headline text-lg italic leading-snug text-ink line-through decoration-side-against decoration-2">
        “Social media is bad.”
      </p>
      <p className="mt-3 flex items-start gap-2 font-body text-sm leading-relaxed text-ink-soft">
        <PiProhibit className="mt-0.5 shrink-0 text-side-against" />
        Too vague to argue — bad for whom, at what? The Arbiter suggests a
        sharper claim:
      </p>
    </div>
    <div className="border border-ink-faint bg-raised p-5">
      <p className="font-label text-[0.62rem] uppercase tracking-[0.26em] text-ink-soft">
        Rewritten &amp; approved
      </p>
      <p className="mt-2 font-headline text-lg italic leading-snug text-ink">
        “Social platforms should verify every account belongs to a human.”
      </p>
      <p className="mt-3 flex items-center gap-2 font-label text-[0.68rem] uppercase tracking-[0.2em] text-side-for">
        <PiSealCheck size={16} /> Passed · Domain: Technology
      </p>
    </div>
  </div>
);

const CampsExhibit = () => (
  <div data-reveal className="flex flex-col gap-4">
    <div className="grid grid-cols-2 gap-4">
      <div className="border-t-2 border-side-for bg-ink-wash p-4">
        <p className="font-label text-[0.66rem] uppercase tracking-[0.24em] text-side-for">
          For
        </p>
        <p className="mt-2 font-body text-sm leading-relaxed text-ink">
          The strongest case for the motion — opened by the AI, then rewritten
          as your side lands arguments.
        </p>
      </div>
      <div className="border-t-2 border-side-against bg-ink-wash p-4">
        <p className="font-label text-[0.66rem] uppercase tracking-[0.24em] text-side-against">
          Against
        </p>
        <p className="mt-2 font-body text-sm leading-relaxed text-ink">
          The strongest case against — always visible, so you know exactly what
          you are up against.
        </p>
      </div>
    </div>
    <div className="border border-ink-faint bg-raised p-5">
      <p className="flex items-center gap-2 font-label text-[0.66rem] uppercase tracking-[0.22em] text-ink-soft">
        <PiLockSimple size={15} /> Before your first argument
      </p>
      <p className="mt-2 font-body text-sm leading-relaxed text-ink">
        “You&rsquo;re committing to <strong>FOR</strong>. You will not be able
        to argue AGAINST in this debate, and a loss costs 5 points from your
        season score — never your record.”
      </p>
      <p className="mt-3 inline-flex items-center gap-2 border border-ink-faint px-3 py-1.5 font-label text-[0.64rem] uppercase tracking-[0.2em] text-ink">
        <PiCheckCircle size={15} /> I understand — lock me in
      </p>
    </div>
  </div>
);

const ClockExhibit = () => (
  <div className="flex flex-col items-center gap-6">
    <p
      data-clock
      className="display-type text-[clamp(3.4rem,8vw,6.4rem)] tabular-nums text-ink"
    >
      48:00:00
    </p>
    <p
      data-locked
      className="max-w-full rotate-[-6deg] border-[3px] border-side-against px-4 py-2 text-center font-label text-xs font-bold uppercase tracking-[0.22em] text-side-against opacity-0 sm:text-sm sm:tracking-[0.3em]"
    >
      Locked — read forever
    </p>
  </div>
);

const scoreCards = [
  {
    score: "+7",
    lines: ["Judged 7 of 8", "Targeted rebuttal — full range unlocked"],
    accent: "text-side-for",
  },
  {
    score: "+5",
    lines: ["Judged 6 of 8", "Capped at 5 — standalone point"],
    accent: "text-side-draw",
  },
  {
    score: "+3",
    lines: ["Judged 7 of 8", "Halved — your 4th argument here"],
    accent: "text-side-draw",
  },
];

const DuelExhibit = () => (
  <div data-reveal className="flex flex-col gap-4">
    {scoreCards.map((c) => (
      <div
        key={c.lines[1]}
        className="flex items-center gap-5 border border-ink-faint bg-raised px-5 py-4"
      >
        <span className={`display-type w-16 text-4xl ${c.accent}`}>{c.score}</span>
        <div>
          <p className="font-label text-[0.62rem] uppercase tracking-[0.24em] text-ink-soft">
            {c.lines[0]}
          </p>
          <p className="font-body text-sm text-ink">{c.lines[1]}</p>
        </div>
      </div>
    ))}
    <p className="mt-1 flex items-center gap-2 font-body text-sm text-ink-soft">
      <PiHeart className="text-side-against" /> A like from the room is +2. An
      abusive argument is −4, and it never posts.
    </p>
  </div>
);

const VerdictExhibit = () => (
  <div data-reveal className="flex flex-col gap-6">
    <div>
      <div className="flex justify-between font-label text-[0.68rem] uppercase tracking-[0.22em]">
        <span className="text-side-for">For · 58</span>
        <span className="text-side-against">Against · 42</span>
      </div>
      <div className="relative mt-2 h-9 overflow-hidden border border-ink-faint">
        <div data-split className="absolute inset-y-0 left-0 w-[58%] bg-side-for" />
        <div className="absolute inset-y-0 right-0 left-[58%] bg-side-against" />
        {/* The draw band — margins of 5 or less are a draw, and you can see it. */}
        <div className="absolute inset-y-0 left-[47.5%] w-[5%] border-x border-dashed border-paper/80 bg-side-draw/40" />
      </div>
      <p className="mt-2 font-body text-xs uppercase tracking-[0.14em] text-ink-soft">
        Margin 16 — clear of the draw band. FOR wins.
      </p>
    </div>
    <table className="w-full border-collapse font-body text-sm text-ink">
      <caption className="mb-2 text-left font-label text-[0.62rem] uppercase tracking-[0.26em] text-ink-soft">
        The payout, exactly
      </caption>
      <tbody>
        {[
          ["MVP of the winning side", "+25 logic · +1 W · a badge"],
          ["Everyone else who won", "+10 logic · +1 W"],
          ["The losing side", "−5 season points only · +1 L — your lifetime score never falls"],
          ["A draw (margin ≤ 5)", "0 · +1 D for both camps"],
          ["The motion's author", "+5 logic for a real debate"],
          ["A walkover (empty side)", "0 for everyone — no farming empty wins"],
        ].map(([who, what]) => (
          <tr key={who} className="border-t border-ink-faint">
            <td className="py-2.5 pr-4 align-top font-medium">{who}</td>
            <td className="py-2.5 text-ink-soft">{what}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/* ------------------------------------------------------------- section */

const Articles = () => {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      initReveals(scope.current);
      const clockEl = scope.current?.querySelector("[data-clock]");
      if (!clockEl) return;
      if (prefersReduced()) {
        gsap.set("[data-locked]", { autoAlpha: 1 });
        return;
      }
      // Scroll drains the clock: 48:00:00 → 00:00:00, then the arena stamps
      // itself shut. The trigger is the clock itself, not the zone around it —
      // hanging it off the zone started the countdown while the numbers were
      // still below the fold, so the reader arrived to a clock already half
      // spent. It now starts as the clock crosses 85% down the viewport and
      // burns through in a short stretch of scroll, all of it in view.
      const state = { t: 48 * 3600 };
      gsap
        .timeline({
          scrollTrigger: {
            trigger: "[data-clock]",
            start: "top 85%",
            end: "+=420",
            scrub: 0.5,
          },
        })
        .to(state, {
          t: 0,
          ease: "none",
          duration: 10,
          onUpdate: () => {
            const t = Math.max(0, Math.round(state.t));
            const h = String(Math.floor(t / 3600)).padStart(2, "0");
            const m = String(Math.floor((t % 3600) / 60)).padStart(2, "0");
            const s = String(t % 60).padStart(2, "0");
            clockEl.textContent = `${h}:${m}:${s}`;
          },
        })
        .fromTo(
          "[data-locked]",
          { autoAlpha: 0, scale: 1.6, rotate: -6 },
          { autoAlpha: 1, scale: 1, rotate: -6, duration: 1.2, ease: "power4.in" },
        );
      // Split bar sweeps in once when the verdict exhibit arrives.
      gsap.fromTo(
        "[data-split]",
        { width: "50%" },
        {
          width: "58%",
          duration: 1.4,
          ease: "power2.inOut",
          scrollTrigger: { trigger: "[data-split]", start: "top 80%", once: true },
        },
      );
    },
    { scope },
  );

  return (
    <div ref={scope}>
      <Section className="!py-12 md:!py-16">
      <div className="mx-auto mb-10 max-w-3xl text-center md:mb-16">
        <Eyebrow className="justify-center">The proceedings, in full</Eyebrow>
        <h2
          data-reveal
          className="display-type mt-5 text-[clamp(2.4rem,6vw,4.6rem)] text-ink"
        >
          The life of <Serif>one debate</Serif>
        </h2>
        <p data-reveal className="mt-6 font-headline text-lg leading-relaxed text-ink-soft">
          Five articles govern everything that happens here. No fine print —
          this is all of it, the same rules the arena will show you as you play.
        </p>
      </div>

      <Article numeral="I" kicker="Article one" title="The motion">
        <Body>
          <p data-reveal>
            Everything starts with one declarative sentence — a claim worth
            fighting over. Before it goes live, an AI referee called the{" "}
            <strong className="text-ink">Arbiter</strong> reads it. Vague,
            unfalsifiable, or unarguable claims are turned away at the door,
            always with the reason and a sharper rewrite to try instead.
          </p>
          <p data-reveal>
            You never walk into a debate that was doomed by a bad question — and
            when your motion produces a real contest, you earn{" "}
            <strong className="text-ink">+5 logic</strong> for asking it.
          </p>
          <Rule>
            Posting always works instantly and always goes live — nothing is
            throttled, nothing waits in a queue.
          </Rule>
        </Body>
        <MotionExhibit />
        {/* Spans the whole article and centres on the page, below both
            columns — a specimen plate under the exhibit, not a third thing
            stacked in the right-hand column. */}
        <Plate
          data-reveal
          src="/landing/motion-quill-seal.jpeg"
          alt="Engraving of a quill, inkwell, and a sealed scroll"
          caption="Plate I · The claim, sealed"
          className="mx-auto hidden w-full max-w-sm lg:col-span-2 lg:block"
        />
      </Article>

      <Article numeral="II" kicker="Article two" title={<>Two camps, <Serif>one choice</Serif></>}>
        <Body>
          <p data-reveal>
            Every debate has exactly two sides, FOR and AGAINST, each with a
            live written case — opened by an AI analyst and rewritten as real
            arguments land, crediting the debaters who moved it.
          </p>
          <p data-reveal>
            Your first argument <strong className="text-ink">locks your side</strong>{" "}
            for that debate. No hedging, no arguing both ends of the same fight,
            no farming a guaranteed win. The camps are real, and the lock is
            confirmed with you before it ever happens.
          </p>
          <Rule>
            The lock is per-debate. Argue FOR nuclear power today, AGAINST
            homework tomorrow — conviction is judged one motion at a time.
          </Rule>
        </Body>
        <CampsExhibit />
      </Article>

      <Article numeral="III" kicker="Article three" title={<>The 48-hour <Serif>clock</Serif></>}>
        <Body>
          <p data-reveal>
            Every debate runs exactly 48 hours from the moment it goes live. No
            extensions, no early closes, and the countdown is visible everywhere
            the debate appears — a deadline you can plan around.
          </p>
          <p data-reveal>
            At zero the arena locks read-only, permanently. Then the judge
            speaks. Your effort resolves into something —{" "}
            <em className="italic">that</em> is the payoff normal internet
            arguments never deliver.
          </p>
          <Rule>
            If one side is still empty with under 6 hours left, the arena warns
            everyone: an unopposed debate concludes as a walkover and nobody
            scores.
          </Rule>
        </Body>
        {/* Pulled up out of the grid so the plate starts level with the
            article's numeral rather than with the copy — the column runs
            taller than the paragraphs, and hanging it from the same top line
            left it dangling well below them. 11.5rem is the header block plus
            the grid's own top margin. No arch on this one: the hourglass fills
            its plate corner to corner, and the arch was cutting the cap and
            the finials off the top of it. */}
        <div
          data-clock-zone
          className="flex flex-col items-center gap-8 lg:-mt-[11.5rem]"
        >
          <Plate
            data-reveal
            src="/landing/clock-hourglass.jpeg"
            alt="Engraving of an ornate hourglass, sand mid-fall"
            caption="Plate III · Forty-eight hours"
            className="max-w-xs"
          />
          <ClockExhibit />
        </div>
      </Article>

      <Article numeral="IV" kicker="Article four" title={<>Replies win <Serif>debates</Serif></>}>
        <Body>
          <p data-reveal>
            Every argument is scored 1–8 by an AI analyst — not on eloquence,
            and not on whether it agrees, but on how much it{" "}
            <em className="italic">moves the argument</em>.
          </p>
          <p data-reveal>
            The full range belongs to <strong className="text-ink">replies</strong>:
            pick a specific opposing argument and dismantle it. A standalone
            point that engages nobody caps at 5. Your fourth argument in the
            same debate scores half — volume never beats sharpness.
          </p>
          <p data-reveal className="flex items-start gap-2">
            <PiArrowBendDownRight className="mt-1.5 shrink-0 text-laurel" />
            <span>
              Every point you earn arrives with its arithmetic shown — judged
              score, cap, halving — so the game teaches you its rules as you
              play it.
            </span>
          </p>
        </Body>
        <DuelExhibit />
      </Article>

      <div data-reveal className="pb-4">
        <Plate
          src="/landing/duel-fencers.jpeg"
          alt="Engraving of two fencers mid-duel, blades crossed"
          caption="Plate IV · The rebuttal, illustrated"
          sizes="(min-width: 1024px) 72rem, 100vw"
          imgClassName="aspect-[2/1] object-cover object-[50%_30%]"
        />
      </div>

      <Article numeral="V" kicker="Article five" title="The verdict">
        <Body>
          <p data-reveal>
            While the debate runs, a probability judge keeps a live split of
            which case is winning — judged on the two written cases, never on
            who is loudest. The draw band sits marked on the bar, so a debate
            drifting toward a tie is visible to everyone, in time to change it.
          </p>
          <p data-reveal>
            At lock, the <strong className="text-ink">Verdict Judge</strong>{" "}
            reads everything — both cases, every argument, the whole reply
            structure — and rules: a winner if the margin clears 5 points, the
            MVP of the winning side, and a written closing that names the crux
            of the whole fight.
          </p>
          <Rule>
            Concluded debates generate a share card — claim, winner, margin,
            MVP. Your win travels to the group chat.
          </Rule>
        </Body>
        <VerdictExhibit />
      </Article>
      </Section>
    </div>
  );
};

export default Articles;
