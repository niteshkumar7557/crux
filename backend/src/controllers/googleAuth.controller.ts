// Google sign-in: start, callback, finish-signup, and the link prompt's state.
// Every decision here comes from lib/googleIdentity.logic.ts; this file does the
// cookies, the SQL and the redirects.
//
// Two short-lived signed cookies carry the flow, because a redirect to Google and
// back cannot carry anything else:
//   g_oauth  — state + nonce (+ the linker's user id), 10 minutes
//   g_signup — the verified profile of someone with no account yet, 15 minutes
// Both are httpOnly and signed with JWT_SECRET, so neither is readable or
// forgeable by the browser holding it. "lax" is correct and required: the return
// leg is a top-level GET navigation, which lax allows and "strict" would not.
//
// Spec: game-theory.md §13

import type { CookieOptions, Request, Response } from "express";
import jwt from "jsonwebtoken";
import pool from "../db/index.js";
import config from "../config/index.js";
import logger from "../lib/logger.js";
import {
  createAccessToken,
  createRefreshToken,
  saveRefreshTokenToDB,
} from "../lib/tokens.js";
import { validateUsername } from "../lib/username.logic.js";
import { importAvatarFromUrl } from "../lib/avatarImport.js";
import { avatarStore } from "./avatar.controller.js";
import {
  buildAuthUrl,
  decodeIdTokenPayload,
  exchangeCode,
  randomToken,
  resolveCreds,
} from "../lib/googleOAuth.js";
import {
  decideIdentity,
  decideLink,
  idTokenClaimsValid,
  narrowGoogleProfile,
  nextSnoozeUntil,
  shouldPromptGoogleLink,
  type GoogleProfile,
} from "../lib/googleIdentity.logic.js";

const isProduction = config.node_env === "production";

const REFRESH_COOKIE: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const FLOW_COOKIE: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/",
};

const OAUTH_COOKIE = "g_oauth";
const SIGNUP_COOKIE = "g_signup";
const OAUTH_TTL_S = 600;
const SIGNUP_TTL_S = 900;

const clientUrl = () => config.client_url ?? "http://localhost:3000";

function googleCreds() {
  return resolveCreds(
    config.google.client_id,
    config.google.client_secret,
    config.google.redirect_uri,
  );
}

// Advertised to the frontend so the button is hidden rather than shown and then
// answering 503 — a control that cannot work should not be drawn.
export async function googleAvailability(_req: Request, res: Response) {
  res.status(200).json({ enabled: googleCreds() !== null });
}

function backToLogin(res: Response, reason: string) {
  return res.redirect(`${clientUrl()}/login?error=${encodeURIComponent(reason)}`);
}

// GET /user/auth/google — the signed-out entry point.
export async function startGoogleAuth(req: Request, res: Response) {
  const creds = googleCreds();
  if (!creds) return res.status(503).json({ error: "google sign-in is not configured" });

  const state = randomToken();
  const nonce = randomToken();
  const flow = jwt.sign({ state, nonce, intent: "sign_in" }, config.jwt_secret as string, {
    expiresIn: OAUTH_TTL_S,
  });

  res.cookie(OAUTH_COOKIE, flow, { ...FLOW_COOKIE, maxAge: OAUTH_TTL_S * 1000 });
  res.redirect(buildAuthUrl(creds, state, nonce));
}

// POST /user/auth/google/link — the signed-IN entry point. It is a POST behind
// authMiddleware rather than a link, because the browser cannot put an
// Authorization header on a top-level navigation; the user id is stamped into
// the flow cookie here and read back on the callback.
export async function startGoogleLink(req: Request, res: Response) {
  const creds = googleCreds();
  if (!creds) return res.status(503).json({ error: "google sign-in is not configured" });

  const state = randomToken();
  const nonce = randomToken();
  const flow = jwt.sign(
    { state, nonce, intent: "link", userId: req.user!.id },
    config.jwt_secret as string,
    { expiresIn: OAUTH_TTL_S },
  );

  res.cookie(OAUTH_COOKIE, flow, { ...FLOW_COOKIE, maxAge: OAUTH_TTL_S * 1000 });
  res.status(200).json({ url: buildAuthUrl(creds, state, nonce) });
}

interface FlowState {
  state: string;
  nonce: string;
  intent: "sign_in" | "link";
  userId: number | null;
}

function readFlow(req: Request): FlowState | null {
  const raw = req.cookies?.[OAUTH_COOKIE];
  if (typeof raw !== "string" || raw === "") return null;
  try {
    const decoded = jwt.verify(raw, config.jwt_secret as string) as Record<string, unknown>;
    const state = decoded.state;
    const nonce = decoded.nonce;
    const intent = decoded.intent;
    if (typeof state !== "string" || typeof nonce !== "string") return null;
    if (intent !== "sign_in" && intent !== "link") return null;
    const userId = typeof decoded.userId === "number" ? decoded.userId : null;
    return { state, nonce, intent, userId };
  } catch {
    return null;
  }
}

async function issueSession(res: Response, userId: number) {
  const { rows } = await pool.query(
    `SELECT id, role, username, email FROM users WHERE id = $1`,
    [userId],
  );
  if (rows.length === 0) return false;

  const refreshToken = createRefreshToken();
  await saveRefreshTokenToDB(userId, refreshToken);
  res.cookie("refresh_token", refreshToken, REFRESH_COOKIE);
  return true;
}

// GET /user/auth/google/callback — where Google sends the browser back.
export async function googleCallback(req: Request, res: Response) {
  const creds = googleCreds();
  if (!creds) return backToLogin(res, "google_unavailable");

  const flow = readFlow(req);
  // One use only, whatever happens next.
  res.clearCookie(OAUTH_COOKIE, FLOW_COOKIE);

  if (!flow) return backToLogin(res, "google_state_expired");

  const returnedState = typeof req.query.state === "string" ? req.query.state : "";
  // The CSRF check: without it, an attacker can complete their own Google flow
  // in a victim's browser and link their account.
  if (returnedState !== flow.state) return backToLogin(res, "google_state_mismatch");

  if (typeof req.query.error === "string") return backToLogin(res, "google_cancelled");
  const code = typeof req.query.code === "string" ? req.query.code : "";
  if (code === "") return backToLogin(res, "google_no_code");

  const idToken = await exchangeCode(creds, code);
  if (!idToken) return backToLogin(res, "google_exchange_failed");

  const payload = decodeIdTokenPayload(idToken);
  if (!idTokenClaimsValid(payload, {
    clientId: creds.clientId,
    nonce: flow.nonce,
    now: Date.now(),
  })) {
    return backToLogin(res, "google_token_rejected");
  }

  const profile = narrowGoogleProfile(payload);
  if (!profile) return backToLogin(res, "google_token_rejected");

  try {
    return flow.intent === "link"
      ? await completeLink(res, profile, flow.userId)
      : await completeSignIn(res, profile);
  } catch (err) {
    logger.error({ err }, "google callback failed");
    return backToLogin(res, "google_failed");
  }
}

async function findBySub(sub: string) {
  const { rows } = await pool.query(
    `SELECT id, google_sub FROM users WHERE google_sub = $1`,
    [sub],
  );
  return rows.length ? { id: rows[0].id as number, googleSub: rows[0].google_sub } : null;
}

async function completeLink(
  res: Response,
  profile: GoogleProfile,
  userId: number | null,
) {
  if (userId === null) {
    return res.redirect(`${clientUrl()}/profile/me?google=session_expired`);
  }

  const decision = decideLink(profile, await findBySub(profile.sub), userId);

  if (decision.kind === "refuse") {
    return res.redirect(`${clientUrl()}/profile/me?google=${decision.reason}`);
  }
  if (decision.kind === "link") {
    await pool.query(
      `UPDATE users
          SET google_sub = $1, google_email = $2, google_linked_at = NOW()
        WHERE id = $3`,
      [profile.sub, profile.email, decision.userId],
    );
  }
  return res.redirect(`${clientUrl()}/profile/me?google=linked`);
}

async function completeSignIn(res: Response, profile: GoogleProfile) {
  const { rows: byEmailRows } = await pool.query(
    `SELECT id, google_sub FROM users WHERE LOWER(email) = $1`,
    [profile.email],
  );
  const byEmail = byEmailRows.length
    ? { id: byEmailRows[0].id as number, googleSub: byEmailRows[0].google_sub }
    : null;

  const decision = decideIdentity(profile, await findBySub(profile.sub), byEmail);

  if (decision.kind === "refuse") return backToLogin(res, decision.reason);

  if (decision.kind === "create") {
    // No row yet. The profile is parked in a signed ticket until a handle is
    // chosen, so an abandoned signup leaves nothing behind to clean up.
    const ticket = jwt.sign(
      {
        sub: profile.sub,
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
      },
      config.jwt_secret as string,
      { expiresIn: SIGNUP_TTL_S },
    );
    res.cookie(SIGNUP_COOKIE, ticket, { ...FLOW_COOKIE, maxAge: SIGNUP_TTL_S * 1000 });
    return res.redirect(`${clientUrl()}/auth/username`);
  }

  if (decision.kind === "link") {
    // §13: the migration path for every account that predates Google sign-in.
    await pool.query(
      `UPDATE users
          SET google_sub = $1, google_email = $2, google_linked_at = NOW()
        WHERE id = $3`,
      [profile.sub, profile.email, decision.userId],
    );
  }

  if (!(await issueSession(res, decision.userId))) {
    return backToLogin(res, "google_failed");
  }
  return res.redirect(`${clientUrl()}/auth/complete`);
}

function readSignupTicket(req: Request): Record<string, unknown> | null {
  const raw = req.cookies?.[SIGNUP_COOKIE];
  if (typeof raw !== "string" || raw === "") return null;
  try {
    return jwt.verify(raw, config.jwt_secret as string) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// GET /user/auth/google/pending — who the handle screen is about to sign up.
//
// The ticket is httpOnly, so the page cannot read the address out of it. It has
// to be shown: pressing Google on the LOGIN page creates an account when none
// exists, and the Google chooser makes picking the wrong account easy. Naming
// the address is what turns "claim a handle" into a decision someone can catch
// before it becomes a row.
//
// It returns only what the user just consented to share with us, and only to the
// browser holding the ticket.
export async function pendingGoogleSignup(req: Request, res: Response) {
  const ticket = readSignupTicket(req);
  const email = typeof ticket?.email === "string" ? ticket.email : null;
  if (!ticket || !email) return res.status(401).json({ error: "signup_expired" });

  res.status(200).json({
    email,
    name: typeof ticket.name === "string" ? ticket.name : null,
  });
}

// POST /user/auth/google/abandon — "sign in instead".
// Invalidates the ticket rather than letting it sit for its remaining minutes in
// a browser someone may have walked away from.
export async function abandonGoogleSignup(_req: Request, res: Response) {
  res.clearCookie(SIGNUP_COOKIE, FLOW_COOKIE);
  res.status(200).json({ abandoned: true });
}

// POST /user/auth/google/complete — the handle step for a brand-new account.
export async function completeGoogleSignup(req: Request, res: Response) {
  const ticket = readSignupTicket(req);
  if (!ticket) return res.status(401).json({ error: "signup_expired" });

  const sub = typeof ticket.sub === "string" ? ticket.sub : null;
  const email = typeof ticket.email === "string" ? ticket.email : null;
  if (!sub || !email) return res.status(401).json({ error: "signup_expired" });

  const handle = validateUsername(String(req.body?.userName ?? ""));
  if (!handle.ok) return res.status(400).json({ error: handle.reason });

  try {
    // Re-checked here rather than trusted from the callback: the ticket is 15
    // minutes old by now, and either row could have appeared in between.
    const { rows: clash } = await pool.query(
      `SELECT 1 FROM users WHERE username = $1 OR LOWER(email) = $2 OR google_sub = $3`,
      [handle.value, email, sub],
    );
    if (clash.length > 0) {
      return res.status(409).json({ error: "That username or account is already taken." });
    }

    const ticketName = typeof ticket.name === "string" ? ticket.name.slice(0, 60) : null;
    const { rows } = await pool.query(
      `INSERT INTO users (username, name, email, hashed_password,
                          google_sub, google_email, google_linked_at)
       VALUES ($1, $2, $3, NULL, $4, $3, NOW())
       RETURNING id, role, username, email`,
      [handle.value, ticketName ?? handle.value, email, sub],
    );
    const user = rows[0];

    // Best-effort, and last: an account that exists without a picture is fine,
    // an account that failed to exist because of one is not.
    const picture = typeof ticket.picture === "string" ? ticket.picture : null;
    if (picture) {
      const avatar = await importAvatarFromUrl(avatarStore, picture, user.id);
      if (avatar) {
        await pool.query(`UPDATE users SET avatar = $1 WHERE id = $2`, [avatar, user.id]);
      }
    }

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken();
    await saveRefreshTokenToDB(user.id, refreshToken);

    res.clearCookie(SIGNUP_COOKIE, FLOW_COOKIE);
    res.cookie("refresh_token", refreshToken, REFRESH_COOKIE);
    res.status(201).json({ accessToken });
  } catch (err) {
    logger.error({ err }, "google signup failed");
    res.status(500).json({ error: "registration failed!" });
  }
}

// GET /user/google/status — drives the prompt, and the profile's account row.
export async function googleStatus(req: Request, res: Response) {
  try {
    const { rows } = await pool.query(
      `SELECT google_sub, google_email, hashed_password IS NOT NULL AS has_password,
              google_prompt_dismissals, google_prompt_snoozed_until
         FROM users WHERE id = $1`,
      [req.user!.id],
    );
    if (rows.length === 0) return res.status(404).json({ error: "user not found" });
    const u = rows[0];

    res.status(200).json({
      linked: u.google_sub !== null,
      googleEmail: u.google_email,
      hasPassword: u.has_password,
      shouldPrompt:
        googleCreds() !== null &&
        shouldPromptGoogleLink(
          {
            googleSub: u.google_sub,
            dismissals: u.google_prompt_dismissals,
            snoozedUntil: u.google_prompt_snoozed_until,
          },
          new Date(),
        ),
    });
  } catch (err) {
    logger.error({ err }, "google status failed");
    res.status(500).json({ error: "failed to read account status" });
  }
}

// POST /user/google/snooze — "Not now".
export async function snoozeGooglePrompt(req: Request, res: Response) {
  try {
    const { rows } = await pool.query(
      `UPDATE users
          SET google_prompt_dismissals = google_prompt_dismissals + 1,
              google_prompt_snoozed_until = $1
        WHERE id = $2
        RETURNING google_prompt_dismissals`,
      [nextSnoozeUntil(new Date()), req.user!.id],
    );
    res.status(200).json({ dismissals: rows[0]?.google_prompt_dismissals ?? 0 });
  } catch (err) {
    logger.error({ err }, "google snooze failed");
    res.status(500).json({ error: "failed to save that" });
  }
}
