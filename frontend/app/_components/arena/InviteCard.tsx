"use client";

// Signed-out prompt in the sidebar.

import { useUser } from "@/app/_hooks/useUser";
import Button from "@/app/_components/ui/Button";

const InviteCard = () => {
  const user = useUser();

  return (
    <aside
      data-reveal
      className="mt-5 border border-ink-faint bg-band px-8 py-16 text-center"
    >
      <p className="flex items-center justify-center gap-3 font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink-soft">
        <span aria-hidden className="h-px w-8 bg-ink-faint" />
        The floor is open
      </p>
      <h2 className="mx-auto mt-5 max-w-xl display-type text-[clamp(1.8rem,3.6vw,2.6rem)] text-ink">
        Your logic is required in the arena
      </h2>
      <p className="mx-auto mt-5 max-w-md font-headline text-base leading-relaxed text-ink-soft">
        Join the highest quality discourse on the web. Sharpen your arguments
        and climb the leaderboard.
      </p>
      <Button
        href={user === null ? "/login" : "/motion/new"}
        size="lg"
        className="mt-9"
      >
        Start a debate
      </Button>
    </aside>
  );
};

export default InviteCard;
