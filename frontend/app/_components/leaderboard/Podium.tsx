import Link from "next/link";
import { LuCrown, LuMedal, LuStar } from "react-icons/lu";
import Avatar from "@/app/_components/ui/Avatar";
import { convertLogicScore } from "@/app/_utils/logicScore";
import type { BoardRow } from "@/app/leaderboard/board";

// The three places, keyed to the three metals.
//
// This used to colour second place with `secondary` and third with `tertiary`
// — which in the new palette are the AGAINST camp and laurel, so the podium
// read as "the negative side came second" and "third place won a prize". The
// metals are their own tokens now (globals.css), shared with the season titles
// on profiles so a rank means the same colour everywhere it appears.
//
// The champion card and the two flanking cards were also near-identical blocks
// of markup maintained twice. One card, three configs.
const PLACES = {
  1: {
    metal: "text-metal-gold",
    metalBg: "bg-metal-gold",
    metalBorder: "border-metal-gold",
    Icon: LuCrown,
    span: "md:col-span-6",
    order: "order-1 md:order-2",
    height: "md:h-[460px]",
    avatar: "2xl" as const,
    name: "text-[clamp(1.8rem,3vw,2.6rem)]",
    numeral: "text-8xl",
  },
  2: {
    metal: "text-metal-silver",
    metalBg: "bg-metal-silver",
    metalBorder: "border-metal-silver",
    Icon: LuMedal,
    span: "md:col-span-3",
    order: "order-2 md:order-1",
    height: "md:h-[380px]",
    avatar: "xl" as const,
    name: "text-2xl",
    numeral: "text-6xl",
  },
  3: {
    metal: "text-metal-bronze",
    metalBg: "bg-metal-bronze",
    metalBorder: "border-metal-bronze",
    Icon: LuStar,
    span: "md:col-span-3",
    order: "order-3",
    height: "md:h-[380px]",
    avatar: "xl" as const,
    name: "text-2xl",
    numeral: "text-6xl",
  },
} as const;

const PodiumCard = ({
  debater,
  place,
  topScore,
  metric,
  showTier,
}: {
  debater: BoardRow;
  place: 1 | 2 | 3;
  topScore: number;
  metric: string;
  showTier: boolean;
}) => {
  const p = PLACES[place];
  const share = topScore > 0 ? (debater.score / topScore) * 100 : 0;
  // The season board carries no career counts, so the stat feet only appear
  // on a board that actually has them to show.
  const hasCounts = debater.motionCount !== undefined;
  const champion = place === 1;

  return (
    <Link
      href={`/profile/${debater.username}`}
      data-reveal
      className={`${p.span} ${p.order}`}
    >
      <div
        className={`relative flex h-full ${p.height} flex-col justify-end border border-ink-faint border-t-2 ${p.metalBorder} bg-band p-8 transition-colors hover:bg-raised ${champion ? "md:p-10" : ""}`}
      >
        <span
          aria-hidden
          className={`absolute right-6 top-5 display-type ${p.numeral} ${p.metal} opacity-15`}
        >
          {String(place).padStart(2, "0")}
        </span>

        <div
          className={`relative mb-7 ${champion ? "mx-auto" : ""} w-fit`}
        >
          <Avatar
            username={debater.username}
            src={debater.avatar}
            size={p.avatar}
            className="plate-arch"
          />
          <span
            className={`absolute -bottom-2 -right-2 ${p.metalBg} p-1 text-paper`}
          >
            <p.Icon className="text-sm" aria-hidden="true" />
          </span>
        </div>

        <div className={champion ? "text-center" : ""}>
          <h2 className={`font-headline ${p.name} leading-tight text-ink`}>
            {debater.name}
          </h2>
          <p
            className={`mt-2 font-label text-[0.6rem] uppercase tracking-[0.24em] ${p.metal}`}
          >
            {showTier
              ? `${convertLogicScore(debater.score).reputation} tier`
              : `${debater.score.toLocaleString("en-US")} logic this season`}
          </p>
        </div>

        <div className="mt-6">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-label text-[0.58rem] uppercase tracking-[0.22em] text-ink-soft">
              {metric}
            </span>
            <span className="font-label text-xs tabular-nums text-ink">
              {debater.score.toLocaleString("en-US")}
            </span>
          </div>
          <div className="mt-2 h-1 w-full bg-ink-wash">
            <div
              className={`h-full ${p.metalBg}`}
              style={{ width: `${share}%` }}
            />
          </div>
        </div>

        {hasCounts && (
          <dl className="mt-6 flex justify-between gap-4 border-t border-ink-faint pt-5">
            <div>
              <dt className="font-label text-[0.58rem] uppercase tracking-[0.2em] text-ink-soft">
                Motions
              </dt>
              <dd className="display-type text-2xl tabular-nums text-ink">
                {debater.motionCount}
              </dd>
            </div>
            <div className="text-right">
              <dt className="font-label text-[0.58rem] uppercase tracking-[0.2em] text-ink-soft">
                Arguments
              </dt>
              <dd className="display-type text-2xl tabular-nums text-ink">
                {debater.argumentCount}
              </dd>
            </div>
          </dl>
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

  return (
    <div className="mb-16 grid grid-cols-1 items-end gap-6 md:grid-cols-12 md:gap-0">
      {([2, 1, 3] as const).map((place) => {
        const debater = top[place - 1];
        if (!debater) return null;
        return (
          <PodiumCard
            key={place}
            debater={debater}
            place={place}
            topScore={topScore}
            metric={metric}
            showTier={showTier}
          />
        );
      })}
    </div>
  );
};

export default Podium;
