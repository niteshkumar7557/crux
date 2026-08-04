// The two HTTP calls of the authorization-code flow, and the ID token decode.
// The decisions live in googleIdentity.logic.ts; this file only talks to Google.
// Spec: game-theory.md §13

import crypto from "crypto";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const TOKEN_TIMEOUT_MS = 10_000;

// Resolved credentials — every field present. The three env vars are narrowed
// into this once, in the controller, so nothing below has to re-check them.
export interface GoogleCreds {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export function resolveCreds(
  clientId: string | undefined,
  clientSecret: string | undefined,
  redirectUri: string | undefined,
): GoogleCreds | null {
  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri };
}

export function randomToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function buildAuthUrl(c: GoogleCreds, state: string, nonce: string): string {
  const params = new URLSearchParams({
    client_id: c.clientId,
    redirect_uri: c.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    // We want the account picker rather than a silent sign-in as whoever the
    // browser happens to be: a user linking a Crux account has to be able to
    // choose WHICH Google account they are linking.
    prompt: "select_account",
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

// Exchanges the one-time code for an ID token. Server to server, over TLS, in a
// request we originated — which is what makes the signature check below
// unnecessary. A token arriving from a browser would need full RS256
// verification against Google's JWKS instead; see the design note in
// docs/superpowers/specs. Do not move this call to the client.
export async function exchangeCode(
  c: GoogleCreds,
  code: string,
): Promise<string | null> {
  const body = new URLSearchParams({
    code,
    client_id: c.clientId,
    client_secret: c.clientSecret,
    redirect_uri: c.redirectUri,
    grant_type: "authorization_code",
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TOKEN_TIMEOUT_MS);
  try {
    const res = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error("google token exchange failed:", res.status, await res.text());
      return null;
    }
    const json: unknown = await res.json();
    if (typeof json !== "object" || json === null) return null;
    const idToken = (json as Record<string, unknown>).id_token;
    return typeof idToken === "string" && idToken !== "" ? idToken : null;
  } catch (err) {
    console.error("google token exchange errored:", err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Returns the payload as `unknown`. The caller narrows it — this function
// deliberately does no coercion, so there is exactly one place that decides what
// a Google profile is.
export function decodeIdTokenPayload(idToken: string): unknown {
  const payload = idToken.split(".")[1];
  if (payload === undefined || payload === "") return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
