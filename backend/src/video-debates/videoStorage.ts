// Derives immutable video object locations and verifies direct R2 delivery.

import { AwsClient } from "aws4fetch";

export type VideoObjectName = "host" | "for" | "against" | "poster";
type VideoAngle = Exclude<VideoObjectName, "poster">;

export type VideoObjectMap<T> = Record<VideoObjectName, T>;
export type ExpectedVideoLengths = VideoObjectMap<number>;

export interface VideoStorageConfig {
  endpoint?: string | undefined;
  bucket?: string | undefined;
  accessKeyId?: string | undefined;
  secretAccessKey?: string | undefined;
  publicUrl?: string | undefined;
  cruxOrigin?: string | undefined;
  nodeEnv?: string | undefined;
}

export interface VideoStorageFailure {
  object: VideoObjectName;
  code:
    | "head_request"
    | "head_status"
    | "content_type"
    | "content_length"
    | "etag"
    | "range_request"
    | "range_status"
    | "accept_ranges"
    | "content_range"
    | "cache_control"
    | "cors_origin"
    | "range_body";
}

export interface VideoObjectReceipt {
  byteLength: number;
  etag: string;
}

export type VideoVerificationResult =
  | { ok: true; receipts: VideoObjectMap<VideoObjectReceipt> }
  | {
      ok: false;
      code: "video_storage_unconfigured" | "video_storage_invalid";
      failures: VideoStorageFailure[];
    };

type VideoFetch = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface VideoStorageDependencies {
  signedFetch?: VideoFetch | undefined;
  publicFetch?: VideoFetch | undefined;
}

export interface VideoStore {
  configured: boolean;
  keysFor(mediaId: string): VideoObjectMap<string>;
  publicUrlsFor(mediaId: string): VideoObjectMap<string>;
  verify(mediaId: string, expectedLengths: ExpectedVideoLengths): Promise<VideoVerificationResult>;
}

const VIDEO_PREFIX = "video-debates";
const OBJECT_FILES: Readonly<VideoObjectMap<string>> = {
  host: "host.mp4",
  for: "for.mp4",
  against: "against.mp4",
  poster: "poster.webp",
};
const OBJECT_NAMES = ["host", "for", "against", "poster"] as const;
const MEDIA_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function baseUrl(value: string | undefined): URL | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (
      (parsed.protocol !== "https:" && parsed.protocol !== "http:") ||
      parsed.username !== "" ||
      parsed.password !== "" ||
      parsed.search !== "" ||
      parsed.hash !== ""
    ) {
      return null;
    }
    parsed.pathname = `${parsed.pathname.replace(/\/+$/, "")}/`;
    return parsed;
  } catch {
    return null;
  }
}

function configuredOrigin(value: string | undefined): string | null {
  const parsed = baseUrl(value);
  return parsed?.origin ?? null;
}

function normalizedDnsHostname(url: URL): string {
  return url.hostname.toLowerCase().replace(/\.+$/, "");
}

function sameSecurityOrigin(left: URL, right: URL): boolean {
  return (
    left.protocol.toLowerCase() === right.protocol.toLowerCase() &&
    normalizedDnsHostname(left) === normalizedDnsHostname(right) &&
    left.port === right.port
  );
}

function isR2Dev(url: URL): boolean {
  const host = normalizedDnsHostname(url);
  return host === "r2.dev" || host.endsWith(".r2.dev");
}

function isR2Api(url: URL): boolean {
  const host = normalizedDnsHostname(url);
  return host === "r2.cloudflarestorage.com" || host.endsWith(".r2.cloudflarestorage.com");
}

function requireMediaId(mediaId: string): string {
  if (!MEDIA_ID.test(mediaId)) {
    throw new Error("media id must be an opaque UUID");
  }
  return mediaId.toLowerCase();
}

function mapObjects<T>(valueFor: (name: VideoObjectName) => T): VideoObjectMap<T> {
  return {
    host: valueFor("host"),
    for: valueFor("for"),
    against: valueFor("against"),
    poster: valueFor("poster"),
  };
}

function keysForMedia(mediaId: string): VideoObjectMap<string> {
  const id = requireMediaId(mediaId);
  return mapObjects((name) => `${VIDEO_PREFIX}/${id}/${OBJECT_FILES[name]}`);
}

function childUrl(base: URL, path: string): string {
  return new URL(path.split("/").map(encodeURIComponent).join("/"), base).toString();
}

function expectedContentType(name: VideoObjectName): "video/mp4" | "image/webp" {
  return name === "poster" ? "image/webp" : "video/mp4";
}

function positiveLength(value: string | null): number | null {
  if (value === null || !/^[1-9]\d*$/.test(value)) return null;
  const length = Number(value);
  return Number.isSafeInteger(length) ? length : null;
}

function strongEtag(value: string | null): value is string {
  return value !== null && /^"[^"\r\n]+"$/.test(value);
}

function immutablePublicCache(value: string | null): boolean {
  if (value === null) return false;
  const directives = new Map<string, string | null>();
  const token = /^[!#$%&'*+\-.^_`|~0-9a-z]+$/i;

  for (const rawDirective of value.split(",")) {
    const directive = rawDirective.trim();
    if (directive === "") return false;
    const separator = directive.indexOf("=");
    if (separator !== -1 && directive.indexOf("=", separator + 1) !== -1) return false;

    const rawName = (separator === -1 ? directive : directive.slice(0, separator)).trim();
    const rawValue = separator === -1 ? null : directive.slice(separator + 1).trim();
    if (!token.test(rawName) || (rawValue !== null && !token.test(rawValue))) return false;

    const name = rawName.toLowerCase();
    if (directives.has(name)) return false;
    directives.set(name, rawValue?.toLowerCase() ?? null);
  }

  if (directives.get("public") !== null || directives.get("immutable") !== null) return false;
  if (!directives.has("public") || !directives.has("immutable")) return false;
  if (
    directives.has("private") ||
    directives.has("no-store") ||
    directives.has("no-cache")
  ) {
    return false;
  }

  const maxAge = directives.get("max-age");
  if (maxAge === undefined || maxAge === null || !/^\d+$/.test(maxAge)) return false;
  const seconds = Number(maxAge);
  return Number.isSafeInteger(seconds) && seconds >= 31_536_000;
}

function matchingContentRange(value: string | null, expectedLength: number): boolean {
  if (value === null) return false;
  const match = /^bytes 0-0\/([1-9]\d*)$/i.exec(value.trim());
  if (!match) return false;
  const total = Number(match[1]);
  return Number.isSafeInteger(total) && total === expectedLength;
}

async function cancelBody(response: Response): Promise<void> {
  if (!response.body) return;
  try {
    await response.body.cancel();
  } catch {
    // A failed cancellation is still contained: verification never reads this body.
  }
}

async function readOneByteAndCancel(response: Response): Promise<boolean> {
  if (!response.body || response.headers.get("Content-Length") !== "1") {
    await cancelBody(response);
    return false;
  }

  let reader: ReadableStreamBYOBReader;
  try {
    reader = response.body.getReader({ mode: "byob" });
  } catch {
    await cancelBody(response);
    return false;
  }

  try {
    const result = await reader.read(new Uint8Array(1));
    return result.done === false && result.value.byteLength === 1;
  } catch {
    return false;
  } finally {
    try {
      await reader.cancel();
    } catch {
      // The byte cap has already been enforced even if cancellation reports an error.
    }
  }
}

function failure(object: VideoObjectName, code: VideoStorageFailure["code"]): VideoStorageFailure {
  return { object, code };
}

async function verifyHead(
  name: VideoObjectName,
  objectUrl: string,
  expectedLength: number,
  signedFetch: VideoFetch,
): Promise<{ failures: VideoStorageFailure[]; receipt: VideoObjectReceipt | null }> {
  let response: Response;
  try {
    response = await signedFetch(objectUrl, { method: "HEAD" });
  } catch {
    return { failures: [failure(name, "head_request")], receipt: null };
  }

  if (response.status !== 200) {
    await cancelBody(response);
    return { failures: [failure(name, "head_status")], receipt: null };
  }

  const failures: VideoStorageFailure[] = [];
  const contentType = response.headers.get("Content-Type");
  const contentLength = positiveLength(response.headers.get("Content-Length"));
  const etag = response.headers.get("ETag");

  if (contentType !== expectedContentType(name)) failures.push(failure(name, "content_type"));
  if (!Number.isSafeInteger(expectedLength) || expectedLength <= 0 || contentLength !== expectedLength) {
    failures.push(failure(name, "content_length"));
  }
  if (!strongEtag(etag)) failures.push(failure(name, "etag"));
  await cancelBody(response);

  return {
    failures,
    receipt:
      failures.length === 0 && contentLength !== null && strongEtag(etag)
        ? { byteLength: contentLength, etag }
        : null,
  };
}

async function verifyRange(
  name: VideoAngle,
  publicUrl: string,
  expectedLength: number,
  cruxOrigin: string,
  publicFetch: VideoFetch,
): Promise<VideoStorageFailure[]> {
  let response: Response;
  try {
    response = await publicFetch(publicUrl, {
      headers: { Range: "bytes=0-0", Origin: cruxOrigin },
    });
  } catch {
    return [failure(name, "range_request")];
  }

  if (response.status !== 206) {
    await cancelBody(response);
    return [failure(name, "range_status")];
  }

  const failures: VideoStorageFailure[] = [];
  // Accept-Ranges is a 200-level header: R2 advertises it on HEAD and on full
  // responses, not on the 206 it returns here. A 206 carrying a matching
  // Content-Range is stronger evidence of range support than the header anyway, so
  // treat the header as a veto — fail only when it is present and denies ranges.
  const acceptRanges = response.headers.get("Accept-Ranges")?.trim().toLowerCase();
  if (acceptRanges !== undefined && acceptRanges !== "bytes") {
    failures.push(failure(name, "accept_ranges"));
  }
  if (!matchingContentRange(response.headers.get("Content-Range"), expectedLength)) {
    failures.push(failure(name, "content_range"));
  }
  if (!immutablePublicCache(response.headers.get("Cache-Control"))) {
    failures.push(failure(name, "cache_control"));
  }
  if (response.headers.get("Access-Control-Allow-Origin") !== cruxOrigin) {
    failures.push(failure(name, "cors_origin"));
  }

  if (failures.length > 0) {
    await cancelBody(response);
    return failures;
  }
  if (!(await readOneByteAndCancel(response))) failures.push(failure(name, "range_body"));
  return failures;
}

export function makeVideoStore(
  config: VideoStorageConfig,
  dependencies: VideoStorageDependencies = {},
): VideoStore {
  const endpoint = baseUrl(config.endpoint);
  const publicUrl = baseUrl(config.publicUrl);
  const cruxOrigin = configuredOrigin(config.cruxOrigin);
  const accessKeyId = config.accessKeyId;
  const secretAccessKey = config.secretAccessKey;
  const credentialsPresent = Boolean(accessKeyId && secretAccessKey);
  const productionPublicUrlAllowed =
    config.nodeEnv !== "production" ||
    (
      publicUrl !== null &&
      endpoint !== null &&
      !isR2Dev(publicUrl) &&
      !isR2Api(publicUrl) &&
      !sameSecurityOrigin(publicUrl, endpoint)
    );
  const configured = Boolean(
    endpoint &&
      publicUrl &&
      cruxOrigin &&
      config.bucket &&
      credentialsPresent &&
      productionPublicUrlAllowed,
  );

  let signedFetch = dependencies.signedFetch;
  if (configured && !signedFetch && accessKeyId && secretAccessKey) {
    const client = new AwsClient({
      accessKeyId,
      secretAccessKey,
      service: "s3",
      region: "auto",
    });
    signedFetch = (input, init) => client.fetch(input, init);
  }
  const publicFetch: VideoFetch | undefined = dependencies.publicFetch ?? globalThis.fetch;

  return {
    configured,
    keysFor: keysForMedia,
    publicUrlsFor(mediaId) {
      if (!configured || !publicUrl) throw new Error("video storage is unconfigured");
      const keys = keysForMedia(mediaId);
      return mapObjects((name) => childUrl(publicUrl, keys[name]));
    },
    async verify(mediaId, expectedLengths) {
      if (!configured || !endpoint || !publicUrl || !cruxOrigin || !config.bucket || !signedFetch || !publicFetch) {
        return { ok: false, code: "video_storage_unconfigured", failures: [] };
      }

      const keys = keysForMedia(mediaId);
      const publicUrls = mapObjects((name) => childUrl(publicUrl, keys[name]));
      const bucket = encodeURIComponent(config.bucket);
      const objectUrls = mapObjects((name) => childUrl(endpoint, `${bucket}/${keys[name]}`));

      const checked = await Promise.all(
        OBJECT_NAMES.map(async (name) => {
          const head = await verifyHead(name, objectUrls[name], expectedLengths[name], signedFetch);
          const rangeFailures = name === "poster"
            ? []
            : await verifyRange(name, publicUrls[name], expectedLengths[name], cruxOrigin, publicFetch);
          return { name, head, failures: [...head.failures, ...rangeFailures] };
        }),
      );
      const failures = checked.flatMap((result) => result.failures);
      if (failures.length > 0) {
        return { ok: false, code: "video_storage_invalid", failures };
      }

      const host = checked[0]?.head.receipt;
      const forReceipt = checked[1]?.head.receipt;
      const against = checked[2]?.head.receipt;
      const poster = checked[3]?.head.receipt;
      if (!host || !forReceipt || !against || !poster) {
        const missing = checked
          .filter((result) => result.head.receipt === null)
          .map((result) => failure(result.name, "head_request"));
        return { ok: false, code: "video_storage_invalid", failures: missing };
      }

      return {
        ok: true,
        receipts: { host, for: forReceipt, against, poster },
      };
    },
  };
}
