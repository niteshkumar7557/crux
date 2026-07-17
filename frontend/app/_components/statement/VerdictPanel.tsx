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
  SimilarStatement,
  VerdictStatus,
} from "@/app/statement/types";

const ACCENT: Record<
  VerdictStatus,
  { headline: string; text: string; chipBorder: string; chipGlow: string; dot: string; barBorder: string }
> = {
  pass: {
    headline: "Claim admitted",
    text: "text-primary",
    chipBorder: "border-primary/30",
    chipGlow: "shadow-glow-primary",
    dot: "bg-primary",
    barBorder: "border-primary/50",
  },
  fail: {
    headline: "Claim rejected",
    text: "text-secondary",
    chipBorder: "border-secondary/30",
    chipGlow: "shadow-glow-secondary",
    dot: "bg-secondary",
    barBorder: "border-secondary/50",
  },
  unavailable: {
    headline: "Arbiter unreachable",
    text: "text-tertiary",
    chipBorder: "border-tertiary/30",
    chipGlow: "",
    dot: "bg-tertiary",
    barBorder: "border-tertiary/50",
  },
};

interface VerdictPanelProps {
  verdict: ArbiterVerdict;
  selectedDomain: string;
  chosenVersion: ClaimVersion;
  onChooseVersion: (v: ClaimVersion) => void;
  onTryReframe: () => void;
  similar: SimilarStatement[];
}

const VerdictPanel = ({
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
            ? "border-primary bg-primary/5"
            : "border-outline-variant bg-surface-container hover:border-primary/50"
        }`}
      >
        <span
          className={`font-label text-[10px] uppercase tracking-widest block mb-3 ${
            active ? "text-primary" : "text-outline"
          }`}
        >
          {label}
        </span>
        <span className="font-headline italic text-lg text-on-surface leading-snug">
          &ldquo;{content}&rdquo;
        </span>
      </button>
    );
  };

  return (
    <div
      ref={rootRef}
      className="bg-surface-container-high border mt-6 border-outline-variant/50 p-6 relative overflow-hidden"
    >
      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-outline-variant/30 pb-4">
          <h3 className={`font-headline italic text-2xl ${accent.text}`}>{accent.headline}</h3>
          <div
            className={`flex items-center gap-3 bg-surface-container px-4 py-2 border ${accent.chipBorder} ${accent.chipGlow}`}
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
          <p className="font-label text-[10px] uppercase tracking-widest text-tertiary">
            FILED UNDER: {verdict.domain}
          </p>
        )}

        {refiled && (
          <p className="font-label text-[10px] uppercase tracking-widest text-tertiary">
            REFILED: {selectedDomain} &rarr; {verdict.domain}
          </p>
        )}

        <div className={`bg-surface-container-lowest p-5 border-l ${accent.barBorder}`}>
          <div className="flex items-start gap-4">
            <LuCpu className={`${accent.text} text-lg mt-0.5 shrink-0`} />
            <p className="font-label text-xs text-on-surface-variant leading-relaxed">
              {verdict.feedback}
            </p>
          </div>
        </div>

        {verdict.status === "pass" && hasRewrite && (
          <div className="space-y-3">
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
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
            <span className="font-headline italic text-sm text-on-surface-variant">
              &ldquo;{verdict.improved}&rdquo;
            </span>
          </div>
        )}

        {verdict.status === "pass" && similar.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-outline-variant/30">
            <p className="font-label text-[10px] uppercase tracking-widest text-tertiary">
              THIS FIGHT MAY ALREADY EXIST — JOIN IT INSTEAD
            </p>
            {similar.map((s) => (
              <Link
                key={s.id}
                href={`/argument/CRX-${s.id}-A`}
                className="flex items-center justify-between gap-4 px-4 py-3 bg-surface-container border border-outline-variant/50 hover:border-primary transition-colors group"
              >
                <span className="font-headline italic text-sm text-on-surface truncate">
                  &ldquo;{s.content}&rdquo;
                </span>
                <span className="font-label text-[10px] uppercase tracking-widest text-outline group-hover:text-primary whitespace-nowrap transition-colors">
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

export default VerdictPanel;
