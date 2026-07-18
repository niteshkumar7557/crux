"use client";
import { useRef } from "react";
import { ArgumentHeaderProps } from "@/app/argument/types";
import ArgumentProbability from "./ArgumentProbability";
import { gsap, useGSAP, SplitText, MOTION_OK } from "@/app/_utils/gsap";

const ArgumentHeader = ({
  argumentHeaderData,
}: {
  argumentHeaderData: ArgumentHeaderProps;
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);

  const { statement, statementKeyword } = argumentHeaderData;
  const matchIndex = statementKeyword
    ? statement.toLowerCase().indexOf(statementKeyword.toLowerCase())
    : -1;
  const before = matchIndex >= 0 ? statement.slice(0, matchIndex) : statement;
  const highlight =
    matchIndex >= 0
      ? statement.slice(matchIndex, matchIndex + statementKeyword.length)
      : "";
  const after =
    matchIndex >= 0
      ? statement.slice(matchIndex + statementKeyword.length)
      : "";

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        if (!headlineRef.current) return;
        const split = SplitText.create(headlineRef.current, {
          type: "lines",
          mask: "lines",
        });
        gsap
          .timeline({ defaults: { ease: "power3.out" } })
          .from("[data-hero-meta]", { y: 10, opacity: 0, duration: 0.5 })
          .from(
            split.lines,
            { yPercent: 110, duration: 0.9, stagger: 0.09 },
            0.1,
          );
        return () => split.revert();
      });
    },
    { scope: rootRef },
  );

  return (
    <div ref={rootRef}>
      <div className="flex flex-col items-start gap-4 mb-8">
        <div data-hero-meta className="flex items-center gap-3">
          <span className="font-label text-[10px] uppercase tracking-[0.2em] text-primary px-2 py-0.5 border border-primary/30">
            Live Arena
          </span>
          <span className="font-label text-[10px] uppercase tracking-[0.2em] text-outline">
            ID: {argumentHeaderData.statementId}
          </span>
        </div>
        <h1
          ref={headlineRef}
          className="font-headline text-5xl md:text-7xl font-bold max-w-5xl tracking-tight break-words"
        >
          {before}
          {highlight && (
            <span className="text-primary italic">{highlight}</span>
          )}
          {after}
        </h1>
      </div>

      <ArgumentProbability argumentHeaderData={argumentHeaderData} />
    </div>
  );
};

export default ArgumentHeader;
