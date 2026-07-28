import fs from "fs/promises";
import path from "path";
import { AwsClient } from "aws4fetch";
import { UPLOADS_DIR, UPLOADS_URL_PREFIX } from "./avatars.js";

// Where a user's uploaded avatar actually lives.
//
// Production stores them in object storage (R2), NOT on a disk attached to the
// API. Container filesystems are discarded on every deploy, and the mounted
// volume that used to fix that came with three costs: it forbids replicas, it
// makes every deploy an interruption, and on the Hobby plan it cannot be backed
// up at all. Object storage is durable by default, so the backup problem stops
// existing rather than getting a nightly job.
//
// Development falls back to the local disk, so `npm run dev` and CI need no
// credentials and a contributor can work without an R2 account. The two modes
// differ only in where bytes land and what URL is handed back; every caller
// above this file is identical either way.

export interface AvatarStore {
  /** Human-readable, for the boot log. */
  readonly kind: "r2" | "local";
  /** Store the processed image. `key` is a bare filename. */
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  /** Remove a stored image. Missing is not an error — the DB row is the truth. */
  remove(key: string): Promise<void>;
  /** The value written to `users.avatar`. */
  urlFor(key: string): string;
}

/**
 * The stored avatar URL back to its storage key.
 *
 * Both modes end in the same filename, so a basename covers each — and because
 * `basename` discards every leading path segment, a hostile value in the column
 * cannot walk out of the uploads directory or the bucket prefix.
 */
export function keyFromAvatarUrl(avatarUrl: string): string {
  return path.posix.basename(avatarUrl);
}

/** Objects are immutable: every upload gets a fresh UUID filename. */
const IMMUTABLE = "public, max-age=31536000, immutable";

/** Bucket prefix, so the avatars bucket stays legible if it ever holds more. */
const R2_PREFIX = "avatars";

class R2AvatarStore implements AvatarStore {
  readonly kind = "r2" as const;

  constructor(
    private readonly client: AwsClient,
    private readonly endpoint: string,
    private readonly bucket: string,
    private readonly publicUrl: string,
  ) {}

  private objectUrl(key: string): string {
    return `${this.endpoint}/${this.bucket}/${R2_PREFIX}/${key}`;
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    const res = await this.client.fetch(this.objectUrl(key), {
      method: "PUT",
      body: new Uint8Array(body),
      headers: { "Content-Type": contentType, "Cache-Control": IMMUTABLE },
    });
    if (!res.ok) {
      throw new Error(`R2 PUT failed: ${res.status} ${await res.text()}`);
    }
  }

  async remove(key: string): Promise<void> {
    const res = await this.client.fetch(this.objectUrl(key), {
      method: "DELETE",
    });
    // 404 means it was already gone, which is the outcome we wanted.
    if (!res.ok && res.status !== 404) {
      throw new Error(`R2 DELETE failed: ${res.status}`);
    }
  }

  urlFor(key: string): string {
    return `${this.publicUrl}/${R2_PREFIX}/${key}`;
  }
}

class LocalAvatarStore implements AvatarStore {
  readonly kind = "local" as const;

  async put(key: string, body: Buffer): Promise<void> {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    await fs.writeFile(path.join(UPLOADS_DIR, key), body);
  }

  async remove(key: string): Promise<void> {
    try {
      await fs.unlink(path.join(UPLOADS_DIR, key));
    } catch (err: any) {
      if (err?.code !== "ENOENT") throw err;
    }
  }

  urlFor(key: string): string {
    return `${UPLOADS_URL_PREFIX}${key}`;
  }
}

export interface AvatarStorageConfig {
  endpoint?: string | undefined;
  bucket?: string | undefined;
  accessKeyId?: string | undefined;
  secretAccessKey?: string | undefined;
  publicUrl?: string | undefined;
}

/**
 * Pure selection, so the choice is testable without touching the network or the
 * environment. R2 needs all five values; anything less is development.
 */
export function makeAvatarStore(cfg: AvatarStorageConfig): AvatarStore {
  const { endpoint, bucket, accessKeyId, secretAccessKey, publicUrl } = cfg;

  if (endpoint && bucket && accessKeyId && secretAccessKey && publicUrl) {
    const client = new AwsClient({
      accessKeyId,
      secretAccessKey,
      service: "s3",
      // R2 has no regions; the S3 signing algorithm still demands one.
      region: "auto",
    });
    return new R2AvatarStore(
      client,
      endpoint.replace(/\/+$/, ""),
      bucket,
      publicUrl.replace(/\/+$/, ""),
    );
  }

  return new LocalAvatarStore();
}
