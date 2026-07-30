// Site footer and the laurel seal.

import Link from "next/link";
import Logo from "./ui/Logo";

const links = [
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Rules of Engagement", href: "/rules" },
  { label: "About", href: "/about" },
];

const Footer = () => {
  return (
    <footer className="border-t border-ink-faint bg-paper">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col items-center justify-between gap-8 px-10 py-12 md:flex-row">
        <div className="flex flex-col items-center gap-3 md:items-start">
          <Logo size={22} wordClassName="text-lg" className="text-ink" />
          <span className="font-label text-[0.65rem] uppercase tracking-[0.22em] text-ink-soft">
            © 2026 Crux Digital Arena. All rights reserved.
          </span>
        </div>
        <nav className="flex flex-wrap justify-center gap-x-8 gap-y-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-label text-[0.65rem] uppercase tracking-[0.22em] text-ink-soft transition-colors hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
