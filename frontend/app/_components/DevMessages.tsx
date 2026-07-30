"use client";
import { useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { LuX } from "react-icons/lu";
import { PiChatCircle, PiChatCircleFill, PiPaperPlaneRight } from "react-icons/pi";
import api from "../axios";
import { jwtPayload } from "../_types/jwt";
import AutoGrowTextarea from "./ui/AutoGrowTextarea";
import Avatar from "./ui/Avatar";
import Skeleton from "./ui/Skeleton";

type DevMessage = {
  id: number;
  sender: "user" | "dev";
  body: string;
  created_at: string;
  /** Client-only: an optimistic row not yet acknowledged by the server. */
  pending?: boolean;
};

/** One side of the thread, as the panel draws it. */
type Participant = { username: string; avatar: string | null };

/**
 * Mirrors DEV_MESSAGE_MAX_CHARS in the backend config. Duplicated rather than
 * fetched: one number, and the alternative is a config round-trip on every page
 * load. If it is raised there, raise it here — the counter is what tells the
 * user the limit exists at all, and a stale one would promise room that the API
 * then refuses.
 */
const MAX_CHARS = 1000;
/** The counter stays hidden until the cap is actually within reach. */
const COUNTER_AT = MAX_CHARS * 0.8;

/**
 * Mirrors DEV_USERNAME, and used only until the first poll answers. The handle
 * is what the header prints, so a blank one would leave the panel briefly
 * addressed to nobody; the server's value always wins once it arrives.
 */
const DEV_HANDLE = "dev_nitesh";

const POLL_CLOSED_MS = 30_000;
/** Faster while open: waiting on a reply is the one moment latency is felt. */
const POLL_OPEN_MS = 10_000;

/** Messages from one sender inside this window share one avatar and one time. */
const GROUP_WINDOW_MS = 10 * 60_000;

// A thread is grouped, not a flat log: a run of messages from one side is drawn
// once — one avatar, one time, corners closed up between the bubbles. A tracked
// timestamp under every single bubble turned the metadata into a second column
// of text competing with the words.
type Row =
  | { kind: "day"; key: string; label: string }
  | { kind: "group"; key: string; sender: "user" | "dev"; items: DevMessage[] };

const dayKey = (iso: string) => new Date(iso).toDateString();

const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    // A thread that crosses a new year would otherwise print two identical
    // "3 January" rules a year apart.
    ...(d.getFullYear() === today.getFullYear() ? {} : { year: "numeric" }),
  });
};

/** A clock time, not `timeAgo`. The day rule already carries the date, and
 *  "7 hours ago" is a sentence — it does not fit a tracked micro-label. */
const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

function buildRows(items: DevMessage[]): Row[] {
  const rows: Row[] = [];
  let day = "";
  let group: Extract<Row, { kind: "group" }> | null = null;

  for (const m of items) {
    const k = dayKey(m.created_at);
    if (k !== day) {
      day = k;
      rows.push({ kind: "day", key: `d-${k}`, label: dayLabel(m.created_at) });
      // A new day always starts a fresh run, however close the two messages are.
      group = null;
    }
    const last = group?.items[group.items.length - 1];
    const near =
      last !== undefined &&
      new Date(m.created_at).getTime() - new Date(last.created_at).getTime() <
        GROUP_WINDOW_MS;

    if (group && group.sender === m.sender && near) {
      group.items.push(m);
    } else {
      group = { kind: "group", key: `g-${m.id}`, sender: m.sender, items: [m] };
      rows.push(group);
    }
  }
  return rows;
}

// A deliberate near-twin of NotificationBell. The bell is the game — verdicts,
// challengers, season titles. This is the developer. Two different kinds of
// event, announced separately, so neither buries the other.
//
// The channel exists because the product has no edit button: a user who spots a
// typo in their own motion or argument has no other recourse, and the empty
// state says so out loud.
//
// `user` and `avatar` are passed down rather than re-fetched: the navbar that
// renders this already holds both, and `useAvatar` would otherwise fire a second
// /user/me on every page load to learn something one component up already knows.
const DevMessages = ({
  user,
  avatar,
}: {
  user: jwtPayload;
  avatar: string | null;
}) => {
  const [items, setItems] = useState<DevMessage[]>([]);
  const [dev, setDev] = useState<Participant>({
    username: DEV_HANDLE,
    avatar: null,
  });
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Until the first request settles there is no way to tell an empty thread from
  // an unloaded one, and rendering the empty state on the guess flashed
  // "send the first message" at everyone, every open.
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  // Server rows replace local ones wholesale, so an optimistic message is
  // reconciled by the next poll rather than merged by hand.
  const load = () =>
    api
      .get("/messages")
      .then(({ data }) => {
        setItems(data.items ?? []);
        setUnread(data.unread ?? 0);
        // Held by value, not by reference: the developer's handle and portrait
        // are the same on every poll, and a fresh object each time would rerender
        // the whole thread twice a minute for nothing.
        setDev((prev) => {
          const next: Participant | undefined = data.dev;
          if (!next) return prev;
          return prev.username === next.username && prev.avatar === next.avatar
            ? prev
            : next;
        });
      })
      .catch(() => {})
      .finally(() => setLoaded(true));

  useEffect(() => {
    load();
    const t = setInterval(load, open ? POLL_OPEN_MS : POLL_CLOSED_MS);
    return () => clearInterval(t);
  }, [open]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // A thread reads oldest-first, so the useful end is the bottom one. Without
  // this, opening a long conversation lands you on its first message.
  //
  // Keyed on the count, not on `items`: every poll builds a fresh array even
  // when nothing changed, and depending on the array pulled the thread back to
  // the bottom every ten seconds while someone was reading history.
  const count = items.length;
  useEffect(() => {
    if (!open) return;
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, count]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      await api.post("/messages/read").catch(() => {});
      setUnread(0);
    }
  };

  const send = async () => {
    const body = draft.trim();
    if (body.length === 0 || body.length > MAX_CHARS || sending) return;

    // Optimistic, with a negative id so it cannot collide with a real row.
    const temp: DevMessage = {
      id: -Date.now(),
      sender: "user",
      body,
      created_at: new Date().toISOString(),
      pending: true,
    };
    setItems((prev) => [...prev, temp]);
    setDraft("");
    setError(null);
    setSending(true);

    try {
      const { data } = await api.post("/messages", { body });
      setItems((prev) => prev.map((m) => (m.id === temp.id ? data.item : m)));
    } catch (err) {
      // The draft goes back into the composer rather than being discarded —
      // losing what someone just wrote is worse than making them press send
      // twice. It is said out loud too: the old panel restored the text and
      // explained nothing, which reads as the composer eating the message.
      setItems((prev) => prev.filter((m) => m.id !== temp.id));
      setDraft(body);
      setError(
        isAxiosError(err) && err.response?.status === 429
          ? (err.response.data?.message ??
            "You're sending these fast. Try again in a minute.")
          : "That didn't send. Your message is back in the box — try again.",
      );
    } finally {
      setSending(false);
    }
  };

  const over = draft.length > MAX_CHARS;
  const canSend = draft.trim().length > 0 && !over && !sending;
  const rows = buildRows(items);
  const me: Participant = { username: user.username, avatar };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label="Talk to the developer"
        aria-expanded={open}
        // Matches the bell exactly: `flex` because an inline <svg> rides on a
        // text baseline and the descender space pushes it high of the nav row,
        // and the last 2px are a transform because `items-center` folds a
        // margin into its centring and only moves the icon half as far.
        className={`relative flex translate-y-[2px] cursor-pointer items-center transition-colors ${
          open ? "text-ink" : "text-ink-soft hover:text-ink"
        }`}
      >
        {/* The same outline/solid reasoning as the bell: open is a state the
            icon should show, and `fill-current` on a stroked glyph closes up
            the drawing into a blob. Phosphor ships the solid cut. */}
        {open ? <PiChatCircleFill size={22} /> : <PiChatCircle size={22} />}
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-ink text-paper text-[9px] font-bold leading-none px-1 py-0.5 min-w-[16px] text-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        // `bg-raised` and a deep cast, because the panel was disappearing into
        // the page. It used to copy the notification panel's `bg-band`, which is
        // that panel's documented exception (§5) and one step *darker* than
        // `paper` in light mode — a floating sheet a shade below the page it
        // floats over reads as part of it. On `raised` the panel is now the
        // lightest thing on screen, which is also the system's actual rule for
        // anything carrying a cast, and the bubbles supply their own contrast
        // rather than needing a darker sheet to sit on.
        //
        // A flex column, unlike the bell's single scrolling box: the composer has
        // to stay reachable no matter how long the thread runs, so only the
        // thread scrolls. Two rem wider than the bell — a conversation needs
        // more line than a list of one-line notices.
        <div className="absolute right-0 mt-4 flex max-h-136 w-104 max-w-[calc(100vw-2rem)] flex-col border border-ink-faint bg-raised shadow-cast-deep z-50">
          {/* The thread header names who is on the other end, the way any DM
              header does. It replaces the four-line paragraph that used to sit
              here explaining the channel — that copy now opens the empty state,
              where it is an invitation rather than a standing notice. */}
          <div className="flex shrink-0 items-center gap-2.5 border-b border-ink-faint px-3.5 py-2.5">
            <Avatar
              username={dev.username}
              src={dev.avatar}
              size="md"
              className="rounded-full"
            />
            <div className="min-w-0 grow">
              <p className="font-label text-[11px] uppercase tracking-[0.2em] text-ink">
                Talk to the developer
              </p>
              <p className="truncate font-label text-[10px] tracking-[0.12em] text-ink-soft">
                @{dev.username}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close messages"
              className="flex shrink-0 items-center text-ink-soft hover:text-ink transition-colors cursor-pointer"
            >
              <LuX size={16} />
            </button>
          </div>

          <div ref={threadRef} className="grow overflow-y-auto px-3.5 py-4">
            {!loaded ? (
              // Shaped like the thread it is about to become — an avatar and a
              // bubble, from each side.
              <div className="flex flex-col gap-4">
                <div className="flex items-end gap-2">
                  <Skeleton className="size-6 rounded-full" />
                  <Skeleton className="h-12 w-[64%] rounded-[1.15rem]" />
                </div>
                <div className="flex flex-row-reverse items-end gap-2">
                  <Skeleton className="size-6 rounded-full" />
                  <Skeleton className="h-8 w-[50%] rounded-[1.15rem]" />
                </div>
              </div>
            ) : items.length === 0 ? (
              // An empty screen is an invitation to act, so it opens with the
              // action and then says what the channel is for.
              <div className="px-2 py-10 text-center">
                <p className="font-body text-[0.95rem] leading-relaxed text-ink">
                  Send the first message.
                </p>
                <p className="mt-2 font-body text-[0.85rem] leading-relaxed text-ink-soft">
                  Feedback, a suggestion, or a fix you need. There&rsquo;s no
                  edit button yet, so a typo in a motion or an argument gets
                  corrected here.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {rows.map((r) =>
                  r.kind === "day" ? (
                    // Only drawn where the day actually turns, so a thread
                    // inside one afternoon never sees one.
                    <div key={r.key} className="flex items-center gap-3">
                      <span className="h-px grow bg-ink-faint" />
                      <span className="font-label text-[9px] uppercase tracking-[0.2em] text-ink-soft">
                        {r.label}
                      </span>
                      <span className="h-px grow bg-ink-faint" />
                    </div>
                  ) : (
                    <Group
                      key={r.key}
                      sender={r.sender}
                      items={r.items}
                      who={r.sender === "user" ? me : dev}
                    />
                  ),
                )}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-ink-faint px-3.5 py-3">
            {error && (
              // The composer's own notice, terracotta-ruled like the debate
              // composer's — a send that failed is stated where it failed, not
              // left for the user to infer from reappearing text.
              <div className="mb-2 flex items-start gap-2 border-l-2 border-side-against bg-ink-wash px-2.5 py-2">
                <p className="grow font-body text-[0.8rem] leading-snug text-ink-soft">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  aria-label="Dismiss"
                  className="mt-0.5 shrink-0 text-ink-soft hover:text-ink transition-colors cursor-pointer"
                >
                  <LuX size={12} />
                </button>
              </div>
            )}
            {/* The composer is a surface with an edge and a focus state. It used
                to be a transparent textarea with `outline-none` and nothing put
                back, so the one control in the panel had no resting shape and no
                keyboard focus at all. `bg-band` on a `raised` panel: one tone
                down reads as recessed in both themes, which is what an input
                should look like. */}
            <div className="flex items-end gap-2 rounded-[1.15rem] border border-ink-faint bg-band px-3 py-2 transition-colors focus-within:border-ink">
              <AutoGrowTextarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  // Enter sends, Shift+Enter breaks the line. Guarded on
                  // `isComposing`: mid-IME-composition, Enter is committing a
                  // character, not finishing a sentence.
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    void send();
                  }
                }}
                maxHeight={120}
                placeholder="Feedback, a suggestion, or a typo to fix…"
                aria-label="Message to the developer"
                data-focus-ring="self"
                className="grow bg-transparent font-body text-[0.9rem] leading-relaxed text-ink placeholder:text-ink-soft focus:outline-none"
              />
              {/* Not optional polish: this panel lives in the nav at every
                  breakpoint, and on a phone the return key inserts a newline.
                  Without a button the thread could be read but never answered.
                  Sized to the composer's line box — bottom-aligned beside a
                  single line of 0.9rem serif, a 32px circle left the text
                  sitting visibly low in the row. */}
              <button
                type="button"
                onClick={() => void send()}
                disabled={!canSend}
                aria-label="Send message"
                className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-ink text-paper transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
              >
                <PiPaperPlaneRight size={14} />
              </button>
            </div>
            <div className="mt-1.5 flex items-center gap-3">
              <span className="font-label text-[10px] uppercase tracking-[0.15em] text-ink-soft">
                Enter to send
              </span>
              <span className="grow" />
              {/* Hidden until the cap is in reach, then it stays. A counter
                  sitting at 4 / 1000 is noise; one appearing at 800 is the
                  warning the limit exists. */}
              {draft.length >= COUNTER_AT && (
                <span
                  className={`font-label text-[10px] tabular-nums tracking-[0.15em] ${
                    over ? "text-side-against" : "text-ink-soft"
                  }`}
                >
                  {draft.length} / {MAX_CHARS}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/** The bubble's resting radius, and the radius its sender-side corners close to
 *  where another bubble from the same side is stacked against them.
 *
 *  Rounded bubbles are a deliberate exception to the system's square corners,
 *  requested by the owner. They are at least the right *family* of exception:
 *  a pill is one of the two shapes the system already allows (§5), and a
 *  single-line bubble at this radius is one. */
const BUBBLE_R = "rounded-[1.15rem]";
const CLOSED_R = "0.3rem";

/** One run of messages from one side — one avatar, one time, corners closed up
 *  between the bubbles.
 *
 *  The two voices are separated by fill, the way a chat separates them: yours is
 *  a forest bubble with cream text, the developer's is the mid paper tone. Both
 *  used to be hairline boxes one paper step apart, which is two tones nobody can
 *  tell apart, with no attribution at all — the avatars now carry who is
 *  speaking, so nothing has to be labelled.
 *
 *  The outgoing fill is `--bubble-own`, deliberately not `--ink`. Ink inverts to
 *  cream at night, so `bg-ink` made a user's own messages the brightest blocks on
 *  a dark screen. The token holds one identity across both themes. */
const Group = ({
  sender,
  items,
  who,
}: {
  sender: "user" | "dev";
  items: DevMessage[];
  who: Participant;
}) => {
  const mine = sender === "user";
  const last = items[items.length - 1];

  return (
    <div className="flex flex-col">
      {/* The avatars are `aria-hidden` decoration, and the visible name labels
          are gone now that they carry identity — so the attribution a sighted
          reader gets from the portrait and the alignment has to be said out loud
          somewhere. Once per run, like everything else here. */}
      <span className="sr-only">
        {mine ? "You wrote:" : `@${who.username} wrote:`}
      </span>
      {/* `items-end` puts the avatar beside the last bubble of the run, which is
          where a grouped thread expects it. */}
      <div
        className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : "flex-row"}`}
      >
        <Avatar
          username={who.username}
          src={who.avatar}
          size="sm"
          className="rounded-full"
        />
        <div
          className={`flex min-w-0 max-w-[78%] flex-col gap-0.5 ${
            mine ? "items-end" : "items-start"
          }`}
        >
          {items.map((m, i) => (
            <div
              key={m.id}
              // Flat fills, no per-bubble shadow: the cast belongs to the panel,
              // not to its contents.
              className={`${BUBBLE_R} px-3.5 py-2 transition-opacity ${
                mine
                  ? "bg-bubble-own text-bubble-own-ink"
                  : "bg-band text-ink"
              } ${m.pending ? "opacity-55" : ""}`}
              // Inline rather than Tailwind corner utilities: an all-corners
              // `rounded-*` and a per-corner override write the same shorthand
              // property, and which one wins depends on their order in the
              // generated stylesheet rather than on this file.
              style={{
                ...(i > 0
                  ? mine
                    ? { borderTopRightRadius: CLOSED_R }
                    : { borderTopLeftRadius: CLOSED_R }
                  : {}),
                ...(i < items.length - 1
                  ? mine
                    ? { borderBottomRightRadius: CLOSED_R }
                    : { borderBottomLeftRadius: CLOSED_R }
                  : {}),
              }}
            >
              <p className="font-body text-[0.9rem] leading-relaxed whitespace-pre-wrap break-words">
                {m.body}
              </p>
            </div>
          ))}
        </div>
      </div>
      {/* Indented past the avatar gutter (24px + 8px gap) so it lines up with
          the bubble column rather than the portrait. */}
      <span
        className={`mt-1 font-label text-[9px] uppercase tracking-[0.15em] tabular-nums text-ink-soft ${
          mine ? "self-end mr-8" : "self-start ml-8"
        }`}
      >
        {last.pending ? "Sending" : clock(last.created_at)}
      </span>
    </div>
  );
};

export default DevMessages;
