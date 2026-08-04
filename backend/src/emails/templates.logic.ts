// Every email Crux sends, as pure functions: (data) => { subject, text, html }.
//
// The HTML follows design-system.md §13, and the constraints there are not
// stylistic. Table layout and inline styles because email clients drop
// stylesheets; hex literals because CSS variables do not survive; light-only
// because a forwarded email is read by someone with no theme; and NO remote
// images at all, because most clients block them, a broken logo is worse than no
// logo, and a remote image in a notification is indistinguishable from tracking.
//
// The text and the HTML are built from the same data in the same function, so
// they cannot drift into saying different things.
// Spec: game-theory.md §20

import type { EmailCategory } from "./budget.logic.js";

// design-system.md §2, light column, hand-synced. Same concession verdictCard.ts
// already makes for satori.
const C = {
  paper: "#f3edda",
  band: "#ece4cb",
  ink: "#244134",
  inkSoft: "#52685b",
  // A solid stand-in for --ink-faint: alpha hairlines are unreliable in email.
  hairline: "#d8d0b8",
  laurel: "#8f6e1f",
  for: "#2f6b4f",
  against: "#9c4a34",
} as const;

const DISPLAY = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const BODY = "Georgia, 'Times New Roman', serif";

export interface EmailLinks {
  siteUrl: string;
  unsubscribeUrl: string;
  preferencesUrl: string;
}

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function truncate(value: string, max: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}

interface Block {
  eyebrow: string;
  heading: string;
  lines: string[];
  quote?: { label: string; body: string } | null;
  stat?: string | null;
  cta: { label: string; url: string };
  footerReason: string;
}

function renderText(b: Block, links: EmailLinks): string {
  const parts = [
    b.eyebrow.toUpperCase(),
    "",
    b.heading,
    "",
    ...b.lines,
  ];
  if (b.quote) parts.push("", `${b.quote.label}: "${b.quote.body}"`);
  if (b.stat) parts.push("", b.stat);
  parts.push(
    "",
    `${b.cta.label}: ${b.cta.url}`,
    "",
    "—",
    b.footerReason,
    `Unsubscribe: ${links.unsubscribeUrl}`,
    `Email settings: ${links.preferencesUrl}`,
    "Crux · cruxdebate.site",
  );
  return parts.join("\n");
}

function renderHtml(b: Block, links: EmailLinks): string {
  const quote = b.quote
    ? `<tr><td style="padding:0 0 20px 0">
         <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
           <tr><td style="border-left:3px solid ${C.hairline};padding:4px 0 4px 16px">
             <div style="font-family:${DISPLAY};font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${C.inkSoft};padding-bottom:6px">${escapeHtml(b.quote.label)}</div>
             <div style="font-family:${BODY};font-size:15px;line-height:1.6;color:${C.ink}">${escapeHtml(b.quote.body)}</div>
           </td></tr>
         </table>
       </td></tr>`
    : "";

  const stat = b.stat
    ? `<tr><td style="padding:0 0 24px 0">
         <div style="font-family:${DISPLAY};font-size:13px;letter-spacing:2px;text-transform:uppercase;color:${C.laurel}">${escapeHtml(b.stat)}</div>
       </td></tr>`
    : "";

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${C.paper};margin:0;padding:0">
  <tr><td align="center" style="padding:32px 16px">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:${C.band};border:1px solid ${C.hairline}">
      <tr><td style="padding:32px 32px 0 32px">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td valign="middle" style="padding-right:10px">
              <!-- alt is deliberately empty: the wordmark beside it already says
                   "Crux", and an alt of "Crux" makes a screen reader say it twice.
                   With images blocked the row degrades to the wordmark alone,
                   which is what the header said before this image existed. -->
              <img src="${escapeHtml(links.siteUrl)}/email/logo.png" width="26" height="26" alt="" style="display:block;border:0;outline:none;text-decoration:none" />
            </td>
            <td valign="middle">
              <div style="font-family:${DISPLAY};font-size:20px;font-weight:bold;letter-spacing:1px;color:${C.ink}">CRUX</div>
            </td>
          </tr>
        </table>
        <div style="font-family:${DISPLAY};font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${C.inkSoft};padding-top:10px">${escapeHtml(b.eyebrow)}</div>
      </td></tr>
      <tr><td style="padding:20px 32px 0 32px">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td style="padding:0 0 16px 0">
            <div style="font-family:${DISPLAY};font-size:24px;line-height:1.25;font-weight:bold;color:${C.ink}">${escapeHtml(b.heading)}</div>
          </td></tr>
          ${b.lines
            .map(
              (line) =>
                `<tr><td style="padding:0 0 14px 0"><div style="font-family:${BODY};font-size:15px;line-height:1.65;color:${C.inkSoft}">${escapeHtml(line)}</div></td></tr>`,
            )
            .join("")}
          ${quote}
          ${stat}
          <tr><td style="padding:4px 0 32px 0">
            <a href="${escapeHtml(b.cta.url)}" style="display:inline-block;background-color:${C.ink};color:${C.paper};font-family:${DISPLAY};font-size:12px;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:14px 28px">${escapeHtml(b.cta.label)}</a>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:0 32px 28px 32px;border-top:1px solid ${C.hairline}">
        <div style="font-family:${BODY};font-size:12px;line-height:1.6;color:${C.inkSoft};padding-top:20px">${escapeHtml(b.footerReason)}</div>
        <div style="font-family:${DISPLAY};font-size:11px;letter-spacing:1px;color:${C.inkSoft};padding-top:12px">
          <a href="${escapeHtml(links.unsubscribeUrl)}" style="color:${C.inkSoft};text-decoration:underline">Unsubscribe</a>
          &nbsp;·&nbsp;
          <a href="${escapeHtml(links.preferencesUrl)}" style="color:${C.inkSoft};text-decoration:underline">Email settings</a>
          &nbsp;·&nbsp;
          <a href="${escapeHtml(links.siteUrl)}" style="color:${C.inkSoft};text-decoration:underline">Crux</a>
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>`;
}

function render(b: Block, subject: string, links: EmailLinks): RenderedEmail {
  return { subject, text: renderText(b, links), html: renderHtml(b, links) };
}

const motionUrl = (links: EmailLinks, motionId: number) =>
  `${links.siteUrl}/motion/CRX-${motionId}-A`;

export interface WelcomeData {
  username: string;
}

export interface VerdictData {
  motionId: number;
  claim: string;
  outcome: "win" | "loss" | "draw";
  isMvp: boolean;
  points: number;
}

export interface ReplyData {
  motionId: number;
  claim: string;
  actor: string;
  yourArgument: string;
  theirArgument: string;
}

export interface OpponentData {
  motionId: number;
  claim: string;
  actor: string;
}

export interface SeasonData {
  title: string;
  rank: number;
}

export interface AnnouncementData {
  motionId: number;
  claim: string;
  subject: string;
  message: string;
}

export function welcomeEmail(d: WelcomeData, links: EmailLinks): RenderedEmail {
  return render(
    {
      eyebrow: "Welcome to the arena",
      heading: `You're in, @${d.username}`,
      lines: [
        "Crux is a debating society run by an AI referee. Someone publishes a motion, two sides argue it for 48 hours, and a judge rules.",
        "Every argument is scored 2–10 on how much it moves the debate — never on eloquence, length or grammar. Reply to a named opponent and the full range is open; a standalone point caps at 7.",
        "Your all-time logic has no way down. A loss costs 5 points from the month's board and nothing else.",
      ],
      cta: { label: "Find a debate", url: `${links.siteUrl}/arena` },
      footerReason: "You're receiving this because you just created a Crux account.",
    },
    "Welcome to Crux",
    links,
  );
}

export function verdictEmail(d: VerdictData, links: EmailLinks): RenderedEmail {
  const headline =
    d.outcome === "win"
      ? d.isMvp
        ? "You won — and you were named MVP"
        : "You won"
      : d.outcome === "loss"
        ? "The bench ruled against you"
        : "It ended in a draw";

  return render(
    {
      eyebrow: "The verdict is in",
      heading: headline,
      lines: [`The bench has ruled on "${truncate(d.claim, 160)}".`],
      stat: `${d.points >= 0 ? "+" : ""}${d.points} logic`,
      cta: { label: "Read the verdict", url: motionUrl(links, d.motionId) },
      footerReason: "You're receiving this because you argued in this debate.",
    },
    `The verdict is in — ${headline.toLowerCase()}`,
    links,
  );
}

export function replyEmail(d: ReplyData, links: EmailLinks): RenderedEmail {
  return render(
    {
      eyebrow: "Someone answered you",
      heading: `@${d.actor} replied to your argument`,
      lines: [
        `On "${truncate(d.claim, 140)}".`,
        `You wrote: "${truncate(d.yourArgument, 140)}"`,
      ],
      quote: { label: `@${d.actor} replied`, body: truncate(d.theirArgument, 240) },
      cta: { label: "Answer back", url: motionUrl(links, d.motionId) },
      footerReason:
        "You're receiving this because someone replied to your argument on Crux.",
    },
    `@${d.actor} answered your argument`,
    links,
  );
}

export function opponentEmail(d: OpponentData, links: EmailLinks): RenderedEmail {
  return render(
    {
      eyebrow: "Your motion has an opponent",
      heading: "It's a real contest now",
      lines: [
        `@${d.actor} has argued the other side of "${truncate(d.claim, 160)}".`,
        "A debate with one side is a walkover, and a walkover pays nobody — including the author.",
      ],
      cta: { label: "Defend your side", url: motionUrl(links, d.motionId) },
      footerReason:
        "You're receiving this because you're arguing in this debate, or you opened it.",
    },
    `@${d.actor} joined the other side`,
    links,
  );
}

export function seasonEmail(d: SeasonData, links: EmailLinks): RenderedEmail {
  return render(
    {
      eyebrow: "The season is over",
      heading: `You finished #${d.rank}`,
      lines: [
        `"${d.title}" is yours, permanently. Season titles and their frames never expire and never come off your profile.`,
        "The board has reset. Everyone starts the new month level.",
      ],
      stat: d.title,
      cta: { label: "See the board", url: `${links.siteUrl}/leaderboard` },
      footerReason:
        "You're receiving this because you placed in the top three last season.",
    },
    `You finished #${d.rank} — "${d.title}" is yours`,
    links,
  );
}

export function announcementEmail(
  d: AnnouncementData,
  links: EmailLinks,
): RenderedEmail {
  return render(
    {
      eyebrow: "From the developer",
      heading: truncate(d.subject, 90),
      lines: [d.message, `The motion: "${truncate(d.claim, 160)}"`],
      cta: { label: "Open the debate", url: motionUrl(links, d.motionId) },
      footerReason:
        "You're receiving this because you have a Crux account and haven't turned announcements off.",
    },
    d.subject,
    links,
  );
}

// Present so a new category cannot be added without deciding what it says.
export type TemplateData =
  | { category: Extract<EmailCategory, "welcome">; data: WelcomeData }
  | { category: Extract<EmailCategory, "verdict">; data: VerdictData }
  | { category: Extract<EmailCategory, "reply">; data: ReplyData }
  | { category: Extract<EmailCategory, "opponent">; data: OpponentData }
  | { category: Extract<EmailCategory, "season">; data: SeasonData }
  | { category: Extract<EmailCategory, "announcement">; data: AnnouncementData };

export function renderEmail(t: TemplateData, links: EmailLinks): RenderedEmail {
  switch (t.category) {
    case "welcome":
      return welcomeEmail(t.data, links);
    case "verdict":
      return verdictEmail(t.data, links);
    case "reply":
      return replyEmail(t.data, links);
    case "opponent":
      return opponentEmail(t.data, links);
    case "season":
      return seasonEmail(t.data, links);
    case "announcement":
      return announcementEmail(t.data, links);
  }
}
