import { describe, it, expect } from "vitest";
import { suppressionsFrom } from "./sesWebhook.controller.js";

describe("suppressionsFrom", () => {
  it("suppresses every recipient of a permanent bounce", () => {
    expect(
      suppressionsFrom({
        notificationType: "Bounce",
        bounce: {
          bounceType: "Permanent",
          bounceSubType: "NoEmail",
          bouncedRecipients: [
            { emailAddress: "Gone@Example.com" },
            { emailAddress: "also-gone@example.com" },
          ],
        },
      }),
    ).toEqual([
      { email: "gone@example.com", reason: "hard_bounce", detail: "NoEmail" },
      { email: "also-gone@example.com", reason: "hard_bounce", detail: "NoEmail" },
    ]);
  });

  it("leaves a transient bounce alone — that is the outbox's backoff to handle", () => {
    expect(
      suppressionsFrom({
        notificationType: "Bounce",
        bounce: {
          bounceType: "Transient",
          bounceSubType: "MailboxFull",
          bouncedRecipients: [{ emailAddress: "full@example.com" }],
        },
      }),
    ).toEqual([]);
  });

  it("suppresses a complaint immediately", () => {
    expect(
      suppressionsFrom({
        notificationType: "Complaint",
        complaint: {
          complaintFeedbackType: "abuse",
          complainedRecipients: [{ emailAddress: "annoyed@example.com" }],
        },
      }),
    ).toEqual([
      { email: "annoyed@example.com", reason: "complaint", detail: "abuse" },
    ]);
  });

  it("reads the eventType spelling a configuration set sends", () => {
    expect(
      suppressionsFrom({
        eventType: "Complaint",
        complaint: { complainedRecipients: [{ emailAddress: "x@example.com" }] },
      }),
    ).toHaveLength(1);
  });

  it("acts on nothing for a delivery", () => {
    expect(
      suppressionsFrom({
        notificationType: "Delivery",
        delivery: { recipients: ["fine@example.com"] },
      }),
    ).toEqual([]);
  });

  it("lowercases the address, so one mailbox cannot be suppressed twice", () => {
    const [s] = suppressionsFrom({
      notificationType: "Complaint",
      complaint: { complainedRecipients: [{ emailAddress: "MiXeD@Example.COM" }] },
    });
    expect(s?.email).toBe("mixed@example.com");
  });

  it("returns nothing for junk rather than throwing", () => {
    for (const junk of [null, undefined, 7, "Bounce", [], {}]) {
      expect(suppressionsFrom(junk)).toEqual([]);
    }
  });

  it("survives a well-typed event with malformed recipients", () => {
    expect(
      suppressionsFrom({
        notificationType: "Bounce",
        bounce: {
          bounceType: "Permanent",
          bouncedRecipients: [null, 7, {}, { emailAddress: "" }, { emailAddress: "ok@example.com" }],
        },
      }),
    ).toEqual([{ email: "ok@example.com", reason: "hard_bounce", detail: "Permanent" }]);
  });

  it("ignores a bounce with no recipients array", () => {
    expect(
      suppressionsFrom({ notificationType: "Bounce", bounce: { bounceType: "Permanent" } }),
    ).toEqual([]);
  });
});
