"use client";
import { useEffect } from "react";
import Button from "@/app/_components/ui/Button";
import Portal from "@/app/_components/ui/Portal";

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
    // Portalled to <body>. Its caller is the composer, a sticky bar with
    // `backdrop-blur-xl`, and a backdrop-filtered ancestor becomes the
    // containing block for `position: fixed` children — so nested here the
    // dialog centred itself inside the 128px composer strip and hung off the
    // bottom of the screen. See ui/Portal.
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
          // The cast takes the side being committed to — the dialog is about
          // one camp, so it stands in that camp's light.
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
          <p className="font-body text-sm text-ink-soft mt-3 leading-relaxed">
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
    </Portal>
  );
};

export default SideLockConfirm;
