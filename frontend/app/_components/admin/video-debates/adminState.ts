// Turns one stored draft state into the actions the workstation may offer.
//
// Every action here is also re-checked server-side; a hidden button is not a rule.

import type {
  AdminVideoDebate,
  ValidationIssue,
  VideoDebateStatus,
} from "@/app/admin/video-debates/types";

export interface WorkflowState {
  showsUploadInstructions: boolean;
  canEditMetadata: boolean;
  canSubmitManifest: boolean;
  canCheckMedia: boolean;
  canValidate: boolean;
  canPublish: boolean;
  canUnpublish: boolean;
  canRotateMedia: boolean;
  nextStep: string;
}

const STATUS_LABEL: Record<VideoDebateStatus, string> = {
  draft: "Draft",
  media_uploaded: "Media verified",
  validated: "Validated",
  published: "Published",
};

export function statusLabel(status: VideoDebateStatus): string {
  return STATUS_LABEL[status];
}

export function workflowFor(debate: AdminVideoDebate): WorkflowState {
  const published = debate.status === "published";
  const hasManifest = debate.submissionHash !== null;
  const currentValidation = debate.validatedRevision === debate.draftRevision;
  const staleValidation = debate.status === "validated" && !currentValidation;

  return {
    showsUploadInstructions: debate.status === "draft",
    canEditMetadata: !published,
    canSubmitManifest: !published,
    // The check compares Content-Length against the submitted probe sizes, so the
    // manifest has to land before the four objects can be verified.
    canCheckMedia: !published && hasManifest && debate.status !== "validated",
    canValidate: debate.status === "media_uploaded" && hasManifest,
    canPublish: debate.status === "validated" && currentValidation,
    canUnpublish: published,
    canRotateMedia: !published,
    nextStep: nextStepFor(debate, hasManifest, staleValidation),
  };
}

function nextStepFor(
  debate: AdminVideoDebate,
  hasManifest: boolean,
  staleValidation: boolean,
): string {
  if (debate.status === "published") {
    return "Published. Unpublish to edit — the four R2 objects stay exactly where they are.";
  }
  if (staleValidation) {
    return "Validation is behind the current revision. Edit metadata or resubmit the manifest, then validate again.";
  }
  if (debate.status === "validated") {
    return "Preview the programme, then publish.";
  }
  if (!hasManifest) {
    return "Submit output/manifest.json, then upload the four objects and run the media check.";
  }
  if (debate.status === "draft") {
    return "Upload host.mp4, for.mp4, against.mp4 and poster.webp to the prefix, then run the media check.";
  }
  return "Validate the stored manifest against the live objects.";
}

export function formatIssue(issue: ValidationIssue): string {
  return `${issue.code} · ${issue.path} — ${issue.message}`;
}

export function formatBytes(byteLength: number): string {
  if (byteLength < 1024) return `${byteLength} B`;
  const units = ["KB", "MB", "GB"];
  let value = byteLength / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unit]}`;
}
