// The SES v2 SendEmail call, signed with aws4fetch — the same client R2 uses, so
// this adds no dependency.
//
// With any credential missing the transport reports itself unconfigured, the
// poller never starts, and rows simply accumulate as `pending`. That is the same
// shape as the Telegram relay: dev and CI need no AWS account, and the boot log
// says which mode is live.

import { AwsClient } from "aws4fetch";

const SEND_TIMEOUT_MS = 15_000;

// Every field is `| undefined` rather than optional, because that is what
// process.env actually hands us and exactOptionalPropertyTypes is on.
export interface SesConfig {
  region: string | undefined;
  accessKeyId: string | undefined;
  secretAccessKey: string | undefined;
  fromEmail: string | undefined;
  fromName: string | undefined;
  replyTo: string | undefined;
  configurationSet: string | undefined;
}

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
  // One-click unsubscribe. Gmail and Yahoo bulk-sender rules effectively require
  // both of these, and SES allows them through on a Simple message.
  unsubscribeUrl?: string;
}

export type SendResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string; retryable: boolean };

export interface SesTransport {
  readonly configured: boolean;
  send(email: OutgoingEmail): Promise<SendResult>;
}

class UnconfiguredTransport implements SesTransport {
  readonly configured = false;
  async send(): Promise<SendResult> {
    return { ok: false, error: "SES is not configured", retryable: true };
  }
}

class AwsSesTransport implements SesTransport {
  readonly configured = true;
  private readonly client: AwsClient;
  private readonly endpoint: string;

  constructor(
    private readonly region: string,
    accessKeyId: string,
    secretAccessKey: string,
    private readonly from: string,
    private readonly replyTo: string | undefined,
    private readonly configurationSet: string | undefined,
  ) {
    this.client = new AwsClient({
      accessKeyId,
      secretAccessKey,
      region,
      service: "ses",
    });
    this.endpoint = `https://email.${region}.amazonaws.com/v2/email/outbound-emails`;
  }

  async send(email: OutgoingEmail): Promise<SendResult> {
    const headers = email.unsubscribeUrl
      ? [
          { Name: "List-Unsubscribe", Value: `<${email.unsubscribeUrl}>` },
          { Name: "List-Unsubscribe-Post", Value: "List-Unsubscribe=One-Click" },
        ]
      : undefined;

    const payload = {
      FromEmailAddress: this.from,
      Destination: { ToAddresses: [email.to] },
      ...(this.replyTo ? { ReplyToAddresses: [this.replyTo] } : {}),
      ...(this.configurationSet
        ? { ConfigurationSetName: this.configurationSet }
        : {}),
      Content: {
        Simple: {
          Subject: { Data: email.subject, Charset: "UTF-8" },
          Body: {
            Text: { Data: email.text, Charset: "UTF-8" },
            Html: { Data: email.html, Charset: "UTF-8" },
          },
          ...(headers ? { Headers: headers } : {}),
        },
      },
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
    try {
      const res = await this.client.fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const raw = await res.text();
      if (!res.ok) {
        // 4xx is our fault and will fail identically next time — a bad address,
        // an unverified identity, a rejected header. Retrying it burns the
        // attempt budget and changes nothing. 429 and 5xx are the provider's.
        const retryable = res.status === 429 || res.status >= 500;
        return { ok: false, error: `SES ${res.status}: ${raw.slice(0, 500)}`, retryable };
      }

      let messageId = "";
      try {
        const json: unknown = JSON.parse(raw);
        if (typeof json === "object" && json !== null) {
          const id = (json as Record<string, unknown>).MessageId;
          if (typeof id === "string") messageId = id;
        }
      } catch {
        // A 200 with an unparseable body still means it was accepted.
      }
      return { ok: true, messageId };
    } catch (err) {
      // A timeout or a socket error may or may not have delivered. Retrying can
      // duplicate; not retrying can drop. A duplicate notification is the lesser
      // harm, so these are retryable.
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        retryable: true,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

export function makeSesTransport(c: SesConfig): SesTransport {
  if (!c.region || !c.accessKeyId || !c.secretAccessKey || !c.fromEmail) {
    return new UnconfiguredTransport();
  }
  const from = c.fromName ? `${c.fromName} <${c.fromEmail}>` : c.fromEmail;
  return new AwsSesTransport(
    c.region,
    c.accessKeyId,
    c.secretAccessKey,
    from,
    c.replyTo,
    c.configurationSet,
  );
}
