// Reports why the admin media check fails, from wherever it is run.
//
// The check itself returns only codes ("cache_control"), which is deliberately
// terse in an admin UI but useless when the same objects pass from one machine and
// fail from another. Cloudflare serves per-PoP caches, so the only meaningful
// question is what THIS host sees. Run it on the box whose check is failing.
//
// It reuses the very predicates the server verifies with, so the two cannot drift.

import { pathToFileURL } from "node:url";
import {
  expectedContentType,
  immutablePublicCache,
  matchingContentRange,
  type VideoObjectName,
} from "../../src/video-debates/videoStorage.js";

export interface DeliveryRule {
  rule: string;
  ok: boolean;
  detail: string;
}

const ANGLES = ["host", "for", "against"] as const;

export function evaluateDelivery(
  status: number,
  headers: Headers,
  cruxOrigin: string,
  name: VideoObjectName,
  expectedLength: number | null,
): DeliveryRule[] {
  const rules: DeliveryRule[] = [];
  const show = (value: string | null): string => value ?? "(absent)";

  rules.push({ rule: "range_status", ok: status === 206, detail: `status ${status}` });

  // Absent is fine: R2 only advertises Accept-Ranges on 200/HEAD, and the 206 with a
  // matching Content-Range is the real proof. Only an explicit denial fails.
  const acceptRanges = headers.get("Accept-Ranges")?.trim().toLowerCase();
  rules.push({
    rule: "accept_ranges",
    ok: acceptRanges === undefined || acceptRanges === "bytes",
    detail: show(headers.get("Accept-Ranges")),
  });

  const contentRange = headers.get("Content-Range");
  rules.push({
    rule: "content_range",
    ok: expectedLength === null ? contentRange !== null : matchingContentRange(contentRange, expectedLength),
    detail: expectedLength === null
      ? `${show(contentRange)} (no expected length given — not compared)`
      : `${show(contentRange)} vs expected total ${expectedLength}`,
  });

  const cacheControl = headers.get("Cache-Control");
  rules.push({
    rule: "cache_control",
    ok: immutablePublicCache(cacheControl),
    detail: `${show(cacheControl)} — needs public + immutable + max-age>=31536000`,
  });

  const allowOrigin = headers.get("Access-Control-Allow-Origin");
  rules.push({
    rule: "cors_origin",
    ok: allowOrigin === cruxOrigin,
    detail: `${show(allowOrigin)} vs required exactly ${cruxOrigin}`,
  });

  rules.push({
    rule: "content_type",
    ok: headers.get("Content-Type") === expectedContentType(name),
    detail: `${show(headers.get("Content-Type"))} vs ${expectedContentType(name)}`,
  });

  return rules;
}

function edgeSummary(headers: Headers): string {
  const parts = ["cf-cache-status", "age", "cf-ray", "vary"]
    .map((key) => (headers.get(key) === null ? null : `${key}=${headers.get(key)}`))
    .filter((value): value is string => value !== null);
  return parts.length === 0 ? "(no Cloudflare headers)" : parts.join("  ");
}

async function main(): Promise<void> {
  const mediaId = process.argv[2];
  const publicUrl = process.env.R2_VIDEO_PUBLIC_URL;
  const cruxOrigin = process.env.CLIENT_URL;
  if (!mediaId) throw new Error("Usage: npm run video:check-delivery -- <media-id>");
  if (!publicUrl || !cruxOrigin) throw new Error("R2_VIDEO_PUBLIC_URL and CLIENT_URL must be set.");

  const origin = new URL(cruxOrigin).origin;
  process.stdout.write(`public url : ${publicUrl}\norigin sent: ${origin}\nmedia id   : ${mediaId}\n\n`);

  let failed = false;
  for (const name of ANGLES) {
    const url = new URL(`video-debates/${mediaId}/${name}.mp4`, `${publicUrl.replace(/\/+$/, "")}/`).toString();
    process.stdout.write(`── ${name}.mp4\n`);
    let response: Response;
    try {
      response = await fetch(url, { headers: { Range: "bytes=0-0", Origin: origin } });
    } catch (error) {
      failed = true;
      process.stdout.write(`   range_request FAILED — ${error instanceof Error ? error.message : "unknown"}\n\n`);
      continue;
    }
    await response.body?.cancel();

    process.stdout.write(`   edge: ${edgeSummary(response.headers)}\n`);
    for (const rule of evaluateDelivery(response.status, response.headers, origin, name, null)) {
      if (!rule.ok) failed = true;
      process.stdout.write(`   ${rule.ok ? "PASS" : "FAIL"} ${rule.rule.padEnd(14)} ${rule.detail}\n`);
    }
    process.stdout.write("\n");
  }

  process.stdout.write(
    failed
      ? "At least one rule failed. A FAIL beside cf-cache-status=HIT means this PoP holds a stale entry: purge by URL.\n"
      : "All delivery rules pass from this host.\n",
  );
  process.exitCode = failed ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Delivery check failed."}\n`);
    process.exitCode = 1;
  });
}
