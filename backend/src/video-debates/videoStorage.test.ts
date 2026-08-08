import { describe, expect, it } from "vitest";
import {
  makeVideoStore,
  type ExpectedVideoLengths,
  type VideoObjectName,
  type VideoStorageConfig,
  type VideoStorageFailure,
} from "./videoStorage.js";

const MEDIA_ID = "018f1f28-7a9c-7d3e-8c4b-6a5f4e3d2c1b";
const LENGTHS: ExpectedVideoLengths = {
  host: 10_001,
  for: 10_002,
  against: 10_003,
  poster: 4_004,
};
const ETAGS: Record<VideoObjectName, string> = {
  host: '"host-etag"',
  for: '"for-etag"',
  against: '"against-etag"',
  poster: '"poster-etag"',
};

const CONFIG: VideoStorageConfig = {
  endpoint: "https://account-id.r2.cloudflarestorage.com",
  bucket: "crux-video",
  accessKeyId: "access-key",
  secretAccessKey: "secret-key",
  publicUrl: "https://media.crux.example",
  cruxOrigin: "https://crux.example",
  nodeEnv: "production",
};

type Fetch = (input: string | URL, init?: RequestInit) => Promise<Response>;
type VideoAngle = Exclude<VideoObjectName, "poster">;

function objectName(input: string | URL): VideoObjectName {
  const pathname = new URL(String(input)).pathname;
  if (pathname.endsWith("/host.mp4")) return "host";
  if (pathname.endsWith("/for.mp4")) return "for";
  if (pathname.endsWith("/against.mp4")) return "against";
  if (pathname.endsWith("/poster.webp")) return "poster";
  throw new Error(`unexpected object URL: ${pathname}`);
}

function videoAngle(input: string | URL): VideoAngle {
  const name = objectName(input);
  if (name === "poster") throw new Error("poster does not have a public range request");
  return name;
}

function validHead(name: VideoObjectName): Response {
  return new Response(null, {
    status: 200,
    headers: {
      "Content-Type": name === "poster" ? "image/webp" : "video/mp4",
      "Content-Length": String(LENGTHS[name]),
      ETag: ETAGS[name],
    },
  });
}

function validRange(name: Exclude<VideoObjectName, "poster">): Response {
  return new Response(new Uint8Array([name === "host" ? 1 : name === "for" ? 2 : 3]), {
    status: 206,
    headers: {
      "Content-Length": "1",
      "Content-Range": `bytes 0-0/${LENGTHS[name]}`,
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Access-Control-Allow-Origin": "https://crux.example",
    },
  });
}

function configuredStore(overrides: {
  config?: Partial<VideoStorageConfig>;
  signedFetch?: Fetch;
  publicFetch?: Fetch;
} = {}) {
  return makeVideoStore(
    { ...CONFIG, ...overrides.config },
    {
      signedFetch: overrides.signedFetch ?? (async (input) => validHead(objectName(input))),
      publicFetch:
        overrides.publicFetch ??
        (async (input) => validRange(videoAngle(input))),
    },
  );
}

function failures(result: Awaited<ReturnType<ReturnType<typeof configuredStore>["verify"]>>): VideoStorageFailure[] {
  expect(result.ok).toBe(false);
  return result.ok ? [] : result.failures;
}

describe("video storage configuration and derived URLs", () => {
  it("is unconfigured when any required video bucket setting is absent", async () => {
    const required: Array<keyof VideoStorageConfig> = [
      "endpoint",
      "bucket",
      "accessKeyId",
      "secretAccessKey",
      "publicUrl",
      "cruxOrigin",
    ];

    for (const setting of required) {
      const store = configuredStore({ config: { [setting]: undefined } });
      expect(store.configured, `missing ${setting}`).toBe(false);
      await expect(store.verify(MEDIA_ID, LENGTHS)).resolves.toEqual({
        ok: false,
        code: "video_storage_unconfigured",
        failures: [],
      });
    }
  });

  it("constructs exactly host, for, against, and poster keys under one opaque media id", () => {
    expect(configuredStore().keysFor(MEDIA_ID)).toEqual({
      host: `video-debates/${MEDIA_ID}/host.mp4`,
      for: `video-debates/${MEDIA_ID}/for.mp4`,
      against: `video-debates/${MEDIA_ID}/against.mp4`,
      poster: `video-debates/${MEDIA_ID}/poster.webp`,
    });
  });

  it("constructs public URLs from R2_VIDEO_PUBLIC_URL without exposing the S3 endpoint", () => {
    const urls = configuredStore({
      config: { publicUrl: "https://media.crux.example/root/" },
    }).publicUrlsFor(MEDIA_ID);

    expect(urls).toEqual({
      host: `https://media.crux.example/root/video-debates/${MEDIA_ID}/host.mp4`,
      for: `https://media.crux.example/root/video-debates/${MEDIA_ID}/for.mp4`,
      against: `https://media.crux.example/root/video-debates/${MEDIA_ID}/against.mp4`,
      poster: `https://media.crux.example/root/video-debates/${MEDIA_ID}/poster.webp`,
    });
    expect(JSON.stringify(urls)).not.toContain("r2.cloudflarestorage.com");
  });

  it("rejects an r2.dev public host in production", async () => {
    const store = configuredStore({
      config: { publicUrl: "https://pub-1234.r2.dev" },
    });

    expect(store.configured).toBe(false);
    await expect(store.verify(MEDIA_ID, LENGTHS)).resolves.toEqual({
      ok: false,
      code: "video_storage_unconfigured",
      failures: [],
    });
  });

  it("rejects Cloudflare S3 API hosts and subdomains as production public hosts", async () => {
    const forbiddenPublicUrls = [
      "https://r2.cloudflarestorage.com",
      "https://account-id.r2.cloudflarestorage.com",
      "https://bucket.account-id.r2.cloudflarestorage.com/public",
    ];

    for (const publicUrl of forbiddenPublicUrls) {
      const store = configuredStore({ config: { publicUrl } });
      expect(store.configured, publicUrl).toBe(false);
      expect(() => store.publicUrlsFor(MEDIA_ID), publicUrl).toThrow(
        "video storage is unconfigured",
      );
      await expect(store.verify(MEDIA_ID, LENGTHS)).resolves.toEqual({
        ok: false,
        code: "video_storage_unconfigured",
        failures: [],
      });
    }
  });

  it("rejects terminal-dot spellings of R2 public hosts in production", async () => {
    const forbiddenPublicUrls = [
      "https://r2.dev.",
      "https://pub-1234.r2.dev./media",
      "https://r2.cloudflarestorage.com.",
      "https://account-id.r2.cloudflarestorage.com./public",
      "https://bucket.account-id.r2.cloudflarestorage.com./public",
    ];

    for (const publicUrl of forbiddenPublicUrls) {
      const store = configuredStore({ config: { publicUrl } });
      expect(store.configured, publicUrl).toBe(false);
      expect(() => store.publicUrlsFor(MEDIA_ID), publicUrl).toThrow(
        "video storage is unconfigured",
      );
      await expect(store.verify(MEDIA_ID, LENGTHS)).resolves.toEqual({
        ok: false,
        code: "video_storage_unconfigured",
        failures: [],
      });
    }
  });

  it("rejects a production public origin equal to the signed endpoint origin", async () => {
    const store = configuredStore({
      config: {
        endpoint: "https://s3.internal.example/account",
        publicUrl: "https://s3.internal.example/public",
      },
    });

    expect(store.configured).toBe(false);
    expect(() => store.publicUrlsFor(MEDIA_ID)).toThrow("video storage is unconfigured");
    await expect(store.verify(MEDIA_ID, LENGTHS)).resolves.toEqual({
      ok: false,
      code: "video_storage_unconfigured",
      failures: [],
    });
  });

  it("compares signed and public origins after terminal-dot normalization", async () => {
    const equivalentOrigins = [
      {
        endpoint: "https://s3.internal.example/account",
        publicUrl: "https://s3.internal.example./public",
      },
      {
        endpoint: "https://s3.internal.example./account",
        publicUrl: "https://s3.internal.example/public",
      },
    ];

    for (const pair of equivalentOrigins) {
      const store = configuredStore({ config: pair });
      expect(store.configured, JSON.stringify(pair)).toBe(false);
      expect(() => store.publicUrlsFor(MEDIA_ID), JSON.stringify(pair)).toThrow(
        "video storage is unconfigured",
      );
      await expect(store.verify(MEDIA_ID, LENGTHS)).resolves.toEqual({
        ok: false,
        code: "video_storage_unconfigured",
        failures: [],
      });
    }
  });

  it("preserves a validated custom-domain URL when constructing public URLs", () => {
    const store = configuredStore({
      config: { publicUrl: "https://media.crux.example./root" },
    });

    expect(store.configured).toBe(true);
    expect(store.publicUrlsFor(MEDIA_ID).host).toBe(
      `https://media.crux.example./root/video-debates/${MEDIA_ID}/host.mp4`,
    );
  });

  it("does not accept a caller-supplied object key outside the derived prefix", () => {
    expect(() => configuredStore().keysFor("../../private-backup")).toThrow(
      "media id must be an opaque UUID",
    );
    expect(() => configuredStore().publicUrlsFor("video-debates/other/host.mp4")).toThrow(
      "media id must be an opaque UUID",
    );
  });
});

describe("video object verification", () => {
  it("requires signed HEAD 200, expected content type, total length, and strong etag for every object", async () => {
    const methods: Array<string | undefined> = [];
    const result = await configuredStore({
      signedFetch: async (input, init) => {
        methods.push(init?.method);
        return validHead(objectName(input));
      },
    }).verify(MEDIA_ID, LENGTHS);

    expect(methods).toEqual(["HEAD", "HEAD", "HEAD", "HEAD"]);
    expect(result).toEqual({
      ok: true,
      receipts: {
        host: { byteLength: 10_001, etag: '"host-etag"' },
        for: { byteLength: 10_002, etag: '"for-etag"' },
        against: { byteLength: 10_003, etag: '"against-etag"' },
        poster: { byteLength: 4_004, etag: '"poster-etag"' },
      },
    });
  });

  it("rejects missing or weak etags and mismatched lengths", async () => {
    const result = await configuredStore({
      signedFetch: async (input) => {
        const name = objectName(input);
        const response = validHead(name);
        if (name === "host") response.headers.delete("ETag");
        if (name === "for") response.headers.set("ETag", 'W/"weak"');
        if (name === "against") response.headers.set("Content-Length", "10004");
        return response;
      },
    }).verify(MEDIA_ID, LENGTHS);

    expect(failures(result)).toEqual([
      { object: "host", code: "etag" },
      { object: "for", code: "etag" },
      { object: "against", code: "content_length" },
    ]);
  });

  it("requires video/mp4 for all angles and image/webp for the poster", async () => {
    const result = await configuredStore({
      signedFetch: async (input) => {
        const name = objectName(input);
        const response = validHead(name);
        response.headers.set("Content-Type", name === "poster" ? "image/png" : "text/plain");
        return response;
      },
    }).verify(MEDIA_ID, LENGTHS);

    expect(failures(result)).toEqual([
      { object: "host", code: "content_type" },
      { object: "for", code: "content_type" },
      { object: "against", code: "content_type" },
      { object: "poster", code: "content_type" },
    ]);
  });

  it("requires public bytes=0-0 to return 206, accept-ranges bytes, and matching content-range total", async () => {
    const requests: Array<{ range: string | null; origin: string | null }> = [];
    const result = await configuredStore({
      publicFetch: async (input, init) => {
        const name = videoAngle(input);
        const headers = new Headers(init?.headers);
        requests.push({ range: headers.get("Range"), origin: headers.get("Origin") });
        const response = validRange(name);
        if (name === "host") return new Response(null, { status: 200, headers: response.headers });
        if (name === "for") response.headers.set("Accept-Ranges", "none");
        if (name === "against") response.headers.set("Content-Range", "bytes 0-0/10004");
        return response;
      },
    }).verify(MEDIA_ID, LENGTHS);

    expect(requests).toEqual([
      { range: "bytes=0-0", origin: "https://crux.example" },
      { range: "bytes=0-0", origin: "https://crux.example" },
      { range: "bytes=0-0", origin: "https://crux.example" },
    ]);
    expect(failures(result)).toEqual([
      { object: "host", code: "range_status" },
      { object: "for", code: "accept_ranges" },
      { object: "against", code: "content_range" },
    ]);
  });

  it("accepts a 206 that omits accept-ranges, as R2 does behind a custom domain", async () => {
    const result = await configuredStore({
      publicFetch: async (input) => {
        const response = validRange(videoAngle(input));
        response.headers.delete("Accept-Ranges");
        return response;
      },
    }).verify(MEDIA_ID, LENGTHS);

    expect(result.ok).toBe(true);
  });

  it("still rejects a 206 that explicitly denies ranges", async () => {
    const result = await configuredStore({
      publicFetch: async (input) => {
        const response = validRange(videoAngle(input));
        response.headers.set("Accept-Ranges", "none");
        return response;
      },
    }).verify(MEDIA_ID, LENGTHS);

    expect(failures(result)).toEqual([
      { object: "host", code: "accept_ranges" },
      { object: "for", code: "accept_ranges" },
      { object: "against", code: "accept_ranges" },
    ]);
  });

  it("requires immutable public cache control on the custom-domain response", async () => {
    const result = await configuredStore({
      publicFetch: async (input) => {
        const name = videoAngle(input);
        const response = validRange(name);
        response.headers.set("Cache-Control", name === "host" ? "public, max-age=60" : name === "for" ? "private, max-age=31536000, immutable" : "public, max-age=31536000");
        return response;
      },
    }).verify(MEDIA_ID, LENGTHS);

    expect(failures(result)).toEqual([
      { object: "host", code: "cache_control" },
      { object: "for", code: "cache_control" },
      { object: "against", code: "cache_control" },
    ]);
  });

  it("rejects contradictory, duplicate, and malformed immutable cache directives", async () => {
    const result = await configuredStore({
      publicFetch: async (input) => {
        const name = videoAngle(input);
        const response = validRange(name);
        response.headers.set(
          "Cache-Control",
          name === "host"
            ? "public, max-age=31536000, max-age=0, immutable"
            : name === "for"
              ? "public, max-age=31536000, immutable, no-cache"
              : "public, max-age=31536000, max-age=31536000, immutable",
        );
        return response;
      },
    }).verify(MEDIA_ID, LENGTHS);

    expect(failures(result)).toEqual([
      { object: "host", code: "cache_control" },
      { object: "for", code: "cache_control" },
      { object: "against", code: "cache_control" },
    ]);

    const malformed = await configuredStore({
      publicFetch: async (input) => {
        const name = videoAngle(input);
        const response = validRange(name);
        response.headers.set("Cache-Control", "public, max-age=31536000x, immutable");
        return response;
      },
    }).verify(MEDIA_ID, LENGTHS);
    expect(failures(malformed)).toEqual([
      { object: "host", code: "cache_control" },
      { object: "for", code: "cache_control" },
      { object: "against", code: "cache_control" },
    ]);
  });

  it("accepts case-insensitive cache directives with safe optional whitespace", async () => {
    const result = await configuredStore({
      publicFetch: async (input) => {
        const name = videoAngle(input);
        const response = validRange(name);
        response.headers.set(
          "Cache-Control",
          " PuBlIc , MAX-AGE = 31536000 , ImMuTaBlE ",
        );
        return response;
      },
    }).verify(MEDIA_ID, LENGTHS);

    expect(result.ok).toBe(true);
  });

  it("accepts a wildcard CORS origin when credentials are not allowed", async () => {
    const result = await configuredStore({
      publicFetch: async (input) => {
        const response = validRange(videoAngle(input));
        response.headers.set("Access-Control-Allow-Origin", "*");
        return response;
      },
    }).verify(MEDIA_ID, LENGTHS);

    expect(result.ok).toBe(true);
  });

  it("requires CORS to allow the configured Crux origin without wildcard credentials", async () => {
    const result = await configuredStore({
      publicFetch: async (input) => {
        const name = videoAngle(input);
        const response = validRange(name);
        response.headers.set(
          "Access-Control-Allow-Origin",
          name === "host" ? "*" : name === "for" ? "https://other.example" : "null",
        );
        if (name === "host") response.headers.set("Access-Control-Allow-Credentials", "true");
        return response;
      },
    }).verify(MEDIA_ID, LENGTHS);

    expect(failures(result)).toEqual([
      { object: "host", code: "cors_origin" },
      { object: "for", code: "cors_origin" },
      { object: "against", code: "cors_origin" },
    ]);
  });

  it("poster verification does not download the poster body", async () => {
    const publicNames: VideoObjectName[] = [];
    const result = await configuredStore({
      publicFetch: async (input) => {
        const name = objectName(input);
        publicNames.push(name);
        if (name === "poster") throw new Error("poster body requested");
        return validRange(name);
      },
    }).verify(MEDIA_ID, LENGTHS);

    expect(result.ok).toBe(true);
    expect(publicNames).toEqual(["host", "for", "against"]);
  });

  it("reads at most one byte from each public range and cancels oversized responses before reading", async () => {
    const pulls: Record<"host" | "for" | "against", number> = { host: 0, for: 0, against: 0 };
    const cancellations: Record<"host" | "for" | "against", number> = { host: 0, for: 0, against: 0 };
    const result = await configuredStore({
      publicFetch: async (input) => {
        const name = videoAngle(input);
        const body = new ReadableStream({
          type: "bytes",
          pull(controller) {
            pulls[name] += 1;
            const request = controller.byobRequest;
            if (!request) throw new Error("expected a one-byte BYOB read");
            if (!(request.view instanceof Uint8Array)) throw new Error("expected a byte view");
            request.view[0] = 9;
            request.respond(1);
          },
          cancel() {
            cancellations[name] += 1;
          },
        });
        const response = validRange(name);
        return new Response(body, { status: 206, headers: response.headers });
      },
    }).verify(MEDIA_ID, LENGTHS);

    expect(result.ok).toBe(true);
    expect(pulls).toEqual({ host: 1, for: 1, against: 1 });
    expect(cancellations).toEqual({ host: 1, for: 1, against: 1 });

    let oversizedPulls = 0;
    let oversizedCancellations = 0;
    const oversized = await configuredStore({
      publicFetch: async (input) => {
        const name = videoAngle(input);
        const body = new ReadableStream({
          type: "bytes",
          pull() {
            oversizedPulls += 1;
          },
          cancel() {
            oversizedCancellations += 1;
          },
        });
        const response = validRange(name);
        response.headers.set("Content-Length", "2");
        return new Response(body, { status: 206, headers: response.headers });
      },
    }).verify(MEDIA_ID, LENGTHS);

    expect(failures(oversized)).toEqual([
      { object: "host", code: "range_body" },
      { object: "for", code: "range_body" },
      { object: "against", code: "range_body" },
    ]);
    expect(oversizedPulls).toBe(0);
    expect(oversizedCancellations).toBe(3);
  });

  it("reports all object failures together without logging credentials", async () => {
    const result = await configuredStore({
      signedFetch: async (input) => {
        const name = objectName(input);
        return new Response(null, { status: name === "poster" ? 404 : 503 });
      },
      publicFetch: async (input) => {
        const name = videoAngle(input);
        return new Response(null, { status: name === "host" ? 500 : 416 });
      },
    }).verify(MEDIA_ID, LENGTHS);

    expect(failures(result)).toEqual([
      { object: "host", code: "head_status" },
      { object: "host", code: "range_status" },
      { object: "for", code: "head_status" },
      { object: "for", code: "range_status" },
      { object: "against", code: "head_status" },
      { object: "against", code: "range_status" },
      { object: "poster", code: "head_status" },
    ]);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("access-key");
    expect(serialized).not.toContain("secret-key");
    expect(serialized).not.toContain("Authorization");
    expect(serialized).not.toContain("r2.cloudflarestorage.com");
  });
});
