"use client";

// The confirmation before a first argument. The side lock is irreversible, so it is
// confirmed rather than discovered. It states the lock and nothing else — the loss
// penalty is disclosed on /rules and in the verdict, not at the moment of commitment.
// Spec: game-theory.md §5, §19

import { useEffect } from "react";
import Button from "@/app/_components/ui/Button";
import Portal from "@/app/_components/ui/Portal";

const SideLockConfirm = ({
  side,
  onConfirm,
  onCancel,
}: {
  side: "for" | "against";
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const label = side === "for" ? "FOR" : "AGAINST";
  const opposing = side === "for" ? "AGAINST" : "FOR";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div
          className="fixed inset-0 bg-scrim backdrop-blur-sm"
          onClick={onCancel}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="side-lock-title"
          className={`relative w-full max-w-md bg-raised border border-ink-faint p-8 ${
            side === "for" ? "shadow-cast-for-deep" : "shadow-cast-against-deep"
          }`}
        >
          <span className="font-label text-[10px] uppercase tracking-[0.2em] text-ink-soft">
            Side lock
          </span>
          <h2
            id="side-lock-title"
            className="font-headline text-3xl font-bold tracking-tight text-ink mt-2"
          >
            You&rsquo;re committing to{" "}
            <span
              className={side === "for" ? "text-side-for" : "text-side-against"}
            >
              {label}
            </span>
            .
          </h2>
          <p className="font-body text-ink-soft mt-4 leading-relaxed">
            You will not be able to argue {opposing} in this debate.
          </p>
          <div className="flex flex-col-reverse sm:flex-row gap-3 mt-8">
            <Button
              variant="outline-neutral"
              size="md"
              className="flex-1"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              autoFocus
              variant={side === "for" ? "outline" : "outline-secondary"}
              size="md"
              className="flex-1"
              onClick={onConfirm}
            >
              Commit to {label}
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default SideLockConfirm;
