export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import Link from "next/link";
import serverApi from "@/app/axios.server";
import Button from "@/app/_components/ui/Button";
import Pagination from "@/app/_components/ui/Pagination";
import Reveal from "@/app/_components/ui/Reveal";
import BoardTable from "@/app/_components/leaderboard/BoardTable";
import Podium from "@/app/_components/leaderboard/Podium";
import {
  BOARD_TABS,
  BoardRow,
  BoardTab,
  leaderboardHref,
  metricLabel,
  parseTab,
} from "./board";

export const metadata: Metadata = {
  title: "Leaderboard",
};

type SearchParams = Promise<{ tab?: string; page?: string }>;

interface BoardResponse {
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  pageSize: number;
  season?: number;
  daysLeft?: number;
}

const EMPTY: BoardResponse = { rows: [], total: 0, page: 1, pageSize: 20 };

const chipClass = (active: boolean) =>
  `${active ? "border-primary text-primary bg-primary/5" : "border-outline-variant bg-surface-container text-on-surface-variant"} border px-4 py-2 font-label text-xs uppercase tracking-widest hover:border-primary hover:text-primary transition-colors`;

/** Both endpoints answer with the same envelope; only the score field differs. */
function toRows(res: BoardResponse, tab: BoardTab): BoardRow[] {
  const scoreKey = tab === "season" ? "seasonLogic" : "logicScore";
  return res.rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    username: String(r.username),
    avatar: (r.avatar as string | null) ?? null,
    score: Number(r[scoreKey] ?? 0),
    rank: Number(r.rank),
    ...(tab === "all-time"
      ? {
          statementCount: Number(r.statementCount ?? 0),
          argumentCount: Number(r.argumentCount ?? 0),
        }
      : {}),
  }));
}

const Leaderboard = async ({ searchParams }: { searchParams: SearchParams }) => {
  const { tab: tabParam, page: pageParam } = await searchParams;
  const tab = parseTab(tabParam);
  const parsedPage = Number.parseInt(pageParam ?? "1", 10);
  const requestedPage =
    Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  // The season strip states the window and its prize unconditionally (§14), so
  // the season endpoint is read on both tabs — it is the only source of the
  // season number and the days left.
  let board: BoardResponse = EMPTY;
  let season = { season: 0, daysLeft: 0 };
  try {
    const [boardRes, seasonMeta] = await Promise.all([
      serverApi.get(
        tab === "season" ? "/arena/leaderboard/season" : "/arena/leaderboard",
        { params: { page: requestedPage } },
      ),
      tab === "season"
        ? null
        : serverApi.get("/arena/leaderboard/season", {
            params: { pageSize: 1 },
          }),
    ]);
    if (Array.isArray(boardRes.data?.rows)) board = boardRes.data;
    const meta = seasonMeta?.data ?? boardRes.data;
    season = {
      season: Number(meta?.season ?? 0),
      daysLeft: Number(meta?.daysLeft ?? 0),
    };
  } catch (error) {
    console.error("Failed to load leaderboard data:", error);
  }

  const rows = toRows(board, tab);
  const metric = metricLabel(tab);
  const totalPages = Math.max(Math.ceil(board.total / board.pageSize), 1);

  // The podium is the head of the board, so it only belongs on its first page.
  const showPodium = board.page === 1 && rows.length >= 3;
  const podium = showPodium ? rows.slice(0, 3) : [];
  const rest = showPodium ? rows.slice(3) : rows;

  return (
    <Reveal
      key={`${tab}-${board.page}`}
      className="max-w-7xl mx-auto px-6 py-12"
    >
      <header
        data-reveal
        className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6"
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
            {tab === "season"
              ? "This month's standings. Logic earned since the 1st — everyone started at zero."
              : "Career standings. Every point of logic ever earned, since the beginning."}
          </p>
        </div>
        <div className="flex flex-col md:items-end">
          <span className="font-label text-[10px] text-outline uppercase tracking-widest mb-1">
            Ranked Debaters
          </span>
          <span className="font-label text-4xl text-primary font-bold tracking-tighter">
            {String(board.total).padStart(2, "0")}
          </span>
        </div>
      </header>

      <div data-reveal className="flex flex-wrap gap-2 mb-4">
        {BOARD_TABS.map((t) => (
          <Link
            key={t.slug}
            href={leaderboardHref(t.slug)}
            aria-current={t.slug === tab ? "page" : undefined}
            className={chipClass(t.slug === tab)}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* §14: the season window and its prize are stated unconditionally — an
          empty board is exactly when a newcomer most needs to know the month is
          still winnable. */}
      <p
        data-reveal
        className="mb-12 font-body text-sm text-on-surface-variant border-l-2 border-outline-variant/40 pl-4"
      >
        <span className="font-label text-[10px] uppercase tracking-widest text-outline block mb-1">
          Season {season.season} · {season.daysLeft}{" "}
          {season.daysLeft === 1 ? "day" : "days"} left
        </span>
        The top 3 on the 1st earn a permanent title and avatar frame. The season
        board counts only logic earned this month; the all-time board never
        falls.
      </p>

      {rows.length === 0 ? (
        <div
          data-reveal
          className="bg-surface-container-low border-l-2 border-outline-variant/30 p-12 text-center"
        >
          <p className="font-headline italic text-2xl text-on-surface mb-3">
            {tab === "season"
              ? "Nobody has scored yet this season."
              : "The arena is quiet."}
          </p>
          <p className="font-body text-sm text-outline mb-8">
            {tab === "season"
              ? "The board is wide open. First point taken takes the lead."
              : "No debaters have been ranked yet. Stake the first claim."}
          </p>
          <Button href="/statement" size="lg">
            Start a Debate
          </Button>
        </div>
      ) : (
        <>
          {showPodium && (
            <Podium top={podium} metric={metric} showTier={tab === "all-time"} />
          )}
          {rest.length > 0 && <BoardTable rows={rest} metric={metric} />}
        </>
      )}

      <div data-reveal>
        <Pagination
          page={board.page}
          totalPages={totalPages}
          totalItems={board.total}
          itemLabel={board.total === 1 ? "debater" : "debaters"}
          hrefFor={(p) => leaderboardHref(tab, p)}
        />
      </div>
    </Reveal>
  );
};

export default Leaderboard;
