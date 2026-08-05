// One POST, one PNG. Preview and export are the same call, so the image an admin
// approves is byte-identical to the file they post — because it is that file.

import { ImageResponse } from "next/og";
import serverApi from "@/app/axios.server";
import { loadOgFonts } from "@/app/_utils/ogFonts";
import { SIZES, type TemplateName } from "@/app/_components/social/socialTokens";
import { canExportLive, type SocialPayload } from "@/app/_components/social/socialAssets";
import { TEMPLATES } from "@/app/_components/social/templates";

export const runtime = "nodejs";

const MAX_BODY = 64 * 1024;

// The Next server has no JWT secret and should not be given one, so the caller's
// token is re-checked by the API that owns it. A hidden button is not a rule.
async function isAdmin(req: Request): Promise<boolean> {
  const auth = req.headers.get("authorization");
  if (!auth) return false;
  try {
    const { status } = await serverApi.get("/admin/social/session", {
      headers: { Authorization: auth },
      validateStatus: () => true,
    });
    return status === 200;
  } catch {
    return false;
  }
}

function narrow(raw: unknown): SocialPayload | null {
  if (typeof raw !== "object" || raw === null) return null;
  const body = raw as Record<string, unknown>;
  const template = body.template;
  if (typeof template !== "string" || !(template in SIZES)) return null;
  if (typeof body.motion !== "string" || typeof body.domain !== "string") return null;
  return body as unknown as SocialPayload;
}

export async function POST(req: Request) {
  if (!(await isAdmin(req))) {
    return new Response("Admins only.", { status: 403 });
  }

  const text = await req.text();
  if (text.length > MAX_BODY) {
    return new Response("Payload too large.", { status: 413 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return new Response("Malformed body.", { status: 400 });
  }

  const payload = narrow(parsed);
  if (!payload) return new Response("Malformed payload.", { status: 400 });

  const render = TEMPLATES[payload.template as TemplateName];
  if (!render) return new Response("Unknown template.", { status: 400 });

  if (
    (payload.template === "ig-live" || payload.template === "x-live") &&
    !canExportLive(payload.closesInHours)
  ) {
    return new Response("Under an hour left — the countdown would be stale.", { status: 409 });
  }

  const fonts = await loadOgFonts();

  return new ImageResponse(await render(payload), {
    ...SIZES[payload.template as TemplateName],
    fonts,
    headers: { "Cache-Control": "no-store" },
  });
}
