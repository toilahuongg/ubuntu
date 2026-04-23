import {
  getDayOfMonthFromDateKey,
  getIsoWeekdayFromDateKey,
} from "@/lib/dates";
import type { TaskType } from "@/lib/tasks/constants";

export const TASK_SCHEDULE_TYPES = [
  "EVERY_DAY",
  "WEEKLY",
  "MONTHLY",
] as const;

export type TaskScheduleType = (typeof TASK_SCHEDULE_TYPES)[number];

export const DEFAULT_TASK_SCHEDULE_TYPE: TaskScheduleType = "EVERY_DAY";

export const TASK_SCHEDULE_TYPE_LABELS: Record<TaskScheduleType, string> = {
  EVERY_DAY: "Mỗi ngày",
  MONTHLY: "Theo ngày trong tháng",
  WEEKLY: "Theo thứ trong tuần",
};

export const TASK_SCHEDULE_TYPE_DESCRIPTIONS: Record<
  TaskScheduleType,
  string
> = {
  EVERY_DAY: "Nhiệm vụ xuất hiện mỗi ngày.",
  MONTHLY: "Chỉ xuất hiện vào các ngày đã chọn trong tháng.",
  WEEKLY: "Chỉ xuất hiện vào các thứ đã chọn trong tuần.",
};

export const TASK_SCHEDULE_WEEKDAY_OPTIONS = [
  { label: "T2", longLabel: "Thứ 2", value: 1 },
  { label: "T3", longLabel: "Thứ 3", value: 2 },
  { label: "T4", longLabel: "Thứ 4", value: 3 },
  { label: "T5", longLabel: "Thứ 5", value: 4 },
  { label: "T6", longLabel: "Thứ 6", value: 5 },
  { label: "T7", longLabel: "Thứ 7", value: 6 },
  { label: "CN", longLabel: "Chủ nhật", value: 7 },
] as const;

type TaskScheduleLike = {
  scheduleType?: TaskScheduleType | null;
  scheduledMonthDays?: number[] | null;
  scheduledWeekdays?: number[] | null;
  taskType?: TaskType | null;
};

export type NormalizedTaskSchedule = {
  scheduleType: TaskScheduleType;
  scheduledMonthDays: number[];
  scheduledWeekdays: number[];
};

function uniqSorted(values: number[], min: number, max: number) {
  return Array.from(
    new Set(
      values.filter(
        (value) =>
          Number.isInteger(value) && Number.isFinite(value) && value >= min && value <= max,
      ),
    ),
  ).sort((a, b) => a - b);
}

export function normalizeTaskSchedule(
  input: TaskScheduleLike,
): NormalizedTaskSchedule {
  if (input.taskType !== "DAILY_PER_MEMBER") {
    return {
      scheduleType: DEFAULT_TASK_SCHEDULE_TYPE,
      scheduledMonthDays: [],
      scheduledWeekdays: [],
    };
  }

  const scheduleType = input.scheduleType ?? DEFAULT_TASK_SCHEDULE_TYPE;
  const scheduledWeekdays = uniqSorted(input.scheduledWeekdays ?? [], 1, 7);
  const scheduledMonthDays = uniqSorted(input.scheduledMonthDays ?? [], 1, 31);

  if (scheduleType === "WEEKLY" && scheduledWeekdays.length === 0) {
    return {
      scheduleType: DEFAULT_TASK_SCHEDULE_TYPE,
      scheduledMonthDays: [],
      scheduledWeekdays: [],
    };
  }

  if (scheduleType === "MONTHLY" && scheduledMonthDays.length === 0) {
    return {
      scheduleType: DEFAULT_TASK_SCHEDULE_TYPE,
      scheduledMonthDays: [],
      scheduledWeekdays: [],
    };
  }

  return {
    scheduleType,
    scheduledMonthDays:
      scheduleType === "MONTHLY" ? scheduledMonthDays : [],
    scheduledWeekdays: scheduleType === "WEEKLY" ? scheduledWeekdays : [],
  };
}

export function isTaskScheduledForDate(
  task: TaskScheduleLike,
  dateKey: string,
) {
  const schedule = normalizeTaskSchedule(task);

  if (schedule.scheduleType === "EVERY_DAY") return true;
  if (schedule.scheduleType === "WEEKLY") {
    return schedule.scheduledWeekdays.includes(getIsoWeekdayFromDateKey(dateKey));
  }
  return schedule.scheduledMonthDays.includes(getDayOfMonthFromDateKey(dateKey));
}

export function formatTaskScheduleLabel(task: TaskScheduleLike) {
  const schedule = normalizeTaskSchedule(task);

  if (schedule.scheduleType === "EVERY_DAY") {
    return TASK_SCHEDULE_TYPE_LABELS.EVERY_DAY;
  }

  if (schedule.scheduleType === "WEEKLY") {
    const labels = TASK_SCHEDULE_WEEKDAY_OPTIONS.filter((option) =>
      schedule.scheduledWeekdays.includes(option.value),
    ).map((option) => option.label);
    return labels.length > 0
      ? `Thứ: ${labels.join(", ")}`
      : TASK_SCHEDULE_TYPE_LABELS.EVERY_DAY;
  }

  return schedule.scheduledMonthDays.length > 0
    ? `Ngày: ${schedule.scheduledMonthDays.join(", ")}`
    : TASK_SCHEDULE_TYPE_LABELS.EVERY_DAY;
}
