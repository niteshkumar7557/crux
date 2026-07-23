"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LuCircleUserRound } from "react-icons/lu";
import api from "../axios";
import { useUser } from "../_hooks/useUser";
import Avatar from "./ui/Avatar";
import SearchBar from "./SearchBar";
import Button from "./ui/Button";
import NotificationBell from "./NotificationBell";

const navLinks = [
  { label: "Arena", href: "/" },
  { label: "Domains", href: "/domain?q=all" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Archive", href: "/archive" },
];

const Navbar = () => {
  const pathname = usePathname();
  const user = useUser();
  // the JWT doesn't carry the avatar, so fetch it once we know who's here
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    api
      .get("/user/me")
      .then(({ data }) => {
        if (active) setAvatar(data.user?.avatar ?? null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user]);

  // AvatarEditor announces changes so the navbar updates without a reload
  useEffect(() => {
    const onUpdate = (e: Event) =>
      setAvatar((e as CustomEvent<string | null>).detail);
    window.addEventListener("crux:avatar-updated", onUpdate);
    return () => window.removeEventListener("crux:avatar-updated", onUpdate);
  }, []);

  return (
    <nav className="bg-surface-container-lowest py-3 px-4 md:px-6 flex items-center justify-between gap-2 md:gap-6">
      <div className="flex items-center shrink-0">
        <Link
          className="text-2xl font-headline italic text-primary-container tracking-tighter"
          href={"/"}
        >
          Crux
        </Link>
        <div className="md:flex gap-3 px-10 justify-center items-center hidden">
          {navLinks.map((e, i) => (
            <Link
              href={e.href}
              key={i}
              className={`${pathname === e.href.split("?")[0] ? "text-primary-container cursor-pointer border-b-2 border-primary-container pb-1 font-bold text-sm" : "text-on-surface-variant font-medium cursor-pointer hover:text-primary-container pb-1 transition-colors duration-200 text-sm"}`}
            >
              {e.label}
            </Link>
          ))}
        </div>
      </div>
      <SearchBar />
      <div className="flex items-center gap-3 shrink-0">
        <Button href={user === null ? "/login" : "/statement"} size="sm">
          NEW STATEMENT
        </Button>
        {user && <NotificationBell />}
        <Link
          href={user ? "/profile/me" : "/login"}
          aria-label={user ? "Your profile" : "Log in"}
          className="cursor-pointer text-outline hover:text-primary-container transition-colors"
        >
          {user ? (
            <Avatar
              username={user.username}
              src={avatar}
              size="md"
              className="hover:border-primary/60 transition-colors"
            />
          ) : (
            <LuCircleUserRound size={26} />
          )}
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
