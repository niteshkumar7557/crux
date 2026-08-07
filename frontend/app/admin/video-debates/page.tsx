"use client";

// The video-debate workstation: create a draft, hand the media to R2, submit the
// manifest, validate, publish.
//
// Role is read from the JWT to decide what to DRAW. Every endpoint behind this page
// re-checks the role server-side, because a hidden button is not a rule.

import { useEffect, useState } from "react";
import api from "@/app/axios";
import { getUser } from "@/app/_utils/getUser";
import NewDraftForm from "@/app/_components/admin/video-debates/NewDraftForm";
import DraftWorkstation from "@/app/_components/admin/video-debates/DraftWorkstation";
import { statusLabel } from "@/app/_components/admin/video-debates/adminState";
import type {
  AdminVideoDebate,
  AdminVideoDebateDetail,
  AdminVideoDebateListItem,
  Domain,
} from "./types";

function fetchDebates(): Promise<AdminVideoDebateListItem[]> {
  return api
    .get<{ debates: AdminVideoDebateListItem[] }>("/admin/video-debates")
    .then(({ data }) => data.debates);
}

const STATUS_CLASS = {
  draft: "text-ink-soft",
  media_uploaded: "text-ink",
  validated: "text-laurel",
  published: "text-side-for",
} as const;

const VideoDebateAdminPage = () => {
  const [role, setRole] = useState<"unknown" | "admin" | "denied">("unknown");
  const [debates, setDebates] = useState<AdminVideoDebateListItem[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selected, setSelected] = useState<AdminVideoDebateDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    getUser().then((user) => {
      if (!alive) return;
      setRole(user?.role === "admin" ? "admin" : "denied");
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (role !== "admin") return;
    fetchDebates()
      .then(setDebates)
      .catch(() => setError("Couldn't load the draft list."));
    api
      .get<{ domains: Domain[] }>("/domains")
      .then(({ data }) => setDomains(data.domains))
      .catch(() => setError("Couldn't load the domain list."));
  }, [role]);

  function refreshList() {
    fetchDebates()
      .then(setDebates)
      .catch(() => setError("Couldn't load the draft list."));
  }

  async function open(id: number) {
    setError("");
    try {
      const { data } = await api.get<AdminVideoDebateDetail>(`/admin/video-debates/${id}`);
      setSelected(data);
    } catch {
      setError("Couldn't open that draft.");
    }
  }

  function applyChange(debate: AdminVideoDebate) {
    setSelected((current) => (current ? { ...current, debate } : current));
    setDebates((current) =>
      current.map((entry) => (entry.id === debate.id ? { ...entry, ...debate } : entry)),
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 md:px-8">
      <div className="mb-12">
        <p className="flex items-center gap-3 font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink-soft">
          <span aria-hidden className="h-px w-8 bg-ink-faint" />
          Administration
        </p>
        <h1 className="mt-5 display-type text-[clamp(2.2rem,5vw,3.4rem)] text-ink">
          Video debates
        </h1>
        <p className="mt-5 max-w-2xl font-body leading-relaxed text-ink-soft">
          Editorial programmes, judged by a dedicated video judge and published unranked. Nothing
          here writes to Arena records, logic scores or the leaderboard.
        </p>
      </div>

      {role === "unknown" && (
        <p className="font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink-soft">Checking…</p>
      )}

      {role === "denied" && (
        <div className="border border-ink-faint bg-band p-8">
          <p className="font-body text-ink-soft">This page is for administrators.</p>
        </div>
      )}

      {role === "admin" && (
        <div className="space-y-10">
          {error !== "" && <p className="font-body text-sm text-side-against">{error}</p>}

          <section>
            <h2 className="font-label text-[0.7rem] uppercase tracking-[0.2em] text-ink">Drafts</h2>
            {debates.length === 0 ? (
              <p className="mt-3 font-body text-sm text-ink-soft">No drafts yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-ink-faint border border-ink-faint bg-band">
                {debates.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => open(entry.id)}
                      className="flex w-full flex-wrap items-baseline justify-between gap-3 px-6 py-4 text-left hover:bg-ink-wash"
                    >
                      <span className="font-body text-sm text-ink">{entry.motion}</span>
                      <span
                        className={`font-label text-[0.6rem] uppercase tracking-[0.2em] ${STATUS_CLASS[entry.status]}`}
                      >
                        {statusLabel(entry.status)} · rev {entry.draftRevision}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {selected && (
            <DraftWorkstation
              key={selected.debate.id}
              detail={selected}
              onChanged={(debate) => {
                applyChange(debate);
                refreshList();
              }}
            />
          )}

          <NewDraftForm
            domains={domains}
            onCreated={(draft) => {
              void open(draft.debate.id);
              refreshList();
            }}
          />
        </div>
      )}
    </div>
  );
};

export default VideoDebateAdminPage;
