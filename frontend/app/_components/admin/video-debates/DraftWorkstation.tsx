"use client";

// One draft, from rclone prefix to publication.
//
// This tool never touches video bytes: the four objects go straight to R2 with the
// operator's own tooling and only the small manifest JSON is posted here. There is
// no `accept="video/*"` element anywhere on this page, by design.

import { useRef, useState } from "react";
import { isAxiosError } from "axios";
import api from "@/app/axios";
import Button from "@/app/_components/ui/Button";
import type {
  AdminVideoDebate,
  AdminVideoDebateDetail,
  MediaCheckResponse,
  ObjectReceipt,
  ParticipantRole,
  StorageFailure,
  ValidationIssue,
  VideoObjectName,
} from "@/app/admin/video-debates/types";
import { formatBytes, formatIssue, statusLabel, workflowFor } from "./adminState";

const OBJECT_FILES: Record<VideoObjectName, string> = {
  host: "host.mp4",
  for: "for.mp4",
  against: "against.mp4",
  poster: "poster.webp",
};
const OBJECT_NAMES: VideoObjectName[] = ["host", "for", "against", "poster"];

const FIELD =
  "w-full border border-ink-faint bg-paper px-4 py-3 font-body text-sm text-ink transition-colors placeholder:text-ink-soft focus:border-ink focus:outline-none";
const LABEL = "block font-label text-[10px] uppercase tracking-widest text-ink-soft";
const HEADING = "font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink-soft";

interface ParticipantEdit {
  role: ParticipantRole;
  displayName: string;
  avatarUrl: string;
  userId: string;
}

function participantEdits(detail: AdminVideoDebateDetail): ParticipantEdit[] {
  return detail.metadata.participants.map((participant) => ({
    role: participant.role,
    displayName: participant.display_name,
    avatarUrl: participant.avatar_url ?? "",
    userId: "",
  }));
}

function messageFrom(err: unknown, fallback: string): string {
  const body = isAxiosError<{ error?: string }>(err) ? err.response?.data : undefined;
  return body?.error ?? fallback;
}

const DraftWorkstation = ({
  detail,
  onChanged,
}: {
  detail: AdminVideoDebateDetail;
  onChanged: (debate: AdminVideoDebate) => void;
}) => {
  const [slug, setSlug] = useState(detail.metadata.slug);
  const [participants, setParticipants] = useState<ParticipantEdit[]>(() => participantEdits(detail));
  const [issues, setIssues] = useState<ValidationIssue[]>(detail.debate.validationIssues);
  const [failures, setFailures] = useState<StorageFailure[]>([]);
  const [receipts, setReceipts] = useState<Record<VideoObjectName, ObjectReceipt> | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmingUnpublish, setConfirmingUnpublish] = useState(false);
  const manifestInput = useRef<HTMLInputElement>(null);

  const debate = detail.debate;
  const workflow = workflowFor(debate);

  function begin() {
    setError("");
    setNotice("");
    setBusy(true);
  }

  function accept(next: AdminVideoDebate, message: string, nextIssues: ValidationIssue[] = []) {
    setIssues(nextIssues);
    setNotice(message);
    onChanged(next);
  }

  async function submitManifest(file: File) {
    begin();
    setFailures([]);
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const { data } = await api.put<{ debate: AdminVideoDebate; unchanged: boolean }>(
        `/admin/video-debates/${debate.id}/manifest`,
        parsed,
      );
      accept(
        data.debate,
        data.unchanged
          ? "That manifest is identical to the stored one. Nothing changed."
          : "Manifest stored. The draft is back to revision " + data.debate.draftRevision + ".",
      );
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError("That file is not valid JSON.");
      } else {
        const body = isAxiosError<{ error?: string; issues?: ValidationIssue[] }>(err)
          ? err.response?.data
          : undefined;
        setIssues(body?.issues ?? []);
        setError(body?.issues?.length ? "" : messageFrom(err, "Couldn't store that manifest."));
      }
    } finally {
      setBusy(false);
      if (manifestInput.current) manifestInput.current.value = "";
    }
  }

  async function checkMedia() {
    begin();
    setFailures([]);
    try {
      const { data } = await api.post<MediaCheckResponse>(
        `/admin/video-debates/${debate.id}/media/check`,
        {},
      );
      setReceipts(data.receipts);
      accept(data.debate, "All four objects verified.");
    } catch (err) {
      const body = isAxiosError<{ error?: string; failures?: StorageFailure[] }>(err)
        ? err.response?.data
        : undefined;
      setFailures(body?.failures ?? []);
      setError(body?.failures?.length ? "" : messageFrom(err, "Couldn't verify the objects."));
    } finally {
      setBusy(false);
    }
  }

  async function validate() {
    begin();
    setFailures([]);
    try {
      const { data } = await api.post<{ debate: AdminVideoDebate }>(
        `/admin/video-debates/${debate.id}/validate`,
        {},
      );
      accept(data.debate, "Validated at revision " + data.debate.draftRevision + ".");
    } catch (err) {
      const body = isAxiosError<{ error?: string; debate?: AdminVideoDebate; issues?: ValidationIssue[] }>(err)
        ? err.response?.data
        : undefined;
      setIssues(body?.issues ?? []);
      if (body?.debate) onChanged(body.debate);
      setError(body?.issues?.length ? "" : messageFrom(err, "Couldn't validate that draft."));
    } finally {
      setBusy(false);
    }
  }

  async function transition(path: string, message: string) {
    begin();
    try {
      const { data } = await api.post<{ debate: AdminVideoDebate }>(
        `/admin/video-debates/${debate.id}/${path}`,
        {},
      );
      accept(data.debate, message);
    } catch (err) {
      setError(messageFrom(err, "Couldn't complete that."));
    } finally {
      setBusy(false);
      setConfirmingUnpublish(false);
    }
  }

  async function rotateMedia() {
    begin();
    try {
      const { data } = await api.post<{ debate: AdminVideoDebate; rclonePrefix: string }>(
        `/admin/video-debates/${debate.id}/media-version`,
        {},
      );
      setReceipts(null);
      accept(
        data.debate,
        `New media prefix ${data.rclonePrefix}. Upload all four objects there and resubmit the manifest; the old keys are untouched.`,
      );
    } catch (err) {
      setError(messageFrom(err, "Couldn't rotate the media id."));
    } finally {
      setBusy(false);
    }
  }

  async function saveMetadata() {
    begin();
    try {
      const { data } = await api.patch<{ debate: AdminVideoDebate }>(
        `/admin/video-debates/${debate.id}/metadata`,
        {
          slug: slug.trim(),
          participants: participants.map((entry) => ({
            role: entry.role,
            display_name: entry.displayName.trim(),
            avatar_url: entry.avatarUrl.trim() === "" ? null : entry.avatarUrl.trim(),
            ...(entry.userId.trim() === "" ? {} : { user_id: Number(entry.userId.trim()) }),
          })),
        },
      );
      accept(data.debate, "Metadata saved. Any previous validation is cleared.");
    } catch (err) {
      const body = isAxiosError<{ error?: string; issues?: ValidationIssue[] }>(err)
        ? err.response?.data
        : undefined;
      setIssues(body?.issues ?? []);
      setError(body?.issues?.length ? "" : messageFrom(err, "Couldn't save that metadata."));
    } finally {
      setBusy(false);
    }
  }

  function downloadMetadata() {
    const blob = new Blob([JSON.stringify(detail.metadata, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "debate.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="border border-ink-faint bg-band p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className={HEADING}>
            {statusLabel(debate.status)} · revision {debate.draftRevision}
            {debate.validatedRevision !== null && ` · validated at ${debate.validatedRevision}`}
          </p>
          <h2 className="mt-3 font-headline text-2xl italic leading-snug text-ink">
            &ldquo;{detail.metadata.motion}&rdquo;
          </h2>
        </div>
        <a
          href={`/admin/video-debates/${debate.id}/preview`}
          className="border border-ink-faint px-5 py-2.5 font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink hover:bg-ink-wash"
        >
          Preview →
        </a>
      </div>

      <p className="mt-6 border-l-2 border-ink-faint bg-paper/60 py-3 pl-4 font-body text-sm leading-relaxed text-ink">
        {workflow.nextStep}
      </p>

      {notice !== "" && <p className="mt-4 font-body text-sm text-side-for">{notice}</p>}
      {error !== "" && <p className="mt-4 font-body text-sm text-side-against">{error}</p>}

      <div className="mt-8">
        <p className={HEADING}>Media prefix</p>
        {/* The --header-upload is not decoration: without it the objects carry no
            Cache-Control, Cloudflare stamps its own short default, and Check media
            refuses every MP4 with `cache_control`. */}
        <code className="mt-3 block overflow-x-auto whitespace-pre border border-ink-faint bg-paper px-4 py-3 font-label text-xs text-ink">
          {`rclone copy publish/ r2:${detail.rcloneBucket}/${detail.rclonePrefix} \\\n  --header-upload "Cache-Control: public, max-age=31536000, immutable" --progress`}
        </code>
        {workflow.showsUploadInstructions && (
          <ul className="mt-3 space-y-1 font-body text-sm text-ink-soft">
            {OBJECT_NAMES.map((name) => (
              <li key={name}>
                {detail.rclonePrefix}
                {OBJECT_FILES[name]}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="outline" size="sm" onClick={downloadMetadata}>
            Download debate.json
          </Button>
          <Button variant="outline" size="sm" onClick={checkMedia} disabled={busy || !workflow.canCheckMedia}>
            Check media
          </Button>
          <Button
            variant="outline-neutral"
            size="sm"
            onClick={rotateMedia}
            disabled={busy || !workflow.canRotateMedia}
          >
            Rotate media id
          </Button>
        </div>
      </div>

      {receipts && (
        <dl className="mt-6 grid gap-2 sm:grid-cols-2">
          {OBJECT_NAMES.map((name) => (
            <div key={name} className="border border-ink-faint bg-paper px-4 py-3">
              <dt className="font-label text-[0.6rem] uppercase tracking-[0.2em] text-ink-soft">
                {OBJECT_FILES[name]}
              </dt>
              <dd className="mt-1 font-body text-sm text-ink">
                {formatBytes(receipts[name].byteLength)} · {receipts[name].etag}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {failures.length > 0 && (
        <ul className="mt-6 space-y-1 border-l-2 border-side-against bg-paper/60 py-3 pl-4">
          {failures.map((failure) => (
            <li key={`${failure.object}-${failure.code}`} className="font-body text-sm text-ink-soft">
              {OBJECT_FILES[failure.object]} · {failure.code}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10">
        <p className={HEADING}>Manifest</p>
        <p className="mt-3 font-body text-sm leading-relaxed text-ink-soft">
          Choose the local <code className="font-label text-xs">output/manifest.json</code>. Only
          this JSON travels through Crux; the video never does.
        </p>
        <input
          ref={manifestInput}
          type="file"
          accept="application/json,.json"
          aria-label="Manifest JSON file"
          disabled={busy || !workflow.canSubmitManifest}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) void submitManifest(file);
          }}
          className="mt-4 block w-full border border-ink-faint bg-paper px-4 py-3 font-body text-sm text-ink file:mr-4 file:border file:border-ink-faint file:bg-band file:px-4 file:py-2 file:font-label file:text-[0.6rem] file:uppercase file:tracking-[0.2em] file:text-ink disabled:opacity-40"
        />
        {debate.submissionHash !== null && (
          <p className="mt-3 font-label text-[0.6rem] uppercase tracking-[0.2em] text-ink-soft">
            Stored hash {debate.submissionHash.slice(0, 12)}…
          </p>
        )}
      </div>

      {issues.length > 0 && (
        <div className="mt-6">
          <p className={HEADING}>Validation issues</p>
          <ul className="mt-3 space-y-1 border-l-2 border-side-against bg-paper/60 py-3 pl-4">
            {issues.map((issue) => (
              <li key={`${issue.code}-${issue.path}`} className="font-body text-sm text-ink-soft">
                {formatIssue(issue)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-10">
        <p className={HEADING}>Editorial metadata</p>
        <p className="mt-3 font-body text-sm leading-relaxed text-ink-soft">
          Every change here increments the revision and clears validation. The motion, the five
          domains and the Round 1 opener cannot be edited at all.
        </p>
        <div className="mt-4 space-y-2">
          <label htmlFor="draft-slug" className={LABEL}>
            Slug
          </label>
          <input
            id="draft-slug"
            value={slug}
            onChange={(event) => setSlug(event.currentTarget.value)}
            disabled={!workflow.canEditMetadata}
            className={FIELD}
          />
        </div>
        <div className="mt-4 space-y-3">
          {participants.map((entry, index) => (
            <div key={entry.role} className="grid gap-3 sm:grid-cols-[6rem_1fr_1fr_6rem]">
              <span className="self-center font-label text-[0.62rem] uppercase tracking-[0.2em] text-ink-soft">
                {entry.role === "host" ? "Host" : entry.role.toUpperCase()}
              </span>
              <input
                aria-label={`${entry.role} display name`}
                value={entry.displayName}
                disabled={!workflow.canEditMetadata}
                onChange={(event) =>
                  setParticipants((current) =>
                    current.map((value, at) =>
                      at === index ? { ...value, displayName: event.currentTarget.value } : value,
                    ),
                  )
                }
                className={FIELD}
              />
              <input
                aria-label={`${entry.role} avatar URL`}
                value={entry.avatarUrl}
                disabled={!workflow.canEditMetadata}
                onChange={(event) =>
                  setParticipants((current) =>
                    current.map((value, at) =>
                      at === index ? { ...value, avatarUrl: event.currentTarget.value } : value,
                    ),
                  )
                }
                className={FIELD}
              />
              <input
                aria-label={`${entry.role} linked user id`}
                value={entry.userId}
                placeholder="User id"
                disabled={!workflow.canEditMetadata}
                onChange={(event) =>
                  setParticipants((current) =>
                    current.map((value, at) =>
                      at === index ? { ...value, userId: event.currentTarget.value } : value,
                    ),
                  )
                }
                className={FIELD}
              />
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={saveMetadata} disabled={busy || !workflow.canEditMetadata}>
            Save metadata
          </Button>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap gap-3 border-t border-ink-faint pt-8">
        <Button variant="outline" size="sm" onClick={validate} disabled={busy || !workflow.canValidate}>
          Validate
        </Button>
        <Button
          variant="solid"
          size="sm"
          onClick={() => transition("publish", "Published.")}
          disabled={busy || !workflow.canPublish}
        >
          Publish
        </Button>
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={() => setConfirmingUnpublish(true)}
          disabled={busy || !workflow.canUnpublish}
        >
          Unpublish
        </Button>
      </div>

      {confirmingUnpublish && (
        <div role="alertdialog" aria-label="Confirm unpublish" className="mt-6 border border-side-against bg-paper p-6">
          <p className="font-body text-sm leading-relaxed text-ink">
            Unpublishing removes the Crux page, the public API record and the captions immediately.
            It does not delete the four R2 objects — anyone holding a direct media URL keeps it.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => transition("unpublish", "Unpublished. The R2 objects are untouched.")}
              disabled={busy}
            >
              Yes, unpublish
            </Button>
            <Button variant="outline-neutral" size="sm" onClick={() => setConfirmingUnpublish(false)}>
              Keep it published
            </Button>
          </div>
        </div>
      )}
    </section>
  );
};

export default DraftWorkstation;
