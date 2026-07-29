"use client";
import { useRef } from "react";
import Link from "next/link";
import { LuCpu, LuRefreshCw } from "react-icons/lu";
import Button from "@/app/_components/ui/Button";
import { gsap, useGSAP, MOTION_OK } from "@/app/_utils/gsap";
import {
  ArbiterVerdict,
  AUTO_DOMAIN,
  ClaimVersion,
  SimilarMotion,
  VerdictStatus,
} from "@/app/motion/new/types";

// Admitted is green and rejected terracotta. Those are the camp colours
// elsewhere, but nothing in the composer has a side yet — no motion exists to
// take one on — so here they can carry their plain meaning of yes and no.
//
// "Unreachable" is neither: it is the arbiter failing to answer, so it stays
// muted rather than taking laurel, which marks things that were earned.
//
// The `chipGlow` slot went with the glow shadows the palette dropped.
const ACCENT: Record<
  VerdictStatus,
  { headline: string; text: string; chipBorder: string; dot: string; barBorder: string }
> = {
  pass: {
    headline: "Claim admitted",
    text: "text-side-for",
    chipBorder: "border-side-for/40",
    dot: "bg-side-for",
    barBorder: "border-side-for/50",
  },
  fail: {
    headline: "Claim rejected",
    text: "text-side-against",
    chipBorder: "border-side-against/40",
    dot: "bg-side-against",
    barBorder: "border-side-against/50",
  },
  unavailable: {
    headline: "Arbiter unreachable",
    text: "text-ink-soft",
    chipBorder: "border-ink-faint",
    dot: "bg-ink-soft",
    barBorder: "border-ink-faint",
  },
};

interface VerdictPanelProps {
  verdict: ArbiterVerdict;
  selectedDomain: string;
  chosenVersion: ClaimVersion;
  onChooseVersion: (v: ClaimVersion) => void;
  onTryReframe: () => void;
  similar: SimilarMotion[];
}

const ArbiterPanel = ({
  verdict,
  selectedDomain,
  chosenVersion,
  onChooseVersion,
  onTryReframe,
  similar,
}: VerdictPanelProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const accent = ACCENT[verdict.status];
  const hasRewrite = verdict.improved.trim() !== verdict.original.trim();
  const autoFiled = verdict.status === "pass" && selectedDomain === AUTO_DOMAIN;
  const refiled =
    verdict.status === "pass" && !autoFiled && verdict.domain !== selectedDomain;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.from(rootRef.current, {
          opacity: 0.25,
          y: 12,
          duration: 0.5,
          ease: "power3.out",
          clearProps: "opacity,transform",
        });
      });
    },
    { scope: rootRef },
  );

  const versionCard = (version: ClaimVersion, label: string, content: string) => {
    const active = chosenVersion === version;
    return (
      <button
        type="button"
        role="radio"
        aria-checked={active}
        onClick={() => onChooseVersion(version)}
        className={`text-left p-5 border cursor-pointer transition-colors ${
          active
            ? "border-ink bg-ink/5"
            : "border-ink-faint bg-band hover:border-ink/50"
        }`}
      >
        <span
          className={`font-label text-[10px] uppercase tracking-widest block mb-3 ${
            active ? "text-ink" : "text-ink-soft"
          }`}
        >
          {label}
        </span>
        <span className="font-headline italic text-lg text-ink leading-snug">
          &ldquo;{content}&rdquo;
        </span>
      </button>
    );
  };

  return (
    <div
      ref={rootRef}
      className="bg-raised border mt-6 border-ink-faint p-6 relative overflow-hidden"
    >
      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-ink-faint pb-4">
          <h3 className={`font-headline italic text-2xl ${accent.text}`}>{accent.headline}</h3>
          <div
            className={`flex items-center gap-3 bg-band px-4 py-2 border ${accent.chipBorder}`}
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full opacity-75 ${accent.dot}`}
              ></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${accent.dot}`}></span>
            </span>
            <span className={`font-label text-[10px] uppercase tracking-widest ${accent.text}`}>
              Eligibility: {verdict.status}
            </span>
          </div>
        </div>

        {autoFiled && (
          <p className="font-label text-[10px] uppercase tracking-widest text-laurel">
            FILED UNDER: {verdict.domain}
          </p>
        )}

        {refiled && (
          <p className="font-label text-[10px] uppercase tracking-widest text-laurel">
            REFILED: {selectedDomain} &rarr; {verdict.domain}
          </p>
        )}

        <div className={`bg-paper p-5 border-l ${accent.barBorder}`}>
          <div className="flex items-start gap-4">
            <LuCpu className={`${accent.text} text-lg mt-0.5 shrink-0`} />
            <p className="font-label text-xs text-ink-soft leading-relaxed">
              {verdict.feedback}
            </p>
          </div>
        </div>

        {verdict.status === "pass" && hasRewrite && (
          <div className="space-y-3">
            <p className="font-label text-[10px] uppercase tracking-widest text-ink-soft">
              CHOOSE YOUR WEAPON — THE CLAIM THAT ENTERS THE ARENA
            </p>
            <div role="radiogroup" className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {versionCard("original", "ORIGINAL — YOUR WORDS", verdict.original)}
              {versionCard("improved", "IMPROVED — ARBITER'S CUT", verdict.improved)}
            </div>
          </div>
        )}

        {verdict.status === "fail" && hasRewrite && (
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <Button type="button" variant="outline-secondary" size="sm" onClick={onTryReframe}>
              Try the Arbiter&apos;s reframe
              <LuRefreshCw className="text-sm" />
            </Button>
            <span className="font-headline italic text-sm text-ink-soft">
              &ldquo;{verdict.improved}&rdquo;
            </span>
          </div>
        )}

        {verdict.status === "pass" && similar.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-ink-faint">
            <p className="font-label text-[10px] uppercase tracking-widest text-laurel">
              THIS FIGHT MAY ALREADY EXIST — JOIN IT INSTEAD
            </p>
            {similar.map((s) => (
              <Link
                key={s.id}
                href={`/motion/CRX-${s.id}-A`}
                className="flex items-center justify-between gap-4 px-4 py-3 bg-band border border-ink-faint hover:border-ink transition-colors group"
              >
                <span className="font-headline italic text-sm text-ink truncate">
                  &ldquo;{s.content}&rdquo;
                </span>
                <span className="font-label text-[10px] uppercase tracking-widest text-ink-soft group-hover:text-ink whitespace-nowrap transition-colors">
                  {s.domain} &rarr;
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ArbiterPanel;
