"use client";
import { useEffect } from "react";
import Button from "@/app/_components/ui/Button";

// §4/§14 — the side lock, confirmed BEFORE it binds.
//
// "A strict rule discovered by surprise feels like punishment. The same rule,
// known in advance, feels like a game." The lock is the single most
// irreversible thing a user can do in a debate, so it gets the one modal in
// the product. The season-only loss penalty is stated here too, because §14
// requires it before as well as after.

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
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="side-lock-title"
        className="relative w-full max-w-md bg-surface-container-lowest border border-outline-variant shadow-2xl p-8"
      >
        <span className="font-label text-[10px] uppercase tracking-[0.2em] text-outline">
          Side lock
        </span>
        <h2
          id="side-lock-title"
          className="font-headline text-3xl font-bold tracking-tight text-on-background mt-2"
        >
          You&rsquo;re committing to{" "}
          <span className={side === "for" ? "text-primary" : "text-secondary"}>
            {label}
          </span>
          .
        </h2>
        <p className="font-body text-on-surface-variant mt-4 leading-relaxed">
          You will not be able to argue {opposing} in this debate.
        </p>
        <p className="font-body text-sm text-outline mt-3 leading-relaxed">
          A loss costs 5 points from your season score — never from your
          all-time logic.
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
  );
};

export default SideLockConfirm;
