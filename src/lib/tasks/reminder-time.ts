export const REMINDER_LEAD_MINUTES = 30;
export const REMINDER_SWEEP_WINDOW_MINUTES = 5;
export const MONTHLY_GOAL_REMINDER_WINDOW_DAYS = 5;

export function minutesFromTime(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function timeFromMinutes(total: number): string {
  const clamped = Math.max(0, Math.min(total, 23 * 60 + 59));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
}

export function resolveReminderDisplayTime(input: {
  deadlineTime: string;
  enabled: boolean;
  reminderTime: string;
}): {
  effectiveReminderTime: string | null;
  isCappedBeforeDeadline: boolean;
} {
  const deadlineMinutes = minutesFromTime(input.deadlineTime);
  const reminderMinutes = minutesFromTime(input.reminderTime);
  const cappedMinutes = Math.max(0, deadlineMinutes - REMINDER_LEAD_MINUTES);
  const isCappedBeforeDeadline =
    input.enabled && reminderMinutes >= deadlineMinutes;

  return {
    effectiveReminderTime: input.enabled
      ? timeFromMinutes(
          isCappedBeforeDeadline ? cappedMinutes : reminderMinutes,
        )
      : null,
    isCappedBeforeDeadline,
  };
}
