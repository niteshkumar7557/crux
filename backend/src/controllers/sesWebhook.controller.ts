// SES delivery events, over SNS. Hard bounces and complaints suppress an address
// permanently and for every category — which the poller then checks before every
// send, including operator announcements.
//
// TRUST BOUNDARY: this endpoint is public, because SNS cannot present a
// credential. Authentication is the message's X.509 SIGNATURE, verified against
// a certificate SNS names and whose URL is restricted to AWS's own SNS hosts.
//
// The topic ARN is checked too, but it is a FILTER, not the trust anchor. An ARN
// contains the AWS account id and leaks through logs, infrastructure code and
// support threads — it is an identifier, not a secret. Trusting it alone would
// let anyone who has seen it forge a complaint and permanently suppress any
// address we mail, or aim SubscribeURL at an internal address and have this
// server fetch it. Both were live holes here before the signature check existed.
//
// So the order below is deliberate: narrow, then filter on ARN, then VERIFY, and
// only then act. Nothing reaches a fetch or a write ahead of the signature.
//
// Without SES_SNS_TOPIC_ARN set nothing is trusted at all and the route answers 503.
//
// Spec: game-theory.md §20

import type { Request, Response } from "express";
import pool from "../db/index.js";
import config from "../config/index.js";
import logger from "../lib/logger.js";
import { verifySnsSignature } from "../emails/snsSignature.js";
import { isSnsUrl } from "../emails/snsSignature.logic.js";

const CONFIRM_TIMEOUT_MS = 10_000;

interface SnsEnvelope {
  type: string;
  topicArn: string;
  message: string;
  subscribeUrl: string | null;
  // The original object, needed verbatim: the signature covers those exact
  // fields, so it cannot be checked against a reshaped copy.
  raw: Record<string, unknown>;
}

function narrowEnvelope(body: unknown): SnsEnvelope | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  const type = b.Type;
  const topicArn = b.TopicArn;
  const message = b.Message;
  if (typeof type !== "string" || typeof topicArn !== "string") return null;
  return {
    type,
    topicArn,
    message: typeof message === "string" ? message : "",
    subscribeUrl: typeof b.SubscribeURL === "string" ? b.SubscribeURL : null,
    raw: b,
  };
}

function stringField(o: Record<string, unknown>, key: string): string | null {
  const v = o[key];
  return typeof v === "string" && v !== "" ? v : null;
}

interface Suppression {
  email: string;
  reason: "hard_bounce" | "complaint";
  detail: string;
}

// Returns every address this event says we must stop writing to.
export function suppressionsFrom(notification: unknown): Suppression[] {
  if (typeof notification !== "object" || notification === null) return [];
  const n = notification as Record<string, unknown>;
  const type = stringField(n, "notificationType") ?? stringField(n, "eventType");

  if (type === "Bounce") {
    const bounce = n.bounce;
    if (typeof bounce !== "object" || bounce === null) return [];
    const b = bounce as Record<string, unknown>;
    // A soft bounce is a mailbox that exists and is temporarily unhappy. The
    // outbox's own backoff handles those; suppressing on one would delete a
    // real user's mail over a full inbox.
    if (stringField(b, "bounceType") !== "Permanent") return [];
    const recipients = Array.isArray(b.bouncedRecipients) ? b.bouncedRecipients : [];
    const subType = stringField(b, "bounceSubType") ?? "Permanent";
    return recipients.flatMap((r) => {
      if (typeof r !== "object" || r === null) return [];
      const email = stringField(r as Record<string, unknown>, "emailAddress");
      return email
        ? [{ email: email.toLowerCase(), reason: "hard_bounce" as const, detail: subType }]
        : [];
    });
  }

  if (type === "Complaint") {
    const complaint = n.complaint;
    if (typeof complaint !== "object" || complaint === null) return [];
    const c = complaint as Record<string, unknown>;
    const recipients = Array.isArray(c.complainedRecipients)
      ? c.complainedRecipients
      : [];
    const subType = stringField(c, "complaintFeedbackType") ?? "complaint";
    return recipients.flatMap((r) => {
      if (typeof r !== "object" || r === null) return [];
      const email = stringField(r as Record<string, unknown>, "emailAddress");
      return email
        ? [{ email: email.toLowerCase(), reason: "complaint" as const, detail: subType }]
        : [];
    });
  }

  // Delivery, Send, Open and the rest are subscribed for the reputation
  // dashboard and are not acted on here.
  return [];
}

async function confirmSubscription(url: string): Promise<void> {
  // Belt and braces behind the signature check: even a genuinely signed message
  // does not get to choose an arbitrary address for this server to fetch.
  if (!isSnsUrl(url)) {
    logger.warn("refused a SubscribeURL that is not an SNS URL");
    return;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIRM_TIMEOUT_MS);
  try {
    // redirect: "error" — following one would walk straight past the host check.
    await fetch(url, { signal: controller.signal, redirect: "error" });
    logger.info("confirmed the SES SNS subscription");
  } catch (err) {
    logger.error({ err }, "could not confirm the SES SNS subscription");
  } finally {
    clearTimeout(timer);
  }
}

export async function handleSesEvent(req: Request, res: Response) {
  const expectedArn = config.ses.snsTopicArn;
  if (!expectedArn) return res.status(503).json({ error: "not configured" });

  // SNS posts with Content-Type text/plain, so app.ts hands this route a raw
  // string. Accepting an already-parsed object too keeps the handler testable
  // and survives a future change of body parser.
  let body: unknown = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "bad envelope" });
    }
  }

  const envelope = narrowEnvelope(body);
  if (!envelope) return res.status(400).json({ error: "bad envelope" });

  // A filter, not authentication — see the header. It runs first only because it
  // is free, and rejecting here saves fetching a certificate for traffic that was
  // never ours to begin with.
  if (envelope.topicArn !== expectedArn) {
    logger.warn({ topicArn: envelope.topicArn }, "dropped an SNS message from an unknown topic");
    return res.status(403).json({ error: "unknown topic" });
  }

  // AUTHENTICATION. Everything below this line has been proven to come from AWS.
  // It sits ahead of the confirmation branch on purpose: SubscribeURL triggers an
  // outbound fetch, so it must not be reachable by an unsigned request.
  if (!(await verifySnsSignature(envelope.raw))) {
    logger.warn({ type: envelope.type }, "dropped an SNS message with a bad signature");
    return res.status(403).json({ error: "bad signature" });
  }

  if (envelope.type === "SubscriptionConfirmation") {
    if (envelope.subscribeUrl) await confirmSubscription(envelope.subscribeUrl);
    return res.status(200).json({ ok: true });
  }

  if (envelope.type !== "Notification") return res.status(200).json({ ok: true });

  let notification: unknown;
  try {
    notification = JSON.parse(envelope.message);
  } catch {
    return res.status(400).json({ error: "bad message" });
  }

  const suppressions = suppressionsFrom(notification);
  for (const s of suppressions) {
    try {
      await pool.query(
        `INSERT INTO email_suppressions (email, reason, detail)
         VALUES ($1, $2, $3)
         ON CONFLICT (email) DO NOTHING`,
        [s.email, s.reason, s.detail],
      );
      logger.warn({ reason: s.reason }, "suppressed an address");
    } catch (err) {
      logger.error({ err }, "could not record a suppression");
    }
  }

  // Always 200 once the topic is ours: a non-2xx makes SNS retry, and a retry of
  // an event we already recorded achieves nothing.
  res.status(200).json({ ok: true, suppressed: suppressions.length });
}
