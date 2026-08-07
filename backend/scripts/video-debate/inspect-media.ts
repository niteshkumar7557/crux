import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { open } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { validateMediaPackageV1, type MediaProbeFacts } from "../../src/video-debates/manifest.logic.js";
import type { MediaProbe, PosterProbe } from "../../src/video-debates/manifest.types.js";
import { writeJsonAtomic } from "./io.js";
import { assertPackageInputPath, assertPackageOutputPath, packagePaths } from "./paths.js";

type UnknownRecord = Record<string, unknown>;
type Role = "host" | "for" | "against";

export type InspectorPorts = {
  packagePath?: {
    assertInput(root: string, path: string, label: string): Promise<void>;
    assertOutput(root: string, path: string, label: string): Promise<void>;
  };
  file: {
    stat(path: string): Promise<{ isFile: boolean; size: number }>;
    read(path: string, position: number, length: number): Promise<Uint8Array>;
  };
  ffprobe(args: readonly string[]): Promise<string>;
  writeJson(path: string, value: unknown): Promise<void>;
};

class InspectionError extends Error {
  constructor(readonly role: string, readonly invariant: string, message: string) {
    super(`${role}: ${invariant}: ${message}`);
  }
}

function fail(role: string, invariant: string, message: string): never {
  throw new InspectionError(role, invariant, message);
}

function object(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : null;
}

function array(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function number(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function integer(value: unknown): number | null {
  const parsed = number(value);
  return parsed !== null && Number.isSafeInteger(parsed) ? parsed : null;
}

async function ffprobeJson(ports: InspectorPorts, args: readonly string[], role: string, invariant: string): Promise<unknown> {
  let output: string;
  try {
    output = await ports.ffprobe(args);
  } catch (error) {
    return fail(role, invariant, error instanceof Error ? error.message : "Could not run ffprobe.");
  }
  try {
    const parsed: unknown = JSON.parse(output);
    return parsed;
  } catch {
    return fail(role, invariant, "ffprobe did not return JSON.");
  }
}

function streamByType(document: unknown, streamType: string, role: string): UnknownRecord {
  const record = object(document);
  const streams = record === null ? null : array(record.streams);
  if (!streams) return fail(role, "ffprobe_streams", "ffprobe did not return a streams array.");
  for (const stream of streams) {
    const candidate = object(stream);
    if (candidate?.codec_type === streamType) return candidate;
  }
  return fail(role, streamType === "video" ? "video_stream" : "audio_stream", `No ${streamType} stream was found.`);
}

function trackFacts(document: unknown, byteLength: number, durationMs: number, maxKeyframeIntervalMs: number, role: Role): MediaProbeFacts {
  const root = object(document);
  const video = streamByType(document, "video", role);
  const audio = streamByType(document, "audio", role);
  const format = root === null ? null : object(root.format);
  const durationSeconds = format === null ? null : number(format.duration);
  const videoCodec = text(video.codec_name);
  const profile = text(video.profile);
  const width = integer(video.width);
  const height = integer(video.height);
  const pixelFormat = text(video.pix_fmt);
  const frameRate = text(video.r_frame_rate);
  const bitrate = integer(video.bit_rate);
  const audioCodec = text(audio.codec_name);
  const sampleRate = integer(audio.sample_rate);
  if (durationSeconds === null || durationSeconds <= 0 || videoCodec === null || profile === null || width === null || height === null || pixelFormat === null || frameRate === null || bitrate === null || audioCodec === null || sampleRate === null) return fail(role, "ffprobe_fields", "ffprobe omitted required stream metadata.");
  if (Math.round(durationSeconds * 1_000) !== durationMs) return fail(role, "duration", "ffprobe duration changed during inspection.");
  return {
    duration_ms: durationMs,
    byte_length: byteLength,
    video_codec: videoCodec,
    video_profile: profile,
    width,
    height,
    pixel_format: pixelFormat,
    frame_rate: frameRate,
    video_bitrate_bps: bitrate,
    max_keyframe_interval_ms: maxKeyframeIntervalMs,
    faststart: true,
    audio_codec: audioCodec,
    audio_sample_rate_hz: sampleRate,
  };
}

async function maximumKeyframeInterval(ports: InspectorPorts, path: string, role: Role, durationMs: number): Promise<number> {
  const document = await ffprobeJson(ports, ["-select_streams", "v:0", "-show_entries", "frame=key_frame,best_effort_timestamp_time", "-show_frames", "-of", "json", path], role, "keyframe_interval");
  const record = object(document);
  const frames = record === null ? null : array(record.frames);
  if (!frames) return fail(role, "keyframe_interval", "ffprobe did not return frame data.");
  let previousKeyframeMs = 0;
  let maximumIntervalMs = 0;
  let foundKeyframe = false;
  for (const frame of frames) {
    const parsed = object(frame);
    if (!parsed || integer(parsed.key_frame) !== 1) continue;
    const timestampSeconds = number(parsed.best_effort_timestamp_time);
    if (timestampSeconds === null || timestampSeconds < 0) return fail(role, "keyframe_interval", "A keyframe is missing a valid timestamp.");
    const timestampMs = Math.round(timestampSeconds * 1_000);
    if (timestampMs < previousKeyframeMs) return fail(role, "keyframe_interval", "Keyframes are not ordered by timestamp.");
    maximumIntervalMs = Math.max(maximumIntervalMs, timestampMs - previousKeyframeMs);
    previousKeyframeMs = timestampMs;
    foundKeyframe = true;
  }
  if (!foundKeyframe) return fail(role, "keyframe_interval", "No video keyframe was found.");
  return Math.max(maximumIntervalMs, durationMs - previousKeyframeMs);
}

const MP4_BRANDS = new Set(["isom", "iso2", "iso3", "iso4", "iso5", "iso6", "avc1", "mp41", "mp42", "dash", "M4V ", "M4A ", "f4v "]);

async function readExact(ports: InspectorPorts, path: string, position: number, length: number, role: Role): Promise<Uint8Array> {
  const bytes = await ports.file.read(path, position, length);
  if (bytes.length !== length) return fail(role, "container", "MP4 atom header is truncated.");
  return bytes;
}

function atomLength(header: Uint8Array, extended: Uint8Array | null, size: number, role: Role): { length: number; headerLength: number } {
  const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
  const baseLength = view.getUint32(0);
  if (baseLength === 0) return { length: size, headerLength: 8 };
  if (baseLength !== 1) return { length: baseLength, headerLength: 8 };
  if (!extended) return fail(role, "container", "MP4 extended atom header is truncated.");
  const extendedView = new DataView(extended.buffer, extended.byteOffset, extended.byteLength);
  const length = extendedView.getBigUint64(0);
  if (length > BigInt(Number.MAX_SAFE_INTEGER)) return fail(role, "container", "MP4 atom is too large to inspect safely.");
  return { length: Number(length), headerLength: 16 };
}

async function inspectContainer(ports: InspectorPorts, path: string, role: Role, size: number): Promise<void> {
  let offset = 0;
  let mp4Brand = false;
  let foundMoov = false;
  let foundMdat = false;
  while (offset + 8 <= size) {
    const header = await readExact(ports, path, offset, 8, role);
    const type = new TextDecoder("ascii").decode(header.slice(4));
    const baseLength = new DataView(header.buffer, header.byteOffset, header.byteLength).getUint32(0);
    const extended = baseLength === 1 ? await readExact(ports, path, offset + 8, 8, role) : null;
    const atom = atomLength(header, extended, size - offset, role);
    if (atom.length < atom.headerLength || offset + atom.length > size) return fail(role, "container", "MP4 atom size is invalid.");
    if (type === "ftyp") {
      const payload = await readExact(ports, path, offset + atom.headerLength, atom.length - atom.headerLength, role);
      if (payload.length < 8) return fail(role, "container", "MP4 ftyp atom is invalid.");
      for (let brandOffset = 0; brandOffset + 4 <= payload.length; brandOffset += 4) {
        const brand = new TextDecoder("ascii").decode(payload.slice(brandOffset, brandOffset + 4));
        if (brandOffset === 4 || MP4_BRANDS.has(brand)) mp4Brand ||= MP4_BRANDS.has(brand);
      }
    }
    if (type === "moov") foundMoov = true;
    if (type === "mdat") {
      foundMdat = true;
      if (!foundMoov) return fail(role, "faststart", "MP4 mdat atom precedes moov.");
    }
    offset += atom.length;
  }
  if (!mp4Brand) return fail(role, "container", "ISO-BMFF file does not declare an accepted MP4 brand.");
  if (!foundMoov || !foundMdat) return fail(role, "faststart", "MP4 must contain moov before mdat.");
}

async function inspectTrack(ports: InspectorPorts, path: string, role: Role): Promise<MediaProbeFacts> {
  const file = await ports.file.stat(path).catch((error: unknown) => fail(role, "file", error instanceof Error ? error.message : "Could not inspect media file."));
  if (!file.isFile || file.size <= 0) return fail(role, "file", "Expected a non-empty regular media file.");
  const document = await ffprobeJson(ports, ["-show_entries", "format=duration:stream=codec_type,codec_name,profile,width,height,pix_fmt,r_frame_rate,bit_rate,sample_rate", "-show_streams", "-show_format", "-of", "json", path], role, "ffprobe");
  const format = object(document);
  const duration = format === null ? null : object(format.format);
  const durationSeconds = duration === null ? null : number(duration.duration);
  if (durationSeconds === null || durationSeconds <= 0) return fail(role, "duration", "ffprobe returned an invalid duration.");
  const durationMs = Math.round(durationSeconds * 1_000);
  const keyframeInterval = await maximumKeyframeInterval(ports, path, role, durationMs);
  await inspectContainer(ports, path, role, file.size);
  return trackFacts(document, file.size, durationMs, keyframeInterval, role);
}

async function inspectPoster(ports: InspectorPorts, path: string): Promise<{ format: string; width: number; height: number; byte_length: number }> {
  const file = await ports.file.stat(path).catch((error: unknown) => fail("poster", "file", error instanceof Error ? error.message : "Could not inspect poster file."));
  if (!file.isFile || file.size <= 0) return fail("poster", "file", "Expected a non-empty regular poster file.");
  const document = await ffprobeJson(ports, ["-show_entries", "stream=codec_name,width,height", "-show_streams", "-of", "json", path], "poster", "ffprobe");
  const stream = streamByType(document, "video", "poster");
  const format = text(stream.codec_name);
  const width = integer(stream.width);
  const height = integer(stream.height);
  if (format === null || width === null || height === null) return fail("poster", "ffprobe_fields", "ffprobe omitted required poster metadata.");
  return { format, width, height, byte_length: file.size };
}

function validationFailure(error: { code: string; path: string; message: string }): never {
  const role = error.path.startsWith("media.host") ? "host" : error.path.startsWith("media.for") ? "for" : error.path.startsWith("media.against") ? "against" : "poster";
  return fail(role, error.code, error.message);
}

export async function inspectMediaPackage(root: string | undefined, ports: InspectorPorts = systemPorts): Promise<{ host: MediaProbe; for: MediaProbe; against: MediaProbe; poster: PosterProbe }> {
  if (!root) throw new Error("Missing absolute video debate package path.");
  const paths = packagePaths(root);
  await ports.packagePath?.assertInput(paths.root, paths.host, "publish/host.mp4");
  const host = await inspectTrack(ports, paths.host, "host");
  await ports.packagePath?.assertInput(paths.root, paths.for, "publish/for.mp4");
  const forMedia = await inspectTrack(ports, paths.for, "for");
  await ports.packagePath?.assertInput(paths.root, paths.against, "publish/against.mp4");
  const against = await inspectTrack(ports, paths.against, "against");
  await ports.packagePath?.assertInput(paths.root, paths.poster, "publish/poster.webp");
  const poster = await inspectPoster(ports, paths.poster);
  const result = validateMediaPackageV1({ host, for: forMedia, against, poster });
  if (!result.ok) return validationFailure(result.errors[0]!);
  await ports.packagePath?.assertOutput(paths.root, paths.mediaProbes, "metadata/media-probes.json");
  await ports.writeJson(paths.mediaProbes, result.value);
  return result.value;
}

async function spawnFfprobe(args: readonly string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("ffprobe", ["-v", "error", ...args], { stdio: ["ignore", "pipe", "pipe"] });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout?.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr?.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.once("error", reject);
    child.once("close", (code) => code === 0 ? resolve(Buffer.concat(stdout).toString("utf8")) : reject(new Error(Buffer.concat(stderr).toString("utf8").trim() || `ffprobe exited with code ${code}.`)));
  });
}

const systemPorts: InspectorPorts = {
  packagePath: {
    assertInput: assertPackageInputPath,
    assertOutput: assertPackageOutputPath,
  },
  file: {
    stat: async (path) => {
      const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
      try {
        const info = await file.stat();
        return { isFile: info.isFile(), size: info.size };
      } finally {
        await file.close();
      }
    },
    read: async (path, position, length) => {
      const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
      try {
        const bytes = new Uint8Array(length);
        const { bytesRead } = await file.read(bytes, 0, length, position);
        return bytes.slice(0, bytesRead);
      } finally {
        await file.close();
      }
    },
  },
  ffprobe: spawnFfprobe,
  writeJson: writeJsonAtomic,
};

async function main(): Promise<void> {
  await inspectMediaPackage(process.argv[2]);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Media inspection failed."}\n`);
    process.exitCode = 1;
  });
}
