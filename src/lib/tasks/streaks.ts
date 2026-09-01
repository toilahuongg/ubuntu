import type { TaskScheduleType } from "@/lib/tasks/schedule";
import { isTaskScheduledForDate } from "@/lib/tasks/schedule";
import type { TaskType } from "@/lib/tasks/constants";

export const TASK_STREAK_MILESTONES = [7, 14, 21, 28] as const;
export const TASK_STREAK_BONUS_MULTIPLIERS = {
  7: 0.5,
  14: 1,
  21: 1.5,
  28: 2,
} as const satisfies Record<TaskStreakMilestone, number>;

export type TaskStreakMilestone = (typeof TASK_STREAK_MILESTONES)[number];

export type TaskStreakSchedule = {
  scheduleType?: TaskScheduleType | null;
  scheduledMonthDays?: number[] | null;
  scheduledWeekdays?: number[] | null;
  taskType?: TaskType | null;
};

export type TaskStreakBonusResult = {
  awarded: boolean;
  bonusExp: number;
  bonusPoints: number;
  milestone: TaskStreakMilestone | null;
  streakLength: number;
};

export type CalculateTaskStreakBonusInput = {
  completedDateKeys: readonly string[];
  dateKey: string;
  expReward: number;
  pointReward: number;
  task: TaskStreakSchedule;
};

export const EMPTY_TASK_STREAK_BONUS: TaskStreakBonusResult = {
  awarded: false,
  bonusExp: 0,
  bonusPoints: 0,
  milestone: null,
  streakLength: 0,
};

export function buildTaskStreakBonusLegacyDescription({
  milestone,
  taskTitle,
}: {
  milestone: TaskStreakMilestone;
  taskTitle: string;
}) {
  return `Thưởng chuỗi ${milestone} ngày: ${taskTitle}`;
}

export function buildTaskStreakBonusDescription({
  milestone,
  periodKey,
  taskTitle,
}: {
  milestone: TaskStreakMilestone;
  periodKey: string;
  taskTitle: string;
}) {
  return `Thưởng chuỗi ${milestone} ngày (${periodKey}): ${taskTitle}`;
}

export function getTaskStreakBonusPeriodRange(periodKey: string) {
  const year = Number(periodKey.slice(0, 4));
  const month = Number(periodKey.slice(5, 7));
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { end, start };
}

function isDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function previousDateKey(dateKey: string) {
  const date = new Date(
    Date.UTC(
      Number(dateKey.slice(0, 4)),
      Number(dateKey.slice(5, 7)) - 1,
      Number(dateKey.slice(8, 10)) - 1,
    ),
  );
  return date.toISOString().slice(0, 10);
}

function toMilestone(streakLength: number): TaskStreakMilestone | null {
  return TASK_STREAK_MILESTONES.includes(
    streakLength as TaskStreakMilestone,
  )
    ? (streakLength as TaskStreakMilestone)
    : null;
}

export function calculateTaskStreakBonus(
  input: CalculateTaskStreakBonusInput,
): TaskStreakBonusResult {
  if (input.task.taskType !== "DAILY_PER_MEMBER" || !isDateKey(input.dateKey)) {
    return EMPTY_TASK_STREAK_BONUS;
  }

  const yearMonth = input.dateKey.slice(0, 7);
  const completedDates = new Set(
    input.completedDateKeys.filter(
      (dateKey) => isDateKey(dateKey) && dateKey.slice(0, 7) === yearMonth,
    ),
  );

  if (!completedDates.has(input.dateKey)) {
    return EMPTY_TASK_STREAK_BONUS;
  }

  let cursor = input.dateKey;
  let streakLength = 0;

  while (cursor.slice(0, 7) === yearMonth) {
    if (isTaskScheduledForDate(input.task, cursor)) {
      if (!completedDates.has(cursor)) break;
      streakLength += 1;
    }
    cursor = previousDateKey(cursor);
  }

  const milestone = toMilestone(streakLength);
  const multiplier = milestone
    ? TASK_STREAK_BONUS_MULTIPLIERS[milestone]
    : 0;
  const bonusExp = milestone
    ? Math.floor(Math.max(0, input.expReward) * multiplier)
    : 0;
  const bonusPoints = milestone
    ? Math.floor(Math.max(0, input.pointReward) * multiplier)
    : 0;

  return {
    awarded: Boolean(milestone && (bonusExp > 0 || bonusPoints > 0)),
    bonusExp,
    bonusPoints,
    milestone,
    streakLength,
  };
}
