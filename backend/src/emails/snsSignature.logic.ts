// What an SNS message must look like before its signature can be checked, and
// the exact string AWS signed. Pure — the certificate fetch and the RSA verify
// live in snsSignature.ts.
//
// This exists because the topic ARN is NOT a secret. It carries the AWS account
// id, and it leaks through logs, infrastructure code, screenshots and support
// threads. Treating it as an authentication token means anyone who has ever seen
// it can forge a complaint and permanently suppress any address we mail, or
// point SubscribeURL at an internal address and make this server fetch it.
// The signature is the real authentication; the ARN is a filter on top of it.

// The canonical string is byte-exact or the verify fails, and the field ORDER is
// part of the specification, not a convention. Do not "tidy" these arrays.
const NOTIFICATION_FIELDS = [
  "Message",
  "MessageId",
  "Subject",
  "Timestamp",
  "TopicArn",
  "Type",
] as const;

const SUBSCRIPTION_FIELDS = [
  "Message",
  "MessageId",
  "SubscribeURL",
  "Timestamp",
  "Token",
  "TopicArn",
  "Type",
] as const;

// Subject is the one optional field: it is included only when present.
const OPTIONAL = new Set(["Subject"]);

export type SnsMessageType =
  | "Notification"
  | "SubscriptionConfirmation"
  | "UnsubscribeConfirmation";

export function isSnsMessageType(value: unknown): value is SnsMessageType {
  return (
    value === "Notification" ||
    value === "SubscriptionConfirmation" ||
    value === "UnsubscribeConfirmation"
  );
}

// Only AWS's own SNS hosts, over TLS. Without this the cert used to verify a
// message could be one the attacker is serving, which makes the whole check
// theatre.
const SNS_HOST = /^sns\.[a-z0-9-]+\.amazonaws\.com(\.cn)?$/;

export function isSnsUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && SNS_HOST.test(url.hostname);
  } catch {
    return false;
  }
}

export function isSigningCertUrl(raw: string): boolean {
  if (!isSnsUrl(raw)) return false;
  try {
    return new URL(raw).pathname.endsWith(".pem");
  } catch {
    return false;
  }
}

export function canonicalString(message: Record<string, unknown>): string | null {
  const type = message.Type;
  if (!isSnsMessageType(type)) return null;

  const fields =
    type === "Notification" ? NOTIFICATION_FIELDS : SUBSCRIPTION_FIELDS;

  let canonical = "";
  for (const field of fields) {
    const value = message[field];
    if (typeof value !== "string") {
      if (OPTIONAL.has(field)) continue;
      return null;
    }
    canonical += `${field}\n${value}\n`;
  }
  return canonical;
}

// SignatureVersion 1 is SHA1, 2 is SHA256. Anything else is not something AWS
// emits, so it is refused rather than guessed at.
export function digestFor(signatureVersion: unknown): "sha1" | "sha256" | null {
  if (signatureVersion === "1") return "sha1";
  if (signatureVersion === "2") return "sha256";
  return null;
}
