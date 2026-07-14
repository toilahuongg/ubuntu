export const DEFAULT_EXP_REWARD = 10;
export const DEFAULT_POINT_REWARD = 10;
export const DEFAULT_LATE_WINDOW_DAYS = 7;

export const TASK_TYPES = [
  "COUNT_TOTAL",
  "MONTHLY_PER_MEMBER",
  "WEEKLY_PER_MEMBER",
  "DAILY_PER_MEMBER",
] as const;
export type TaskType = (typeof TASK_TYPES)[number];
export const DEFAULT_TASK_TYPE: TaskType = "MONTHLY_PER_MEMBER";

export const MONTHLY_GOAL_TASK_TYPES = [
  "MONTHLY_PER_MEMBER",
  "WEEKLY_PER_MEMBER",
  "DAILY_PER_MEMBER",
] as const satisfies readonly TaskType[];

const monthlyGoalTaskTypeSet = new Set<TaskType>(MONTHLY_GOAL_TASK_TYPES);

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  COUNT_TOTAL: "Theo số lần",
  DAILY_PER_MEMBER: "Theo ngày",
  WEEKLY_PER_MEMBER: "Theo tuần",
  MONTHLY_PER_MEMBER: "Theo tháng",
};

export function normalizeTaskType(taskType?: TaskType | null): TaskType {
  return taskType ?? DEFAULT_TASK_TYPE;
}

export function supportsMonthlyGoal(taskType?: TaskType | null): boolean {
  return monthlyGoalTaskTypeSet.has(normalizeTaskType(taskType));
}

export function isDailyTaskType(taskType?: TaskType | null): boolean {
  return normalizeTaskType(taskType) === "DAILY_PER_MEMBER";
}

export function isWeeklyTaskType(taskType?: TaskType | null): boolean {
  return normalizeTaskType(taskType) === "WEEKLY_PER_MEMBER";
}

export function getMonthlyGoalLimitForTaskType(
  taskType?: TaskType | null,
): number | null {
  return normalizeTaskType(taskType) === "MONTHLY_PER_MEMBER" ? 1 : null;
}

export function getTaskProgressUnitLabel(
  taskType?: TaskType | null,
): "ngày" | "lần" | "lượt" {
  const normalized = normalizeTaskType(taskType);
  if (normalized === "DAILY_PER_MEMBER") return "ngày";
  if (normalized === "MONTHLY_PER_MEMBER") return "lần";
  return "lượt";
}

export function getTaskHeaderCompletionLabel(
  taskType: TaskType | null | undefined,
  count: number,
): string {
  return normalizeTaskType(taskType) === "MONTHLY_PER_MEMBER"
    ? `${count} lần tháng này`
    : `${count} lượt hôm nay`;
}

export function getTaskSubmitCopy(taskType?: TaskType | null): {
  actionLabel: string;
  completedLabel: string;
  countLabel: (count: number) => string;
  heading: string;
  pendingLabel: string;
  successLabel: string;
} {
  const normalized = normalizeTaskType(taskType);
  if (normalized === "DAILY_PER_MEMBER") {
    return {
      actionLabel: "Nộp nhanh hôm nay",
      completedLabel: "Đã nộp hôm nay",
      countLabel: () => "Đã nộp hôm nay",
      heading: "Hoàn thành hôm nay",
      pendingLabel: "Chưa nộp hôm nay",
      successLabel: "Đã nộp hoàn thành hôm nay.",
    };
  }
  if (normalized === "MONTHLY_PER_MEMBER") {
    return {
      actionLabel: "Hoàn thành tháng này",
      completedLabel: "Đã hoàn thành tháng này",
      countLabel: () => "Đã hoàn thành tháng này",
      heading: "Hoàn thành tháng này",
      pendingLabel: "Chưa hoàn thành tháng này",
      successLabel: "Đã hoàn thành tháng này.",
    };
  }
  return {
    actionLabel: "Nộp nhanh hôm nay",
    completedLabel: "Đã nộp hôm nay",
    countLabel: (count) => `Đã nộp ${count} lần`,
    heading: "Số lần hoàn thành hôm nay",
    pendingLabel: "Chưa nộp hôm nay",
    successLabel: "Đã nộp hoàn thành hôm nay.",
  };
}
