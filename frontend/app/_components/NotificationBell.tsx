"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LuX } from "react-icons/lu";
import { PiBell, PiBellFill } from "react-icons/pi";
import api from "../axios";

type Notif = {
  id: number;
  type: string;
  motion_id: number | null;
  actor: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
};

// §14's four notification types, each given a colour from the existing palette
// rather than a new one: gold is the system's "earned" accent, so the two
// outcomes that are awarded to you wear it, and the two that are someone
// else's move wear that person's camp colour. Left rule + label only — the
// rows stay flat paper (design-system.md §2).
const TYPE_TONE: Record<string, { rule: string; label: string }> = {
  verdict: { rule: "border-l-laurel", label: "text-laurel" },
  season: { rule: "border-l-metal-gold", label: "text-metal-gold" },
  reply: { rule: "border-l-side-for", label: "text-side-for" },
  opposition: { rule: "border-l-side-against", label: "text-side-against" },
};
const UNKNOWN_TONE = { rule: "border-l-ink-faint", label: "text-ink-soft" };

const NotificationBell = () => {
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = () =>
    api
      .get("/notifications")
      .then(({ data }) => {
        setItems(data.items ?? []);
        setUnread(data.unread ?? 0);
      })
      .catch(() => {});

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

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

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      await api.post("/notifications/read").catch(() => {});
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  };

  // Local state is only emptied once the server confirms — a failed clear that
  // blanked the list would refill itself on the next 30s poll and read as a bug.
  const clearAll = async () => {
    try {
      await api.delete("/notifications");
      setItems([]);
      setUnread(0);
    } catch {
      /* leave the inbox as-is; the next poll is the source of truth */
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label="Notifications"
        aria-expanded={open}
        // `flex`, not the default inline-block: an inline <svg> sits on a text
        // baseline, and the descender space under it left the bell riding ~4px
        // high of everything else in the nav row.
        //
        // The last 2px are a transform rather than a margin: with
        // `items-center` on the nav row, a margin is folded into the centring
        // and only moves the icon half as far as it says.
        className={`relative flex translate-y-0.5 cursor-pointer items-center transition-colors ${
          open ? "text-ink" : "text-ink-soft hover:text-ink"
        }`}
      >
        {/* A matched outline/solid pair, the same reasoning as the like control:
            the panel being open is a state the bell should show, and filling a
            stroked bell with `fill-current` closes up the clapper gap and turns
            the drawing into a blob. Phosphor ships the solid cut, so the open
            bell is the same bell, rung. */}
        {open ? <PiBellFill size={22} /> : <PiBell size={22} />}
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-ink text-paper text-[9px] font-bold leading-none px-1 py-0.5 min-w-4 text-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        // `bg-band` rather than `bg-raised`. The panel used to be the lightest
        // surface on the page, which is the system's rule for anything casting a
        // shadow — but on cream paper that made a floating white sheet of
        // near-white rows, and the hairlines between them were the only thing
        // separating one notification from the next. One paper step down in both
        // themes (`#faf6e8 → #ece4cb` light, `#1b2c24 → #14231c` dark) gives the
        // rows an edge to sit on.
        //
        // What carries "above the page" is the border and the cast — and the
        // cast is the `-deep` step, not the resting one. Anchored under a blurred
        // paper navbar, over a page only a shade lighter than the panel itself,
        // the shallow cast left it reading as part of the page.
        <div className="absolute right-0 mt-4 w-96 max-w-[calc(100vw-2rem)] max-h-96 overflow-y-auto bg-band border border-ink-faint shadow-cast-deep z-50">
          <div className="sticky top-0 flex items-center gap-3 bg-band px-3 py-2.5 border-b border-ink-faint">
            <span className="font-label text-[11px] uppercase tracking-[0.2em] text-ink-soft">
              Notifications
            </span>
            <span className="grow" />
            {items.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="font-label text-[11px] uppercase tracking-[0.15em] text-ink-soft hover:text-ink transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close notifications"
              className="flex items-center text-ink-soft hover:text-ink transition-colors cursor-pointer"
            >
              <LuX size={16} />
            </button>
          </div>
          {items.length === 0 ? (
            <p className="p-8 font-label text-[11px] uppercase tracking-[0.2em] text-ink-soft text-center">
              Nothing yet
            </p>
          ) : (
            items.map((n) => {
              const tone = TYPE_TONE[n.type] ?? UNKNOWN_TONE;
              const body = (
                // A read notification is no longer dimmed to 60%. Fading the
                // whole row took the message, the rule and the type label down
                // together, and a 14px serif at 60% on warm paper is the least
                // readable text in the product — for the half of the inbox you
                // are most likely to be going back to re-read. Read state is
                // carried by the fill alone now: unread rows sit on a wash,
                // read rows sit on the panel.
                <div
                  className={`border-l-2 ${tone.rule} border-b border-b-ink-faint px-3.5 py-3 transition-colors ${
                    n.is_read ? "hover:bg-ink-wash" : "bg-ink-wash"
                  }`}
                >
                  {/* 15px and a full line-and-a-half of leading. These are
                      sentences, not captions, and they were set tighter and
                      smaller than any other prose in the app. */}
                  <p className="font-body text-[0.95rem] leading-relaxed text-ink">
                    {n.message}
                  </p>
                  <span
                    className={`mt-1.5 inline-block font-label text-[10px] uppercase tracking-[0.15em] ${tone.label}`}
                  >
                    {n.type}
                  </span>
                </div>
              );
              return n.motion_id ? (
                <Link
                  key={n.id}
                  href={`/motion/CRX-${n.motion_id}-A`}
                  onClick={() => setOpen(false)}
                >
                  {body}
                </Link>
              ) : (
                <div key={n.id}>{body}</div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
