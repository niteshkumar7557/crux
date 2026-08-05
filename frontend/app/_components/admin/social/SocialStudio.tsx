"use client";

// Pick a motion, draft the copy, edit it, watch the previews, export.
//
// Preview and export are the same POST, so the image on screen is the file that
// leaves — there is no second rendering path that can drift.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isAxiosError } from "axios";
import api from "@/app/axios";
import Button from "@/app/_components/ui/Button";
import { defaultCopy, hostOf, normaliseCopy, type SocialCopy } from "@/app/_components/social/socialCopy";
import {
  DEFAULT_SIZES,
  assetFilename,
  buildPayloads,
  canExportLive,
  type RawArgument,
  type SocialPayload,
  type SocialSizes,
} from "@/app/_components/social/socialAssets";
import { SIZE_STEPS, type SizeStep } from "@/app/_components/social/socialFit";
import { zipStore } from "@/app/_components/social/zipStore";
import type { Analysis } from "@/app/motion/types";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Accepts a bare id or the CRX-42-A form the URLs use, because that is what is
// on screen when you decide to post about a debate. Same rule as BroadcastForm.
function parseMotionRef(raw: string): number | null {
  const match = raw.trim().match(/^(?:CRX-)?(\d+)(?:-[A-Z])?$/i);
  const id = match ? Number(match[1]) : Number(raw.trim());
  return Number.isInteger(id) && id > 0 ? id : null;
}

// The analyses arrive already parsed: motion.controller.ts runs readAnalysis()
// before responding, so both the arena panel and this page read one shape.
interface Loaded {
  id: number;
  motion: string;
  keyword: string;
  status: "live" | "concluded";
  winner: SocialPayload["winner"];
  split: { for: number; against: number };
  margin: number | null;
  verdictText: string | null;
  mvpUsername: string | null;
  closesAt: string | null;
  forAnalysis: Analysis | null;
  againstAnalysis: Analysis | null;
  args: RawArgument[];
  // Pinned when the debate is loaded, never read during render: a clock read
  // while rendering is impure, and a countdown that drifts per keystroke would
  // put a different number on the poster than the one that was approved.
  now: number;
}

// Tailwind cannot see class names built at runtime, so the selected state is a
// lookup of two literal strings rather than an interpolation.
const STEP_CLASS = {
  on: "border-ink bg-ink text-paper",
  off: "border-ink-faint bg-paper text-ink-soft hover:border-ink",
} as const;

const STEP_LABEL: Record<SizeStep, string> = {
  auto: "Auto",
  xs: "XS",
  sm: "S",
  md: "M",
  lg: "L",
  xl: "XL",
};

/** One row of size presets. `Auto` is the fitted size; the rest scale from it. */
const SizeRow = ({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: SizeStep;
  onChange: (step: SizeStep) => void;
}) => (
  <div className="flex flex-wrap items-center justify-between gap-3">
    <span className="font-label text-[0.58rem] uppercase tracking-[0.28em] text-ink-soft">
      {label}
      <span className="ml-2 normal-case tracking-normal opacity-60">{hint}</span>
    </span>
    <div className="flex gap-1">
      {SIZE_STEPS.map((step) => (
        <button
          key={step}
          type="button"
          aria-pressed={value === step}
          onClick={() => onChange(step)}
          className={`border px-2.5 py-1 font-label text-[0.55rem] uppercase tracking-[0.18em] transition-colors ${
            value === step ? STEP_CLASS.on : STEP_CLASS.off
          }`}
        >
          {STEP_LABEL[step]}
        </button>
      ))}
    </div>
  </div>
);

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const SocialStudio = () => {
  const [ref, setRef] = useState("");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [copy, setCopy] = useState<SocialCopy | null>(null);
  const [sizes, setSizes] = useState<SocialSizes>(DEFAULT_SIZES);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<"idle" | "loading" | "drafting" | "rendering">("idle");
  const [error, setError] = useState<string | null>(null);
  const blobs = useRef<Map<string, Blob>>(new Map());

  const payloads = useMemo(() => {
    if (!loaded || !copy) return [];
    return buildPayloads({ ...loaded, copy, sizes, siteUrl: SITE });
  }, [loaded, copy, sizes]);

  // Pinned to the load, so a live poster's hour stamp cannot change between the
  // render pass that fills `blobs` and the export that looks names up in it.
  // The epoch fallback is never read: with nothing loaded there are no payloads.
  const stampedAt = useMemo(() => new Date(loaded?.now ?? 0), [loaded]);

  const load = async () => {
    const id = parseMotionRef(ref);
    if (id === null) return setError("That is not a motion reference.");
    setBusy("loading");
    setError(null);
    try {
      const [{ data: motion }, { data: args }] = await Promise.all([
        api.get(`/motion/${id}`),
        api.get(`/motion/${id}/arguments`),
      ]);
      const row = motion?.data;
      if (!row) throw new Error("not found");
      setLoaded({
        id,
        motion: String(row.content),
        keyword: String(row.content_keyword ?? ""),
        status: row.status,
        winner: row.winner,
        split: { for: row.affirmative, against: row.negative },
        margin: row.margin,
        verdictText: row.verdict_text,
        mvpUsername: row.mvp_username,
        closesAt: row.closes_at,
        forAnalysis: row.for_analysis,
        againstAnalysis: row.against_analysis,
        args: (args?.arguments ?? []) as RawArgument[],
        now: Date.now(),
      });
      setCopy(defaultCopy(String(row.content), SITE));
    } catch (err) {
      setError(isAxiosError(err) ? "Could not load that debate." : "Something went wrong.");
    } finally {
      setBusy("idle");
    }
  };

  const draft = async () => {
    if (!loaded) return;
    setBusy("drafting");
    try {
      const { data } = await api.post("/admin/social/copy", {
        motionId: loaded.id,
        host: hostOf(SITE),
      });
      setCopy(normaliseCopy(data?.data, loaded.motion, SITE));
    } catch {
      // The AI is the optional half. Defaults are already on screen.
      setError("The model did not answer — the defaults below still export fine.");
    } finally {
      setBusy("idle");
    }
  };

  const render = useCallback(async (payload: SocialPayload): Promise<Blob | null> => {
    const res = await fetch("/admin/social/render", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("access_token") ?? ""}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    return res.blob();
  }, []);

  // Debounced: re-rendering thirteen images on every keystroke is a waste of a
  // machine and a second of your life per character.
  useEffect(() => {
    if (payloads.length === 0) return;
    const timer = setTimeout(async () => {
      setBusy("rendering");
      const next: Record<string, string> = {};
      for (const payload of payloads) {
        const key = assetFilename(payload, stampedAt);
        const blob = await render(payload);
        if (!blob) continue;
        blobs.current.set(key, blob);
        next[key] = URL.createObjectURL(blob);
      }
      setPreviews((old) => {
        for (const url of Object.values(old)) URL.revokeObjectURL(url);
        return next;
      });
      setBusy("idle");
    }, 600);
    return () => clearTimeout(timer);
  }, [payloads, render, stampedAt]);

  const exportSet = async (which: "instagram" | "linkedin" | "x") => {
    if (!loaded || !copy) return;
    const wanted: Record<typeof which, string[]> = {
      instagram: ["ig-cover", "ig-argument", "ig-verdict", "ig-story", "ig-live"],
      linkedin: ["li-verdict"],
      x: ["x-verdict", "x-live"],
    };
    const entries = [];
    for (const payload of payloads) {
      if (!wanted[which].includes(payload.template)) continue;
      const name = assetFilename(payload, stampedAt);
      const blob = blobs.current.get(name);
      if (!blob) continue;
      entries.push({ name, data: new Uint8Array(await blob.arrayBuffer()) });
    }
    entries.push({
      name: "caption.txt",
      data: new TextEncoder().encode(copy.captions[which]),
    });

    saveBlob(
      new Blob([zipStore(entries)], { type: "application/zip" }),
      `crux-${which}-${String(loaded.id).padStart(4, "0")}.zip`,
    );
  };

  const staleLive =
    loaded?.status === "live" && !canExportLive(payloads[0]?.closesInHours ?? null);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end gap-4 border border-ink-faint bg-band p-6">
        <label className="flex flex-col gap-2">
          <span className="font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink-soft">
            Motion
          </span>
          <input
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="CRX-412-A or 412"
            className="border border-ink-faint bg-paper px-4 py-2 font-label text-sm text-ink"
          />
        </label>
        <Button onClick={load} disabled={busy !== "idle"}>
          Load debate
        </Button>
        <Button variant="outline" onClick={draft} disabled={!loaded || busy !== "idle"}>
          {busy === "drafting" ? "Drafting…" : "Draft copy"}
        </Button>
      </div>

      {error && <p className="font-body text-ink-soft">{error}</p>}

      {staleLive && (
        <p className="border border-side-against bg-band p-4 font-body text-ink">
          Under an hour left. The countdown is printed into the image, so this one is not
          exportable.
        </p>
      )}

      {copy && loaded && (
        <div className="flex flex-col gap-6 border border-ink-faint bg-band p-6">
          <label className="flex flex-col gap-2">
            <span className="font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink-soft">
              Cover hook
            </span>
            <input
              value={copy.hook}
              onChange={(e) => setCopy({ ...copy, hook: e.target.value })}
              className="border border-ink-faint bg-paper px-4 py-2 font-body text-ink"
            />
          </label>

          <div className="grid gap-6 sm:grid-cols-2">
            {(["for", "against"] as const).map((side) => (
              <div key={side} className="flex flex-col gap-2">
                <span className="font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink-soft">
                  {side === "for" ? "For — the three words" : "Against — the three words"}
                </span>
                {copy.words[side].map((word, i) => (
                  <input
                    key={i}
                    value={word}
                    onChange={(e) => {
                      const words = [...copy.words[side]];
                      words[i] = e.target.value.toUpperCase();
                      setCopy({ ...copy, words: { ...copy.words, [side]: words } });
                    }}
                    className="border border-ink-faint bg-paper px-4 py-2 font-label text-sm uppercase tracking-[0.2em] text-ink"
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 border-t border-ink-faint pt-6">
            <span className="font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink-soft">
              Sizing
            </span>
            <p className="font-body text-sm text-ink-soft">
              Auto sizes each element to its own content, which is what stops a long line
              running into the text beneath it. The other steps scale from that, and may
              overflow — the preview shows exactly what exports.
            </p>
            <div className="flex flex-col gap-2.5">
              <SizeRow
                label="Headline"
                hint="the display line"
                value={sizes.headline}
                onChange={(step) => setSizes({ ...sizes, headline: step })}
              />
              <SizeRow
                label="Motion"
                hint="the serif motion"
                value={sizes.motion}
                onChange={(step) => setSizes({ ...sizes, motion: step })}
              />
              <SizeRow
                label="Body"
                hint="quotes and rulings"
                value={sizes.body}
                onChange={(step) => setSizes({ ...sizes, body: step })}
              />
              <SizeRow
                label="Word"
                hint="the word above an argument"
                value={sizes.word}
                onChange={(step) => setSizes({ ...sizes, word: step })}
              />
              <SizeRow
                label="Image"
                hint="the engraving plate"
                value={sizes.plate}
                onChange={(step) => setSizes({ ...sizes, plate: step })}
              />
              <SizeRow
                label="Box"
                hint="the frame's inner padding"
                value={sizes.pad}
                onChange={(step) => setSizes({ ...sizes, pad: step })}
              />
            </div>
            <button
              type="button"
              onClick={() => setSizes(DEFAULT_SIZES)}
              className="self-start font-label text-[0.58rem] uppercase tracking-[0.24em] text-ink underline"
            >
              Reset to auto
            </button>
          </div>

          {(["instagram", "linkedin", "x"] as const).map((platform) => (
            <label key={platform} className="flex flex-col gap-2">
              <span className="font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink-soft">
                {platform} caption
              </span>
              <textarea
                rows={4}
                value={copy.captions[platform]}
                onChange={(e) =>
                  setCopy({
                    ...copy,
                    captions: { ...copy.captions, [platform]: e.target.value },
                  })
                }
                className="border border-ink-faint bg-paper px-4 py-2 font-body text-ink"
              />
            </label>
          ))}
        </div>
      )}

      {payloads.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => exportSet("instagram")} disabled={busy !== "idle"}>
            Export Instagram
          </Button>
          <Button variant="outline" onClick={() => exportSet("linkedin")} disabled={busy !== "idle"}>
            Export LinkedIn
          </Button>
          <Button variant="outline" onClick={() => exportSet("x")} disabled={busy !== "idle"}>
            Export X
          </Button>
          {busy === "rendering" && (
            <span className="self-center font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink-soft">
              Rendering…
            </span>
          )}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(previews).map(([name, url]) => (
          <figure key={name} className="flex flex-col gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={name} className="w-full border border-ink-faint" />
            <figcaption className="flex items-center justify-between">
              <span className="font-label text-[0.62rem] uppercase tracking-[0.24em] text-ink-soft">
                {name}
              </span>
              <a
                href={url}
                download={name}
                className="font-label text-[0.62rem] uppercase tracking-[0.24em] text-ink underline"
              >
                Download
              </a>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
};

export default SocialStudio;
