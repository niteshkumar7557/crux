import Link from "next/link";
import { LuCrown, LuMedal, LuStar } from "react-icons/lu";
import Avatar from "@/app/_components/ui/Avatar";
import { convertLogicScore } from "@/app/_utils/logicScore";
import type { BoardRow } from "@/app/leaderboard/board";

// The two flanking podium cards mirror each other: silver leans secondary
// (red), bronze leans tertiary (amber).
const SIDE_CARD = {
  2: {
    border: "border-l-4 border-secondary/30",
    accent: "text-secondary",
    bar: "bg-secondary",
    badge: "bg-secondary text-on-secondary",
    watermark: "top-6 right-6",
    Icon: LuMedal,
    order: "order-2 md:order-1",
  },
  3: {
    border: "border-r-4 border-tertiary/30",
    accent: "text-tertiary",
    bar: "bg-tertiary",
    badge: "bg-tertiary text-on-tertiary",
    watermark: "top-6 left-6",
    Icon: LuStar,
    order: "order-3",
  },
} as const;

const PodiumSideCard = ({
  debater,
  place,
  topScore,
  metric,
}: {
  debater: BoardRow;
  place: 2 | 3;
  topScore: number;
  metric: string;
}) => {
  const style = SIDE_CARD[place];
  const share = topScore > 0 ? (debater.score / topScore) * 100 : 0;
  // The season board carries no career counts, so the stat feet only appear
  // on a board that actually has them to show.
  const hasCounts = debater.statementCount !== undefined;
  return (
    <Link
      href={`/profile/${debater.username}`}
      data-reveal
      className={`md:col-span-3 ${style.order}`}
    >
      <div
        className={`bg-surface-container-low p-8 ${style.border} relative h-[380px] flex flex-col justify-end hover:bg-surface-container transition-colors`}
      >
        <div
          className={`absolute ${style.watermark} font-label text-6xl opacity-10 font-bold italic`}
        >
          {String(place).padStart(2, "0")}
        </div>
        <div className="relative w-20 h-20 mb-6">
          <Avatar username={debater.username} src={debater.avatar} size="xl" />
          <div className={`absolute -bottom-2 -right-2 ${style.badge} p-1`}>
            <style.Icon className="text-sm" />
          </div>
        </div>
        <h3 className="font-headline text-2xl italic mb-1 text-on-background">
          {debater.name}
        </h3>
        <div className="flex flex-col gap-1 mb-6">
          <div className="flex justify-between items-baseline">
            <span
              className={`font-label text-[10px] uppercase ${style.accent} tracking-widest`}
            >
              {metric}
            </span>
            <span className="font-label text-xs font-bold text-on-background">
              {debater.score.toLocaleString("en-US")}
            </span>
          </div>
          <div className="w-full h-1 bg-surface-container-highest">
            <div
              className={`h-full ${style.bar}`}
              style={{ width: `${share}%` }}
            ></div>
          </div>
        </div>
        {hasCounts && (
          <div className="flex justify-between items-end">
            <div>
              <span className="block font-label text-[10px] text-outline uppercase">
                Statements
              </span>
              <span className="font-label text-2xl font-bold text-on-background">
                {debater.statementCount}
              </span>
            </div>
            <div className="text-right">
              <span className="block font-label text-[10px] text-outline uppercase">
                Arguments
              </span>
              <span className="font-label text-xl font-bold text-on-background">
                {debater.argumentCount}
              </span>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
};

/** The top three of whichever board is showing. */
const Podium = ({
  top,
  metric,
  showTier,
}: {
  top: BoardRow[];
  metric: string;
  /** All-time only: a tier is a career standing, not a monthly one. */
  showTier: boolean;
}) => {
  const topScore = top[0]?.score ?? 0;
  const champion = top[0];
  const hasCounts = champion.statementCount !== undefined;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-0 mb-16 items-end">
      <PodiumSideCard
        debater={top[1]}
        place={2}
        topScore={topScore}
        metric={metric}
      />

      <Link
        href={`/profile/${champion.username}`}
        data-reveal
        className="md:col-span-6 order-1 md:order-2 z-10"
      >
        <div className="bg-surface-container-high p-12 border-t-4 border-primary shadow-2xl relative h-[460px] flex flex-col justify-end hover:bg-surface-container-highest transition-colors">
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-primary">
            <LuCrown className="text-6xl" aria-hidden="true" />
          </div>
          <div className="absolute top-8 left-8 font-label text-8xl opacity-10 font-bold italic text-primary">
            01
          </div>
          <div className="relative w-32 h-32 mx-auto mb-8">
            <div className="absolute inset-0 bg-primary/20 scale-110"></div>
            <Avatar
              username={champion.username}
              src={champion.avatar}
              size="2xl"
              className="relative z-10"
            />
          </div>
          <div className="text-center">
            <h2 className="font-headline text-4xl italic mb-2 text-on-background">
              {champion.name}
            </h2>
            <span className="font-label text-xs uppercase text-primary tracking-[0.3em] block">
              {showTier
                ? `${convertLogicScore(champion.score).reputation} tier`
                : `${champion.score.toLocaleString("en-US")} logic this season`}
            </span>
            <div
              className={`grid ${hasCounts ? "grid-cols-3" : "grid-cols-1"} gap-4 text-center mt-8 border-t border-outline-variant/30 pt-8`}
            >
              <div>
                <span className="block font-label text-[10px] text-outline uppercase mb-1">
                  {metric}
                </span>
                <span className="font-label text-3xl font-bold text-primary">
                  {champion.score.toLocaleString("en-US")}
                </span>
              </div>
              {hasCounts && (
                <>
                  <div>
                    <span className="block font-label text-[10px] text-outline uppercase mb-1">
                      Statements
                    </span>
                    <span className="font-label text-3xl font-bold text-on-background">
                      {champion.statementCount}
                    </span>
                  </div>
                  <div>
                    <span className="block font-label text-[10px] text-outline uppercase mb-1">
                      Arguments
                    </span>
                    <span className="font-label text-3xl font-bold text-on-background">
                      {champion.argumentCount}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </Link>

      <PodiumSideCard
        debater={top[2]}
        place={3}
        topScore={topScore}
        metric={metric}
      />
    </div>
  );
};

export default Podium;
