// Admin video-debate API contracts duplicated at the frontend HTTP boundary.

export type VideoDebateStatus = "draft" | "media_uploaded" | "validated" | "published";
export type DebateSide = "for" | "against";
export type ParticipantRole = "host" | DebateSide;
export type VideoObjectName = ParticipantRole | "poster";

export interface ValidationIssue {
  code: string;
  path: string;
  message: string;
}

export interface StorageFailure {
  object: VideoObjectName;
  code: string;
}

export interface AdminVideoDebate {
  id: number;
  slug: string;
  status: VideoDebateStatus;
  draftRevision: number;
  validatedRevision: number | null;
  submissionHash: string | null;
  validationIssues: ValidationIssue[];
}

export interface AdminVideoDebateListItem extends AdminVideoDebate {
  motion: string;
}

export interface DraftMetadataParticipant {
  role: ParticipantRole;
  display_name: string;
  avatar_url: string | null;
  username?: string;
}

export interface DraftMetadataRound {
  number: number;
  domain_id: number;
  domain: string;
  opener: DebateSide;
}

// The operator saves this as metadata/debate.json. It carries the media prefix
// receipt and never a credential or signed URL.
export interface VideoDebateDraftMetadataV1 {
  version: 1;
  draft_id: string;
  media_id: string;
  motion: string;
  slug: string;
  participants: DraftMetadataParticipant[];
  rounds: DraftMetadataRound[];
}

export interface AdminVideoDebateDetail {
  debate: AdminVideoDebate;
  mediaId: string;
  rclonePrefix: string;
  rcloneBucket: string;
  metadata: VideoDebateDraftMetadataV1;
}

// The create response reports only the new row's opening state; the workstation
// reads the full draft back through GET /admin/video-debates/:id.
export interface CreatedDraft {
  debate: { id: number; status: VideoDebateStatus; draftRevision: number };
  mediaId: string;
  rclonePrefix: string;
  metadata: VideoDebateDraftMetadataV1;
}

export interface ObjectReceipt {
  byteLength: number;
  etag: string;
}

export interface MediaCheckResponse {
  debate: AdminVideoDebate;
  receipts: Record<VideoObjectName, ObjectReceipt>;
}

export interface Domain {
  id: number;
  name: string;
}
