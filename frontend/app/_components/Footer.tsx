import Link from "next/link";
import { CiShare2 } from "react-icons/ci";
import { MdOutlineTerminal } from "react-icons/md";

const Footer = () => {
  return (
    <footer className="bg-surface-container-lowest border-t border-outline-variant/10">
      <div className="flex flex-col md:flex-row justify-between items-center px-10 py-12 w-full gap-8 max-w-screen-2xl mx-auto">
        <div className="flex flex-col gap-4">
          <span className="text-lg font-headline text-on-surface italic">
            Crux
          </span>
          <span className="font-label uppercase tracking-widest text-xs text-outline">
            © 2026 Crux Digital Arena. All Rights Reserved.
          </span>
        </div>
        <div className="flex gap-8">
          <Link
            className="font-label uppercase tracking-widest text-xs text-outline hover:text-primary transition-colors"
            href={"/leaderboard"}
          >
            Leaderboard
          </Link>
          <Link
            className="font-label uppercase tracking-tight text-xs text-outline hover:text-primary transition-colors"
            href={"/rules"}
          >
            Rules of Engagement
          </Link>
          <Link
            className="font-label uppercase tracking-widest text-xs text-outline hover:text-primary transition-colors"
            href={"/about"}
          >
            About
          </Link>
        </div>
        <div className="flex gap-4">
          <button
            type="button"
            aria-label="Developer terminal"
            className="w-8 h-8 flex items-center justify-center bg-surface-container-high border border-outline-variant/30 text-outline hover:text-primary transition-colors cursor-pointer"
          >
            <span className="text-sm">
              <MdOutlineTerminal />
            </span>
          </button>
          <button
            type="button"
            aria-label="Share Crux"
            className="w-8 h-8 flex items-center justify-center bg-surface-container-high border border-outline-variant/30 text-outline hover:text-primary transition-colors cursor-pointer"
          >
            <span className="text-sm">
              <CiShare2 />
            </span>
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
