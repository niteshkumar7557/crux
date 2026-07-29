export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import Link from "next/link";
import serverApi from "@/app/axios.server";
import Button from "@/app/_components/ui/Button";
import Pagination from "@/app/_components/ui/Pagination";
import Reveal from "@/app/_components/ui/Reveal";
import BoardTable from "@/app/_components/leaderboard/BoardTable";
import Podium from "@/app/_components/leaderboard/Podium";
import SeasonCountdown from "@/app/_components/leaderboard/SeasonCountdown";
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
  endsAt?: string;
}

const EMPTY: BoardResponse = { rows: [], total: 0, page: 1, pageSize: 20 };

const chipClass = (active: boolean) =>
  `${active ? "border-ink text-ink bg-ink/5" : "border-ink-faint bg-band text-ink-soft"} border px-4 py-2 font-label text-xs uppercase tracking-widest hover:border-ink hover:text-ink transition-colors`;

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
          motionCount: Number(r.motionCount ?? 0),
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
  let season = { season: 0, endsAt: "" };
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
      // The season boundary is the backend's to state (§10). Without it the
      // clock simply does not render — a countdown the client invented for
      // itself would be a second, competing answer.
      endsAt: String(meta?.endsAt ?? ""),
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
          <div className="flex items-center gap-2 text-ink font-label text-xs tracking-[0.2em] uppercase mb-2">
            <span className="w-8 h-px bg-ink"></span>
            Arena Statistics
          </div>
          <h1 className="font-headline text-5xl md:text-7xl font-bold italic tracking-tight text-ink">
            The Elite Hierarchy
          </h1>
          <p className="mt-4 text-ink-soft font-body text-lg max-w-lg leading-relaxed">
            {tab === "season"
              ? "This month's standings. Logic earned since the 1st — everyone started at zero."
              : "Career standings. Every point of logic ever earned, since the beginning."}
          </p>
        </div>
        {season.endsAt && (
          <SeasonCountdown endsAt={season.endsAt} season={season.season} />
        )}
      </header>

      {/* The board's own controls: which board on the left, how deep it goes on
          the right, on one line. */}
      <div
        data-reveal
        className="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3"
      >
        <div className="flex flex-wrap gap-2">
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
        <div className="flex items-center gap-3">
          <span className="font-label text-xl font-bold leading-none tabular-nums tracking-tighter text-ink">
            {String(board.total).padStart(2, "0")}
          </span>
          <span className="font-label text-[10px] uppercase tracking-widest text-ink-soft">
            Ranked Debaters
          </span>
        </div>
      </div>

      {/* §14: the season window and its prize are stated unconditionally — an
          empty board is exactly when a newcomer most needs to know the month is
          still winnable. */}
      <p
        data-reveal
        className="mb-12 font-body text-sm text-ink-soft border-l-2 border-ink-faint pl-4"
      >
        <span className="font-label text-[10px] uppercase tracking-widest text-ink-soft block mb-1">
          Season {season.season} · closes at month end, UTC
        </span>
        The top 3 on the 1st earn a permanent title and avatar frame. The season
        board counts only logic earned this month; the all-time board never
        falls.
      </p>

      {rows.length === 0 ? (
        <div
          data-reveal
          className="bg-band border-l-2 border-ink-faint p-12 text-center"
        >
          <p className="font-headline italic text-2xl text-ink mb-3">
            {tab === "season"
              ? "Nobody has scored yet this season."
              : "The arena is quiet."}
          </p>
          <p className="font-body text-sm text-ink-soft mb-8">
            {tab === "season"
              ? "The board is wide open. First point taken takes the lead."
              : "No debaters have been ranked yet. Stake the first claim."}
          </p>
          <Button href="/motion/new" size="lg">
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
