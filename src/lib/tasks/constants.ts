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
