"use client";
import { useEffect, useRef, useState } from "react";
import { LuRadioTower } from "react-icons/lu";
import Avatar from "@/app/_components/ui/Avatar";
import Button from "@/app/_components/ui/Button";
import { gsap, useGSAP, MOTION_OK } from "@/app/_utils/gsap";

const CAST_STAGES = [
  "Summoning the Arbiter…",
  "Drafting the case FOR…",
  "…and AGAINST…",
  "Opening the arena…",
];
const CAST_STAGE_MS = 2200;

// Highlight the arbiter keyword inside the claim. The keyword is only
// guaranteed to exist in the IMPROVED text — if the user chose ORIGINAL and
// it's absent, render plain text (spec-mandated fallback).
function highlightKeyword(content: string, keyword: string) {
  if (!keyword) return content;
  const idx = content.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx === -1) return content;
  return (
    <>
      {content.slice(0, idx)}
      <span className="text-primary">{content.slice(idx, idx + keyword.length)}</span>
      {content.slice(idx + keyword.length)}
    </>
  );
}

interface BroadcastPreviewProps {
  content: string;
  keyword: string;
  domain: string;
  username: string | null;
  avatar: string | null;
  requiresLogin: boolean;
  casting: boolean;
  notice: string;
  onBroadcast: () => void;
}

const BroadcastPreview = ({
  content,
  keyword,
  domain,
  username,
  avatar,
  requiresLogin,
  casting,
  notice,
  onBroadcast,
}: BroadcastPreviewProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [castIdx, setCastIdx] = useState(0);

  useEffect(() => {
    if (!casting) return;
    const reset = setTimeout(() => setCastIdx(0), 0);
    const timer = setInterval(
      () => setCastIdx((i) => Math.min(i + 1, CAST_STAGES.length - 1)),
      CAST_STAGE_MS,
    );
    return () => {
      clearTimeout(reset);
      clearInterval(timer);
    };
  }, [casting]);

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

  return (
    <div ref={rootRef} className="mt-6 space-y-4">
      <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
        THIS IS HOW IT ENTERS THE ARENA
      </p>
      <div className="bg-surface-container-low p-6 border-l-2 border-primary">
        <div className="flex items-center gap-2 mb-4">
          <Avatar username={username ?? "?"} src={avatar} size="sm" />
          <span className="font-body text-[10px] font-bold text-outline uppercase tracking-wider">
            {username ?? "you"}
          </span>
          <span className="font-label uppercase text-[10px] text-on-surface-variant bg-outline/10 px-1.5 py-1 ml-auto">
            now
          </span>
        </div>
        <span className="font-label text-[10px] text-tertiary uppercase tracking-widest mb-3 block">
          {domain}
        </span>
        <h3 className="font-headline text-xl mb-4">
          &ldquo;{highlightKeyword(content, keyword)}&rdquo;
        </h3>
        <p className="font-label text-[10px] text-outline uppercase tracking-widest">
          AWAITING FIRST ARGUMENTS
        </p>
      </div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-3">
        {notice && (
          <p className="font-label text-[10px] uppercase tracking-widest text-tertiary md:mr-auto">
            {notice}
          </p>
        )}
        {requiresLogin ? (
          <Button size="lg" className="w-full md:w-auto" href="/login?next=/statement">
            Log in to broadcast
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            className="w-full md:w-auto"
            disabled={casting}
            onClick={() => {
              setCastIdx(0);
              onBroadcast();
            }}
          >
            {casting ? CAST_STAGES[castIdx] : "Broadcast Statement"}
            {casting ? (
              <span className="border-t-2 border-on-primary h-4 w-4 rounded-full animate-spin motion-reduce:animate-none"></span>
            ) : (
              <LuRadioTower className="text-lg" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default BroadcastPreview;
