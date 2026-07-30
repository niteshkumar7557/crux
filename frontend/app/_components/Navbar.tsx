"use client";

// Carries data-navbar, and something depends on it: StickyMotion measures this
// element to park itself at the navbar's bottom edge. The height is measured, not
// hardcoded — the row grows at md and with a wrapping search field.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LuCircleUserRound } from "react-icons/lu";
import { useUser } from "../_hooks/useUser";
import { useAvatar } from "../_hooks/useAvatar";
import Avatar from "./ui/Avatar";
import SearchBar from "./SearchBar";
import Button from "./ui/Button";
import Logo from "./ui/Logo";
import ThemeToggle from "./ui/ThemeToggle";
import NotificationBell from "./NotificationBell";
import DevMessages from "./DevMessages";

const navLinks = [
  { label: "Arena", href: "/arena" },
  { label: "Domains", href: "/domain?q=all" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Archive", href: "/archive" },
];

const Navbar = () => {
  const pathname = usePathname();
  const user = useUser();
  const avatar = useAvatar(user);

  return (
    <nav
      data-navbar
      className="sticky top-0 z-50 border-b border-ink-faint bg-paper/85 backdrop-blur-md"
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3 md:gap-6 md:px-6">
        <div className="flex items-center shrink-0">
          <Link
            className="flex items-center text-ink"
            href={"/arena"}
            aria-label="Crux — home"
          >
            <Logo size={26} wordClassName="text-2xl" />
          </Link>
          <div className="hidden items-center justify-center gap-8 px-10 md:flex">
            {navLinks.map((link) => {
              const active = pathname === link.href.split("?")[0];
              return (
                <Link
                  href={link.href}
                  key={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative font-label text-[0.7rem] uppercase tracking-[0.22em] transition-colors after:absolute after:inset-x-0 after:-bottom-1.5 after:h-px after:content-[''] ${
                    active
                      ? "text-ink after:bg-ink"
                      : "text-ink-soft hover:text-ink after:bg-transparent"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
          <SearchBar />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button href={user === null ? "/login" : "/motion/new"} size="sm">
            New motion
          </Button>
          <ThemeToggle className="hidden sm:flex" />
          {user && <DevMessages user={user} avatar={avatar} />}
          {user && <NotificationBell />}
          <Link
            href={user ? "/profile/me" : "/login"}
            aria-label={user ? "Your profile" : "Log in"}
            className="cursor-pointer text-ink-soft transition-colors hover:text-ink"
          >
            {user ? (
              <Avatar username={user.username} src={avatar} size="md" />
            ) : (
              <LuCircleUserRound size={26} />
            )}
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
