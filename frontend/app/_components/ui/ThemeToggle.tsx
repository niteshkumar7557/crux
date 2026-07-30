"use client";

// Light/dark, persisted to localStorage. See design-system.md §2.

import { PiMoonStars, PiSunDim } from "react-icons/pi";

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
