import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { inspectMediaPackage, type InspectorPorts } from "./inspect-media.js";

const atom = (type: string, payload: Uint8Array<ArrayBufferLike> = new Uint8Array()): Uint8Array<ArrayBufferLike> => {
  const bytes = new Uint8Array(8 + payload.length);
  new DataView(bytes.buffer).setUint32(0, bytes.length);
  bytes.set(new TextEncoder().encode(type), 4);
  bytes.set(payload, 8);
  return bytes;
};

const concat = (...parts: Uint8Array<ArrayBufferLike>[]): Uint8Array<ArrayBufferLike> => {
  const bytes = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return bytes;
};

const ftyp = (majorBrand: string): Uint8Array => concat(
  new TextEncoder().encode(majorBrand),
  new Uint8Array(4),
  new TextEncoder().encode(majorBrand),
);

const validMp4 = () => concat(atom("ftyp", ftyp("isom")), atom("moov"), atom("mdat"));

const mediaResponse = JSON.stringify({
  format: { duration: "4.000" },
  streams: [
    { codec_type: "video", codec_name: "h264", profile: "High", width: 1280, height: 720, pix_fmt: "yuv420p", r_frame_rate: "30/1", bit_rate: "2500000" },
    { codec_type: "audio", codec_name: "aac", sample_rate: "48000" },
  ],
});

const frameResponse = JSON.stringify({
  frames: [
    { key_frame: 1, best_effort_timestamp_time: "0" },
    { key_frame: 1, best_effort_timestamp_time: "2" },
  ],
});

const posterResponse = JSON.stringify({
  streams: [{ codec_type: "video", codec_name: "webp", width: 1600, height: 900 }],
});

function ports(overrides: Partial<InspectorPorts> = {}): InspectorPorts & { calls: string[][]; writes: unknown[] } {
  const calls: string[][] = [];
  const writes: unknown[] = [];
  const files = new Map<string, Uint8Array>([
    ["/package/publish/host.mp4", validMp4()],
    ["/package/publish/for.mp4", validMp4()],
    ["/package/publish/against.mp4", validMp4()],
    ["/package/publish/poster.webp", new Uint8Array([1])],
  ]);
  return {
    calls,
    writes,
    file: {
      stat: async (path) => ({ isFile: true, size: files.get(path)?.length ?? 1 }),
      read: async (path, position, length) => files.get(path)?.slice(position, position + length) ?? new Uint8Array(),
    },
    ffprobe: async (args) => {
      calls.push([...args]);
      if (args.includes("-show_frames")) return frameResponse;
      if (args.some((argument) => argument.includes("codec_name,width,height"))) return posterResponse;
      return mediaResponse;
    },
    writeJson: async (_path, value) => { writes.push(value); },
    ...overrides,
  };
}

describe("inspectMediaPackage", () => {
  it("rejects a missing package argument before invoking ffprobe", async () => {
    const fake = ports();

    await expect(inspectMediaPackage(undefined, fake)).rejects.toThrow("Missing absolute");
    expect(fake.calls).toHaveLength(0);
    expect(fake.writes).toHaveLength(0);
  });

  it("rejects malformed FFprobe JSON for the role that produced it without writing probes", async () => {
    const fake = ports({ ffprobe: async () => "not json" });

    await expect(inspectMediaPackage("/package", fake)).rejects.toThrow("host: ffprobe");
    expect(fake.writes).toHaveLength(0);
  });

  it("rejects an ISO-BMFF QuickTime brand even when moov precedes mdat", async () => {
    const fake = ports();
    const quickTime = concat(atom("ftyp", ftyp("qt  ")), atom("moov"), atom("mdat"));
    const originalRead = fake.file.read;
    fake.file.read = async (path, position, length) => path.endsWith("host.mp4")
      ? quickTime.slice(position, position + length)
      : originalRead(path, position, length);

    await expect(inspectMediaPackage("/package", fake)).rejects.toThrow("host: container");
    expect(fake.writes).toHaveLength(0);
  });

  it("reports the failed role and does not write when one later track fails", async () => {
    let mediaCalls = 0;
    const fake = ports({
      ffprobe: async (args) => {
        if (args.includes("-show_frames")) return frameResponse;
        if (args.some((argument) => argument.includes("codec_name,width,height"))) return posterResponse;
        mediaCalls += 1;
        return mediaCalls === 2 ? JSON.stringify({ format: { duration: "4" }, streams: [] }) : mediaResponse;
      },
    });

    await expect(inspectMediaPackage("/package", fake)).rejects.toThrow("for: video_stream");
    expect(fake.writes).toHaveLength(0);
  });

  it("accepts a legitimate recognized H.264 profile and writes only after every role passes", async () => {
    const highTenResponse = mediaResponse.replace('"profile":"High"', '"profile":"High 10"');
    const fake = ports({
      ffprobe: async (args) => {
        if (args.includes("-show_frames")) return frameResponse;
        if (args.some((argument) => argument.includes("codec_name,width,height"))) return posterResponse;
        return highTenResponse;
      },
    });

    await expect(inspectMediaPackage("/package", fake)).resolves.toMatchObject({ host: { video_profile: "High 10" } });
    expect(fake.writes).toHaveLength(1);
  });

  it("rejects a symlinked media terminal before stat, FFprobe, or output writes", async () => {
    const root = await mkdtemp(join(tmpdir(), "crux-video-inspect-symlink-"));
    const external = await mkdtemp(join(tmpdir(), "crux-video-inspect-external-"));
    try {
      await mkdir(join(root, "publish"), { recursive: true });
      const externalHost = join(external, "host.mp4");
      await writeFile(externalHost, validMp4());
      await symlink(externalHost, join(root, "publish/host.mp4"));

      await expect(inspectMediaPackage(root)).rejects.toThrow("package_path publish/host.mp4");
      await expect(import("node:fs/promises").then(({ stat }) => stat(join(root, "metadata/media-probes.json"))))
        .rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(external, { recursive: true, force: true });
    }
  });
});
