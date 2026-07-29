"use client";
import { PiMoonStars, PiSunDim } from "react-icons/pi";

// Light is the printed charter read in daylight; dark is the archive at night.
// The theme itself is applied to <html> before paint by the script in
// app/layout.tsx — this only flips it.
//
// No React state, deliberately. The server cannot know the theme, so any state
// seeded from the DOM renders one icon on the server and the other on the
// client — and `suppressHydrationWarning` does NOT cover descendants, so the
// swapped <path> inside the icon still threw a hydration error on every page.
// Both icons are rendered instead and CSS picks one, which is something the
// server and client always agree on. The label stays true in both states so it
// needs no swapping either.
const ThemeToggle = ({ className = "" }: { className?: string }) => {
  const flip = () => {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("crux-theme", next);
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={flip}
      aria-label="Switch between light and dark mode"
      className={`flex size-9 shrink-0 items-center justify-center rounded-full border border-ink-faint text-ink-soft transition-colors hover:text-ink ${className}`}
    >
      <PiMoonStars size={17} className="dark:hidden" />
      <PiSunDim size={17} className="hidden dark:block" />
    </button>
  );
};

export default ThemeToggle;
