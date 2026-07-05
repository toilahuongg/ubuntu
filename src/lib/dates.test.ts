import { describe, it, expect } from "vitest";
import { getWeekRangeFromDateKey } from "./dates";

describe("getWeekRangeFromDateKey", () => {
  it("should calculate correct start and end dates relative to startDayOfWeek", () => {
    // 2026-07-05 is a Sunday (weekday = 7)
    // If week starts on Wednesday (3), the week starts on Wednesday 2026-07-01 and ends Tuesday 2026-07-07
    const range1 = getWeekRangeFromDateKey("2026-07-05", 3);
    expect(range1.startStr).toBe("2026-07-01");
    expect(range1.endStr).toBe("2026-07-07");

    // If week starts on Monday (1), the week starts on Monday 2026-06-29 and ends Sunday 2026-07-05
    const range2 = getWeekRangeFromDateKey("2026-07-05", 1);
    expect(range2.startStr).toBe("2026-06-29");
    expect(range2.endStr).toBe("2026-07-05");
  });

  describe("DST and Timezone Edge Cases", () => {
    const originalEnv = process.env.APP_TIMEZONE;

    it("should calculate correct range during DST start transition in America/New_York (March 2026)", () => {
      process.env.APP_TIMEZONE = "America/New_York";
      // March 8, 2026 is DST start Sunday. Week starts Monday (1)
      const range = getWeekRangeFromDateKey("2026-03-08", 1);
      expect(range.startStr).toBe("2026-03-02");
      expect(range.endStr).toBe("2026-03-08");

      // Week starts Sunday (7)
      const rangeSun = getWeekRangeFromDateKey("2026-03-08", 7);
      expect(rangeSun.startStr).toBe("2026-03-08");
      expect(rangeSun.endStr).toBe("2026-03-14");

      // Reset
      if (originalEnv === undefined) {
        delete process.env.APP_TIMEZONE;
      } else {
        process.env.APP_TIMEZONE = originalEnv;
      }
    });

    it("should calculate correct range during DST end transition in America/New_York (November 2026)", () => {
      process.env.APP_TIMEZONE = "America/New_York";
      // November 1, 2026 is DST end Sunday. Week starts Monday (1)
      const range = getWeekRangeFromDateKey("2026-11-01", 1);
      expect(range.startStr).toBe("2026-10-26");
      expect(range.endStr).toBe("2026-11-01");

      // Week starts Sunday (7)
      const rangeSun = getWeekRangeFromDateKey("2026-11-01", 7);
      expect(rangeSun.startStr).toBe("2026-11-01");
      expect(rangeSun.endStr).toBe("2026-11-07");

      // Reset
      if (originalEnv === undefined) {
        delete process.env.APP_TIMEZONE;
      } else {
        process.env.APP_TIMEZONE = originalEnv;
      }
    });

    it("should verify correct TypeScript return type signature", () => {
      const result: { startStr: string; endStr: string } = getWeekRangeFromDateKey("2026-07-05", 1);
      expect(typeof result.startStr).toBe("string");
      expect(typeof result.endStr).toBe("string");
    });
  });
});
