// The reader's side of the shared-password gate.
//
// serverApi talks to the API directly rather than through the /api rewrite, so it
// does not inherit the browser's cookies — a server component has to forward the
// pass by hand or every SSR fetch is refused.

import { isAxiosError } from "axios";

export const VIDEO_PASS_COOKIE = "crux_video_pass";

export function isGateRejection(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 401;
}

// next/headers is imported here rather than at the top so this module stays
// loadable outside a request — the unit test imports isGateRejection alone.
export async function videoPassHeaders(): Promise<Record<string, string>> {
  const { cookies } = await import("next/headers");
  const pass = (await cookies()).get(VIDEO_PASS_COOKIE)?.value;
  return pass ? { Cookie: `${VIDEO_PASS_COOKIE}=${pass}` } : {};
}
