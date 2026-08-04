import { describe, it, expect } from "vitest";
import {
  canonicalString,
  digestFor,
  isSigningCertUrl,
  isSnsUrl,
} from "./snsSignature.logic.js";

describe("isSnsUrl", () => {
  it("accepts AWS's own SNS hosts over https", () => {
    expect(isSnsUrl("https://sns.eu-north-1.amazonaws.com/x")).toBe(true);
    expect(isSnsUrl("https://sns.us-east-1.amazonaws.com/?Action=ConfirmSubscription")).toBe(true);
    expect(isSnsUrl("https://sns.cn-north-1.amazonaws.com.cn/x")).toBe(true);
  });

  it("refuses plain http", () => {
    expect(isSnsUrl("http://sns.eu-north-1.amazonaws.com/x")).toBe(false);
  });

  it("refuses the internal addresses an SSRF aims at", () => {
    expect(isSnsUrl("http://169.254.169.254/latest/meta-data/")).toBe(false);
    expect(isSnsUrl("https://localhost:8000/health")).toBe(false);
    expect(isSnsUrl("http://127.0.0.1:5432/")).toBe(false);
    expect(isSnsUrl("file:///etc/passwd")).toBe(false);
  });

  it("is not fooled by a lookalike host", () => {
    expect(isSnsUrl("https://sns.eu-north-1.amazonaws.com.evil.com/x")).toBe(false);
    expect(isSnsUrl("https://evil.com/sns.eu-north-1.amazonaws.com")).toBe(false);
    expect(isSnsUrl("https://notsns.eu-north-1.amazonaws.com/x")).toBe(false);
    expect(isSnsUrl("https://sns.amazonaws.com/x")).toBe(false);
    expect(isSnsUrl("https://user@sns.evil.com/x")).toBe(false);
  });

  it("refuses junk rather than throwing", () => {
    expect(isSnsUrl("")).toBe(false);
    expect(isSnsUrl("not a url")).toBe(false);
  });
});

describe("isSigningCertUrl", () => {
  it("requires an SNS host and a .pem path", () => {
    expect(isSigningCertUrl("https://sns.eu-north-1.amazonaws.com/Simple-abc.pem")).toBe(true);
  });

  it("refuses a non-pem path even on an SNS host", () => {
    expect(isSigningCertUrl("https://sns.eu-north-1.amazonaws.com/evil.txt")).toBe(false);
  });

  it("refuses a .pem served anywhere else", () => {
    expect(isSigningCertUrl("https://evil.com/cert.pem")).toBe(false);
  });
});

describe("canonicalString", () => {
  it("builds a Notification in the exact documented field order", () => {
    expect(
      canonicalString({
        Type: "Notification",
        MessageId: "id-1",
        TopicArn: "arn:aws:sns:x:1:t",
        Message: "body",
        Timestamp: "2026-08-04T12:00:00.000Z",
        Signature: "ignored",
      }),
    ).toBe(
      "Message\nbody\n" +
        "MessageId\nid-1\n" +
        "Timestamp\n2026-08-04T12:00:00.000Z\n" +
        "TopicArn\narn:aws:sns:x:1:t\n" +
        "Type\nNotification\n",
    );
  });

  it("includes Subject only when it is present", () => {
    const withSubject = canonicalString({
      Type: "Notification",
      MessageId: "id-1",
      TopicArn: "arn",
      Message: "body",
      Subject: "hello",
      Timestamp: "t",
    });
    expect(withSubject).toContain("Subject\nhello\n");
    // And it sits between MessageId and Timestamp, not at the end.
    expect(withSubject).toBe(
      "Message\nbody\nMessageId\nid-1\nSubject\nhello\nTimestamp\nt\nTopicArn\narn\nType\nNotification\n",
    );
  });

  it("uses the subscription field set, which includes SubscribeURL and Token", () => {
    expect(
      canonicalString({
        Type: "SubscriptionConfirmation",
        MessageId: "id-2",
        TopicArn: "arn",
        Message: "confirm me",
        SubscribeURL: "https://sns.eu-north-1.amazonaws.com/?x=1",
        Token: "tok",
        Timestamp: "t",
      }),
    ).toBe(
      "Message\nconfirm me\n" +
        "MessageId\nid-2\n" +
        "SubscribeURL\nhttps://sns.eu-north-1.amazonaws.com/?x=1\n" +
        "Timestamp\nt\n" +
        "Token\ntok\n" +
        "TopicArn\narn\n" +
        "Type\nSubscriptionConfirmation\n",
    );
  });

  it("refuses a message missing any required field", () => {
    expect(
      canonicalString({ Type: "Notification", MessageId: "id", TopicArn: "arn", Message: "b" }),
    ).toBeNull();
    expect(
      canonicalString({ Type: "SubscriptionConfirmation", MessageId: "id", TopicArn: "arn", Message: "b", Timestamp: "t" }),
    ).toBeNull();
  });

  it("refuses an unknown message type", () => {
    expect(canonicalString({ Type: "SomethingElse", Message: "b" })).toBeNull();
    expect(canonicalString({})).toBeNull();
  });
});

describe("digestFor", () => {
  it("maps the two versions AWS emits", () => {
    expect(digestFor("1")).toBe("sha1");
    expect(digestFor("2")).toBe("sha256");
  });

  it("refuses anything else rather than guessing", () => {
    for (const junk of ["3", "", 1, 2, null, undefined, "sha256"]) {
      expect(digestFor(junk)).toBeNull();
    }
  });
});
