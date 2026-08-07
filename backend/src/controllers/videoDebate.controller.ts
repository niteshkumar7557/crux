// Serves published video-debate metadata and captions, and owns the admin publication lifecycle.

import pool from "../db/index.js";
import config from "../config/index.js";
import logger from "../lib/logger.js";
import { createHash, randomUUID } from "node:crypto";
import { renderWebVtt } from "../video-debates/captions.logic.js";
import {
  VIDEO_PASS_COOKIE,
  VIDEO_PASS_MAX_AGE_MS,
  issueVideoPass,
  passwordAccepted,
} from "../video-debates/access.logic.js";
import {
  domainsFromAggregate,
  mediaIdFromVideoDebateRow,
  participantsFromAggregate,
  toVideoDebateDetail,
  toVideoDebateListItem,
  transcriptFromStored,
} from "../video-debates/public.logic.js";
import {
  makeVideoStore,
  type ExpectedVideoLengths,
  type VideoObjectMap,
  type VideoStorageFailure,
  type VideoVerificationResult,
} from "../video-debates/videoStorage.js";
import type {
  DebateSide,
  ParticipantRole,
  ValidationIssue,
  VideoDebateDraftMetadataV1,
} from "../video-debates/manifest.types.js";
import { validateSubmissionV1 } from "../video-debates/manifest.logic.js";
import { narrowPlaybackEvent } from "../video-debates/telemetry.logic.js";
import {
  nextVideoDebateState,
  type VideoDebateLifecycleState,
  type VideoDebateObjectReceipts,
  type VideoDebateStatus,
} from "../video-debates/lifecycle.logic.js";

export interface DbLike {
  query(sql: string, values?: readonly unknown[]): Promise<{ rows: unknown[] }>;
  connect?(): Promise<DbClientLike>;
}

export interface DbClientLike {
  query(sql: string, values?: readonly unknown[]): Promise<{ rows: unknown[] }>;
  release(): void;
}

interface PublicVideoStore {
  configured: boolean;
  keysFor?(mediaId: string): VideoObjectMap<string>;
  publicUrlsFor(mediaId: string): VideoObjectMap<string>;
  verify(mediaId: string, expectedLengths: ExpectedVideoLengths): Promise<VideoVerificationResult>;
}

interface HandlerLogger {
  error(details: unknown, message?: string): void;
  info(details: unknown, message?: string): void;
}

interface Queryable {
  query(sql: string, values?: readonly unknown[]): Promise<{ rows: unknown[] }>;
}

interface PublicRequest {
  query?: unknown;
  params?: unknown;
  body?: unknown;
  user?: { id: number } | undefined;
}

interface PublicResponse {
  setHeader(name: string, value: string): unknown;
  status(code: number): PublicResponse;
  json(body: unknown): unknown;
  type(value: string): PublicResponse;
  send(body?: unknown): unknown;
}

interface HandlerDependencies {
  db: DbLike;
  store: PublicVideoStore;
  logger: HandlerLogger;
  uuid?: (() => string) | undefined;
  hash?: ((canonicalJson: string) => string) | undefined;
}

interface DraftParticipant {
  role: ParticipantRole;
  userId: number | null;
  displayName: string;
  avatarUrl: string | null;
}

interface DraftRound {
  number: number;
  domainId: number;
  domain: string;
  opener: DebateSide;
}

interface DraftInput {
  slug: string;
  motion: string;
  participants: DraftParticipant[];
  rounds: DraftRound[];
}

interface StoredDraftParticipant extends DraftParticipant {
  id: number;
  username: string | null;
}

interface MetadataParticipantPatch {
  role: ParticipantRole;
  hasUserId: boolean;
  userId: number | null;
  hasDisplayName: boolean;
  displayName: string;
  hasAvatarUrl: boolean;
  avatarUrl: string | null;
}

type DraftInputResult =
  | { ok: true; value: DraftInput }
  | { ok: false; issues: ValidationIssue[] };

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function validationIssue(code: string, path: string, message: string): ValidationIssue {
  return { code, path, message };
}

function invalidDraft(code: string, path: string, message: string): DraftInputResult {
  return { ok: false, issues: [validationIssue(code, path, message)] };
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === allowed.length && keys.every((key) => allowed.includes(key));
}

function nullableText(value: unknown): string | null | undefined {
  if (value === null) return null;
  return typeof value === "string" ? value : undefined;
}

function positiveInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
}

function participantRole(value: unknown): ParticipantRole | null {
  return value === "host" || value === "for" || value === "against" ? value : null;
}

function debateSide(value: unknown): DebateSide | null {
  return value === "for" || value === "against" ? value : null;
}

function parseDraftInput(raw: unknown): DraftInputResult {
  const root = object(raw);
  if (!exactKeys(root, ["slug", "motion", "participants", "rounds"])) {
    return invalidDraft("invalid_keys", "$", "Draft contains unsupported or missing fields.");
  }
  if (typeof root.slug !== "string" || root.slug.length > 120 || !SLUG.test(root.slug)) {
    return invalidDraft("invalid_slug", "slug", "Slug must be lowercase words separated by hyphens and no longer than 120 characters.");
  }
  if (typeof root.motion !== "string" || root.motion.trim() === "" || root.motion.length > 500) {
    return invalidDraft("invalid_motion", "motion", "Motion must be non-blank and no longer than 500 characters.");
  }
  if (!Array.isArray(root.participants) || root.participants.length !== 3) {
    return invalidDraft("participant_roles", "participants", "Draft requires exactly host, FOR, and AGAINST participants.");
  }

  const participants: DraftParticipant[] = [];
  const roles = new Set<ParticipantRole>();
  for (let index = 0; index < root.participants.length; index += 1) {
    const participant = object(root.participants[index]);
    const allowedKeys = participant.user_id === undefined
      ? ["role", "display_name", "avatar_url"]
      : ["role", "user_id", "display_name", "avatar_url"];
    if (!exactKeys(participant, allowedKeys)) {
      return invalidDraft("invalid_keys", `participants[${index}]`, "Participant contains unsupported or missing fields.");
    }
    const role = participantRole(participant.role);
    const userId = participant.user_id === undefined || participant.user_id === null
      ? null
      : positiveInteger(participant.user_id);
    const displayName = typeof participant.display_name === "string"
      ? participant.display_name.trim()
      : "";
    const avatarUrl = nullableText(participant.avatar_url);
    if (!role || roles.has(role)) {
      return invalidDraft("participant_roles", `participants[${index}].role`, "Participant roles must be host, FOR, and AGAINST exactly once.");
    }
    if (participant.user_id !== undefined && participant.user_id !== null && userId === null) {
      return invalidDraft("invalid_user", `participants[${index}].user_id`, "Linked user id must be a positive integer or null.");
    }
    if (displayName === "" || displayName.length > 80) {
      return invalidDraft("invalid_display_name", `participants[${index}].display_name`, "Display name must be non-blank and no longer than 80 characters.");
    }
    if (avatarUrl === undefined) {
      return invalidDraft("invalid_avatar", `participants[${index}].avatar_url`, "Avatar snapshot must be a string or null.");
    }
    roles.add(role);
    participants.push({ role, userId, displayName, avatarUrl });
  }

  if (!Array.isArray(root.rounds) || root.rounds.length !== 5) {
    return invalidDraft("round_sequence", "rounds", "Draft requires exactly five rounds.");
  }
  const rounds: DraftRound[] = [];
  const domainIds = new Set<number>();
  const domainNames = new Set<string>();
  let roundOneOpener: DebateSide | null = null;
  for (let index = 0; index < root.rounds.length; index += 1) {
    const round = object(root.rounds[index]);
    if (!exactKeys(round, ["number", "domain_id", "domain", "opener"])) {
      return invalidDraft("invalid_keys", `rounds[${index}]`, "Round contains unsupported or missing fields.");
    }
    const number = positiveInteger(round.number);
    const domainId = positiveInteger(round.domain_id);
    const domain = typeof round.domain === "string" ? round.domain.trim() : "";
    const opener = debateSide(round.opener);
    if (number !== index + 1) {
      return invalidDraft("round_sequence", `rounds[${index}].number`, "Rounds must be numbered one through five in order.");
    }
    if (domainId === null || domain === "" || domainIds.has(domainId) || domainNames.has(domain)) {
      return invalidDraft("domain_set", `rounds[${index}].domain_id`, "Rounds must use five distinct known domains.");
    }
    if (!opener) {
      return invalidDraft("opener_alternation", `rounds[${index}].opener`, "Round opener must be FOR or AGAINST.");
    }
    if (index === 0) roundOneOpener = opener;
    const expectedOpener = index % 2 === 0
      ? roundOneOpener
      : roundOneOpener === "for" ? "against" : "for";
    if (opener !== expectedOpener) {
      return invalidDraft("opener_alternation", `rounds[${index}].opener`, "Round openers must alternate from Round 1.");
    }
    domainIds.add(domainId);
    domainNames.add(domain);
    rounds.push({ number, domainId, domain, opener });
  }

  return {
    ok: true,
    value: { slug: root.slug, motion: root.motion.trim(), participants, rounds },
  };
}

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value));
}

function slugFrom(req: PublicRequest): string {
  const slug = object(req.params).slug;
  return typeof slug === "string" ? slug : "";
}

function integer(value: unknown): number | null {
  const narrowed = typeof value === "string" && /^-?\d+$/.test(value) ? Number(value) : value;
  return typeof narrowed === "number" && Number.isSafeInteger(narrowed) ? narrowed : null;
}

function isoTimestamp(value: unknown): string {
  const date = value instanceof Date ? value : typeof value === "string" ? new Date(value) : null;
  if (!date || !Number.isFinite(date.getTime())) throw new Error("Invalid video debate timestamp.");
  return date.toISOString();
}

function paging(req: PublicRequest) {
  const query = object(req.query);
  const parsedPageSize = integer(query.pageSize);
  const pageSize = Math.min(Math.max(parsedPageSize ?? 12, 1), 50);
  const parsedPage = integer(query.page);
  const page = parsedPage !== null && parsedPage >= 1 ? parsedPage : 1;
  return { page, pageSize };
}

function noStore(res: PublicResponse): void {
  res.setHeader("Cache-Control", "no-store");
}

function notFound(res: PublicResponse) {
  return res.status(404).json({ error: "video_debate_not_found" });
}

function failed(res: PublicResponse) {
  return res.status(500).json({ error: "video_debate_unavailable" });
}

function storageUnavailable(res: PublicResponse) {
  return res.status(503).json({ error: "video_storage_unconfigured" });
}

function invalidDraftResponse(res: PublicResponse, issues: ValidationIssue[]) {
  return res.status(422).json({ error: "invalid_video_debate_draft", issues });
}

function storedDomain(value: unknown): { id: number; name: string } | null {
  const row = object(value);
  const id = integer(row.id);
  return id !== null && id > 0 && typeof row.name === "string"
    ? { id, name: row.name }
    : null;
}

function storedUser(value: unknown): { id: number; username: string } | null {
  const row = object(value);
  const id = integer(row.id);
  return id !== null && id > 0 && typeof row.username === "string"
    ? { id, username: row.username }
    : null;
}

function storedStatus(value: unknown): VideoDebateStatus | null {
  return value === "draft" || value === "media_uploaded" || value === "validated" || value === "published"
    ? value
    : null;
}

function storedValidationIssues(value: unknown): ValidationIssue[] {
  if (!Array.isArray(value)) return [];
  const issues: ValidationIssue[] = [];
  for (const entry of value) {
    const row = object(entry);
    if (typeof row.code !== "string" || typeof row.path !== "string" || typeof row.message !== "string") {
      return [];
    }
    issues.push({ code: row.code, path: row.path, message: row.message });
  }
  return issues;
}

function lifecycleState(
  value: unknown,
  objectReceipts: VideoDebateObjectReceipts = noObjectReceipts(),
): VideoDebateLifecycleState | null {
  const row = object(value);
  const status = storedStatus(row.status);
  const draftRevision = integer(row.draft_revision);
  const validatedRevision = row.validated_revision === null ? null : integer(row.validated_revision);
  const submissionHash = row.submission_hash === null || row.submission_hash === undefined
    ? null
    : typeof row.submission_hash === "string" ? row.submission_hash : undefined;
  if (!status || draftRevision === null || draftRevision < 1 || validatedRevision === undefined || submissionHash === undefined) {
    return null;
  }
  return {
    status,
    draftRevision,
    validatedRevision,
    submissionHash,
    objectReceipts,
    validationIssues: storedValidationIssues(row.validation_errors),
  };
}

function noObjectReceipts(): VideoDebateObjectReceipts {
  return { host: false, for: false, against: false, poster: false };
}

function allObjectReceipts(): VideoDebateObjectReceipts {
  return { host: true, for: true, against: true, poster: true };
}

function objectVerified(etag: unknown, checkedAt: unknown): boolean {
  return typeof etag === "string" && etag !== "" && checkedAt !== null && checkedAt !== undefined;
}

function storedObjectReceipts(
  debateRow: Record<string, unknown>,
  participantRows: readonly Record<string, unknown>[],
): VideoDebateObjectReceipts {
  const byRole = new Map(participantRows.map((row) => [row.role, row]));
  const angle = (role: ParticipantRole) => {
    const row = object(byRole.get(role));
    return objectVerified(row.media_etag, row.media_checked_at);
  };
  return {
    host: angle("host"),
    for: angle("for"),
    against: angle("against"),
    poster: objectVerified(debateRow.poster_etag, debateRow.poster_checked_at),
  };
}

function probeByteLength(value: unknown): number | null {
  const length = integer(object(value).byte_length);
  return length !== null && length > 0 ? length : null;
}

function storageIssue(failure: VideoStorageFailure): ValidationIssue {
  return validationIssue(
    failure.code,
    `media.${failure.object}`,
    "Stored media object failed direct delivery verification.",
  );
}

function storedParticipant(value: unknown): StoredDraftParticipant | null {
  const row = object(value);
  const id = integer(row.id);
  const role = participantRole(row.role);
  const userId = row.user_id === null ? null : integer(row.user_id);
  const avatarUrl = nullableText(row.avatar_url);
  const username = row.username === null || row.username === undefined
    ? null
    : typeof row.username === "string" ? row.username : undefined;
  if (
    id === null || id <= 0 || !role || userId === null && row.user_id !== null ||
    typeof row.display_name !== "string" || avatarUrl === undefined || username === undefined
  ) return null;
  return {
    id,
    role,
    userId,
    displayName: row.display_name,
    avatarUrl,
    username,
  };
}

function storedRound(value: unknown): DraftRound | null {
  const row = object(value);
  const number = integer(row.round_number);
  const domainId = integer(row.domain_id);
  const domain = typeof row.domain === "string" ? row.domain : null;
  const opener = debateSide(row.opener);
  return number !== null && domainId !== null && domain !== null && opener
    ? { number, domainId, domain, opener }
    : null;
}

function parseMetadataPatch(raw: unknown):
  | { ok: true; slug?: string; participants?: MetadataParticipantPatch[] }
  | { ok: false; issues: ValidationIssue[] } {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, issues: [validationIssue("invalid_type", "$", "Metadata patch must be an object.")] };
  }
  const root = object(raw);
  const result: { ok: true; slug?: string; participants?: MetadataParticipantPatch[] } = { ok: true };
  if (Object.prototype.hasOwnProperty.call(root, "slug")) {
    if (typeof root.slug !== "string" || root.slug.length > 120 || !SLUG.test(root.slug)) {
      return { ok: false, issues: [validationIssue("invalid_slug", "slug", "Slug must be lowercase words separated by hyphens and no longer than 120 characters.")] };
    }
    result.slug = root.slug;
  }
  if (!Object.prototype.hasOwnProperty.call(root, "participants")) return result;
  if (!Array.isArray(root.participants)) {
    return { ok: false, issues: [validationIssue("invalid_participants", "participants", "Participants patch must be an array.")] };
  }

  const patches: MetadataParticipantPatch[] = [];
  const roles = new Set<ParticipantRole>();
  for (let index = 0; index < root.participants.length; index += 1) {
    const entry = object(root.participants[index]);
    const role = participantRole(entry.role);
    if (!role || roles.has(role)) {
      return { ok: false, issues: [validationIssue("participant_roles", `participants[${index}].role`, "Participant patch roles must be unique host, FOR, or AGAINST values.")] };
    }
    const allowed = ["role", "user_id", "display_name", "avatar_url"];
    if (Object.keys(entry).some((key) => !allowed.includes(key))) {
      return { ok: false, issues: [validationIssue("invalid_keys", `participants[${index}]`, "Participant patch contains unsupported fields.")] };
    }
    const hasUserId = Object.prototype.hasOwnProperty.call(entry, "user_id");
    const userId = entry.user_id === null ? null : positiveInteger(entry.user_id);
    if (hasUserId && entry.user_id !== null && userId === null) {
      return { ok: false, issues: [validationIssue("invalid_user", `participants[${index}].user_id`, "Linked user id must be a positive integer or null.")] };
    }
    const hasDisplayName = Object.prototype.hasOwnProperty.call(entry, "display_name");
    const displayName = typeof entry.display_name === "string" ? entry.display_name.trim() : "";
    if (hasDisplayName && (displayName === "" || displayName.length > 80)) {
      return { ok: false, issues: [validationIssue("invalid_display_name", `participants[${index}].display_name`, "Display name must be non-blank and no longer than 80 characters.")] };
    }
    const hasAvatarUrl = Object.prototype.hasOwnProperty.call(entry, "avatar_url");
    const avatarUrl = nullableText(entry.avatar_url);
    if (hasAvatarUrl && avatarUrl === undefined) {
      return { ok: false, issues: [validationIssue("invalid_avatar", `participants[${index}].avatar_url`, "Avatar snapshot must be a string or null.")] };
    }
    roles.add(role);
    patches.push({
      role,
      hasUserId,
      userId,
      hasDisplayName,
      displayName,
      hasAvatarUrl,
      avatarUrl: avatarUrl ?? null,
    });
  }
  result.participants = patches;
  return result;
}

function draftMetadata(
  debateRow: Record<string, unknown>,
  slug: string,
  participants: readonly StoredDraftParticipant[],
  rounds: readonly DraftRound[],
): VideoDebateDraftMetadataV1 {
  const id = integer(debateRow.id);
  if (id === null || typeof debateRow.media_id !== "string" || typeof debateRow.motion !== "string") {
    throw new Error("Invalid stored video debate draft.");
  }
  return {
    version: 1,
    draft_id: String(id),
    media_id: debateRow.media_id,
    motion: debateRow.motion,
    slug,
    participants: participants.map((participant) => ({
      role: participant.role,
      display_name: participant.displayName,
      avatar_url: participant.avatarUrl,
      ...(participant.username === null ? {} : { username: participant.username }),
    })),
    rounds: rounds.map((round) => ({
      number: round.number,
      domain_id: round.domainId,
      domain: round.domain,
      opener: round.opener,
    })),
  };
}

function adminDebateState(id: number, slug: string, state: VideoDebateLifecycleState) {
  return {
    id,
    slug,
    status: state.status,
    draftRevision: state.draftRevision,
    validatedRevision: state.validatedRevision,
    submissionHash: state.submissionHash,
    validationIssues: state.validationIssues,
  };
}

function adminIdFrom(req: PublicRequest): number | null {
  const id = integer(object(req.params).id);
  return id !== null && id > 0 ? id : null;
}

const ADMIN_DEBATE_COLUMNS = `
      id, slug, motion, status, media_id, duration_ms, manifest_version, transcript,
      intro_start_ms, intro_end_ms, outro_start_ms, outro_end_ms,
      final_winner, for_round_wins, against_round_wins, final_crux, final_verdict,
      poster_probe, poster_etag, poster_checked_at, submission_hash,
      draft_revision, validated_revision, validation_errors, published_at, updated_at`;

const ADMIN_PARTICIPANT_COLUMNS = `
      participant.id, participant.role, participant.user_id, participant.display_name,
      participant.avatar_url, participant.media_probe, participant.media_etag,
      participant.media_checked_at, linked_user.username`;

const ADMIN_ROUND_COLUMNS = `
      round.round_number, round.domain_id, domain.name AS domain, round.opener,
      round.for_start_ms, round.for_end_ms, round.against_start_ms, round.against_end_ms,
      round.grace_start_ms, round.grace_end_ms, round.winner, round.for_score,
      round.against_score, round.ruling, round.for_points, round.against_points`;

interface AdminAggregate {
  id: number;
  slug: string;
  mediaId: string;
  state: VideoDebateLifecycleState;
  debateRow: Record<string, unknown>;
  participantRows: Record<string, unknown>[];
  rounds: DraftRound[];
  roundRows: Record<string, unknown>[];
}

async function readAdminAggregate(
  source: Queryable,
  debateId: number,
  lock: boolean,
): Promise<AdminAggregate | null> {
  const debateResult = await source.query(
    `
      SELECT ${ADMIN_DEBATE_COLUMNS}
      FROM video_debates
      WHERE id = $1
      ${lock ? "FOR UPDATE" : ""}
    `,
    [debateId],
  );
  const debateValue = debateResult.rows[0];
  if (debateValue === undefined) return null;
  const debateRow = object(debateValue);
  const id = integer(debateRow.id);
  if (id === null || typeof debateRow.slug !== "string" || typeof debateRow.media_id !== "string") {
    throw new Error("Invalid stored video debate row.");
  }

  const participantResult = await source.query(
    `
      SELECT ${ADMIN_PARTICIPANT_COLUMNS}
      FROM video_debate_participants participant
      LEFT JOIN users linked_user ON linked_user.id = participant.user_id
      WHERE participant.video_debate_id = $1
      ORDER BY CASE participant.role WHEN 'host' THEN 0 WHEN 'for' THEN 1 ELSE 2 END
    `,
    [debateId],
  );
  const participantRows = participantResult.rows.map(object);
  if (participantRows.length !== 3 || participantRows.some((row) => storedParticipant(row) === null)) {
    throw new Error("Invalid stored video debate participants.");
  }

  const roundResult = await source.query(
    `
      SELECT ${ADMIN_ROUND_COLUMNS}
      FROM video_debate_rounds round
      JOIN domains domain ON domain.id = round.domain_id
      WHERE round.video_debate_id = $1
      ORDER BY round.round_number
    `,
    [debateId],
  );
  const roundRows = roundResult.rows.map(object);
  const rounds = roundRows.map(storedRound);
  if (rounds.length !== 5 || rounds.some((round) => round === null)) {
    throw new Error("Invalid stored video debate rounds.");
  }

  const state = lifecycleState(debateRow, storedObjectReceipts(debateRow, participantRows));
  if (!state) throw new Error("Invalid stored video debate state.");
  return {
    id,
    slug: debateRow.slug,
    mediaId: debateRow.media_id,
    state,
    debateRow,
    participantRows,
    rounds: rounds.filter((round): round is DraftRound => round !== null),
    roundRows,
  };
}

function mediaProbesFrom(aggregate: AdminAggregate): VideoObjectMap<unknown> {
  const byRole = new Map(aggregate.participantRows.map((row) => [row.role, row]));
  return {
    host: object(byRole.get("host")).media_probe,
    for: object(byRole.get("for")).media_probe,
    against: object(byRole.get("against")).media_probe,
    poster: aggregate.debateRow.poster_probe,
  };
}

function expectedObjectLengths(aggregate: AdminAggregate): ExpectedVideoLengths | null {
  const probes = mediaProbesFrom(aggregate);
  const host = probeByteLength(probes.host);
  const forLength = probeByteLength(probes.for);
  const against = probeByteLength(probes.against);
  const poster = probeByteLength(probes.poster);
  if (host === null || forLength === null || against === null || poster === null) return null;
  return { host, for: forLength, against, poster };
}

// Rebuilds the submitted document from columns and hands it back to the frozen validator
// untouched: stored rows are re-narrowed, never trusted because they were once accepted.
function storedSubmission(aggregate: AdminAggregate): unknown {
  const debateRow = aggregate.debateRow;
  return {
    version: debateRow.manifest_version,
    duration_ms: debateRow.duration_ms,
    media: mediaProbesFrom(aggregate),
    timeline: [
      { type: "intro", start_ms: debateRow.intro_start_ms, end_ms: debateRow.intro_end_ms },
      ...aggregate.roundRows.map((row) => ({
        type: "round",
        number: row.round_number,
        domain: row.domain,
        opener: row.opener,
        for: { start_ms: row.for_start_ms, end_ms: row.for_end_ms },
        against: { start_ms: row.against_start_ms, end_ms: row.against_end_ms },
        grace: { start_ms: row.grace_start_ms, end_ms: row.grace_end_ms },
      })),
      { type: "outro", start_ms: debateRow.outro_start_ms, end_ms: debateRow.outro_end_ms },
    ],
    transcript: debateRow.transcript,
    rounds: aggregate.roundRows.map((row) => ({
      number: row.round_number,
      winner: row.winner,
      for_score: row.for_score,
      against_score: row.against_score,
      ruling: row.ruling,
      points: { for: row.for_points, against: row.against_points },
    })),
    final: {
      winner: debateRow.final_winner,
      round_score: {
        for: debateRow.for_round_wins,
        against: debateRow.against_round_wins,
      },
      crux: debateRow.final_crux,
      verdict: debateRow.final_verdict,
    },
  };
}

function manifestStored(debateRow: Record<string, unknown>): boolean {
  return integer(debateRow.manifest_version) !== null && typeof debateRow.submission_hash === "string";
}

function sameDraft(locked: VideoDebateLifecycleState, snapshot: VideoDebateLifecycleState): boolean {
  return (
    locked.status === snapshot.status &&
    locked.draftRevision === snapshot.draftRevision &&
    locked.validatedRevision === snapshot.validatedRevision
  );
}

function draftChanged(res: PublicResponse) {
  return res.status(409).json({ error: "draft_changed" });
}

function invalidTransition(res: PublicResponse) {
  return res.status(409).json({ error: "invalid_video_debate_transition" });
}

function verificationRefused(
  res: PublicResponse,
  verification: Extract<VideoVerificationResult, { ok: false }>,
) {
  if (verification.code === "video_storage_unconfigured") return storageUnavailable(res);
  return res.status(422).json({ error: verification.code, failures: verification.failures });
}

export function makeVideoDebateHandlers({
  db,
  store,
  logger: handlerLogger,
  uuid = randomUUID,
  hash = sha256,
}: HandlerDependencies) {
  async function runTransaction(
    res: PublicResponse,
    action: string,
    work: (client: DbClientLike) => Promise<{ commit: boolean; response: unknown }>,
  ): Promise<unknown> {
    if (!db.connect) return failed(res);
    const client = await db.connect();
    let transactionOpen = false;
    try {
      await client.query("BEGIN");
      transactionOpen = true;
      const outcome = await work(client);
      await client.query(outcome.commit ? "COMMIT" : "ROLLBACK");
      transactionOpen = false;
      return outcome.response;
    } catch (err) {
      if (transactionOpen) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          handlerLogger.error({ err: rollbackError }, `Failed to roll back ${action}`);
        }
      }
      handlerLogger.error({ err }, `Failed to ${action}`);
      return failed(res);
    } finally {
      client.release();
    }
  }

  function audit(aggregate: AdminAggregate, next: VideoDebateLifecycleState, adminId: number | null, message: string) {
    handlerLogger.info({
      videoDebateId: aggregate.id,
      mediaId: aggregate.mediaId,
      fromStatus: aggregate.state.status,
      toStatus: next.status,
      draftRevision: next.draftRevision,
      validatedRevision: next.validatedRevision,
      adminId,
      issueCodes: next.validationIssues.map((issue) => issue.code),
    }, message);
  }

  return {
    async createVideoDebateDraft(req: PublicRequest, res: PublicResponse) {
      const parsed = parseDraftInput(req.body);
      if (!parsed.ok) return invalidDraftResponse(res, parsed.issues);
      if (!db.connect || !store.keysFor) return failed(res);

      const client = await db.connect();
      let transactionOpen = false;
      try {
        await client.query("BEGIN");
        transactionOpen = true;
        const domainResult = await client.query(
          `SELECT id, name FROM domains WHERE id = ANY($1::int[]) ORDER BY id`,
          [parsed.value.rounds.map((round) => round.domainId)],
        );
        const domains = new Map<number, string>();
        for (const value of domainResult.rows) {
          const domain = storedDomain(value);
          if (domain) domains.set(domain.id, domain.name);
        }
        const unknownDomain = parsed.value.rounds.find(
          (round) => domains.get(round.domainId) !== round.domain,
        );
        if (unknownDomain) {
          await client.query("ROLLBACK");
          transactionOpen = false;
          return invalidDraftResponse(res, [validationIssue(
            "unknown_domain",
            `rounds[${unknownDomain.number - 1}].domain_id`,
            "Round domain id and name must match a known domain.",
          )]);
        }

        const linkedUserIds = [...new Set(parsed.value.participants.flatMap(
          (participant) => participant.userId === null ? [] : [participant.userId],
        ))];
        const users = new Map<number, string>();
        if (linkedUserIds.length > 0) {
          const userResult = await client.query(
            `SELECT id, username FROM users WHERE id = ANY($1::int[]) ORDER BY id`,
            [linkedUserIds],
          );
          for (const value of userResult.rows) {
            const user = storedUser(value);
            if (user) users.set(user.id, user.username);
          }
        }
        const unknownUser = linkedUserIds.find((id) => !users.has(id));
        if (unknownUser !== undefined) {
          await client.query("ROLLBACK");
          transactionOpen = false;
          return invalidDraftResponse(res, [validationIssue(
            "unknown_user",
            "participants.user_id",
            "Every linked participant user must exist.",
          )]);
        }

        const mediaId = uuid();
        const keys = store.keysFor(mediaId);
        const debateResult = await client.query(
          `
            INSERT INTO video_debates
              (slug, motion, media_id, poster_object_key, created_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
          `,
          [parsed.value.slug, parsed.value.motion, mediaId, keys.poster, req.user?.id ?? null],
        );
        const debateId = integer(object(debateResult.rows[0]).id);
        if (debateId === null || debateId <= 0) throw new Error("Invalid inserted video debate id.");

        const participantValues: unknown[] = [debateId];
        for (const participant of parsed.value.participants) {
          participantValues.push(
            participant.role,
            participant.userId,
            participant.displayName,
            participant.avatarUrl,
            keys[participant.role],
          );
        }
        await client.query(
          `
            INSERT INTO video_debate_participants
              (video_debate_id, role, user_id, display_name, avatar_url, mp4_object_key)
            VALUES
              ($1, $2, $3, $4, $5, $6),
              ($1, $7, $8, $9, $10, $11),
              ($1, $12, $13, $14, $15, $16)
          `,
          participantValues,
        );

        const roundValues: unknown[] = [debateId];
        for (const round of parsed.value.rounds) {
          roundValues.push(round.number, round.domainId, round.opener);
        }
        await client.query(
          `
            INSERT INTO video_debate_rounds
              (video_debate_id, round_number, domain_id, opener)
            VALUES
              ($1, $2, $3, $4),
              ($1, $5, $6, $7),
              ($1, $8, $9, $10),
              ($1, $11, $12, $13),
              ($1, $14, $15, $16)
          `,
          roundValues,
        );
        await client.query("COMMIT");
        transactionOpen = false;

        const metadata: VideoDebateDraftMetadataV1 = {
          version: 1,
          draft_id: String(debateId),
          media_id: mediaId,
          motion: parsed.value.motion,
          slug: parsed.value.slug,
          participants: parsed.value.participants.map((participant) => ({
            role: participant.role,
            display_name: participant.displayName,
            avatar_url: participant.avatarUrl,
            ...(participant.userId === null ? {} : { username: users.get(participant.userId)! }),
          })),
          rounds: parsed.value.rounds.map((round) => ({
            number: round.number,
            domain_id: round.domainId,
            domain: round.domain,
            opener: round.opener,
          })),
        };
        return res.status(201).json({
          debate: { id: debateId, status: "draft", draftRevision: 1 },
          mediaId,
          rclonePrefix: `video-debates/${mediaId}/`,
          metadata,
        });
      } catch (err) {
        if (transactionOpen) {
          try {
            await client.query("ROLLBACK");
          } catch (rollbackError) {
            handlerLogger.error({ err: rollbackError }, "Failed to roll back video debate draft");
          }
        }
        handlerLogger.error({ err }, "Failed to create video debate draft");
        return failed(res);
      } finally {
        client.release();
      }
    },

    async listAdminVideoDebates(_req: PublicRequest, res: PublicResponse) {
      noStore(res);
      try {
        const result = await db.query(`
          SELECT id, slug, motion, status, draft_revision, validated_revision,
                 submission_hash, validation_errors
          FROM video_debates
          ORDER BY updated_at DESC, id DESC
        `);
        const debates = result.rows.map((value) => {
          const row = object(value);
          const id = integer(row.id);
          const state = lifecycleState(row);
          if (id === null || !state || typeof row.slug !== "string" || typeof row.motion !== "string") {
            throw new Error("Invalid stored admin video debate.");
          }
          return {
            ...adminDebateState(id, row.slug, state),
            motion: row.motion,
          };
        });
        return res.status(200).json({ debates });
      } catch (err) {
        handlerLogger.error({ err }, "Failed to list admin video debates");
        return failed(res);
      }
    },

    async getAdminVideoDebate(req: PublicRequest, res: PublicResponse) {
      noStore(res);
      const debateId = adminIdFrom(req);
      if (debateId === null) return res.status(400).json({ error: "invalid_video_debate_id" });
      try {
        const debateResult = await db.query(
          `
            SELECT id, slug, motion, status, media_id, draft_revision,
                   validated_revision, submission_hash, validation_errors
            FROM video_debates
            WHERE id = $1
          `,
          [debateId],
        );
        const value = debateResult.rows[0];
        if (value === undefined) return notFound(res);
        const row = object(value);
        const state = lifecycleState(row);
        if (!state || typeof row.slug !== "string" || typeof row.media_id !== "string") {
          throw new Error("Invalid stored admin video debate.");
        }
        const participantResult = await db.query(
          `
            SELECT participant.id, participant.role, participant.user_id,
                   participant.display_name, participant.avatar_url, linked_user.username
            FROM video_debate_participants participant
            LEFT JOIN users linked_user ON linked_user.id = participant.user_id
            WHERE participant.video_debate_id = $1
            ORDER BY CASE participant.role WHEN 'host' THEN 0 WHEN 'for' THEN 1 ELSE 2 END
          `,
          [debateId],
        );
        const participantRows = participantResult.rows.map(storedParticipant);
        if (participantRows.length !== 3 || participantRows.some((participant) => participant === null)) {
          throw new Error("Invalid stored video debate participants.");
        }
        const roundResult = await db.query(
          `
            SELECT round.round_number, round.domain_id, domain.name AS domain, round.opener
            FROM video_debate_rounds round
            JOIN domains domain ON domain.id = round.domain_id
            WHERE round.video_debate_id = $1
            ORDER BY round.round_number
          `,
          [debateId],
        );
        const roundRows = roundResult.rows.map(storedRound);
        if (roundRows.length !== 5 || roundRows.some((round) => round === null)) {
          throw new Error("Invalid stored video debate rounds.");
        }
        const participants = participantRows.filter(
          (participant): participant is StoredDraftParticipant => participant !== null,
        );
        const rounds = roundRows.filter((round): round is DraftRound => round !== null);
        return res.status(200).json({
          debate: adminDebateState(debateId, row.slug, state),
          mediaId: row.media_id,
          rclonePrefix: `video-debates/${row.media_id}/`,
          metadata: draftMetadata(row, row.slug, participants, rounds),
        });
      } catch (err) {
        handlerLogger.error({ err }, "Failed to read admin video debate");
        return failed(res);
      }
    },

    async patchVideoDebateMetadata(req: PublicRequest, res: PublicResponse) {
      const debateId = adminIdFrom(req);
      if (debateId === null) return res.status(400).json({ error: "invalid_video_debate_id" });
      const patch = parseMetadataPatch(req.body);
      if (!patch.ok) return invalidDraftResponse(res, patch.issues);
      if (!db.connect) return failed(res);

      const client = await db.connect();
      let transactionOpen = false;
      try {
        await client.query("BEGIN");
        transactionOpen = true;
        const debateResult = await client.query(
          `
            SELECT id, slug, motion, status, media_id, draft_revision,
                   validated_revision, submission_hash, validation_errors
            FROM video_debates
            WHERE id = $1
            FOR UPDATE
          `,
          [debateId],
        );
        const debateValue = debateResult.rows[0];
        if (debateValue === undefined) {
          await client.query("ROLLBACK");
          transactionOpen = false;
          return notFound(res);
        }
        const debateRow = object(debateValue);
        const currentState = lifecycleState(debateRow);
        if (!currentState || typeof debateRow.slug !== "string") throw new Error("Invalid stored video debate state.");
        if (currentState.status === "published") {
          await client.query("ROLLBACK");
          transactionOpen = false;
          return res.status(409).json({ error: "published_video_debate_immutable" });
        }

        const participantResult = await client.query(
          `
            SELECT participant.id, participant.role, participant.user_id,
                   participant.display_name, participant.avatar_url, linked_user.username
            FROM video_debate_participants participant
            LEFT JOIN users linked_user ON linked_user.id = participant.user_id
            WHERE participant.video_debate_id = $1
            ORDER BY CASE participant.role WHEN 'host' THEN 0 WHEN 'for' THEN 1 ELSE 2 END
          `,
          [debateId],
        );
        const participants = participantResult.rows.map(storedParticipant);
        if (participants.length !== 3 || participants.some((participant) => participant === null)) {
          throw new Error("Invalid stored video debate participants.");
        }
        const currentParticipants = participants.filter(
          (participant): participant is StoredDraftParticipant => participant !== null,
        );
        const patchByRole = new Map((patch.participants ?? []).map((entry) => [entry.role, entry]));
        const proposedParticipants = currentParticipants.map((participant) => {
          const update = patchByRole.get(participant.role);
          if (!update) return { ...participant };
          return {
            ...participant,
            userId: update.hasUserId ? update.userId : participant.userId,
            displayName: update.hasDisplayName ? update.displayName : participant.displayName,
            avatarUrl: update.hasAvatarUrl ? update.avatarUrl : participant.avatarUrl,
          };
        });

        const linkedUserIds = [...new Set(proposedParticipants.flatMap(
          (participant) => participant.userId === null ? [] : [participant.userId],
        ))];
        const usernames = new Map<number, string>();
        if (linkedUserIds.length > 0) {
          const userResult = await client.query(
            `SELECT id, username FROM users WHERE id = ANY($1::int[]) ORDER BY id`,
            [linkedUserIds],
          );
          for (const value of userResult.rows) {
            const user = storedUser(value);
            if (user) usernames.set(user.id, user.username);
          }
        }
        if (linkedUserIds.some((id) => !usernames.has(id))) {
          await client.query("ROLLBACK");
          transactionOpen = false;
          return invalidDraftResponse(res, [validationIssue(
            "unknown_user",
            "participants.user_id",
            "Every linked participant user must exist.",
          )]);
        }
        for (const participant of proposedParticipants) {
          participant.username = participant.userId === null ? null : usernames.get(participant.userId) ?? null;
        }

        const roundResult = await client.query(
          `
            SELECT round.round_number, round.domain_id, domain.name AS domain, round.opener
            FROM video_debate_rounds round
            JOIN domains domain ON domain.id = round.domain_id
            WHERE round.video_debate_id = $1
            ORDER BY round.round_number
          `,
          [debateId],
        );
        const rounds = roundResult.rows.map(storedRound);
        if (rounds.length !== 5 || rounds.some((round) => round === null)) {
          throw new Error("Invalid stored video debate rounds.");
        }
        const storedRounds = rounds.filter((round): round is DraftRound => round !== null);
        const slug = patch.slug ?? debateRow.slug;
        const participantsChanged = proposedParticipants.some((participant, index) => {
          const current = currentParticipants[index];
          return !current || participant.userId !== current.userId ||
            participant.displayName !== current.displayName || participant.avatarUrl !== current.avatarUrl;
        });
        const changed = slug !== debateRow.slug || participantsChanged;

        let nextState = currentState;
        if (changed) {
          const transition = nextVideoDebateState(currentState, { type: "metadata_changed" });
          if (!transition.ok) throw new Error("Video debate metadata transition rejected.");
          nextState = transition.state;
          await client.query(
            `
              UPDATE video_debates
              SET slug = $2,
                  status = $3,
                  draft_revision = $4,
                  validated_revision = NULL,
                  validation_errors = '[]'::jsonb,
                  validated_at = NULL,
                  updated_at = NOW()
              WHERE id = $1
            `,
            [debateId, slug, nextState.status, nextState.draftRevision],
          );
          for (let index = 0; index < proposedParticipants.length; index += 1) {
            const participant = proposedParticipants[index]!;
            const current = currentParticipants[index]!;
            if (
              participant.userId === current.userId && participant.displayName === current.displayName &&
              participant.avatarUrl === current.avatarUrl
            ) continue;
            await client.query(
              `
                UPDATE video_debate_participants
                SET user_id = $3, display_name = $4, avatar_url = $5, updated_at = NOW()
                WHERE video_debate_id = $1 AND id = $2
              `,
              [debateId, participant.id, participant.userId, participant.displayName, participant.avatarUrl],
            );
          }
        }
        await client.query("COMMIT");
        transactionOpen = false;
        return res.status(200).json({
          debate: adminDebateState(debateId, slug, nextState),
          metadata: draftMetadata(debateRow, slug, proposedParticipants, storedRounds),
        });
      } catch (err) {
        if (transactionOpen) {
          try {
            await client.query("ROLLBACK");
          } catch (rollbackError) {
            handlerLogger.error({ err: rollbackError }, "Failed to roll back video debate metadata");
          }
        }
        handlerLogger.error({ err }, "Failed to update video debate metadata");
        return failed(res);
      } finally {
        client.release();
      }
    },

    async putVideoDebateManifest(req: PublicRequest, res: PublicResponse) {
      const debateId = adminIdFrom(req);
      if (debateId === null) return res.status(400).json({ error: "invalid_video_debate_id" });
      if (!db.connect) return failed(res);

      const client = await db.connect();
      let transactionOpen = false;
      try {
        await client.query("BEGIN");
        transactionOpen = true;
        const debateResult = await client.query(
          `
            SELECT id, slug, status, draft_revision, validated_revision,
                   submission_hash, validation_errors
            FROM video_debates
            WHERE id = $1
            FOR UPDATE
          `,
          [debateId],
        );
        const debateValue = debateResult.rows[0];
        if (debateValue === undefined) {
          await client.query("ROLLBACK");
          transactionOpen = false;
          return notFound(res);
        }
        const debateRow = object(debateValue);
        const currentState = lifecycleState(debateRow);
        if (!currentState || typeof debateRow.slug !== "string") throw new Error("Invalid stored video debate state.");
        if (currentState.status === "published") {
          await client.query("ROLLBACK");
          transactionOpen = false;
          return res.status(409).json({ error: "published_video_debate_immutable" });
        }

        const roundResult = await client.query(
          `
            SELECT round.round_number, round.domain_id, domain.name AS domain, round.opener
            FROM video_debate_rounds round
            JOIN domains domain ON domain.id = round.domain_id
            WHERE round.video_debate_id = $1
            ORDER BY round.round_number
          `,
          [debateId],
        );
        const expectedRounds = roundResult.rows.map(storedRound);
        if (expectedRounds.length !== 5 || expectedRounds.some((round) => round === null)) {
          throw new Error("Invalid stored video debate rounds.");
        }
        const immutableRounds = expectedRounds.filter((round): round is DraftRound => round !== null);
        const validation = validateSubmissionV1(req.body, {
          domains: immutableRounds.map((round) => ({ id: round.domainId, name: round.domain })),
          roundOneOpener: immutableRounds[0]!.opener,
        });
        if (!validation.ok) {
          await client.query("ROLLBACK");
          transactionOpen = false;
          return res.status(422).json({ error: "invalid_video_debate_manifest", issues: validation.errors });
        }
        const mismatchedDomainIndex = immutableRounds.findIndex((round, index) => {
          const timeline = validation.value.timeline[index + 1];
          return !timeline || timeline.type !== "round" || timeline.domain !== round.domain;
        });
        if (mismatchedDomainIndex !== -1) {
          await client.query("ROLLBACK");
          transactionOpen = false;
          return res.status(422).json({
            error: "invalid_video_debate_manifest",
            issues: [validationIssue(
              "domain_round_mismatch",
              `timeline[${mismatchedDomainIndex + 1}].domain`,
              "Each round domain must match the immutable draft order.",
            )],
          });
        }

        const canonicalJson = JSON.stringify(validation.value);
        const submissionHash = hash(canonicalJson);
        const transition = nextVideoDebateState(currentState, {
          type: "manifest_changed",
          submissionHash,
        });
        if (!transition.ok) throw new Error("Video debate manifest transition rejected.");
        if (Object.keys(transition.commands).length === 0) {
          await client.query("COMMIT");
          transactionOpen = false;
          return res.status(200).json({
            debate: adminDebateState(debateId, debateRow.slug, transition.state),
            unchanged: true,
          });
        }

        const intro = validation.value.timeline[0];
        const outro = validation.value.timeline[6];
        if (!intro || intro.type !== "intro" || !outro || outro.type !== "outro") {
          throw new Error("Validated manifest lost timeline boundaries.");
        }
        await client.query(
          `
            UPDATE video_debates
            SET status = $2,
                duration_ms = $3,
                manifest_version = $4,
                transcript = $5::jsonb,
                intro_start_ms = $6,
                intro_end_ms = $7,
                outro_start_ms = $8,
                outro_end_ms = $9,
                final_winner = $10,
                for_round_wins = $11,
                against_round_wins = $12,
                final_crux = $13,
                final_verdict = $14,
                poster_probe = $15::jsonb,
                submission_hash = $16,
                draft_revision = $17,
                validated_revision = NULL,
                validation_errors = '[]'::jsonb,
                validated_at = NULL,
                updated_at = NOW()
            WHERE id = $1
          `,
          [
            debateId,
            transition.state.status,
            validation.value.duration_ms,
            validation.value.version,
            JSON.stringify(validation.value.transcript),
            intro.start_ms,
            intro.end_ms,
            outro.start_ms,
            outro.end_ms,
            validation.value.final.winner,
            validation.value.final.round_score.for,
            validation.value.final.round_score.against,
            validation.value.final.crux,
            validation.value.final.verdict,
            JSON.stringify(validation.value.media.poster),
            submissionHash,
            transition.state.draftRevision,
          ],
        );

        for (let index = 0; index < validation.value.rounds.length; index += 1) {
          const result = validation.value.rounds[index]!;
          const timeline = validation.value.timeline[index + 1];
          if (!timeline || timeline.type !== "round") throw new Error("Validated manifest lost a round timeline.");
          await client.query(
            `
              UPDATE video_debate_rounds
              SET for_start_ms = $3, for_end_ms = $4,
                  against_start_ms = $5, against_end_ms = $6,
                  grace_start_ms = $7, grace_end_ms = $8,
                  winner = $9, for_score = $10, against_score = $11,
                  ruling = $12, for_points = $13::jsonb, against_points = $14::jsonb,
                  updated_at = NOW()
              WHERE video_debate_id = $1 AND round_number = $2
            `,
            [
              debateId, result.number,
              timeline.for.start_ms, timeline.for.end_ms,
              timeline.against.start_ms, timeline.against.end_ms,
              timeline.grace.start_ms, timeline.grace.end_ms,
              result.winner, result.for_score, result.against_score, result.ruling,
              JSON.stringify(result.points.for), JSON.stringify(result.points.against),
            ],
          );
        }
        for (const role of ["host", "for", "against"] as const) {
          const probe = validation.value.media[role];
          await client.query(
            `
              UPDATE video_debate_participants
              SET media_probe = $3::jsonb, media_byte_length = $4, updated_at = NOW()
              WHERE video_debate_id = $1 AND role = $2
            `,
            [debateId, role, JSON.stringify(probe), probe.byte_length],
          );
        }
        await client.query("COMMIT");
        transactionOpen = false;
        return res.status(200).json({
          debate: adminDebateState(debateId, debateRow.slug, transition.state),
          unchanged: false,
        });
      } catch (err) {
        if (transactionOpen) {
          try {
            await client.query("ROLLBACK");
          } catch (rollbackError) {
            handlerLogger.error({ err: rollbackError }, "Failed to roll back video debate manifest");
          }
        }
        handlerLogger.error({ err }, "Failed to store video debate manifest");
        return failed(res);
      } finally {
        client.release();
      }
    },

    async checkVideoDebateMedia(req: PublicRequest, res: PublicResponse) {
      const debateId = adminIdFrom(req);
      if (debateId === null) return res.status(400).json({ error: "invalid_video_debate_id" });
      const adminId = req.user?.id ?? null;
      let snapshot: AdminAggregate | null;
      try {
        snapshot = await readAdminAggregate(db, debateId, false);
      } catch (err) {
        handlerLogger.error({ err }, "Failed to read video debate media state");
        return failed(res);
      }
      if (!snapshot) return notFound(res);
      if (snapshot.state.status === "published") {
        return res.status(409).json({ error: "published_video_debate_immutable" });
      }
      const expectedLengths = expectedObjectLengths(snapshot);
      if (!expectedLengths) return res.status(409).json({ error: "manifest_required" });

      let verification: VideoVerificationResult;
      try {
        verification = await store.verify(snapshot.mediaId, expectedLengths);
      } catch (err) {
        handlerLogger.error({ err }, "Failed to verify video debate media");
        return failed(res);
      }
      if (!verification.ok) return verificationRefused(res, verification);
      const receipts = verification.receipts;

      const verified = snapshot;
      return runTransaction(res, "record video debate media receipts", async (client) => {
        const locked = await readAdminAggregate(client, debateId, true);
        if (!locked) return { commit: false, response: notFound(res) };
        if (!sameDraft(locked.state, verified.state)) {
          return { commit: false, response: draftChanged(res) };
        }
        const transition = nextVideoDebateState(locked.state, {
          type: "media_verified",
          objectReceipts: allObjectReceipts(),
        });
        if (!transition.ok) return { commit: false, response: invalidTransition(res) };

        for (const role of ["host", "for", "against"] as const) {
          await client.query(
            `
              UPDATE video_debate_participants
              SET media_etag = $3, media_byte_length = $4, media_checked_at = NOW(), updated_at = NOW()
              WHERE video_debate_id = $1 AND role = $2
            `,
            [debateId, role, receipts[role].etag, receipts[role].byteLength],
          );
        }
        await client.query(
          `
            UPDATE video_debates
            SET status = $2, poster_etag = $3, poster_checked_at = NOW(), updated_at = NOW()
            WHERE id = $1
          `,
          [debateId, transition.state.status, receipts.poster.etag],
        );
        audit(locked, transition.state, adminId, "Verified video debate media objects");
        return {
          commit: true,
          response: res.status(200).json({
            debate: adminDebateState(debateId, locked.slug, transition.state),
            receipts,
          }),
        };
      });
    },

    async validateVideoDebate(req: PublicRequest, res: PublicResponse) {
      const debateId = adminIdFrom(req);
      if (debateId === null) return res.status(400).json({ error: "invalid_video_debate_id" });
      const adminId = req.user?.id ?? null;
      let snapshot: AdminAggregate | null;
      try {
        snapshot = await readAdminAggregate(db, debateId, false);
      } catch (err) {
        handlerLogger.error({ err }, "Failed to read video debate validation state");
        return failed(res);
      }
      if (!snapshot) return notFound(res);
      if (snapshot.state.status === "published") {
        return res.status(409).json({ error: "published_video_debate_immutable" });
      }
      if (snapshot.state.status === "draft") {
        return res.status(409).json({ error: "media_verification_required" });
      }
      if (
        snapshot.state.status === "validated" &&
        snapshot.state.validatedRevision === snapshot.state.draftRevision
      ) {
        return res.status(200).json({
          debate: adminDebateState(debateId, snapshot.slug, snapshot.state),
          unchanged: true,
        });
      }

      const verified = snapshot;
      const issues: ValidationIssue[] = [];
      if (!manifestStored(verified.debateRow)) {
        issues.push(validationIssue(
          "manifest_missing",
          "manifest",
          "A validated manifest must be submitted before validation.",
        ));
      } else {
        const validation = validateSubmissionV1(storedSubmission(verified), {
          domains: verified.rounds.map((round) => ({ id: round.domainId, name: round.domain })),
          roundOneOpener: verified.rounds[0]!.opener,
        });
        if (!validation.ok) issues.push(...validation.errors);
      }

      if (issues.length === 0) {
        const expectedLengths = expectedObjectLengths(verified);
        if (!expectedLengths) {
          issues.push(validationIssue("manifest_missing", "media", "Media probe sizes are missing."));
        } else {
          let verification: VideoVerificationResult;
          try {
            verification = await store.verify(verified.mediaId, expectedLengths);
          } catch (err) {
            handlerLogger.error({ err }, "Failed to verify video debate media");
            return failed(res);
          }
          if (!verification.ok) {
            if (verification.code === "video_storage_unconfigured") return storageUnavailable(res);
            issues.push(...verification.failures.map(storageIssue));
          }
        }
      }

      return runTransaction(res, "record video debate validation", async (client) => {
        const locked = await readAdminAggregate(client, debateId, true);
        if (!locked) return { commit: false, response: notFound(res) };
        if (!sameDraft(locked.state, verified.state)) {
          return { commit: false, response: draftChanged(res) };
        }
        const transition = issues.length === 0
          ? nextVideoDebateState(locked.state, { type: "validation_passed" })
          : nextVideoDebateState(locked.state, { type: "validation_failed", issues });
        if (!transition.ok) return { commit: false, response: invalidTransition(res) };

        if (issues.length === 0) {
          await client.query(
            `
              UPDATE video_debates
              SET status = $2,
                  validated_revision = $3,
                  validation_errors = '[]'::jsonb,
                  validated_at = NOW(),
                  validated_by = $4,
                  updated_at = NOW()
              WHERE id = $1
            `,
            [debateId, transition.state.status, transition.state.validatedRevision, adminId],
          );
          audit(locked, transition.state, adminId, "Validated video debate draft");
          return {
            commit: true,
            response: res.status(200).json({
              debate: adminDebateState(debateId, locked.slug, transition.state),
            }),
          };
        }

        await client.query(
          `
            UPDATE video_debates
            SET validated_revision = NULL,
                validation_errors = $2::jsonb,
                validated_at = NULL,
                updated_at = NOW()
            WHERE id = $1
          `,
          [debateId, JSON.stringify(issues)],
        );
        audit(locked, transition.state, adminId, "Rejected video debate validation");
        return {
          commit: true,
          response: res.status(422).json({
            error: "invalid_video_debate",
            debate: adminDebateState(debateId, locked.slug, transition.state),
            issues,
          }),
        };
      });
    },

    async publishVideoDebate(req: PublicRequest, res: PublicResponse) {
      const debateId = adminIdFrom(req);
      if (debateId === null) return res.status(400).json({ error: "invalid_video_debate_id" });
      const adminId = req.user?.id ?? null;
      let snapshot: AdminAggregate | null;
      try {
        snapshot = await readAdminAggregate(db, debateId, false);
      } catch (err) {
        handlerLogger.error({ err }, "Failed to read video debate publication state");
        return failed(res);
      }
      if (!snapshot) return notFound(res);
      if (snapshot.state.status === "published") {
        return res.status(200).json({
          debate: adminDebateState(debateId, snapshot.slug, snapshot.state),
          unchanged: true,
        });
      }
      if (
        snapshot.state.status !== "validated" ||
        snapshot.state.validatedRevision !== snapshot.state.draftRevision
      ) {
        return res.status(409).json({ error: "video_debate_not_validated" });
      }
      const expectedLengths = expectedObjectLengths(snapshot);
      if (!expectedLengths) return res.status(409).json({ error: "manifest_required" });

      let verification: VideoVerificationResult;
      try {
        verification = await store.verify(snapshot.mediaId, expectedLengths);
      } catch (err) {
        handlerLogger.error({ err }, "Failed to verify video debate media");
        return failed(res);
      }
      if (!verification.ok) return verificationRefused(res, verification);

      const verified = snapshot;
      return runTransaction(res, "publish video debate", async (client) => {
        const locked = await readAdminAggregate(client, debateId, true);
        if (!locked) return { commit: false, response: notFound(res) };
        if (!sameDraft(locked.state, verified.state)) {
          return { commit: false, response: draftChanged(res) };
        }
        const transition = nextVideoDebateState(locked.state, {
          type: "published",
          objectReceipts: allObjectReceipts(),
        });
        if (!transition.ok) return { commit: false, response: invalidTransition(res) };

        await client.query(
          `
            UPDATE video_debates
            SET status = 'published', published_at = NOW(), published_by = $2, updated_at = NOW()
            WHERE id = $1
          `,
          [debateId, adminId],
        );
        audit(locked, transition.state, adminId, "Published video debate");
        return {
          commit: true,
          response: res.status(200).json({
            debate: adminDebateState(debateId, locked.slug, transition.state),
            unchanged: false,
          }),
        };
      });
    },

    async unpublishVideoDebate(req: PublicRequest, res: PublicResponse) {
      const debateId = adminIdFrom(req);
      if (debateId === null) return res.status(400).json({ error: "invalid_video_debate_id" });
      const adminId = req.user?.id ?? null;
      return runTransaction(res, "unpublish video debate", async (client) => {
        const locked = await readAdminAggregate(client, debateId, true);
        if (!locked) return { commit: false, response: notFound(res) };
        const transition = nextVideoDebateState(locked.state, { type: "unpublished" });
        if (!transition.ok) return { commit: false, response: invalidTransition(res) };

        // Removing Crux access never touches R2: the four published objects stay byte-identical.
        await client.query(
          `
            UPDATE video_debates
            SET status = $2, published_at = NULL, updated_at = NOW()
            WHERE id = $1
          `,
          [debateId, transition.state.status],
        );
        audit(locked, transition.state, adminId, "Unpublished video debate");
        return {
          commit: true,
          response: res.status(200).json({
            debate: adminDebateState(debateId, locked.slug, transition.state),
          }),
        };
      });
    },

    async rotateVideoDebateMedia(req: PublicRequest, res: PublicResponse) {
      const debateId = adminIdFrom(req);
      if (debateId === null) return res.status(400).json({ error: "invalid_video_debate_id" });
      if (!store.keysFor) return failed(res);
      const keysFor = store.keysFor;
      const adminId = req.user?.id ?? null;
      return runTransaction(res, "rotate video debate media", async (client) => {
        const locked = await readAdminAggregate(client, debateId, true);
        if (!locked) return { commit: false, response: notFound(res) };
        const transition = nextVideoDebateState(locked.state, { type: "media_rotated" });
        if (!transition.ok) {
          return {
            commit: false,
            response: res.status(409).json({ error: "published_video_debate_immutable" }),
          };
        }

        const mediaId = uuid();
        const keys = keysFor(mediaId);
        await client.query(
          `
            UPDATE video_debates
            SET media_id = $2,
                poster_object_key = $3,
                status = $4,
                draft_revision = $5,
                validated_revision = NULL,
                submission_hash = NULL,
                manifest_version = NULL,
                poster_probe = NULL,
                poster_etag = NULL,
                poster_checked_at = NULL,
                validation_errors = '[]'::jsonb,
                validated_at = NULL,
                updated_at = NOW()
            WHERE id = $1
          `,
          [debateId, mediaId, keys.poster, transition.state.status, transition.state.draftRevision],
        );
        for (const role of ["host", "for", "against"] as const) {
          await client.query(
            `
              UPDATE video_debate_participants
              SET mp4_object_key = $3,
                  media_probe = NULL,
                  media_byte_length = NULL,
                  media_etag = NULL,
                  media_checked_at = NULL,
                  updated_at = NOW()
              WHERE video_debate_id = $1 AND role = $2
            `,
            [debateId, role, keys[role]],
          );
        }
        audit(locked, transition.state, adminId, "Rotated video debate media id");
        return {
          commit: true,
          response: res.status(200).json({
            debate: adminDebateState(debateId, locked.slug, transition.state),
            mediaId,
            rclonePrefix: `video-debates/${mediaId}/`,
          }),
        };
      });
    },

    async previewVideoDebate(req: PublicRequest, res: PublicResponse) {
      noStore(res);
      const debateId = adminIdFrom(req);
      if (debateId === null) return res.status(400).json({ error: "invalid_video_debate_id" });
      if (!store.configured) return storageUnavailable(res);
      try {
        const aggregate = await readAdminAggregate(db, debateId, false);
        if (!aggregate) return notFound(res);
        const urls = store.publicUrlsFor(aggregate.mediaId);
        return res.status(200).json(toVideoDebateDetail({
          // An unpublished draft has no publication date; preview borrows the row's own clock.
          debate: {
            ...aggregate.debateRow,
            published_at: aggregate.debateRow.published_at ?? aggregate.debateRow.updated_at,
          },
          participants: aggregate.participantRows,
          rounds: aggregate.roundRows,
        }, urls));
      } catch (err) {
        handlerLogger.error({ err }, "Failed to preview video debate");
        return failed(res);
      }
    },

    async listVideoDebates(req: PublicRequest, res: PublicResponse) {
      noStore(res);
      if (!store.configured) return storageUnavailable(res);
      const { page, pageSize } = paging(req);
      try {
        const result = await db.query(
          `
            WITH published AS (
              SELECT
                id,
                slug,
                motion,
                media_id,
                duration_ms,
                final_winner,
                for_round_wins,
                against_round_wins,
                published_at,
                updated_at
              FROM video_debates
              WHERE status = 'published'
            ), published_total AS (
              SELECT COUNT(*)::int AS total FROM published
            ), debate_page AS (
              SELECT
                vd.*,
                COALESCE(participant_data.participants, '[]'::jsonb) AS participants,
                COALESCE(round_data.domains, '[]'::jsonb) AS domains
              FROM published vd
              LEFT JOIN LATERAL (
                SELECT jsonb_agg(
                  jsonb_build_object(
                    'role', participant.role,
                    'display_name', participant.display_name,
                    'avatar_url', participant.avatar_url,
                    'username', linked_user.username
                  )
                  ORDER BY CASE participant.role WHEN 'host' THEN 0 WHEN 'for' THEN 1 ELSE 2 END
                ) AS participants
                FROM video_debate_participants participant
                LEFT JOIN users linked_user ON linked_user.id = participant.user_id
                WHERE participant.video_debate_id = vd.id
              ) participant_data ON TRUE
              LEFT JOIN LATERAL (
                SELECT jsonb_agg(domain.name ORDER BY round.round_number) AS domains
                FROM video_debate_rounds round
                JOIN domains domain ON domain.id = round.domain_id
                WHERE round.video_debate_id = vd.id
              ) round_data ON TRUE
              ORDER BY vd.published_at DESC, vd.id DESC
              LIMIT $1 OFFSET $2
            )
            SELECT debate_page.*, published_total.total
            FROM published_total
            LEFT JOIN debate_page ON TRUE
            ORDER BY debate_page.published_at DESC NULLS LAST, debate_page.id DESC NULLS LAST
          `,
          [pageSize, (page - 1) * pageSize],
        );
        const total = integer(object(result.rows[0]).total);
        if (total === null || total < 0) throw new Error("Invalid published video debate count.");
        const debates = result.rows.filter(
          (value) => typeof object(value).slug === "string",
        ).map((value) => {
          const row = object(value);
          const urls = store.publicUrlsFor(mediaIdFromVideoDebateRow(row));
          return toVideoDebateListItem(
            row,
            participantsFromAggregate(row.participants),
            domainsFromAggregate(row.domains),
            urls,
          );
        });
        return res.status(200).json({ debates, total, page, pageSize });
      } catch (err) {
        handlerLogger.error({ err }, "Failed to list published video debates");
        return failed(res);
      }
    },

    async getVideoDebateBySlug(req: PublicRequest, res: PublicResponse) {
      noStore(res);
      if (!store.configured) return storageUnavailable(res);
      try {
        const debateResult = await db.query(
          `
            SELECT
              id,
              slug,
              motion,
              media_id,
              duration_ms,
              manifest_version,
              transcript,
              intro_start_ms,
              intro_end_ms,
              outro_start_ms,
              outro_end_ms,
              final_winner,
              for_round_wins,
              against_round_wins,
              final_crux,
              final_verdict,
              published_at,
              updated_at
            FROM video_debates
            WHERE slug = $1 AND status = 'published'
          `,
          [slugFrom(req)],
        );
        const debateRow = debateResult.rows[0];
        if (debateRow === undefined) return notFound(res);
        const debate = object(debateRow);
        const debateId = integer(debate.id);
        if (debateId === null) throw new Error("Invalid stored video debate id.");

        const participantResult = await db.query(
          `
            SELECT
              participant.role,
              participant.display_name,
              participant.avatar_url,
              linked_user.username
            FROM video_debate_participants participant
            LEFT JOIN users linked_user ON linked_user.id = participant.user_id
            WHERE participant.video_debate_id = $1
            ORDER BY CASE participant.role WHEN 'host' THEN 0 WHEN 'for' THEN 1 ELSE 2 END
          `,
          [debateId],
        );
        const roundResult = await db.query(
          `
            SELECT
              round.round_number,
              domain.name AS domain,
              round.opener,
              round.for_start_ms,
              round.for_end_ms,
              round.against_start_ms,
              round.against_end_ms,
              round.grace_start_ms,
              round.grace_end_ms,
              round.winner,
              round.for_score,
              round.against_score,
              round.ruling,
              round.for_points,
              round.against_points
            FROM video_debate_rounds round
            JOIN domains domain ON domain.id = round.domain_id
            WHERE round.video_debate_id = $1
            ORDER BY round.round_number
          `,
          [debateId],
        );
        const urls = store.publicUrlsFor(mediaIdFromVideoDebateRow(debate));
        return res.status(200).json(toVideoDebateDetail({
          debate,
          participants: participantResult.rows,
          rounds: roundResult.rows,
        }, urls));
      } catch (err) {
        handlerLogger.error({ err }, "Failed to read published video debate");
        return failed(res);
      }
    },

    async getVideoDebateCaptions(req: PublicRequest, res: PublicResponse) {
      noStore(res);
      try {
        const result = await db.query(
          `
            SELECT transcript
            FROM video_debates
            WHERE slug = $1 AND status = 'published'
          `,
          [slugFrom(req)],
        );
        const row = result.rows[0];
        if (row === undefined) return notFound(res);
        const body = renderWebVtt(transcriptFromStored(object(row).transcript));
        return res.type("text/vtt; charset=utf-8").status(200).send(body);
      } catch (err) {
        handlerLogger.error({ err }, "Failed to read published video debate captions");
        return failed(res);
      }
    },

    // Operational health only: no row is written, nothing ranked moves, and the
    // request body is narrowed field by field before anything is logged.
    async recordVideoPlaybackEvent(req: PublicRequest, res: PublicResponse) {
      noStore(res);
      try {
        const result = await db.query(
          `
            SELECT id, duration_ms
            FROM video_debates
            WHERE slug = $1 AND status = 'published'
          `,
          [slugFrom(req)],
        );
        const row = result.rows[0];
        if (row === undefined) return notFound(res);
        const stored = object(row);
        const debateId = integer(stored.id);
        const durationMs = integer(stored.duration_ms);
        if (debateId === null || durationMs === null || durationMs <= 0) {
          throw new Error("Invalid stored video debate duration.");
        }

        const event = narrowPlaybackEvent(req.body, durationMs);
        if (!event) return res.status(400).json({ error: "invalid_playback_event" });

        handlerLogger.info({
          videoDebateId: debateId,
          event: event.event,
          role: event.role,
          atMs: event.atMs,
          bufferMs: event.bufferMs,
          online: event.online,
          connection: event.connection,
        }, "video_playback");
        return res.status(204).send();
      } catch (err) {
        handlerLogger.error({ err }, "Failed to record a video playback event");
        return failed(res);
      }
    },

    async getVideoDebateSitemap(_req: PublicRequest, res: PublicResponse) {
      noStore(res);
      try {
        const result = await db.query(`
          SELECT slug, published_at, updated_at
          FROM video_debates
          WHERE status = 'published'
          ORDER BY published_at DESC, id DESC
        `);
        return res.status(200).json(result.rows.map((value) => {
          const row = object(value);
          return {
            slug: typeof row.slug === "string" ? row.slug : "",
            publishedAt: isoTimestamp(row.published_at),
            updatedAt: isoTimestamp(row.updated_at),
          };
        }));
      } catch (err) {
        handlerLogger.error({ err }, "Failed to read video debate sitemap");
        return failed(res);
      }
    },
  };
}

const productionHandlers = makeVideoDebateHandlers({
  db: pool,
  store: makeVideoStore(config.video_storage),
  logger,
});

export const {
  createVideoDebateDraft,
  listAdminVideoDebates,
  getAdminVideoDebate,
  patchVideoDebateMetadata,
  putVideoDebateManifest,
  checkVideoDebateMedia,
  validateVideoDebate,
  publishVideoDebate,
  unpublishVideoDebate,
  rotateVideoDebateMedia,
  previewVideoDebate,
  listVideoDebates,
  getVideoDebateBySlug,
  getVideoDebateCaptions,
  getVideoDebateSitemap,
  recordVideoPlaybackEvent,
} = productionHandlers;

interface AccessResponse extends PublicResponse {
  cookie(name: string, value: string, options: Record<string, unknown>): unknown;
}

// The gate itself. It touches no table and needs no injected store, so it sits
// outside the handler factory.
export function postVideoDebateAccess(req: PublicRequest, res: AccessResponse) {
  const secret = config.jwt_secret;
  const body = req.body as { password?: unknown } | undefined;
  // A missing secret and a wrong password are answered identically: a
  // misconfigured deployment must not announce itself to a stranger.
  if (!secret || !passwordAccepted(body?.password, config.video_debate.password)) {
    return res.status(401).json({ error: "wrong_password" });
  }
  res.cookie(VIDEO_PASS_COOKIE, issueVideoPass(secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: config.node_env === "production",
    path: "/",
    maxAge: VIDEO_PASS_MAX_AGE_MS,
  });
  return res.status(204).send();
}
