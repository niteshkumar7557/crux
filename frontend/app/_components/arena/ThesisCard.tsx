"use client";
import { useUser } from "@/app/_hooks/useUser";
import Button from "@/app/_components/ui/Button";

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
      <Button
        href={user === null ? "/login" : "/statement"}
        size="lg"
        className="relative z-10"
      >
        Initialize Thesis
      </Button>
    </div>
  );
};

export default ThesisCard;
