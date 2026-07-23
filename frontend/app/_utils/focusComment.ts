"use client";
import { gsap, MOTION_OK } from "./gsap";

// §5 replies live in the OPPOSING column, so following one is a jump across the
// page — you land mid-column with no idea which card you were sent to. Both
// directions of the thread (a reply's quoted stub, and the "↳ N replies" badge
// on the comment being answered) route through here so the landing always
// announces itself the same way.

const FLASH = {
  for: "0 0 0 2px var(--color-primary)",
  against: "0 0 0 2px var(--color-secondary)",
} as const;

export function focusComment(commentId: number) {
  const el = document.getElementById(`comment-${commentId}`);
  if (!el) return;

  const motionOk = window.matchMedia(MOTION_OK).matches;
  el.scrollIntoView({
    behavior: motionOk ? "smooth" : "auto",
    block: "center",
  });
  if (!motionOk) return;

  // The card itself, not the anchor wrapper — the wrapper has no background to
  // ring. Side-tinted so the flash agrees with the column you landed in.
  const card = el.firstElementChild as HTMLElement | null;
  if (!card) return;
  const side = el.dataset.side === "against" ? "against" : "for";
  // The card carries `transition-all`, which would fight GSAP for the shadow
  // and damp the flash into a smear. Suspend it for the duration.
  gsap.set(card, { transition: "none" });
  gsap.fromTo(
    card,
    { boxShadow: "0 0 0 0 transparent" },
    {
      boxShadow: FLASH[side],
      duration: 0.45,
      repeat: 1,
      yoyo: true,
      ease: "power2.out",
      overwrite: "auto",
      // clearProps leaves both of these behind here, and a stranded
      // `transition: none` would cost the card its hover fade for good.
      onComplete: () => {
        card.style.removeProperty("box-shadow");
        card.style.removeProperty("transition");
      },
    },
  );
}
