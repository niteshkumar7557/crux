import { describe, it, expect } from "vitest";
import { isArenaClosed } from "./arenaClock";

const NOW = Date.parse("2026-07-31T12:00:00.000Z");
const inHours = (h: number) => new Date(NOW + h * 3_600_000).toISOString();

describe("isArenaClosed", () => {
  it("is open while the clock still runs", () => {
    expect(
      isArenaClosed({ status: "live", closesAt: inHours(4), now: NOW }),
    ).toBe(false);
  });

  it("closes the moment the clock reaches zero", () => {
    expect(
      isArenaClosed({ status: "live", closesAt: inHours(0), now: NOW }),
    ).toBe(true);
  });

  it("stays closed after zero, however long after", () => {
    expect(
      isArenaClosed({ status: "live", closesAt: inHours(-9), now: NOW }),
    ).toBe(true);
  });

  it("closes on the server's word even while the clock says otherwise", () => {
    expect(
      isArenaClosed({ status: "concluded", closesAt: inHours(4), now: NOW }),
    ).toBe(true);
  });

  it("stays open when there is no deadline to read", () => {
    expect(isArenaClosed({ status: "live", closesAt: null, now: NOW })).toBe(
      false,
    );
  });

  it("stays open on an unparseable deadline rather than locking a live debate", () => {
    expect(
      isArenaClosed({ status: "live", closesAt: "not a date", now: NOW }),
    ).toBe(false);
  });
});
