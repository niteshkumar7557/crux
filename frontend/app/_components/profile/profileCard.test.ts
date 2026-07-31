import { describe, it, expect } from "vitest";
import { buildProfileCard } from "./profileCard";
import type { ProfileShell } from "@/app/profile/types";

const shell: ProfileShell = {
  identity: {
    id: 1,
    name: "Nitesh Kumar",
    username: "niteshkumar",
    avatar: null,
    bio: "",
  },
  standing: {
    logic: 342,
    tier: "master",
    globalRank: 3,
    record: { wins: 12, losses: 4, draws: 1 },
    mvpCount: 2,
  },
  season: {
    number: 2,
    logic: 88,
    rank: 5,
    startsAt: "2026-08-01T00:00:00.000Z",
    daysLeft: 9,
  },
  titles: [],
};

const withTitles = (titles: ProfileShell["titles"]): ProfileShell => ({
  ...shell,
  titles,
});

describe("buildProfileCard", () => {
  it("reads the standing off the shell", () => {
    const card = buildProfileCard(shell);
    expect(card).toMatchObject({
      name: "Nitesh Kumar",
      handle: "@niteshkumar",
      tier: "MASTER",
      logic: 342,
      record: "12–4–1",
      rank: "#3",
      mvp: "2× MVP",
    });
  });

  it("drops the rank when the user is unranked", () => {
    const card = buildProfileCard({
      ...shell,
      standing: { ...shell.standing, globalRank: 0 },
    });
    expect(card.rank).toBeNull();
  });

  it("drops the MVP line at zero rather than showing 0×", () => {
    const card = buildProfileCard({
      ...shell,
      standing: { ...shell.standing, mvpCount: 0 },
    });
    expect(card.mvp).toBeNull();
  });

  it("falls back to the username when there is no display name", () => {
    const card = buildProfileCard({
      ...shell,
      identity: { ...shell.identity, name: "" },
    });
    expect(card.name).toBe("niteshkumar");
  });

  it("never reports a negative logic score", () => {
    const card = buildProfileCard({
      ...shell,
      standing: { ...shell.standing, logic: -20 },
    });
    expect(card.logic).toBe(0);
  });

  // satori cannot ellipsize, so an uncut name would run off the frame.
  it("cuts a name too long for the card", () => {
    const card = buildProfileCard({
      ...shell,
      identity: {
        ...shell.identity,
        name: "Bartholomew Alexander Wellington Fitzgerald",
      },
    });
    expect(card.name.length).toBeLessThanOrEqual(27);
    expect(card.name.endsWith("…")).toBe(true);
  });

  it("has no title when nothing has been won", () => {
    expect(buildProfileCard(shell).title).toBeNull();
  });

  it("shows the best title, not the first", () => {
    const card = buildProfileCard(
      withTitles([
        { seasonKey: "2026-06", seasonNumber: 1, rank: 3, title: "Third Chair", frame: "bronze" },
        { seasonKey: "2026-07", seasonNumber: 2, rank: 1, title: "Champion", frame: "gold" },
      ]),
    );
    expect(card.title).toBe("Champion");
  });

  it("breaks a tie on rank with the more recent season", () => {
    const card = buildProfileCard(
      withTitles([
        { seasonKey: "2026-05", seasonNumber: 0, rank: 1, title: "Old Champion", frame: "gold" },
        { seasonKey: "2026-07", seasonNumber: 2, rank: 1, title: "New Champion", frame: "gold" },
      ]),
    );
    expect(card.title).toBe("New Champion");
  });

  it("survives a shell with no titles array at all", () => {
    const card = buildProfileCard({
      ...shell,
      titles: undefined as unknown as ProfileShell["titles"],
    });
    expect(card.title).toBeNull();
  });
});
