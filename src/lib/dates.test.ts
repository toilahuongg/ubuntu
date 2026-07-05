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
});
