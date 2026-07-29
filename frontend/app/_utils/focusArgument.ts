"use client";
import { gsap, MOTION_OK } from "./gsap";

// §5 replies live in the OPPOSING column, so following one is a jump across the
// page — you land mid-column with no idea which card you were sent to. Both
// directions of the thread (a reply's quoted stub, and the "↳ N replies" badge
// on the argument being answered) route through here so the landing always
// announces itself the same way.

// A ring in the argument's own camp colour, plus a soft cast of the same hue so
// the card lifts as it is called out.
//
// These read `--color-side-for` / `--color-side-against`, the tokens this
// palette actually defines. They used to read `--color-primary` and
// `--color-secondary`, which were the old Material palette's names and have not
// existed since the debate-hall system rolled out — an undefined custom
// property makes the whole `box-shadow` declaration invalid, so every jump
// landed with no highlight at all. Any colour used here must come from
// `globals.css`.
const FLASH = {
  for: "0 0 0 2px var(--color-side-for), 0 12px 26px -14px var(--cast-for)",
  against:
    "0 0 0 2px var(--color-side-against), 0 12px 26px -14px var(--cast-against)",
} as const;

/** The same shadow with every layer transparent — the tween's start state.
 *
 *  It has to match FLASH layer for layer. GSAP interpolates `box-shadow` one
 *  layer at a time, and given a one-layer start against a two-layer end it
 *  invents the missing layer's origin: the glow swept in from a ~245px offset
 *  before settling, which read as a grey blob crossing the card. */
const FLASH_OFF = "0 0 0 0 transparent, 0 12px 26px -14px transparent";

/** How long the ring stays put when the viewer has asked for reduced motion. */
const STATIC_HOLD_MS = 1400;

export function focusArgument(argumentId: number) {
  const el = document.getElementById(`argument-${argumentId}`);
  if (!el) return;

  const motionOk = window.matchMedia(MOTION_OK).matches;
  el.scrollIntoView({
    behavior: motionOk ? "smooth" : "auto",
    block: "center",
  });

  // The card itself, not the anchor wrapper — the wrapper has no background to
  // ring. Side-tinted so the flash agrees with the column you landed in.
  const card = el.firstElementChild as HTMLElement | null;
  if (!card) return;
  const side = el.dataset.side === "against" ? "against" : "for";

  // Reduced motion still gets the highlight — it is what tells you which card
  // you were sent to. It just arrives and leaves instead of pulsing.
  if (!motionOk) {
    card.style.boxShadow = FLASH[side];
    window.setTimeout(() => card.style.removeProperty("box-shadow"), STATIC_HOLD_MS);
    return;
  }
  // The card carries `transition-all`, which would fight GSAP for the shadow
  // and damp the flash into a smear. Suspend it for the duration.
  gsap.set(card, { transition: "none" });
  gsap.fromTo(
    card,
    { boxShadow: FLASH_OFF },
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
