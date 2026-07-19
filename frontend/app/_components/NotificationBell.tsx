"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LuBell } from "react-icons/lu";
import api from "../axios";

type Notif = {
  id: number;
  type: string;
  argument_id: number | null;
  actor: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
};

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
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label="Notifications"
        className="relative cursor-pointer text-outline hover:text-primary-container transition-colors"
      >
        <LuBell size={22} />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-primary text-surface-container-lowest text-[9px] font-bold leading-none px-1 py-0.5 min-w-[16px] text-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-surface-container-lowest border border-outline-variant/30 z-50">
          <div className="px-3 py-2 border-b border-outline-variant/20 font-label text-[10px] uppercase tracking-[0.2em] text-outline">
            Notifications
          </div>
          {items.length === 0 ? (
            <p className="p-6 font-label text-[10px] uppercase tracking-[0.2em] text-outline text-center">
              Nothing yet
            </p>
          ) : (
            items.map((n) => {
              const body = (
                <div
                  className={`p-3 border-b border-outline-variant/15 hover:bg-surface-container transition-colors ${
                    n.is_read ? "opacity-60" : ""
                  }`}
                >
                  <p className="font-body text-xs text-on-surface leading-snug">
                    {n.message}
                  </p>
                  <span className="font-label text-[9px] uppercase tracking-[0.15em] text-outline">
                    {n.type}
                  </span>
                </div>
              );
              return n.argument_id ? (
                <Link
                  key={n.id}
                  href={`/argument/CRX-${n.argument_id}-A`}
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
