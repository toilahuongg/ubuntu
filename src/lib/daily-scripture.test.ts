import { describe, expect, it } from "vitest";

import { getDailyScripture } from "@/lib/daily-scripture";

describe("getDailyScripture", () => {
  it("starts the approved cycle on April 24, 2026", () => {
    expect(getDailyScripture("2026-04-24")).toMatchObject({
      dayNumber: 1,
      reference: "Công-vụ 20:24",
    });
  });

  it("advances one verse per day and wraps after seven days", () => {
    expect(getDailyScripture("2026-04-27")).toMatchObject({
      dayNumber: 4,
      reference: "Hê-bơ-rơ 12:1",
    });

    expect(getDailyScripture("2026-05-01")).toMatchObject({
      dayNumber: 1,
      reference: "Công-vụ 20:24",
    });
  });
});
