"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CgProfile } from "react-icons/cg";
import { useUser } from "../_hooks/useUser";
import SearchBar from "./SearchBar";
import Button from "./ui/Button";

const navLinks = [
  { label: "Arena", href: "/" },
  { label: "Leaderboard", href: "/leaderboard" },
];

const Navbar = () => {
  const pathname = usePathname();
  const user = useUser();
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
              className={`${pathname === e.href ? "text-primary-container cursor-pointer border-b-2 border-primary-container pb-1 font-bold text-sm" : "text-on-surface-variant font-medium cursor-pointer hover:text-primary-container pb-1 transition-colors duration-200 text-sm"}`}
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
        <Link
          href={user ? `/profile/${user.id}` : "/login"}
          className={`cursor-pointer ${pathname === "/profile" ? "border-b-2 border-primary-container pb-1 text-primary-container" : ""} text-outline hover:text-primary-container transition-colors`}
        >
          <CgProfile size={26} />
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
