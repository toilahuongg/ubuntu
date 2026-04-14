export const DEFAULT_EXP_REWARD = 10;
export const DEFAULT_POINT_REWARD = 10;
export const DEFAULT_LATE_WINDOW_DAYS = 7;

export const TASK_TYPES = ["COUNT_TOTAL", "MONTHLY_PER_MEMBER"] as const;
export type TaskType = (typeof TASK_TYPES)[number];
export const DEFAULT_TASK_TYPE: TaskType = "MONTHLY_PER_MEMBER";
