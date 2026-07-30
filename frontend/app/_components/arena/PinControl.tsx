"use client";

// Admin-only stage curation. The server re-checks the role; this only hides the
// control. Spec: game-theory.md §15

import { useEffect, useState } from "react";
import { getUser } from "@/app/_utils/getUser";
import type { jwtPayload } from "@/app/_types/jwt";
import api from "@/app/axios";

const CHIP =
  "font-label text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 border transition-colors disabled:cursor-not-allowed";

const PinControl = ({
  motionId,
  pinned,
  isMotd,
}: {
  motionId: number;
  pinned: boolean;
  isMotd: boolean;
}) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [stage, setStage] = useState({ pinned, isMotd });
  const [busy, setBusy] = useState<"pin" | "motd" | null>(null);

  useEffect(() => {
    let live = true;
    getUser()
      .then((user) => {
        if (live) setIsAdmin((user as jwtPayload | null)?.role === "admin");
      })
      .catch(() => {
      });
    return () => {
      live = false;
    };
  }, []);

  if (!isAdmin) return null;

  const togglePin = async () => {
    setBusy("pin");
    try {
      const { data } = await api.post(`/admin/pin/${motionId}`);
      setStage((s) => ({ ...s, pinned: Boolean(data.pinned) }));
    } catch {
    } finally {
      setBusy(null);
    }
  };

  const crown = async () => {
    setBusy("motd");
    try {
      await api.post(`/admin/motd/${motionId}`);
      setStage((s) => ({ ...s, isMotd: true }));
    } catch {
    } finally {
      setBusy(null);
    }
  };

  const pending = busy !== null ? "opacity-60" : "";

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        onClick={togglePin}
        disabled={busy !== null}
        aria-pressed={stage.pinned}
        title={
          stage.pinned
            ? "On the Main Stage regardless of heat. Click to unpin."
            : "Force onto the Main Stage regardless of heat."
        }
        className={`${CHIP} ${pending} ${
          stage.pinned
            ? "text-laurel border-laurel/40 hover:border-laurel"
            : "text-ink-soft border-ink-faint hover:text-laurel hover:border-laurel/40"
        }`}
      >
        {stage.pinned ? "Pinned" : "Pin"}
      </button>

      <button
        type="button"
        onClick={crown}
        disabled={busy !== null || stage.isMotd}
        aria-pressed={stage.isMotd}
        title={
          stage.isMotd
            ? "Already the Motion of the Day."
            : "Crown this the Motion of the Day until tomorrow."
        }
        className={`${CHIP} ${pending} ${
          stage.isMotd
            ? "text-laurel border-laurel/40"
            : "text-ink-soft border-ink-faint hover:text-laurel hover:border-laurel/40"
        }`}
      >
        {stage.isMotd ? "Motion of the Day" : "Make MotD"}
      </button>
    </span>
  );
};

export default PinControl;
