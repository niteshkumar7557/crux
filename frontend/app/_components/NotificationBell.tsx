"use client";

// The inbox dropdown. Spec: game-theory.md §20

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LuX } from "react-icons/lu";
import { PiBell, PiBellFill } from "react-icons/pi";
import api from "../axios";
import NavPanel from "./ui/NavPanel";
import { DRAWER_COUNT, drawerRow } from "./ui/drawerRow";

type Notif = {
  id: number;
  type: string;
  motion_id: number | null;
  actor: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
};

const TYPE_TONE: Record<string, { rule: string; label: string }> = {
  verdict: { rule: "border-l-laurel", label: "text-laurel" },
  season: { rule: "border-l-metal-gold", label: "text-metal-gold" },
  reply: { rule: "border-l-side-for", label: "text-side-for" },
  opposition: { rule: "border-l-side-against", label: "text-side-against" },
};
const UNKNOWN_TONE = { rule: "border-l-ink-faint", label: "text-ink-soft" };

const NotificationBell = ({
  variant = "icon",
}: {
  variant?: "icon" | "row";
}) => {
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // In the drawer the panel is portalled to <body>, so it is no longer inside
  // `ref` and the outside-click handler would close it on its own contents.
  const panelRef = useRef<HTMLDivElement>(null);

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
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
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

  const clearAll = async () => {
    try {
      await api.delete("/notifications");
      setItems([]);
      setUnread(0);
    } catch {
    }
  };

  return (
    <div ref={ref} className={variant === "row" ? undefined : "relative"}>
      {variant === "row" ? (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className={drawerRow()}
        >
          <PiBell size={18} className="shrink-0" />
          Notifications
          {unread > 0 && (
            <span className={DRAWER_COUNT}>{unread > 9 ? "9+" : unread}</span>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={toggle}
          aria-label="Notifications"
          aria-expanded={open}
          className={`relative flex translate-y-0.5 cursor-pointer items-center transition-colors ${
            open ? "text-ink" : "text-ink-soft hover:text-ink"
          }`}
        >
          {open ? <PiBellFill size={22} /> : <PiBell size={22} />}
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-ink text-paper text-[9px] font-bold leading-none px-1 py-0.5 min-w-4 text-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      )}
      {open && (
        <NavPanel
          variant={variant}
          panelRef={panelRef}
          width="w-96 max-w-[calc(100vw-2rem)] max-h-96"
          className="overflow-y-auto bg-band border border-ink-faint shadow-cast-deep"
        >
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
                <div
                  className={`border-l-2 ${tone.rule} border-b border-b-ink-faint px-3.5 py-3 transition-colors ${
                    n.is_read ? "hover:bg-ink-wash" : "bg-ink-wash"
                  }`}
                >
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
        </NavPanel>
      )}
    </div>
  );
};

export default NotificationBell;
