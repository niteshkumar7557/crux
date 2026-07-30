"use client";

// The bio. NOTE: the Debater Profiler writes this same column on every motion post,
// so a hand-written bio does not survive. See future-features.md §5.
// Spec: game-theory.md §13

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import api from "@/app/axios";
import Button from "@/app/_components/ui/Button";
import AutoGrowTextarea from "@/app/_components/ui/AutoGrowTextarea";

const BIO_MAX = 280;

const BioEditor = ({ bio, onDone }: { bio: string; onDone: () => void }) => {
  const router = useRouter();
  const [value, setValue] = useState(bio);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const over = value.length > BIO_MAX;

  async function save() {
    if (over) return;
    setBusy(true);
    setError("");
    try {
      await api.patch("/profile/bio", { bio: value });
      router.refresh();
      onDone();
    } catch (err) {
      setError(
        (isAxiosError<{ error?: string }>(err) && err.response?.data?.error) ||
          "Could not save. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 max-w-xl">
      <label htmlFor="bio" className="sr-only">
        Your bio
      </label>
      <AutoGrowTextarea
        id="bio"
        rows={3}
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
        placeholder="Post some Motions to get to know about you."
        className="w-full bg-raised border-none text-ink p-4 focus:ring-1 focus:ring-ink placeholder:text-ink-soft font-body text-base"
      />
      <div className="flex items-center justify-between gap-4 mt-3">
        <span
          className={`font-label text-[10px] uppercase tracking-widest ${
            over ? "text-side-against" : "text-ink-soft"
          }`}
        >
          {value.length} / {BIO_MAX}
        </span>
        <div className="flex items-center gap-3">
          <Button
            variant="outline-neutral"
            size="sm"
            onClick={onDone}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={save} disabled={busy || over}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
      {error && (
        <p className="font-label text-[10px] uppercase tracking-widest text-side-against mt-2">
          {error}
        </p>
      )}
    </div>
  );
};

export default BioEditor;
