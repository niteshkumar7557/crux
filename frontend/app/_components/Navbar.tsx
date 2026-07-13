"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CgProfile } from "react-icons/cg";
import { useUser } from "../_hooks/useUser";
import SearchBar from "./SearchBar";

const navLinks = [
  { label: "Arena", href: "/" },
  { label: "Leaderboard", href: "/leaderboard" },
];

const Navbar = () => {
  const pathname = usePathname();
  const user = useUser();
  return (
    <div className="bg-neutral-950 py-3 px-6 flex items-start justify-between">
      <div className="flex">
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
              className={`${pathname === e.href ? "text-primary-container cursor-pointer border-b-2 border-primary-container pb-1 font-bold text-sm" : "text-neutral-400 font-medium cursor-pointer hover:text-primary-container pb-1 transition-colors duration-200 text-sm"}`}
            >
              {e.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <SearchBar />
        {/* <div className="hidden lg:flex items-center bg-surface-container-low border border-outline-variant/30 px-3 py-1.5 gap-2">
          <span className="material-symbols-outlined text-outline text-sm">
            <IoMdSearch />
          </span>
          <input
            className="bg-transparent border-none focus:ring-0 text-sm w-48 font-body"
            placeholder="Search statements..."
            type="text"
          />
        </div> */}
        <Link
          href={user === null ? "/login" : "/statement"}
          className="bg-primary text-on-primary mx-2 px-4 py-2 font-label uppercase tracking-widest text-xs font-bold hover:bg-primary-container active:scale-95 transition-all duration-100"
        >
          NEW STATEMENT
        </Link>
        {/* <span className="cursor-pointer text-gray-500 hover:text-primary-container transition-colors">
          <IoIosNotificationsOutline size={31} />
        </span> */}
        <Link
          href={user ? `/profile/${user.id}` : "/login"}
          className={`cursor-pointer ${pathname === "/profile" ? "border-b-2 border-primary-container pb-1 text-primary-container" : ""} text-gray-500 hover:text-primary-container transition-colors`}
        >
          <CgProfile size={26} />
        </Link>
      </div>
    </div>
  );
};

export default Navbar;
