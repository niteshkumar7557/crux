// Where an uploaded avatar actually lives. Object storage in production, because a
// container filesystem is discarded on every deploy; the local disk in dev and CI,
// so contributing needs no credentials. Callers above this file are identical either
// way, and the active mode is logged on boot.

import fs from "fs/promises";
import path from "path";
import { AwsClient } from "aws4fetch";
import { UPLOADS_DIR, UPLOADS_URL_PREFIX } from "./avatars.js";

export interface AvatarStore {
  readonly kind: "r2" | "local";
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  remove(key: string): Promise<void>;
  urlFor(key: string): string;
}

export function keyFromAvatarUrl(avatarUrl: string): string {
  return path.posix.basename(avatarUrl);
}

const IMMUTABLE = "public, max-age=31536000, immutable";

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

export function makeAvatarStore(cfg: AvatarStorageConfig): AvatarStore {
  const { endpoint, bucket, accessKeyId, secretAccessKey, publicUrl } = cfg;

  if (endpoint && bucket && accessKeyId && secretAccessKey && publicUrl) {
    const client = new AwsClient({
      accessKeyId,
      secretAccessKey,
      service: "s3",
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
