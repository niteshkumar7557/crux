"use client";

// Scrolls to an argument and flashes it in its side's colour — used by reply links and the case panel.

import { gsap, MOTION_OK } from "./gsap";

const FLASH = {
  for: "0 0 0 2px var(--color-side-for), 0 12px 26px -14px var(--cast-for)",
  against:
    "0 0 0 2px var(--color-side-against), 0 12px 26px -14px var(--cast-against)",
} as const;

const FLASH_OFF = "0 0 0 0 transparent, 0 12px 26px -14px transparent";

const STATIC_HOLD_MS = 1400;

export function focusArgument(argumentId: number) {
  const el = document.getElementById(`argument-${argumentId}`);
  if (!el) return;

  const motionOk = window.matchMedia(MOTION_OK).matches;
  el.scrollIntoView({
    behavior: motionOk ? "smooth" : "auto",
    block: "center",
  });

  const card = el.firstElementChild as HTMLElement | null;
  if (!card) return;
  const side = el.dataset.side === "against" ? "against" : "for";

  if (!motionOk) {
    card.style.boxShadow = FLASH[side];
    window.setTimeout(() => card.style.removeProperty("box-shadow"), STATIC_HOLD_MS);
    return;
  }
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
      onComplete: () => {
        card.style.removeProperty("box-shadow");
        card.style.removeProperty("transition");
      },
    },
  );
}
