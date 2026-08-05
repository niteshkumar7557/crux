import { describe, it, expect } from "vitest";
import { buildClashes, UNANSWERED_AFTER_HOURS } from "./clash";
import type { UserArgumentCardProps } from "@/app/motion/types";

const T0 = Date.parse("2026-08-05T12:00:00.000Z");
const hours = (h: number) => new Date(T0 + h * 3_600_000).toISOString();

function arg(
  argument_id: number,
  over: Partial<UserArgumentCardProps> = {},
): UserArgumentCardProps {
  return {
    side: "for",
    reputation: "beginner",
    username: `u${argument_id}`,
    avatar: null,
    argument: "an argument",
    points: 5,
    likes: 0,
    argument_id,
    post_user_id: argument_id,
    initiallyLiked: false,
    replyTo: null,
    replyCount: 0,
    firstReplyId: null,
    viewerLockedSide: null,
    closed: false,
    createdAt: hours(0),
    ...over,
  };
}

const answering = (argumentId: number) => ({
  argumentId,
  username: `u${argumentId}`,
  content: "what it answers",
});

const live = (args: UserArgumentCardProps[], atHour = 0) =>
  buildClashes({ arguments: args, status: "live", now: T0 + atHour * 3_600_000 });

const concluded = (args: UserArgumentCardProps[]) =>
  buildClashes({ arguments: args, status: "concluded", now: T0 });

const ids = (clashes: ReturnType<typeof buildClashes>) => clashes.map((c) => c.id);

describe("buildClashes — structure", () => {
  it("gathers a root and its reply into one clash", () => {
    const out = live([
      arg(1),
      arg(2, { side: "against", replyTo: answering(1), createdAt: hours(1) }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe(1);
    expect(out[0].entries.map((e) => e.argument.argument_id)).toEqual([2]);
  });

  it("gives a standalone argument a clash of its own", () => {
    const out = live([arg(1), arg(2)]);
    expect(out).toHaveLength(2);
    expect(out.every((c) => c.entries.length === 0)).toBe(true);
  });

  it("assigns depth down a chain", () => {
    const out = live([
      arg(1),
      arg(2, { side: "against", replyTo: answering(1), createdAt: hours(1) }),
      arg(3, { replyTo: answering(2), createdAt: hours(2) }),
    ]);
    expect(out[0].root.depth).toBe(0);
    expect(out[0].entries.map((e) => e.depth)).toEqual([1, 2]);
  });

  it("orders entries by depth, then by time within a depth", () => {
    const out = live([
      arg(1),
      arg(3, { side: "against", replyTo: answering(1), createdAt: hours(3) }),
      arg(2, { side: "against", replyTo: answering(1), createdAt: hours(1) }),
      arg(4, { replyTo: answering(2), createdAt: hours(4) }),
    ]);
    expect(out[0].entries.map((e) => e.argument.argument_id)).toEqual([2, 3, 4]);
    expect(out[0].entries.map((e) => e.depth)).toEqual([1, 1, 2]);
  });

  it("opens a clash for an orphan whose parent is not in the list", () => {
    const out = live([arg(2, { replyTo: answering(99), createdAt: hours(1) })]);
    expect(ids(out)).toEqual([2]);
  });

  it("does not mutate its input", () => {
    const input = [arg(2, { createdAt: hours(2) }), arg(1, { createdAt: hours(1) })];
    live(input);
    expect(input.map((a) => a.argument_id)).toEqual([2, 1]);
  });
});

describe("buildClashes — ordering", () => {
  it("puts the most recently active clash first while live", () => {
    const out = live([
      arg(1, { createdAt: hours(0) }),
      arg(2, { createdAt: hours(1) }),
      arg(3, { side: "against", replyTo: answering(1), createdAt: hours(5) }),
    ]);
    expect(ids(out)).toEqual([1, 2]);
  });

  it("puts the strongest clash first once concluded", () => {
    const out = concluded([
      arg(1, { points: 4 }),
      arg(2, { points: 9 }),
      arg(3, { points: 6 }),
    ]);
    expect(ids(out)).toEqual([2, 3, 1]);
  });

  it("scores a clash by its best entry, not only its root", () => {
    const out = concluded([
      arg(1, { points: 2 }),
      arg(2, { points: 6 }),
      arg(3, { side: "against", points: 10, replyTo: answering(1), createdAt: hours(1) }),
    ]);
    expect(ids(out)).toEqual([1, 2]);
  });

  it("breaks a points tie on the longer exchange", () => {
    const out = concluded([
      arg(1, { points: 7 }),
      arg(2, { points: 7 }),
      arg(3, { side: "against", points: 5, replyTo: answering(2), createdAt: hours(1) }),
    ]);
    expect(ids(out)).toEqual([2, 1]);
  });
});

describe("buildClashes — the unanswered mark", () => {
  it("stays quiet on a lone root that is still young", () => {
    const out = live([arg(1, { createdAt: hours(0) })], UNANSWERED_AFTER_HOURS - 1);
    expect(out[0].unanswered).toBe(false);
  });

  it("marks a lone root once it has stood the full window", () => {
    const out = live([arg(1, { createdAt: hours(0) })], UNANSWERED_AFTER_HOURS);
    expect(out[0].unanswered).toBe(true);
  });

  it("marks every lone root immediately once concluded", () => {
    const out = concluded([arg(1, { createdAt: hours(0) })]);
    expect(out[0].unanswered).toBe(true);
  });

  it("never marks a root that drew a reply, however old", () => {
    const out = live(
      [arg(1), arg(2, { side: "against", replyTo: answering(1), createdAt: hours(1) })],
      100,
    );
    expect(out[0].unanswered).toBe(false);
  });

  it("treats an unparseable timestamp as unanswered rather than crashing", () => {
    const out = live([arg(1, { createdAt: "not a date" })], 1);
    expect(out[0].unanswered).toBe(true);
  });
});
