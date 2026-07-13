"use client";
import { useUser } from "@/app/_hooks/useUser";
import Link from "next/link";

const ThesisCard = () => {
  const user = useUser();

  return (
    <div
      data-reveal
      className="bg-surface-container p-12 text-center border border-outline-variant/10 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent"></div>
      <h2
        className="font-headline text-3xl mb-4 relative z-10 italic"
      >
        Your logic is required in the Arena.
      </h2>
      <p className="font-body text-outline mb-8 max-w-md mx-auto relative z-10 text-sm">
        Join the highest quality discourse on the web. Sharpen your arguments
        and climb the leaderboard.
      </p>
      <Link
        href={user === null ? "/login" : "/statement"}
        className="bg-on-surface text-surface px-10 py-3 font-label uppercase tracking-[0.2em] text-xs font-bold hover:bg-primary transition-colors relative z-10"
      >
        Initialize Thesis
      </Link>
    </div>
  );
};

export default ThesisCard;
