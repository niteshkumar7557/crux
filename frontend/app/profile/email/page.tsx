"use client";

// Email preferences. One toggle per category, plus a global switch.
//
// The global switch is drawn apart from the five and inverted — "turn everything
// off" is a different kind of act from "I don't want this one", and burying it
// among the categories is how a user who wants to stop hearing from us ends up
// pressing the spam button instead.
// Spec: game-theory.md §20

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/app/axios";
import { getUser } from "@/app/_utils/getUser";

type Prefs = {
  all: boolean;
  verdicts: boolean;
  replies: boolean;
  opponents: boolean;
  season: boolean;
  announcements: boolean;
};

const CATEGORIES: { key: keyof Prefs; label: string; body: string }[] = [
  {
    key: "verdicts",
    label: "Verdicts",
    body: "A debate you argued in has concluded — your result, your score, and your certificate.",
  },
  {
    key: "replies",
    label: "Replies",
    body: "Someone answered one of your arguments while the clock was still running.",
  },
  {
    key: "opponents",
    label: "New opponents",
    body: "Someone joined the other side of a debate you opened or are arguing in.",
  },
  {
    key: "season",
    label: "Season results",
    body: "You placed in the top three when a season closed. Once a month at most.",
  },
  {
    key: "announcements",
    label: "Announcements",
    body: "The occasional note from the developer about a particular debate.",
  },
];

const Toggle = ({
  on,
  onChange,
  label,
  disabled,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!on)}
    className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
      on ? "border-side-for bg-side-for/20" : "border-ink-faint bg-ink-wash"
    }`}
  >
    <span
      className={`absolute top-0.5 h-4 w-4 rounded-full transition-all ${
        on ? "left-[1.45rem] bg-side-for" : "left-0.5 bg-ink-soft"
      }`}
    />
  </button>
);

const EmailPrefsPage = () => {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "signed-out" | "error">(
    "loading",
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      const user = await getUser();
      if (!alive) return;
      if (!user) {
        setStatus("signed-out");
        return;
      }
      try {
        const { data } = await api.get("/email/prefs");
        if (!alive) return;
        setPrefs(data.prefs);
        setStatus("ready");
      } catch {
        if (alive) setStatus("error");
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  async function change(key: keyof Prefs, next: boolean) {
    if (!prefs) return;
    // Optimistic: a toggle that waits on a round trip before moving feels broken.
    const previous = prefs;
    setPrefs({ ...prefs, [key]: next });
    setSaving(true);
    try {
      const { data } = await api.patch("/email/prefs", { [key]: next });
      setPrefs(data.prefs);
    } catch {
      setPrefs(previous);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 md:px-8">
      <div className="mb-12">
        <p className="flex items-center gap-3 font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink-soft">
          <span aria-hidden className="h-px w-8 bg-ink-faint" />
          Your account
        </p>
        <h1 className="mt-5 display-type text-[clamp(2.2rem,5vw,3.4rem)] text-ink">
          Email settings
        </h1>
        <p className="mt-4 max-w-xl font-body text-lg text-ink-soft">
          Crux emails you about your own debates and nothing else. Every message
          links to a live arena or a result, and there is a hard limit of four a
          day.
        </p>
      </div>

      {status === "loading" && (
        <p className="font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink-soft">
          Loading…
        </p>
      )}

      {status === "signed-out" && (
        <div className="border border-ink-faint bg-band p-8">
          <p className="font-body text-ink-soft">
            Sign in to change your email settings.{" "}
            <Link href="/login" className="text-ink underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="border border-ink-faint bg-band p-8">
          <p className="font-body text-ink-soft">
            We couldn&rsquo;t load your settings. Reload the page and try again.
          </p>
        </div>
      )}

      {status === "ready" && prefs && (
        <>
          <div className="border border-ink-faint bg-band">
            {CATEGORIES.map((c, i) => (
              <div
                key={c.key}
                className={`flex items-start justify-between gap-6 p-6 ${
                  i > 0 ? "border-t border-ink-faint" : ""
                }`}
              >
                <div className="min-w-0">
                  <h2 className="font-label text-[0.7rem] uppercase tracking-[0.2em] text-ink">
                    {c.label}
                  </h2>
                  <p className="mt-2 font-body text-sm leading-relaxed text-ink-soft">
                    {c.body}
                  </p>
                </div>
                <Toggle
                  label={c.label}
                  on={prefs[c.key] && prefs.all}
                  disabled={saving || !prefs.all}
                  onChange={(next) => change(c.key, next)}
                />
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-start justify-between gap-6 border border-ink-faint bg-raised p-6">
            <div className="min-w-0">
              <h2 className="font-label text-[0.7rem] uppercase tracking-[0.2em] text-ink">
                All email
              </h2>
              <p className="mt-2 font-body text-sm leading-relaxed text-ink-soft">
                Turn this off and we send you nothing at all. Your in-app
                notifications are unaffected — the bell keeps everything.
              </p>
            </div>
            <Toggle
              label="All email"
              on={prefs.all}
              disabled={saving}
              onChange={(next) => change("all", next)}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default EmailPrefsPage;
