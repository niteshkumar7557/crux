"use client";
import { useEffect, useState } from "react";
import { getUser } from "@/app/_utils/getUser";
import type { jwtPayload } from "@/app/_types/jwt";
import api from "@/app/axios";

// §11 The pin — an admin curates the stage by hand while heat has too little
// volume to mean anything. Renders nothing for everyone else.
//
// Hiding the buttons is not the access control: `requireRole("admin")` on the
// server is. This only keeps a control off the screen of someone who cannot
// use it.

const CHIP =
  "font-label text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 border transition-colors disabled:cursor-not-allowed";

const PinControl = ({
  argumentId,
  pinned,
  isDotd,
}: {
  argumentId: number;
  pinned: boolean;
  isDotd: boolean;
}) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [stage, setStage] = useState({ pinned, isDotd });
  const [busy, setBusy] = useState<"pin" | "dotd" | null>(null);

  useEffect(() => {
    let live = true;
    getUser()
      .then((user) => {
        if (live) setIsAdmin((user as jwtPayload | null)?.role === "admin");
      })
      .catch(() => {
        /* logged out — getUser rejects when the token refresh fails */
      });
    return () => {
      live = false;
    };
  }, []);

  if (!isAdmin) return null;

  const togglePin = async () => {
    setBusy("pin");
    try {
      const { data } = await api.post(`/admin/pin/${argumentId}`);
      // Trust the row the server actually wrote, not an optimistic flip.
      setStage((s) => ({ ...s, pinned: Boolean(data.pinned) }));
    } catch {
      /* the displayed state still matches the server — leave it */
    } finally {
      setBusy(null);
    }
  };

  const crown = async () => {
    setBusy("dotd");
    try {
      await api.post(`/admin/dotd/${argumentId}`);
      setStage((s) => ({ ...s, isDotd: true }));
    } catch {
      /* as above */
    } finally {
      setBusy(null);
    }
  };

  // Dim only while a request is in flight. The `disabled:` variant would also
  // dim "Debate of the Day", which is an *active* state, not a dead control.
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
            ? "text-tertiary border-tertiary/40 hover:border-tertiary"
            : "text-outline border-outline/30 hover:text-tertiary hover:border-tertiary/40"
        }`}
      >
        {stage.pinned ? "Pinned" : "Pin"}
      </button>

      <button
        type="button"
        onClick={crown}
        disabled={busy !== null || stage.isDotd}
        aria-pressed={stage.isDotd}
        title={
          stage.isDotd
            ? "Already the Debate of the Day."
            : "Crown this the Debate of the Day until tomorrow."
        }
        className={`${CHIP} ${pending} ${
          stage.isDotd
            ? "text-tertiary border-tertiary/40"
            : "text-outline border-outline/30 hover:text-tertiary hover:border-tertiary/40"
        }`}
      >
        {stage.isDotd ? "Debate of the Day" : "Make DotD"}
      </button>
    </span>
  );
};

export default PinControl;
