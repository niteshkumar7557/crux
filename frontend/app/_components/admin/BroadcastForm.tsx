"use client";

// Email every user about one motion.
//
// The shape of this form is the safety: nothing can be sent until a motion has
// been resolved and its real recipient count is on screen. An irreversible fan-out
// to every account should never be one field and a button.

import { useState } from "react";
import { isAxiosError } from "axios";
import api from "@/app/axios";
import Button from "@/app/_components/ui/Button";
import { utcDate } from "@/app/_utils/formatDate";

const SUBJECT_MAX = 120;
const MESSAGE_MAX = 2000;

interface Preview {
  motion: {
    id: number;
    content: string;
    domain: string;
    status: string;
    closes_at: string | null;
    arguments: number;
  };
  recipients: number;
  optedOut: number;
}

// Accepts a bare id or the CRX-42-A form the URLs use, because that is what is
// on screen when you decide to write about a debate.
function parseMotionRef(raw: string): number | null {
  const match = raw.trim().match(/^(?:CRX-)?(\d+)(?:-[A-Z])?$/i);
  const id = match ? Number(match[1]) : Number(raw.trim());
  return Number.isInteger(id) && id > 0 ? id : null;
}

const BroadcastForm = () => {
  const [ref, setRef] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<number | null>(null);

  async function lookUp() {
    setError("");
    setSent(null);
    const motionId = parseMotionRef(ref);
    if (motionId === null) {
      setError("That doesn't look like a motion id. Try 42 or CRX-42-A.");
      setPreview(null);
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.get("/admin/broadcast/preview", {
        params: { motionId },
      });
      setPreview(data);
    } catch (err) {
      setPreview(null);
      setError(
        isAxiosError(err) && err.response?.status === 404
          ? "No debate with that id."
          : "Couldn't look that up.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!preview) return;
    setError("");
    setBusy(true);
    try {
      const { data } = await api.post("/admin/broadcast", {
        motionId: preview.motion.id,
        subject,
        message,
      });
      setSent(data.queued);
      setSubject("");
      setMessage("");
    } catch (err) {
      setError(
        (isAxiosError<{ error?: string }>(err) && err.response?.data?.error) ||
          "Couldn't send that.",
      );
    } finally {
      setBusy(false);
    }
  }

  const ready =
    preview !== null && subject.trim().length > 0 && message.trim().length > 0;

  return (
    <div className="border border-ink-faint bg-band p-8">
      <h2 className="font-label text-[0.7rem] uppercase tracking-[0.2em] text-ink">
        Broadcast
      </h2>
      <p className="mt-2 font-body text-sm leading-relaxed text-ink-soft">
        One email to every user who hasn&rsquo;t turned announcements off. It
        goes through the same queue as everything else, so bounces, complaints
        and opt-outs are honoured at send time.
      </p>

      <div className="mt-8 space-y-2">
        <label
          htmlFor="motion-ref"
          className="block font-label text-[10px] uppercase tracking-widest text-ink-soft"
        >
          Motion
        </label>
        <div className="flex gap-3">
          <input
            id="motion-ref"
            value={ref}
            onChange={(e) => setRef(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                lookUp();
              }
            }}
            placeholder="CRX-42-A"
            className="min-w-0 flex-1 border border-ink-faint bg-paper px-4 py-3 font-body text-sm text-ink transition-colors placeholder:text-ink-soft focus:border-ink focus:outline-none"
          />
          <Button variant="outline" size="sm" onClick={lookUp} disabled={busy}>
            Look up
          </Button>
        </div>
      </div>

      {preview && (
        <div className="mt-6 border-l-2 border-ink-faint bg-paper/60 py-3 pl-4">
          <p className="font-headline text-lg italic leading-snug text-ink">
            &ldquo;{preview.motion.content}&rdquo;
          </p>
          <p className="mt-2 font-label text-[0.6rem] uppercase tracking-[0.2em] text-ink-soft">
            {preview.motion.domain} · {preview.motion.status}
            {preview.motion.status === "live" && preview.motion.closes_at
              ? ` · closes ${utcDate(preview.motion.closes_at)}`
              : ""}{" "}
            · {preview.motion.arguments} arguments
          </p>
        </div>
      )}

      <div className="mt-8 space-y-2">
        <label
          htmlFor="subject"
          className="block font-label text-[10px] uppercase tracking-widest text-ink-soft"
        >
          Subject
        </label>
        <input
          id="subject"
          value={subject}
          maxLength={SUBJECT_MAX}
          onChange={(e) => setSubject(e.currentTarget.value)}
          className="w-full border border-ink-faint bg-paper px-4 py-3 font-body text-sm text-ink transition-colors placeholder:text-ink-soft focus:border-ink focus:outline-none"
          placeholder="A debate worth your time"
        />
        <p className="text-right font-label text-[10px] uppercase tracking-widest text-ink-soft">
          {subject.length}/{SUBJECT_MAX}
        </p>
      </div>

      <div className="mt-4 space-y-2">
        <label
          htmlFor="message"
          className="block font-label text-[10px] uppercase tracking-widest text-ink-soft"
        >
          Message
        </label>
        <textarea
          id="message"
          value={message}
          maxLength={MESSAGE_MAX}
          rows={5}
          onChange={(e) => setMessage(e.currentTarget.value)}
          className="w-full resize-y border border-ink-faint bg-paper px-4 py-3 font-body text-sm leading-relaxed text-ink transition-colors placeholder:text-ink-soft focus:border-ink focus:outline-none"
          placeholder="This one is close and the AGAINST side needs a sharper case."
        />
        <p className="text-right font-label text-[10px] uppercase tracking-widest text-ink-soft">
          {message.length}/{MESSAGE_MAX}
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-6 border-l-2 border-side-against py-1 pl-4 font-body text-xs leading-relaxed text-ink-soft"
        >
          {error}
        </p>
      )}

      {sent !== null && (
        <p className="mt-6 border-l-2 border-side-for py-1 pl-4 font-body text-xs leading-relaxed text-ink-soft">
          Queued for {sent} {sent === 1 ? "person" : "people"}. They send over the
          next few minutes.
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-ink-faint pt-6">
        <span className="font-label text-[0.62rem] uppercase tracking-[0.2em] text-ink-soft">
          {preview
            ? `${preview.recipients} recipients${preview.optedOut > 0 ? ` · ${preview.optedOut} opted out` : ""}`
            : "Look up a motion first"}
        </span>
        <Button size="md" onClick={send} disabled={!ready || busy}>
          {busy ? "Sending…" : "Send"}
        </Button>
      </div>
    </div>
  );
};

export default BroadcastForm;
