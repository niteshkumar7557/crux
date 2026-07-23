import { describe, it, expect, afterEach } from "vitest";
import { claimOnce, shouldAnimate, type SeenStore } from "./animateOnce";

function fakeStore(): SeenStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  };
}

describe("claimOnce", () => {
  it("allows the first claim and refuses every one after", () => {
    const store = fakeStore();
    expect(claimOnce(store, "/leaderboard")).toBe(true);
    expect(claimOnce(store, "/leaderboard")).toBe(false);
    expect(claimOnce(store, "/leaderboard")).toBe(false);
  });

  it("judges each key independently", () => {
    const store = fakeStore();
    expect(claimOnce(store, "/")).toBe(true);
    expect(claimOnce(store, "/leaderboard")).toBe(true);
    expect(claimOnce(store, "/")).toBe(false);
  });

  it("namespaces what it writes, so it cannot collide with other storage", () => {
    const store = fakeStore();
    claimOnce(store, "/domain");
    expect([...store.data.keys()]).toEqual(["crux:seen:/domain"]);
  });

  it("animates when the store throws on read (storage disabled)", () => {
    const store: SeenStore = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {},
    };
    expect(claimOnce(store, "/")).toBe(true);
  });

  it("animates when the store throws on write (private mode)", () => {
    const store: SeenStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    };
    expect(claimOnce(store, "/")).toBe(true);
  });
});

// The property that keeps a feed coherent: a page full of score bars asks the
// same question many times in one commit and must get one answer. Timing this
// in a browser is flaky; the contract is exact, so assert it directly.
describe("shouldAnimate batching", () => {
  const realWindow = globalThis.window;

  afterEach(() => {
    if (realWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      globalThis.window = realWindow;
    }
  });

  function installWindow() {
    const data = new Map<string, string>();
    (globalThis as { window?: unknown }).window = {
      sessionStorage: {
        getItem: (k: string) => data.get(k) ?? null,
        setItem: (k: string, v: string) => void data.set(k, v),
      },
    };
    return data;
  }

  it("gives every caller in one commit the same answer", () => {
    installWindow();
    const answers = Array.from({ length: 12 }, () => shouldAnimate("/domain"));
    expect(answers.every((a) => a === true)).toBe(true);
  });

  it("refuses once the commit has been released", async () => {
    installWindow();
    expect(shouldAnimate("/domain")).toBe(true);
    await Promise.resolve(); // drain the microtask that clears the batch
    expect(shouldAnimate("/domain")).toBe(false);
  });

  it("never animates on the server, where there is no session to record", () => {
    delete (globalThis as { window?: unknown }).window;
    expect(shouldAnimate("/domain")).toBe(false);
  });
});
