"use client";

// Carries data-navbar, and something depends on it: StickyMotion measures this
// element to park itself at the navbar's bottom edge. The height is measured, not
// hardcoded — the row grows at lg and with a wrapping search field.
//
// Below lg the row carries the logo, search and the composer CTA only, and
// everything else moves into the drawer. The full row needs ~1020px: at anything
// narrower it pushed the composer CTA, the bell and the avatar off the right edge
// rather than compressing them — both clusters are `shrink-0`, so there was
// nothing to give. **The switch is at lg, not md, because that is where the row
// actually fits** — an iPad in portrait is 810–834px and was losing controls off
// the right of the screen exactly like a phone was.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LuCircleUserRound, LuMenu, LuX } from "react-icons/lu";
import { PiGithubLogo } from "react-icons/pi";
import { useUser } from "../_hooks/useUser";
import { useAvatar } from "../_hooks/useAvatar";
import Avatar from "./ui/Avatar";
import SearchBar from "./SearchBar";
import Button from "./ui/Button";
import Logo from "./ui/Logo";
import ThemeToggle from "./ui/ThemeToggle";
import NotificationBell from "./NotificationBell";
import DevMessages from "./DevMessages";
import { drawerRow } from "./ui/drawerRow";

const navLinks = [
  { label: "Arena", href: "/arena" },
  { label: "Domains", href: "/domain?q=all" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Archive", href: "/archive" },
];

const GITHUB_URL = "https://github.com/niteshkumar7557/crux";

const Navbar = () => {
  const pathname = usePathname();
  const user = useUser();
  const avatar = useAvatar(user);
  // The route the drawer was opened on, rather than a boolean: a drawer that
  // survives the navigation it just triggered is a drawer covering the page the
  // reader asked for, and deriving it from the pathname closes it without an
  // effect that writes state back on every route change.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const menuOpen = openedOn === pathname;
  const setMenuOpen = (next: boolean) => setOpenedOn(next ? pathname : null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenedOn(null);
    };
    // The two dropdowns the drawer hosts portal their panels to <body>, so a tap
    // inside one lands outside the nav. Their own scrim is what closes them; the
    // drawer must not take that tap as a reason to unmount them.
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (navRef.current?.contains(target)) return;
      if ((target as Element).closest?.("[data-nav-panel]")) return;
      setOpenedOn(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menuOpen]);

  return (
    <nav
      ref={navRef}
      data-navbar
      className="sticky top-0 z-50 border-b border-ink-faint bg-paper/85 backdrop-blur-md"
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3 lg:gap-6 lg:px-6">
        <div className="flex min-w-0 items-center">
          <Link
            className="flex items-center text-ink"
            href={"/arena"}
            aria-label="Crux — home"
          >
            <Logo size={26} wordClassName="text-2xl" />
          </Link>
          {/* Tighter at lg than at xl: the row is still close to its floor just
              above 1024px, and the link group is where the spare width is. */}
          <div className="hidden items-center justify-center gap-6 px-6 lg:flex xl:gap-8 xl:px-10">
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
          {/* Not gated on a session: the composer has a spectator mode that lets
              a signed-out visitor draft a claim and run the Arbiter on it, and
              only asks for a login at the point of broadcasting. */}
          <Button href="/motion/new" size="sm">
            New motion
          </Button>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Crux on GitHub — opens in a new tab"
            className="hidden shrink-0 items-center text-ink-soft transition-colors hover:text-ink lg:flex"
          >
            <PiGithubLogo size={22} />
          </a>
          <ThemeToggle className="hidden lg:flex" />
          <span className="hidden lg:flex">
            {user && <DevMessages user={user} avatar={avatar} />}
          </span>
          <span className="hidden lg:flex">
            {user && <NotificationBell />}
          </span>
          <Link
            href={user ? "/profile/me" : "/login"}
            aria-label={user ? "Your profile" : "Log in"}
            className="hidden cursor-pointer text-ink-soft transition-colors hover:text-ink lg:block"
          >
            {user ? (
              <Avatar username={user.username} src={avatar} size="md" />
            ) : (
              <LuCircleUserRound size={26} />
            )}
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="flex shrink-0 items-center text-ink-soft transition-colors hover:text-ink lg:hidden"
          >
            {menuOpen ? <LuX size={24} /> : <LuMenu size={24} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="absolute inset-x-0 top-full border-b border-ink-faint bg-paper py-2 shadow-cast lg:hidden">
          {navLinks.map((link) => {
            const active = pathname === link.href.split("?")[0];
            return (
              <Link
                href={link.href}
                key={link.href}
                aria-current={active ? "page" : undefined}
                className={drawerRow(active)}
              >
                {link.label}
              </Link>
            );
          })}

          <span aria-hidden className="my-2 block h-px bg-ink-faint" />

          {user ? (
            <>
              <DevMessages user={user} avatar={avatar} variant="row" />
              <NotificationBell variant="row" />
              <Link href="/profile/me" className={drawerRow()}>
                <Avatar username={user.username} src={avatar} size="sm" />
                Your profile
              </Link>
            </>
          ) : (
            <Link href="/login" className={drawerRow()}>
              <LuCircleUserRound size={18} className="shrink-0" />
              Log in
            </Link>
          )}

          <span aria-hidden className="my-2 block h-px bg-ink-faint" />

          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={drawerRow()}
          >
            <PiGithubLogo size={18} className="shrink-0" />
            Source on GitHub
            <span className="sr-only"> — opens in a new tab</span>
          </a>

          <div className={`${drawerRow()} hover:bg-transparent hover:text-ink-soft`}>
            Appearance
            <span className="ml-auto">
              <ThemeToggle />
            </span>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
