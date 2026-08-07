// The states a programme moves through, and which moves are legal.
//
// draft -> media_uploaded -> validated -> published, and back again on unpublish.
// Keeping the rules here rather than in the controller means an illegal move is a
// failing test rather than a corrupted row.

export type VideoDebateStatus = "draft" | "media_uploaded" | "validated" | "published";

export type VideoDebateObjectReceipts = {
  host: boolean;
  for: boolean;
  against: boolean;
  poster: boolean;
};

export type VideoDebateValidationIssue = {
  code: string;
  path: string;
  message: string;
};

export type VideoDebateLifecycleState = {
  status: VideoDebateStatus;
  draftRevision: number;
  validatedRevision: number | null;
  submissionHash: string | null;
  objectReceipts: VideoDebateObjectReceipts;
  validationIssues: readonly VideoDebateValidationIssue[];
};

export type VideoDebateLifecycleEvent =
  | { type: "metadata_changed" }
  | { type: "manifest_changed"; submissionHash: string }
  | { type: "media_rotated" }
  | { type: "media_verified"; objectReceipts: VideoDebateObjectReceipts }
  | { type: "validation_passed" }
  | { type: "validation_failed"; issues: readonly VideoDebateValidationIssue[] }
  | { type: "published"; objectReceipts: VideoDebateObjectReceipts }
  | { type: "unpublished" };

export type VideoDebateLifecycleCommands = {
  setStatus?: VideoDebateStatus;
  setDraftRevision?: number;
  setValidatedRevision?: number | null;
  setSubmissionHash?: string | null;
  setValidationIssues?: VideoDebateValidationIssue[];
  setObjectReceipts?: VideoDebateObjectReceipts;
  clearObjectReceipts?: true;
  setValidatedAt?: true;
  clearValidatedAt?: true;
  setPublishedAt?: true;
  clearPublishedAt?: true;
};

export type TransitionResult =
  | { ok: true; state: VideoDebateLifecycleState; commands: VideoDebateLifecycleCommands }
  | { ok: false; code: "invalid_transition" };

const emptyObjectReceipts = (): VideoDebateObjectReceipts => ({
  host: false,
  for: false,
  against: false,
  poster: false,
});

function copyObjectReceipts(receipts: VideoDebateObjectReceipts): VideoDebateObjectReceipts {
  return {
    host: receipts.host,
    for: receipts.for,
    against: receipts.against,
    poster: receipts.poster,
  };
}

function copyIssues(issues: readonly VideoDebateValidationIssue[]): VideoDebateValidationIssue[] {
  return issues.map((issue) => ({ code: issue.code, path: issue.path, message: issue.message }));
}

function copyState(state: VideoDebateLifecycleState): VideoDebateLifecycleState {
  return {
    status: state.status,
    draftRevision: state.draftRevision,
    validatedRevision: state.validatedRevision,
    submissionHash: state.submissionHash,
    objectReceipts: copyObjectReceipts(state.objectReceipts),
    validationIssues: copyIssues(state.validationIssues),
  };
}

function allObjectsVerified(receipts: VideoDebateObjectReceipts): boolean {
  return receipts.host && receipts.for && receipts.against && receipts.poster;
}

function accepted(
  state: VideoDebateLifecycleState,
  commands: VideoDebateLifecycleCommands,
): TransitionResult {
  return { ok: true, state, commands };
}

function invalid(): TransitionResult {
  return { ok: false, code: "invalid_transition" };
}

function invalidateValidation(
  current: VideoDebateLifecycleState,
  submissionHash: string | null,
  updateSubmissionHash: boolean,
): TransitionResult {
  const status = current.status === "validated" ? "media_uploaded" : current.status;
  const draftRevision = current.draftRevision + 1;
  const state: VideoDebateLifecycleState = {
    status,
    draftRevision,
    validatedRevision: null,
    submissionHash,
    objectReceipts: copyObjectReceipts(current.objectReceipts),
    validationIssues: [],
  };
  const commands: VideoDebateLifecycleCommands = {
    setDraftRevision: draftRevision,
    setValidatedRevision: null,
    setValidationIssues: [],
    clearValidatedAt: true,
  };
  if (updateSubmissionHash) commands.setSubmissionHash = submissionHash;
  if (status !== current.status) commands.setStatus = status;
  return accepted(state, commands);
}

function changeSubmission(
  current: VideoDebateLifecycleState,
  submissionHash: string,
): TransitionResult {
  if (current.submissionHash === submissionHash) return accepted(copyState(current), {});
  return invalidateValidation(current, submissionHash, true);
}

function rotateMedia(current: VideoDebateLifecycleState): TransitionResult {
  const draftRevision = current.draftRevision + 1;
  return accepted(
    {
      status: "draft",
      draftRevision,
      validatedRevision: null,
      submissionHash: null,
      objectReceipts: emptyObjectReceipts(),
      validationIssues: [],
    },
    {
      setStatus: "draft",
      setDraftRevision: draftRevision,
      setValidatedRevision: null,
      setSubmissionHash: null,
      setValidationIssues: [],
      clearObjectReceipts: true,
      clearValidatedAt: true,
    },
  );
}

export function nextVideoDebateState(
  current: VideoDebateLifecycleState,
  event: VideoDebateLifecycleEvent,
): TransitionResult {
  if (current.status === "published") {
    if (event.type !== "unpublished") return invalid();
    return accepted(
      {
        status: "validated",
        draftRevision: current.draftRevision,
        validatedRevision: current.validatedRevision,
        submissionHash: current.submissionHash,
        objectReceipts: copyObjectReceipts(current.objectReceipts),
        validationIssues: copyIssues(current.validationIssues),
      },
      { setStatus: "validated", clearPublishedAt: true },
    );
  }

  if (event.type === "metadata_changed") {
    if (current.status === "draft" || current.status === "media_uploaded" || current.status === "validated") {
      return invalidateValidation(current, current.submissionHash, false);
    }
    return invalid();
  }

  if (event.type === "manifest_changed") {
    if (current.status === "draft" || current.status === "media_uploaded" || current.status === "validated") {
      return changeSubmission(current, event.submissionHash);
    }
    return invalid();
  }

  if (event.type === "media_rotated") {
    if (current.status === "draft" || current.status === "media_uploaded" || current.status === "validated") {
      return rotateMedia(current);
    }
    return invalid();
  }

  if (event.type === "media_verified") {
    if (current.status !== "draft" && current.status !== "media_uploaded") return invalid();
    const objectReceipts = copyObjectReceipts(event.objectReceipts);
    const status = allObjectsVerified(objectReceipts) ? "media_uploaded" : "draft";
    return accepted(
      {
        status,
        draftRevision: current.draftRevision,
        validatedRevision: current.validatedRevision,
        submissionHash: current.submissionHash,
        objectReceipts,
        validationIssues: copyIssues(current.validationIssues),
      },
      {
        setObjectReceipts: copyObjectReceipts(objectReceipts),
        ...(status === current.status ? {} : { setStatus: status }),
      },
    );
  }

  if (event.type === "validation_passed") {
    if (current.status !== "media_uploaded" || !allObjectsVerified(current.objectReceipts)) return invalid();
    return accepted(
      {
        status: "validated",
        draftRevision: current.draftRevision,
        validatedRevision: current.draftRevision,
        submissionHash: current.submissionHash,
        objectReceipts: copyObjectReceipts(current.objectReceipts),
        validationIssues: [],
      },
      {
        setStatus: "validated",
        setValidatedRevision: current.draftRevision,
        setValidationIssues: [],
        setValidatedAt: true,
      },
    );
  }

  if (event.type === "validation_failed") {
    if (current.status !== "media_uploaded") return invalid();
    const issues = copyIssues(event.issues);
    return accepted(
      {
        status: "media_uploaded",
        draftRevision: current.draftRevision,
        validatedRevision: null,
        submissionHash: current.submissionHash,
        objectReceipts: copyObjectReceipts(current.objectReceipts),
        validationIssues: issues,
      },
      { setValidatedRevision: null, setValidationIssues: copyIssues(issues), clearValidatedAt: true },
    );
  }

  if (event.type === "published") {
    if (
      current.status !== "validated" ||
      current.validatedRevision !== current.draftRevision ||
      !allObjectsVerified(event.objectReceipts)
    ) return invalid();
    const objectReceipts = copyObjectReceipts(event.objectReceipts);
    return accepted(
      {
        status: "published",
        draftRevision: current.draftRevision,
        validatedRevision: current.validatedRevision,
        submissionHash: current.submissionHash,
        objectReceipts,
        validationIssues: copyIssues(current.validationIssues),
      },
      {
        setStatus: "published",
        setObjectReceipts: copyObjectReceipts(objectReceipts),
        setPublishedAt: true,
      },
    );
  }

  return invalid();
}
