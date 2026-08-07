import { describe, expect, it } from "vitest";
import { createPlaybackController, type MediaPort } from "./playbackController";

interface FakePort extends MediaPort {
  log: string[];
  rejectPlay: boolean;
  playRejection?: unknown;
}

function fakePort(duration = 480): FakePort {
  const log: string[] = [];
  let currentTime = 0;
  let playbackRate = 1;
  let volume = 1;
  let muted = false;
  let defaultMuted = false;
  const port: FakePort = {
    log,
    rejectPlay: false,
    duration,
    paused: true,
    readyState: 4,
    networkState: 2,
    get currentTime() { return currentTime; },
    set currentTime(value: number) { currentTime = value; log.push(`time:${value}`); },
    get playbackRate() { return playbackRate; },
    set playbackRate(value: number) { playbackRate = value; log.push(`rate:${value}`); },
    get volume() { return volume; },
    set volume(value: number) { volume = value; log.push(`volume:${value}`); },
    get muted() { return muted; },
    set muted(value: boolean) { muted = value; log.push(`muted:${value}`); },
    get defaultMuted() { return defaultMuted; },
    set defaultMuted(value: boolean) { defaultMuted = value; log.push(`defaultMuted:${value}`); },
    async play() {
      log.push("play");
      if (port.rejectPlay) throw port.playRejection ?? new Error("NotAllowedError");
      port.paused = false;
    },
    pause() {
      log.push("pause");
      port.paused = true;
    },
    load() { log.push("load"); },
  };
  return port;
}

function fakeScheduler() {
  const intervals: { handle: number; ms: number; handler: () => void }[] = [];
  const cleared: number[] = [];
  let next = 1;
  return {
    intervals,
    cleared,
    setInterval(handler: () => void, ms: number) {
      const handle = next;
      next += 1;
      intervals.push({ handle, ms, handler });
      return handle;
    },
    clearInterval(handle: number) {
      cleared.push(handle);
    },
  };
}

function harness() {
  const ports = { host: fakePort(), for: fakePort(), against: fakePort() };
  const scheduler = fakeScheduler();
  const time = { nowMs: 0 };
  const controller = createPlaybackController(ports, { now: () => time.nowMs }, scheduler);
  return { ports, scheduler, time, controller };
}

function count(log: string[], entry: string): number {
  return log.filter((value) => value === entry).length;
}

describe("playback controller commands", () => {
  it("play seeks followers to host before starting all healthy ports", async () => {
    const { ports, controller } = harness();
    ports.host.currentTime = 42;

    await controller.play();

    for (const follower of [ports.for, ports.against]) {
      expect(follower.log.indexOf("time:42")).toBeGreaterThan(-1);
      expect(follower.log.indexOf("time:42")).toBeLessThan(follower.log.indexOf("play"));
    }
    expect(count(ports.host.log, "play")).toBe(1);
    expect(controller.getSnapshot().intent).toBe("playing");
  });

  it("pause pauses all healthy ports and clears playing intent", async () => {
    const { ports, controller } = harness();

    await controller.play();
    controller.pause();

    expect(ports.host.paused).toBe(true);
    expect(ports.for.paused).toBe(true);
    expect(ports.against.paused).toBe(true);
    expect(controller.getSnapshot().intent).toBe("paused");
  });

  it("seek writes one clamped time to host and both healthy followers", () => {
    const { ports, controller } = harness();

    controller.seek(-5);
    controller.seek(9_999);

    for (const port of [ports.host, ports.for, ports.against]) {
      expect(count(port.log, "time:0")).toBe(1);
      expect(count(port.log, "time:480")).toBe(1);
    }
  });

  it("playback rate updates host and healthy followers", () => {
    const { ports, controller } = harness();

    controller.setPlaybackRate(1.5);

    expect(ports.host.playbackRate).toBe(1.5);
    expect(ports.for.playbackRate).toBe(1.5);
    expect(ports.against.playbackRate).toBe(1.5);
    expect(controller.getSnapshot().playbackRate).toBe(1.5);
  });

  it("volume and mute affect only host", () => {
    const { ports, controller } = harness();

    controller.setVolume(0.4);
    controller.setMuted(true);

    expect(ports.host.volume).toBe(0.4);
    expect(ports.host.muted).toBe(true);
    expect(ports.for.volume).toBe(1);
    expect(ports.against.volume).toBe(1);
    expect(count(ports.for.log, "volume:0.4")).toBe(0);
  });

  it("followers are muted and defaultMuted on attach and after a volumechange attempt", () => {
    const { ports, controller } = harness();

    expect(ports.for.muted).toBe(true);
    expect(ports.for.defaultMuted).toBe(true);
    ports.against.muted = false;
    controller.handleEvent("against", "volumechange");

    expect(ports.against.muted).toBe(true);
    expect(ports.against.defaultMuted).toBe(true);
  });

  it("one follower play rejection degrades it while host continues", async () => {
    const { ports, controller } = harness();
    ports.for.rejectPlay = true;

    await controller.play();

    expect(controller.getSnapshot().tracks.for).toBe("unavailable");
    expect(controller.getSnapshot().fatal).toBe(false);
    expect(ports.host.paused).toBe(false);
    expect(ports.against.paused).toBe(false);
  });

  it("host play rejection becomes fatal and pauses the group", async () => {
    const { ports, controller } = harness();
    ports.host.rejectPlay = true;

    await controller.play();

    expect(controller.getSnapshot().fatal).toBe(true);
    expect(controller.getSnapshot().tracks.host).toBe("unavailable");
    expect(controller.getSnapshot().intent).toBe("paused");
    expect(ports.for.paused).toBe(true);
    expect(ports.against.paused).toBe(true);
  });
});

describe("playback controller buffering and recovery", () => {
  it("waiting follower pauses all tracks but preserves play intent", async () => {
    const { ports, controller } = harness();

    await controller.play();
    controller.handleEvent("for", "waiting");

    expect(ports.host.paused).toBe(true);
    expect(ports.against.paused).toBe(true);
    expect(controller.getSnapshot().intent).toBe("playing");
    expect(controller.getSnapshot().buffering).toBe(true);
  });

  it("canplay resumes only when every healthy track is ready", async () => {
    const { ports, controller } = harness();

    await controller.play();
    controller.handleEvent("for", "waiting");
    controller.handleEvent("against", "waiting");
    controller.handleEvent("for", "canplay");

    expect(ports.host.paused).toBe(true);

    controller.handleEvent("against", "canplay");

    expect(ports.host.paused).toBe(false);
    expect(controller.getSnapshot().buffering).toBe(false);
  });

  it("user pause during buffering prevents automatic resume", async () => {
    const { ports, controller } = harness();

    await controller.play();
    controller.handleEvent("for", "waiting");
    controller.pause();
    controller.handleEvent("for", "canplay");

    expect(ports.host.paused).toBe(true);
    expect(controller.getSnapshot().intent).toBe("paused");
  });

  it("follower error changes tile state to unavailable and removes it from sync loop", async () => {
    const { ports, controller } = harness();

    await controller.play();
    controller.handleEvent("against", "error");
    ports.host.currentTime = 100;
    const before = ports.against.log.length;
    controller.tick();

    expect(controller.getSnapshot().tracks.against).toBe("unavailable");
    expect(ports.against.log.length).toBe(before);
    expect(ports.host.paused).toBe(false);
  });

  it("retry follower loads it at host time and rejoins only after ready", async () => {
    const { ports, controller } = harness();

    await controller.play();
    controller.handleEvent("against", "error");
    ports.host.currentTime = 60;
    controller.retry("against");

    expect(ports.against.log).toContain("load");
    expect(ports.against.log).toContain("time:60");
    expect(controller.getSnapshot().tracks.against).toBe("buffering");

    controller.handleEvent("against", "canplay");

    expect(controller.getSnapshot().tracks.against).toBe("ready");
  });

  it("retry host keeps programme stopped until host can play again", async () => {
    const { ports, controller } = harness();
    ports.host.rejectPlay = true;

    await controller.play();
    const playsBeforeRetry = count(ports.host.log, "play");
    controller.retry("host");

    expect(ports.host.log).toContain("load");
    expect(count(ports.host.log, "play")).toBe(playsBeforeRetry);
    expect(controller.getSnapshot().playing).toBe(false);

    controller.handleEvent("host", "canplay");

    expect(controller.getSnapshot().playing).toBe(false);
    expect(controller.getSnapshot().fatal).toBe(false);

    ports.host.rejectPlay = false;
    await controller.play();

    expect(ports.host.paused).toBe(false);
  });

  it("destroy cancels interval/frame callbacks and removes listeners", async () => {
    const { ports, scheduler, controller } = harness();
    let notifications = 0;
    controller.subscribe(() => { notifications += 1; });

    expect(scheduler.intervals).toHaveLength(1);

    controller.destroy();
    const handle = scheduler.intervals[0]?.handle;
    const before = ports.host.log.length;
    controller.tick();
    controller.seek(10);
    await controller.play();

    expect(scheduler.cleared).toEqual([handle]);
    expect(ports.host.log.length).toBe(before);
    expect(notifications).toBe(0);
  });
});

describe("playback controller drift correction", () => {
  it("nudges a drifting follower and hard seeks a badly drifted one", async () => {
    const { ports, controller } = harness();

    await controller.play();
    ports.host.currentTime = 100;
    ports.for.currentTime = 99.7;
    ports.against.currentTime = 90;
    controller.tick();

    expect(ports.for.playbackRate).toBeCloseTo(1.04, 10);
    expect(ports.against.currentTime).toBe(100);
    expect(ports.against.playbackRate).toBe(1);
  });
});

describe("playback controller resume", () => {
  // Real browsers fire `seeking` when play() re-points a follower at the host time.
  // That marks the track waiting, which pauses the group mid-resume — and if only a
  // follower is left paused, nothing restarted it: the resume branch was gated on the
  // HOST being paused, and tick() only ever seeks, never plays.
  it("restarts a follower left paused while the host is already playing", async () => {
    const { ports, controller } = harness();

    await controller.play();
    // A follower drops out on its own, with no resume in flight to rescue it.
    ports.for.pause();
    expect(ports.host.paused).toBe(false);

    controller.tick();
    // startHealthyPorts is async and fire-and-forget, so the follower's play()
    // lands a microtask later. In the browser the 250ms interval hides that.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(ports.for.paused).toBe(false);
    expect(ports.host.paused).toBe(false);
    expect(ports.against.paused).toBe(false);
  });

  it("does not replay ports that are already running", async () => {
    const { ports, controller } = harness();

    await controller.play();
    const before = ports.host.log.filter((entry) => entry === "play").length;
    controller.tick();
    controller.tick();

    expect(ports.host.log.filter((entry) => entry === "play").length).toBe(before);
  });
});

describe("playback controller resume rejections", () => {
  // Browsers reject play() with AbortError whenever a pause() supersedes it, and
  // pauseAll() does that routinely while the group waits on a seek. Treating that
  // as a media failure condemned a healthy angle to "Angle unavailable" forever.
  it("does not degrade a follower whose play was merely superseded by a pause", async () => {
    const { ports, controller } = harness();
    ports.for.rejectPlay = true;
    ports.for.playRejection = Object.assign(new Error("interrupted"), { name: "AbortError" });

    await controller.play();

    expect(controller.getSnapshot().tracks.for).not.toBe("unavailable");
  });

  it("still degrades a follower that genuinely cannot play", async () => {
    const { ports, controller } = harness();
    ports.for.rejectPlay = true;

    await controller.play();

    expect(controller.getSnapshot().tracks.for).toBe("unavailable");
  });
});
