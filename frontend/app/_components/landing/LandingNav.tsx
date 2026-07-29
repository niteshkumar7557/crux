"use client";
import Link from "next/link";
import Logo from "../ui/Logo";
import ThemeToggle from "../ui/ThemeToggle";
import { PillButton } from "./ui";

const links = [
  { label: "The Rules", href: "#proceedings" },
  { label: "Seasons", href: "#seasons" },
  { label: "The Stage", href: "#stage" },
  { label: "Fair Play", href: "#fair" },
];

const LandingNav = () => {
  return (
    <nav className="sticky top-0 z-50 border-b border-ink-faint bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4 md:px-10">
        <Link href="/" className="text-ink" aria-label="Crux — home">
          <Logo size={26} wordClassName="text-2xl" />
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="font-label text-[0.7rem] uppercase tracking-[0.22em] text-ink-soft transition-colors hover:text-ink"
            >
              {l.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="hidden font-label text-[0.7rem] uppercase tracking-[0.22em] text-ink-soft transition-colors hover:text-ink sm:block"
          >
            Sign in
          </Link>
          <PillButton href="/arena" className="!px-5 !py-2.5">
            Enter the arena
          </PillButton>
        </div>
      </div>
    </nav>
  );
};

export default LandingNav;
