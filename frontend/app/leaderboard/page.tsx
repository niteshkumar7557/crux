export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import Link from "next/link";
import { LuCrown, LuMedal, LuStar } from "react-icons/lu";
import serverApi from "@/app/axios.server";
import Avatar from "@/app/_components/ui/Avatar";
import Button from "@/app/_components/ui/Button";
import Reveal from "@/app/_components/ui/Reveal";
import { convertLogicScore } from "@/app/_utils/logicScore";

export const metadata: Metadata = {
  title: "Leaderboard",
};

interface LeaderboardRow {
  id: number;
  name: string;
  username: string;
  avatar: string | null;
  logicScore: number;
  rank: number;
  statementCount: number;
  argumentCount: number;
}

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
}: {
  debater: LeaderboardRow;
  place: 2 | 3;
  topScore: number;
}) => {
  const style = SIDE_CARD[place];
  const share = topScore > 0 ? (debater.logicScore / topScore) * 100 : 0;
  return (
    <Link
      href={`/profile/${debater.id}`}
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
              Logic Score
            </span>
            <span className="font-label text-xs font-bold text-on-background">
              {debater.logicScore.toLocaleString("en-US")}
            </span>
          </div>
          <div className="w-full h-1 bg-surface-container-highest">
            <div
              className={`h-full ${style.bar}`}
              style={{ width: `${share}%` }}
            ></div>
          </div>
        </div>
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
      </div>
    </Link>
  );
};

const Leaderboard = async () => {
  let standings: LeaderboardRow[] = [];
  try {
    const { data } = await serverApi.get("/arena/leaderboard");
    if (Array.isArray(data)) standings = data;
  } catch (error) {
    console.error("Failed to load leaderboard data:", error);
  }

  const hasPodium = standings.length >= 3;
  const podium = hasPodium ? standings.slice(0, 3) : [];
  const rest = hasPodium ? standings.slice(3) : standings;
  const topScore = standings[0]?.logicScore ?? 0;

  return (
    <Reveal className="max-w-7xl mx-auto px-6 py-12">
      <header
        data-reveal
        className="mb-16 flex flex-col md:flex-row justify-between items-start md:items-end gap-6"
      >
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-primary font-label text-xs tracking-[0.2em] uppercase mb-2">
            <span className="w-8 h-px bg-primary"></span>
            Arena Statistics
          </div>
          <h1 className="font-headline text-5xl md:text-7xl font-bold italic tracking-tight text-on-background">
            The Elite Hierarchy
          </h1>
          <p className="mt-4 text-on-surface-variant font-body text-lg max-w-lg leading-relaxed">
            Ranking the most consistent analytical minds in the global arena.
            Logic is the only currency accepted here.
          </p>
        </div>
        <div className="flex flex-col md:items-end">
          <span className="font-label text-[10px] text-outline uppercase tracking-widest mb-1">
            Ranked Debaters
          </span>
          <span className="font-label text-4xl text-primary font-bold tracking-tighter">
            {String(standings.length).padStart(2, "0")}
          </span>
        </div>
      </header>

      {standings.length === 0 ? (
        <div className="bg-surface-container-low border-l-2 border-outline-variant/30 p-12 text-center">
          <p className="font-headline italic text-2xl text-on-surface mb-3">
            The arena is quiet.
          </p>
          <p className="font-body text-sm text-outline mb-8">
            No debaters have been ranked yet. Stake the first claim.
          </p>
          <Button href="/statement" size="lg">
            Start a Debate
          </Button>
        </div>
      ) : (
        <>
          {hasPodium && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-0 mb-16 items-end">
              <PodiumSideCard debater={podium[1]} place={2} topScore={topScore} />

              <Link
                href={`/profile/${podium[0].id}`}
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
                      username={podium[0].username}
                      src={podium[0].avatar}
                      size="2xl"
                      className="relative z-10"
                    />
                  </div>
                  <div className="text-center">
                    <h2 className="font-headline text-4xl italic mb-2 text-on-background">
                      {podium[0].name}
                    </h2>
                    <span className="font-label text-xs uppercase text-primary tracking-[0.3em] block">
                      {convertLogicScore(podium[0].logicScore).reputation} tier
                    </span>
                    <div className="grid grid-cols-3 gap-4 text-center mt-8 border-t border-outline-variant/30 pt-8">
                      <div>
                        <span className="block font-label text-[10px] text-outline uppercase mb-1">
                          Logic Score
                        </span>
                        <span className="font-label text-3xl font-bold text-primary">
                          {podium[0].logicScore.toLocaleString("en-US")}
                        </span>
                      </div>
                      <div>
                        <span className="block font-label text-[10px] text-outline uppercase mb-1">
                          Statements
                        </span>
                        <span className="font-label text-3xl font-bold text-on-background">
                          {podium[0].statementCount}
                        </span>
                      </div>
                      <div>
                        <span className="block font-label text-[10px] text-outline uppercase mb-1">
                          Arguments
                        </span>
                        <span className="font-label text-3xl font-bold text-on-background">
                          {podium[0].argumentCount}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>

              <PodiumSideCard debater={podium[2]} place={3} topScore={topScore} />
            </div>
          )}

          {rest.length > 0 && (
            <div>
              <div className="grid grid-cols-12 px-8 py-4 bg-surface-container-lowest border-b border-outline-variant/30">
                <div className="col-span-2 md:col-span-1 font-label text-[10px] text-outline uppercase tracking-widest">
                  Rank
                </div>
                <div className="col-span-6 md:col-span-5 font-label text-[10px] text-outline uppercase tracking-widest">
                  Debater
                </div>
                <div className="col-span-4 md:col-span-2 font-label text-[10px] text-outline uppercase tracking-widest text-right">
                  Logic Score
                </div>
                <div className="hidden md:block md:col-span-2 font-label text-[10px] text-outline uppercase tracking-widest text-right">
                  Statements
                </div>
                <div className="hidden md:block md:col-span-2 font-label text-[10px] text-outline uppercase tracking-widest text-right">
                  Arguments
                </div>
              </div>
              <div className="space-y-px">
                {rest.map((debater, i) => (
                  <Link
                    key={debater.id}
                    href={`/profile/${debater.id}`}
                    data-reveal
                    className={`grid grid-cols-12 px-8 py-6 ${i % 2 === 0 ? "bg-surface" : "bg-surface-container-lowest"} hover:bg-surface-container-low transition-colors items-center group border-l-2 border-transparent hover:border-primary`}
                  >
                    <div className="col-span-2 md:col-span-1 font-label text-xl font-bold text-outline group-hover:text-primary transition-colors">
                      {String(debater.rank).padStart(2, "0")}
                    </div>
                    <div className="col-span-6 md:col-span-5 flex items-center gap-4 min-w-0">
                      <Avatar
                        username={debater.username}
                        src={debater.avatar}
                        size="lg"
                      />
                      <span className="min-w-0">
                        <span className="block font-headline text-xl italic text-on-background truncate">
                          {debater.name}
                        </span>
                        <span className="block font-label text-[10px] uppercase tracking-widest text-outline truncate">
                          @{debater.username}
                        </span>
                      </span>
                    </div>
                    <div className="col-span-4 md:col-span-2 text-right font-label text-lg font-medium text-on-background">
                      {debater.logicScore.toLocaleString("en-US")}
                    </div>
                    <div className="hidden md:block md:col-span-2 text-right font-label text-lg font-medium text-on-surface-variant">
                      {debater.statementCount}
                    </div>
                    <div className="hidden md:block md:col-span-2 text-right font-label text-lg font-medium text-on-background">
                      {debater.argumentCount}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Reveal>
  );
};

export default Leaderboard;
