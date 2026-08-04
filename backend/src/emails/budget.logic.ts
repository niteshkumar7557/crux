// Who gets an email, and who has had enough. Pure — the counting query and the
// send live in jobs/email.ts.
// Spec: game-theory.md §20

export const EMAIL_CATEGORIES = [
  "welcome",
  "verdict",
  "reply",
  "opponent",
  "season",
  "announcement",
] as const;

export type EmailCategory = (typeof EMAIL_CATEGORIES)[number];

// §20: 4 per user per rolling 24 hours, across the two high-frequency categories
// only. Overflow is DROPPED, not deferred — there is no digest in this release,
// so there is nowhere to defer it to, and the in-app inbox still has everything.
export const EMAIL_RATION = 4;
export const RATION_WINDOW_HOURS = 24;

// The rationed set is exactly the categories a busy debate can produce many of.
// The others are rare by construction: a welcome is once per account lifetime, a
// season result reaches three people a month, a verdict is the thing the user was
// waiting for, and an announcement is typed by hand.
const RATIONED = new Set<EmailCategory>(["reply", "opponent"]);

export function isRationed(category: EmailCategory): boolean {
  return RATIONED.has(category);
}

// welcome is transactional: it confirms the account that was just created, so it
// has no opt-out and no preference column. Everything else does.
const PREFERENCE_COLUMN: Record<EmailCategory, string | null> = {
  welcome: null,
  verdict: "email_verdicts",
  reply: "email_replies",
  opponent: "email_opponents",
  season: "email_season",
  announcement: "email_announcements",
};

export function preferenceColumn(category: EmailCategory): string | null {
  return PREFERENCE_COLUMN[category];
}

export function isEmailCategory(value: string): value is EmailCategory {
  return (EMAIL_CATEGORIES as readonly string[]).includes(value);
}

export interface SendConditions {
  category: EmailCategory;
  suppressed: boolean;
  // The global switch. Never blocks `welcome`: an account confirmation is not a
  // subscription, and the switch cannot be set before the account exists anyway.
  globallyEnabled: boolean;
  // The per-category consent, already read for this category. True for welcome.
  categoryEnabled: boolean;
  // Rationed sends already made in the window.
  sentInWindow: number;
}

export type SendVerdict =
  | { send: true }
  | { send: false; reason: "suppressed" | "unsubscribed" | "over_ration" };

// Called at SEND time, never at queue time. §20 promises that unsubscribing while
// a message sits pending means it is not sent, and this is where that is kept.
export function decideSend(c: SendConditions): SendVerdict {
  // Suppression outranks everything, including transactional mail: a hard bounce
  // means the mailbox does not exist, and a complaint means they asked us to stop.
  if (c.suppressed) return { send: false, reason: "suppressed" };

  if (c.category !== "welcome") {
    if (!c.globallyEnabled || !c.categoryEnabled) {
      return { send: false, reason: "unsubscribed" };
    }
  }

  if (isRationed(c.category) && c.sentInWindow >= EMAIL_RATION) {
    return { send: false, reason: "over_ration" };
  }

  return { send: true };
}

// Exponential, in minutes: 1, 4, 9, 16, 25. Five attempts spans about an hour,
// which covers a provider blip without holding a dead address for days.
export const MAX_ATTEMPTS = 5;

export function nextAttemptDelayMs(attempts: number): number {
  return attempts * attempts * 60_000;
}

export function isDead(attempts: number): boolean {
  return attempts >= MAX_ATTEMPTS;
}
