"use client";

// Why a post is not on the page — or, in one case, why it is. Shares the award
// slip's anatomy on purpose, but never dismisses itself: an award can expire
// unread, a refusal is the reason there is nothing to read.
//
// The "posted" tone exists for one situation only: the write landed and the
// reply did not survive the trip back. It is not an award — we never received
// the points — so it says what happened and points at the arena.
// Spec: game-theory.md §19

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { LuTriangleAlert, LuArrowRight, LuX, LuCheck } from "react-icons/lu";
import { gsap, MOTION_OK } from "@/app/_utils/gsap";
import Portal from "@/app/_components/ui/Portal";

export type Notice = {
  title: string;
  body: ReactNode;
  action?: { href: string; label: string };
  tone?: "refusal" | "posted";
};

const TONES = {
  refusal: {
    label: "Not posted",
    Icon: LuTriangleAlert,
    accent: "text-side-against",
  },
  posted: { label: "Posted", Icon: LuCheck, accent: "text-laurel" },
} as const;

const RefusalNotice = ({
  notice,
  onDismiss,
}: {
  notice: Notice;
  onDismiss: () => void;
}) => {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current || !window.matchMedia(MOTION_OK).matches) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        rootRef.current,
        { opacity: 0, y: 16, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: "power3.out" },
      );
    }, rootRef);
    return () => ctx.revert();
  }, [notice]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  const { label, Icon, accent } = TONES[notice.tone ?? "refusal"];

  return (
    <Portal>
      <div
        ref={rootRef}
        role={notice.tone === "posted" ? "status" : "alert"}
        className="fixed bottom-32 right-6 z-60 w-88 max-w-[calc(100vw-3rem)] bg-raised border border-ink-faint shadow-cast-deep"
      >
        <div className="flex items-center justify-between border-b border-ink-faint px-5 py-3">
          <span
            className={`flex items-center gap-2 font-label text-[10px] uppercase tracking-[0.2em] ${accent} font-bold`}
          >
            <Icon className="text-sm" />
            {label}
          </span>
          <button
            className="shrink-0 text-ink-soft hover:text-ink transition-colors cursor-pointer"
            aria-label="Dismiss"
            onClick={onDismiss}
          >
            <LuX className="text-sm" />
          </button>
        </div>

        <div className="px-5 py-4">
          <h4 className="font-headline text-xl font-bold tracking-tight text-ink">
            {notice.title}
          </h4>
          <p className="mt-2 font-body text-[0.95rem] leading-relaxed text-ink-soft">
            {notice.body}
          </p>
          {notice.action && (
            <Link
              href={notice.action.href}
              className="mt-4 inline-flex items-center gap-1.5 font-label text-[10px] uppercase tracking-[0.15em] text-ink-soft hover:text-ink transition-colors"
            >
              {notice.action.label}
              <LuArrowRight className="text-[11px]" />
            </Link>
          )}
        </div>
      </div>
    </Portal>
  );
};

export default RefusalNotice;
