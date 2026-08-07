import { describe, expect, it } from "vitest";
import { formatIssue, workflowFor } from "./adminState";
import type { AdminVideoDebate, VideoDebateStatus } from "@/app/admin/video-debates/types";

function debate(overrides: Partial<AdminVideoDebate> = {}): AdminVideoDebate {
  return {
    id: 41,
    slug: "applied-learning",
    status: "draft",
    draftRevision: 1,
    validatedRevision: null,
    submissionHash: null,
    validationIssues: [],
    ...overrides,
  };
}

const STATUSES: VideoDebateStatus[] = ["draft", "media_uploaded", "validated", "published"];

describe("admin video debate workflow state", () => {
  it("shows upload instructions only for draft", () => {
    const shown = STATUSES.filter(
      (status) => workflowFor(debate({ status, submissionHash: "hash" })).showsUploadInstructions,
    );

    expect(shown).toEqual(["draft"]);
  });

  it("shows validate only after media and manifest exist", () => {
    expect(workflowFor(debate({ status: "draft", submissionHash: "hash" })).canValidate).toBe(false);
    expect(workflowFor(debate({ status: "media_uploaded", submissionHash: null })).canValidate).toBe(false);
    expect(workflowFor(debate({ status: "media_uploaded", submissionHash: "hash" })).canValidate).toBe(true);
  });

  it("shows publish only for current validated revision", () => {
    const stale = debate({
      status: "validated",
      submissionHash: "hash",
      draftRevision: 5,
      validatedRevision: 4,
    });
    const current = debate({
      status: "validated",
      submissionHash: "hash",
      draftRevision: 5,
      validatedRevision: 5,
    });

    expect(workflowFor(stale).canPublish).toBe(false);
    expect(workflowFor(current).canPublish).toBe(true);
    expect(workflowFor(debate({ status: "media_uploaded", submissionHash: "hash" })).canPublish).toBe(false);
  });

  it("shows unpublish only for published", () => {
    const shown = STATUSES.filter(
      (status) => workflowFor(debate({ status, submissionHash: "hash", validatedRevision: 1 })).canUnpublish,
    );

    expect(shown).toEqual(["published"]);
  });

  it("treats a published debate as immutable everywhere else", () => {
    const state = workflowFor(debate({ status: "published", submissionHash: "hash", validatedRevision: 1 }));

    expect(state).toMatchObject({
      canEditMetadata: false,
      canSubmitManifest: false,
      canCheckMedia: false,
      canValidate: false,
      canPublish: false,
      canRotateMedia: false,
    });
  });

  it("requires a manifest before the media check can compare object sizes", () => {
    expect(workflowFor(debate({ submissionHash: null })).canCheckMedia).toBe(false);
    expect(workflowFor(debate({ submissionHash: "hash" })).canCheckMedia).toBe(true);
  });

  // The backend moves an edited draft back to media_uploaded, so a stale validated
  // row is defensive only: it offers a re-edit, never a publish or a direct validate.
  it("names the next step when validation is behind the current revision", () => {
    const stale = workflowFor(debate({
      status: "validated",
      submissionHash: "hash",
      draftRevision: 6,
      validatedRevision: 5,
    }));

    expect(stale.nextStep).toMatch(/revision/i);
    expect(stale.canValidate).toBe(false);
    expect(stale.canPublish).toBe(false);
    expect(stale.canEditMetadata).toBe(true);
  });

  it("formats stable validation path and code without hiding details", () => {
    const formatted = formatIssue({
      code: "round_draw",
      path: "rounds[0]",
      message: "A round score cannot be tied.",
    });

    expect(formatted).toContain("round_draw");
    expect(formatted).toContain("rounds[0]");
    expect(formatted).toContain("A round score cannot be tied.");
  });
});
