import { describe, expect, it } from "vitest";
import { nextVideoDebateState } from "./lifecycle.logic.js";
import type { VideoDebateLifecycleState } from "./lifecycle.logic.js";

const verifiedObjects = {
  host: true,
  for: true,
  against: true,
  poster: true,
};

function state(overrides: Partial<VideoDebateLifecycleState> = {}): VideoDebateLifecycleState {
  return {
    status: "draft",
    draftRevision: 1,
    validatedRevision: null,
    submissionHash: null,
    objectReceipts: {
      host: false,
      for: false,
      against: false,
      poster: false,
    },
    validationIssues: [],
    ...overrides,
  };
}

describe("nextVideoDebateState", () => {
  it("draft moves to media_uploaded only after all four objects verify", () => {
    const incomplete = nextVideoDebateState(
      state(),
      { type: "media_verified", objectReceipts: { ...verifiedObjects, poster: false } },
    );
    const complete = nextVideoDebateState(
      state(),
      { type: "media_verified", objectReceipts: verifiedObjects },
    );

    expect(incomplete).toMatchObject({
      ok: true,
      state: { status: "draft" },
      commands: { setObjectReceipts: { ...verifiedObjects, poster: false } },
    });
    expect(complete).toMatchObject({
      ok: true,
      state: { status: "media_uploaded" },
      commands: { setStatus: "media_uploaded", setObjectReceipts: verifiedObjects },
    });
  });

  it("validated metadata or manifest change returns to media_uploaded and increments revision", () => {
    const contentEvents = [
      { type: "metadata_changed" as const },
      { type: "manifest_changed" as const, submissionHash: "new-hash" },
    ];
    for (const event of contentEvents) {
      const outcome = nextVideoDebateState(
        state({
          status: "validated",
          draftRevision: 4,
          validatedRevision: 4,
          submissionHash: "old-hash",
          objectReceipts: verifiedObjects,
        }),
        event,
      );

      expect(outcome).toMatchObject({
        ok: true,
        state: { status: "media_uploaded", draftRevision: 5, validatedRevision: null },
        commands: {
          setStatus: "media_uploaded",
          setDraftRevision: 5,
          setValidatedRevision: null,
          clearValidatedAt: true,
        },
      });
    }
  });

  it("metadata change preserves the manifest hash and resubmitting that manifest is idempotent", () => {
    const current = state({
      status: "validated",
      draftRevision: 4,
      validatedRevision: 4,
      submissionHash: "manifest-hash",
      objectReceipts: verifiedObjects,
    });

    const metadataChanged = nextVideoDebateState(current, { type: "metadata_changed" });
    expect(metadataChanged).toMatchObject({
      ok: true,
      state: {
        status: "media_uploaded",
        draftRevision: 5,
        submissionHash: "manifest-hash",
      },
      commands: {
        setDraftRevision: 5,
        setValidatedRevision: null,
        clearValidatedAt: true,
      },
    });
    expect(metadataChanged.ok && metadataChanged.commands).not.toHaveProperty("setSubmissionHash");

    if (!metadataChanged.ok) throw new Error("metadata transition rejected");
    expect(nextVideoDebateState(
      metadataChanged.state,
      { type: "manifest_changed", submissionHash: "manifest-hash" },
    )).toEqual({ ok: true, state: metadataChanged.state, commands: {} });
  });

  it("an identical submission hash is idempotent and keeps validation", () => {
    const outcome = nextVideoDebateState(
      state({
        status: "validated",
        draftRevision: 4,
        validatedRevision: 4,
        submissionHash: "same-hash",
        objectReceipts: verifiedObjects,
      }),
      { type: "manifest_changed", submissionHash: "same-hash" },
    );

    expect(outcome).toEqual({
      ok: true,
      state: state({
        status: "validated",
        draftRevision: 4,
        validatedRevision: 4,
        submissionHash: "same-hash",
        objectReceipts: verifiedObjects,
      }),
      commands: {},
    });
  });

  it("media rotation returns to draft, clears receipts, and increments revision", () => {
    const outcome = nextVideoDebateState(
      state({
        status: "media_uploaded",
        draftRevision: 2,
        submissionHash: "old-hash",
        objectReceipts: verifiedObjects,
      }),
      { type: "media_rotated" },
    );

    expect(outcome).toMatchObject({
      ok: true,
      state: {
        status: "draft",
        draftRevision: 3,
        submissionHash: null,
        objectReceipts: { host: false, for: false, against: false, poster: false },
      },
      commands: {
        setStatus: "draft",
        setDraftRevision: 3,
        setSubmissionHash: null,
        clearObjectReceipts: true,
      },
    });
  });

  it("validation pass records validated_revision equal to draft_revision", () => {
    const outcome = nextVideoDebateState(
      state({ status: "media_uploaded", draftRevision: 7, objectReceipts: verifiedObjects }),
      { type: "validation_passed" },
    );

    expect(outcome).toMatchObject({
      ok: true,
      state: { status: "validated", validatedRevision: 7, validationIssues: [] },
      commands: {
        setStatus: "validated",
        setValidatedRevision: 7,
        setValidationIssues: [],
        setValidatedAt: true,
      },
    });
  });

  it("validation failure stays media_uploaded and stores issues", () => {
    const issues = [{ code: "manifest_shape", path: "timeline", message: "Timeline is incomplete." }];
    const outcome = nextVideoDebateState(
      state({ status: "media_uploaded", objectReceipts: verifiedObjects }),
      { type: "validation_failed", issues },
    );

    expect(outcome).toMatchObject({
      ok: true,
      state: { status: "media_uploaded", validatedRevision: null, validationIssues: issues },
      commands: { setValidationIssues: issues, setValidatedRevision: null, clearValidatedAt: true },
    });
  });

  it("publish requires validated status and equal revisions", () => {
    const draft = nextVideoDebateState(
      state({ status: "media_uploaded", objectReceipts: verifiedObjects }),
      { type: "published", objectReceipts: verifiedObjects },
    );
    const stale = nextVideoDebateState(
      state({
        status: "validated",
        draftRevision: 3,
        validatedRevision: 2,
        objectReceipts: verifiedObjects,
      }),
      { type: "published", objectReceipts: verifiedObjects },
    );
    const valid = nextVideoDebateState(
      state({
        status: "validated",
        draftRevision: 3,
        validatedRevision: 3,
        objectReceipts: verifiedObjects,
      }),
      { type: "published", objectReceipts: verifiedObjects },
    );

    expect(draft).toEqual({ ok: false, code: "invalid_transition" });
    expect(stale).toEqual({ ok: false, code: "invalid_transition" });
    expect(valid).toMatchObject({
      ok: true,
      state: { status: "published" },
      commands: { setStatus: "published", setPublishedAt: true },
    });
  });

  it("published rows reject metadata, manifest, and media rotation mutations", () => {
    const current = state({
      status: "published",
      draftRevision: 5,
      validatedRevision: 5,
      submissionHash: "published-hash",
      objectReceipts: verifiedObjects,
    });

    expect(nextVideoDebateState(current, { type: "metadata_changed" }))
      .toEqual({ ok: false, code: "invalid_transition" });
    expect(nextVideoDebateState(current, { type: "manifest_changed", submissionHash: "next-hash" }))
      .toEqual({ ok: false, code: "invalid_transition" });
    expect(nextVideoDebateState(current, { type: "media_rotated" }))
      .toEqual({ ok: false, code: "invalid_transition" });
  });

  it("unpublish moves published to validated without changing the revision", () => {
    const outcome = nextVideoDebateState(
      state({
        status: "published",
        draftRevision: 5,
        validatedRevision: 5,
        submissionHash: "published-hash",
        objectReceipts: verifiedObjects,
      }),
      { type: "unpublished" },
    );

    expect(outcome).toMatchObject({
      ok: true,
      state: { status: "validated", draftRevision: 5, validatedRevision: 5 },
      commands: { setStatus: "validated", clearPublishedAt: true },
    });
  });

  it("republish requires object verification and the same validated revision", () => {
    const current = state({
      status: "validated",
      draftRevision: 8,
      validatedRevision: 8,
      submissionHash: "republish-hash",
      objectReceipts: verifiedObjects,
    });
    const missingObject = nextVideoDebateState(
      current,
      { type: "published", objectReceipts: { ...verifiedObjects, against: false } },
    );
    const republished = nextVideoDebateState(current, { type: "published", objectReceipts: verifiedObjects });

    expect(missingObject).toEqual({ ok: false, code: "invalid_transition" });
    expect(republished).toMatchObject({
      ok: true,
      state: { status: "published", draftRevision: 8, validatedRevision: 8 },
      commands: { setStatus: "published", setObjectReceipts: verifiedObjects, setPublishedAt: true },
    });
  });
});
