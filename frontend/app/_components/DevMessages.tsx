"use client";

// "Talk to the developer" — the one messaging surface in the product, and the one
// place rounded bubbles are allowed (design-system.md §5). Spec: game-theory.md §20

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
  pending?: boolean;
};

type Participant = { username: string; avatar: string | null };

const MAX_CHARS = 1000;
const COUNTER_AT = MAX_CHARS * 0.8;

const DEV_HANDLE = "dev_nitesh";

const POLL_CLOSED_MS = 30_000;
const POLL_OPEN_MS = 10_000;

const GROUP_WINDOW_MS = 10 * 60_000;

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
    ...(d.getFullYear() === today.getFullYear() ? {} : { year: "numeric" }),
  });
};

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
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  const load = () =>
    api
      .get("/messages")
      .then(({ data }) => {
        setItems(data.items ?? []);
        setUnread(data.unread ?? 0);
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
        className={`relative flex translate-y-[2px] cursor-pointer items-center transition-colors ${
          open ? "text-ink" : "text-ink-soft hover:text-ink"
        }`}
      >
        {open ? <PiChatCircleFill size={22} /> : <PiChatCircle size={22} />}
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-ink text-paper text-[9px] font-bold leading-none px-1 py-0.5 min-w-[16px] text-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-4 flex max-h-136 w-104 max-w-[calc(100vw-2rem)] flex-col border border-ink-faint bg-raised shadow-cast-deep z-50">
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
            <div className="flex items-end gap-2 rounded-[1.15rem] border border-ink-faint bg-band px-3 py-2 transition-colors focus-within:border-ink">
              <AutoGrowTextarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
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

const BUBBLE_R = "rounded-[1.15rem]";
const CLOSED_R = "0.3rem";

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
      <span className="sr-only">
        {mine ? "You wrote:" : `@${who.username} wrote:`}
      </span>
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
              className={`${BUBBLE_R} px-3.5 py-2 transition-opacity ${
                mine
                  ? "bg-bubble-own text-bubble-own-ink"
                  : "bg-band text-ink"
              } ${m.pending ? "opacity-55" : ""}`}
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
