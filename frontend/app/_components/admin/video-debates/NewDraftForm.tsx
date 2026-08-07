"use client";

// Creates the draft that fixes the participant contract.
//
// Motion, the five domains and the Round 1 opener become immutable the moment this
// posts — a correction to any of them is a new draft, not an edit — so the form
// states that before it can be submitted.

import { useState } from "react";
import { isAxiosError } from "axios";
import api from "@/app/axios";
import Button from "@/app/_components/ui/Button";
import type {
  CreatedDraft,
  DebateSide,
  Domain,
  ParticipantRole,
  ValidationIssue,
} from "@/app/admin/video-debates/types";
import { formatIssue } from "./adminState";

const ROLES: { role: ParticipantRole; label: string }[] = [
  { role: "host", label: "Host" },
  { role: "for", label: "FOR" },
  { role: "against", label: "AGAINST" },
];

const FIELD =
  "w-full border border-ink-faint bg-paper px-4 py-3 font-body text-sm text-ink transition-colors placeholder:text-ink-soft focus:border-ink focus:outline-none";
const LABEL = "block font-label text-[10px] uppercase tracking-widest text-ink-soft";

interface ParticipantDraft {
  role: ParticipantRole;
  userId: string;
  displayName: string;
  avatarUrl: string;
}

const emptyParticipants = (): ParticipantDraft[] =>
  ROLES.map(({ role }) => ({ role, userId: "", displayName: "", avatarUrl: "" }));

const NewDraftForm = ({
  domains,
  onCreated,
}: {
  domains: Domain[];
  onCreated: (draft: CreatedDraft) => void;
}) => {
  const [slug, setSlug] = useState("");
  const [motion, setMotion] = useState("");
  const [participants, setParticipants] = useState<ParticipantDraft[]>(emptyParticipants);
  const [roundDomains, setRoundDomains] = useState<string[]>(["", "", "", "", ""]);
  const [opener, setOpener] = useState<DebateSide>("for");
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function updateParticipant(role: ParticipantRole, patch: Partial<ParticipantDraft>) {
    setParticipants((current) =>
      current.map((entry) => (entry.role === role ? { ...entry, ...patch } : entry)),
    );
  }

  function updateRoundDomain(index: number, value: string) {
    setRoundDomains((current) => current.map((entry, at) => (at === index ? value : entry)));
  }

  const chosen = roundDomains.filter((value) => value !== "");
  const complete =
    slug.trim() !== "" &&
    motion.trim() !== "" &&
    participants.every((entry) => entry.displayName.trim() !== "") &&
    chosen.length === 5 &&
    new Set(chosen).size === 5;

  async function create() {
    setError("");
    setIssues([]);
    setBusy(true);
    try {
      const { data } = await api.post<CreatedDraft>("/admin/video-debates", {
        slug: slug.trim(),
        motion: motion.trim(),
        participants: participants.map((entry) => ({
          role: entry.role,
          user_id: entry.userId.trim() === "" ? null : Number(entry.userId.trim()),
          display_name: entry.displayName.trim(),
          avatar_url: entry.avatarUrl.trim() === "" ? null : entry.avatarUrl.trim(),
        })),
        rounds: roundDomains.map((value, index) => {
          const domain = domains.find((entry) => String(entry.id) === value);
          return {
            number: index + 1,
            domain_id: domain?.id ?? 0,
            domain: domain?.name ?? "",
            opener: index % 2 === 0 ? opener : opener === "for" ? "against" : "for",
          };
        }),
      });
      setSlug("");
      setMotion("");
      setParticipants(emptyParticipants());
      setRoundDomains(["", "", "", "", ""]);
      onCreated(data);
    } catch (err) {
      const body = isAxiosError<{ error?: string; issues?: ValidationIssue[] }>(err)
        ? err.response?.data
        : undefined;
      setIssues(body?.issues ?? []);
      setError(body?.issues?.length ? "" : body?.error ?? "Couldn't create that draft.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border border-ink-faint bg-band p-8">
      <h2 className="font-label text-[0.7rem] uppercase tracking-[0.2em] text-ink">New draft</h2>
      <p className="mt-2 font-body text-sm leading-relaxed text-ink-soft">
        The motion, the five domains and the Round 1 opener are fixed by this form and cannot be
        edited afterwards. A correction to any of them is a new draft. The slug and the three
        participant snapshots stay editable until publication.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="video-debate-slug" className={LABEL}>
            Slug
          </label>
          <input
            id="video-debate-slug"
            value={slug}
            onChange={(event) => setSlug(event.currentTarget.value)}
            placeholder="applied-learning"
            className={FIELD}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="video-debate-opener" className={LABEL}>
            Round 1 opener
          </label>
          <select
            id="video-debate-opener"
            value={opener}
            onChange={(event) => setOpener(event.currentTarget.value === "against" ? "against" : "for")}
            className={FIELD}
          >
            <option value="for">FOR opens Round 1</option>
            <option value="against">AGAINST opens Round 1</option>
          </select>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <label htmlFor="video-debate-motion" className={LABEL}>
          Motion
        </label>
        <textarea
          id="video-debate-motion"
          value={motion}
          onChange={(event) => setMotion(event.currentTarget.value)}
          rows={2}
          placeholder="Schools should replace final exams with project work."
          className={`${FIELD} resize-y`}
        />
      </div>

      <fieldset className="mt-8">
        <legend className={LABEL}>Participants</legend>
        <div className="mt-3 space-y-3">
          {participants.map((entry) => {
            const label = ROLES.find((role) => role.role === entry.role)?.label ?? entry.role;
            return (
              <div key={entry.role} className="grid gap-3 sm:grid-cols-[6rem_1fr_1fr_6rem]">
                <span className="self-center font-label text-[0.62rem] uppercase tracking-[0.2em] text-ink-soft">
                  {label}
                </span>
                <input
                  aria-label={`${label} display name`}
                  value={entry.displayName}
                  onChange={(event) => updateParticipant(entry.role, { displayName: event.currentTarget.value })}
                  placeholder="Display name"
                  className={FIELD}
                />
                <input
                  aria-label={`${label} avatar URL`}
                  value={entry.avatarUrl}
                  onChange={(event) => updateParticipant(entry.role, { avatarUrl: event.currentTarget.value })}
                  placeholder="Avatar URL (optional)"
                  className={FIELD}
                />
                <input
                  aria-label={`${label} linked user id`}
                  value={entry.userId}
                  onChange={(event) => updateParticipant(entry.role, { userId: event.currentTarget.value })}
                  placeholder="User id"
                  className={FIELD}
                />
              </div>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-8">
        <legend className={LABEL}>Five distinct domains, in round order</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {roundDomains.map((value, index) => (
            <div key={index} className="grid gap-3 sm:grid-cols-[5rem_1fr]">
              <span className="self-center font-label text-[0.62rem] uppercase tracking-[0.2em] text-ink-soft">
                Round {index + 1}
              </span>
              <select
                aria-label={`Round ${index + 1} domain`}
                value={value}
                onChange={(event) => updateRoundDomain(index, event.currentTarget.value)}
                className={FIELD}
              >
                <option value="">Choose a domain</option>
                {domains.map((domain) => (
                  <option key={domain.id} value={String(domain.id)}>
                    {domain.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </fieldset>

      {issues.length > 0 && (
        <ul className="mt-6 space-y-1 border-l-2 border-side-against bg-paper/60 py-3 pl-4">
          {issues.map((issue) => (
            <li key={`${issue.code}-${issue.path}`} className="font-body text-sm text-ink-soft">
              {formatIssue(issue)}
            </li>
          ))}
        </ul>
      )}
      {error !== "" && (
        <p className="mt-6 font-body text-sm text-side-against">{error}</p>
      )}

      <div className="mt-8">
        <Button variant="solid" size="sm" onClick={create} disabled={busy || !complete}>
          Create draft
        </Button>
      </div>
    </section>
  );
};

export default NewDraftForm;
