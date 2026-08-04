import { describe, it, expect } from "vitest";
import {
  renderEmail,
  type EmailLinks,
  type TemplateData,
} from "./templates.logic.js";
import { EMAIL_CATEGORIES } from "./budget.logic.js";

const links: EmailLinks = {
  siteUrl: "https://cruxdebate.site",
  unsubscribeUrl: "https://cruxdebate.site/u/tok123",
  preferencesUrl: "https://cruxdebate.site/profile/email",
};

const ALL: TemplateData[] = [
  { category: "welcome", data: { username: "nitesh" } },
  {
    category: "verdict",
    data: { motionId: 42, claim: "UBI should replace means-tested welfare", outcome: "win", isMvp: true, points: 35 },
  },
  {
    category: "reply",
    data: {
      motionId: 42,
      claim: "UBI should replace means-tested welfare",
      actor: "rhea",
      yourArgument: "The mechanism fails because the tax base contracts.",
      theirArgument: "That assumes a static base, but elasticity evidence says otherwise.",
    },
  },
  {
    category: "opponent",
    data: { motionId: 42, claim: "UBI should replace means-tested welfare", actor: "rhea" },
  },
  { category: "season", data: { title: "Contender", rank: 2 } },
  {
    category: "announcement",
    data: {
      motionId: 42,
      claim: "UBI should replace means-tested welfare",
      subject: "A debate worth your time",
      message: "This one is close and the AGAINST side needs a sharper case.",
    },
  },
];

describe("every template", () => {
  it("covers every category the spec names", () => {
    expect(ALL.map((t) => t.category).sort()).toEqual([...EMAIL_CATEGORIES].sort());
  });

  it.each(ALL)("$category — has a subject, text and html", (t) => {
    const mail = renderEmail(t, links);
    expect(mail.subject.length).toBeGreaterThan(0);
    expect(mail.subject.length).toBeLessThanOrEqual(140);
    expect(mail.text.length).toBeGreaterThan(0);
    expect(mail.html.length).toBeGreaterThan(0);
  });

  it.each(ALL)("$category — ships both unsubscribe routes in text and html", (t) => {
    const mail = renderEmail(t, links);
    for (const body of [mail.text, mail.html]) {
      expect(body).toContain(links.unsubscribeUrl);
      expect(body).toContain(links.preferencesUrl);
    }
  });

  it.each(ALL)("$category — states why it was received", (t) => {
    const mail = renderEmail(t, links);
    expect(mail.text).toContain("You're receiving this because");
    expect(mail.html).toContain("receiving this because");
  });

  it.each(ALL)("$category — links only to our own site", (t) => {
    const mail = renderEmail(t, links);
    const urls = mail.html.match(/https?:\/\/[^"'\s)]+/g) ?? [];
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      expect(url.startsWith("https://cruxdebate.site")).toBe(true);
    }
  });

  it.each(ALL)("$category — carries exactly one image, the logo", (t) => {
    const images = renderEmail(t, links).html.match(/<img\b[^>]*>/gi) ?? [];
    expect(images).toHaveLength(1);
    expect(images[0]).toContain(`${links.siteUrl}/email/logo.png`);
  });

  it.each(ALL)("$category — sizes the logo, so a blocked image cannot reflow it", (t) => {
    const [img] = renderEmail(t, links).html.match(/<img\b[^>]*>/gi) ?? [];
    expect(img).toMatch(/width="\d+"/);
    expect(img).toMatch(/height="\d+"/);
  });

  it.each(ALL)("$category — is not a tracking pixel in disguise", (t) => {
    const [img] = renderEmail(t, links).html.match(/<img\b[^>]*>/gi) ?? [];
    // design-system §13: the one image is a visible logo. A 1x1, or an image
    // whose URL carries the recipient, is an open tracker wearing a logo's name.
    expect(img).not.toMatch(/width="1"/);
    expect(img).not.toMatch(/height="1"/);
    expect(img).not.toMatch(/\?/);
    expect(img).toMatch(/alt="/);
  });

  it.each(ALL)("$category — uses no CSS background images", (t) => {
    expect(renderEmail(t, links).html).not.toMatch(/background-image/i);
  });

  it.each(ALL)("$category — carries no stylesheet or script", (t) => {
    const mail = renderEmail(t, links);
    expect(mail.html).not.toMatch(/<style/i);
    expect(mail.html).not.toMatch(/<script/i);
    expect(mail.html).not.toMatch(/@import/i);
  });

  it.each(ALL)("$category — is light-only, with no theme branch", (t) => {
    expect(renderEmail(t, links).html).not.toMatch(/prefers-color-scheme/i);
  });
});

describe("escaping", () => {
  it("does not let a claim inject markup", () => {
    const mail = renderEmail(
      {
        category: "opponent",
        data: {
          motionId: 1,
          claim: '<script>alert("x")</script> & "quoted"',
          actor: "rhea",
        },
      },
      links,
    );
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("&lt;script&gt;");
  });

  it("does not let a username inject markup", () => {
    const mail = renderEmail(
      {
        category: "opponent",
        data: { motionId: 1, claim: "A claim", actor: '<b>x</b>' },
      },
      links,
    );
    expect(mail.html).not.toContain("<b>x</b>");
  });

  it("escapes an attacker-supplied announcement body", () => {
    const mail = renderEmail(
      {
        category: "announcement",
        data: {
          motionId: 1,
          claim: "A claim",
          subject: "Hi",
          message: '"><a href="https://evil.com">click</a>',
        },
      },
      links,
    );
    expect(mail.html).not.toContain('href="https://evil.com"');
  });
});

describe("verdict", () => {
  it("names MVP only when it was earned", () => {
    const mvp = renderEmail(
      { category: "verdict", data: { motionId: 1, claim: "c", outcome: "win", isMvp: true, points: 35 } },
      links,
    );
    const plain = renderEmail(
      { category: "verdict", data: { motionId: 1, claim: "c", outcome: "win", isMvp: false, points: 10 } },
      links,
    );
    expect(mvp.subject.toLowerCase()).toContain("mvp");
    expect(plain.subject.toLowerCase()).not.toContain("mvp");
  });

  it("signs a negative payout rather than hiding it", () => {
    const loss = renderEmail(
      { category: "verdict", data: { motionId: 1, claim: "c", outcome: "loss", isMvp: false, points: -5 } },
      links,
    );
    expect(loss.text).toContain("-5 logic");
  });

  it("distinguishes all three outcomes in the subject", () => {
    const subjects = (["win", "loss", "draw"] as const).map(
      (outcome) =>
        renderEmail(
          { category: "verdict", data: { motionId: 1, claim: "c", outcome, isMvp: false, points: 0 } },
          links,
        ).subject,
    );
    expect(new Set(subjects).size).toBe(3);
  });

  it("truncates a long claim rather than shipping a wall", () => {
    const mail = renderEmail(
      {
        category: "verdict",
        data: { motionId: 1, claim: "x".repeat(500), outcome: "win", isMvp: false, points: 10 },
      },
      links,
    );
    expect(mail.text).toContain("…");
    expect(mail.text).not.toContain("x".repeat(200));
  });
});

describe("deep links", () => {
  it("points every motion email at that motion", () => {
    for (const t of ALL) {
      const mail = renderEmail(t, links);
      const data = t.data as { motionId?: number };
      if (data.motionId === undefined) continue;
      expect(mail.text).toContain(`/motion/CRX-${data.motionId}-A`);
    }
  });

  it("sends the season email to the board, which is where the payoff is", () => {
    const mail = renderEmail({ category: "season", data: { title: "Contender", rank: 2 } }, links);
    expect(mail.text).toContain("/leaderboard");
  });
});
