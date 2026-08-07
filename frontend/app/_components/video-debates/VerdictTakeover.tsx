"use client";

// The scrim, the portal and the focus. Portal is required, not stylistic: the
// navbar is backdrop-blurred, and a blurred ancestor becomes the containing block
// for position: fixed — see design-system.md §5.

import { useEffect, useRef } from "react";
import type { PlaybackManifestV1 } from "@/app/video-debates/types";
import type { VerdictCue } from "./verdictGate.logic";
import Portal from "@/app/_components/ui/Portal";
import VerdictPanel from "./VerdictPanel";

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const VerdictTakeover = ({
  cue,
  manifest,
  onContinue,
}: {
  cue: VerdictCue | null;
  manifest: PlaybackManifestV1;
  onContinue: () => void;
}) => {
  const shellRef = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!cue) return;
    restoreTo.current = document.activeElement as HTMLElement | null;
    const shell = shellRef.current;
    shell?.querySelector<HTMLElement>("button")?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onContinue();
        return;
      }
      if (event.key !== "Tab" || !shell) return;
      const focusable = shell.querySelectorAll<HTMLElement>(FOCUSABLE);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreTo.current?.focus();
    };
  }, [cue, onContinue]);

  if (!cue) return null;

  return (
    <Portal>
      <div
        ref={shellRef}
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-scrim p-4 md:p-8"
      >
        <VerdictPanel cue={cue} manifest={manifest} onContinue={onContinue} />
      </div>
    </Portal>
  );
};

export default VerdictTakeover;
