import { describe, expect, it } from "vitest";

import { resolveReminderDisplayTime } from "@/lib/tasks/reminder-time";

describe("reminder time display", () => {
  it("recomputes the capped preview from the current form time", () => {
    expect(
      resolveReminderDisplayTime({
        deadlineTime: "21:00",
        enabled: true,
        reminderTime: "22:30",
      }),
    ).toEqual({
      effectiveReminderTime: "20:30",
      isCappedBeforeDeadline: true,
    });
  });
});
