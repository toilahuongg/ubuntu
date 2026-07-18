import type { TaskType } from "@/lib/tasks/constants";
import type { TaskStatus } from "@/lib/tasks/types";

type DashboardTickInput = {
  isGoalComplete: boolean;
  isPending?: boolean;
  maxPerWeek?: number | null;
  optimisticCount: number;
  status: TaskStatus;
  taskType?: TaskType;
  weeklyCompletion?: number;
};

export function resolveDashboardTickState(input: DashboardTickInput) {
  const isPending = input.isPending ?? false;
  const isDone = input.optimisticCount > 0;
  const isCountTotal = input.taskType === "COUNT_TOTAL";
  const isWeeklyTask = input.taskType === "WEEKLY_PER_MEMBER";
  const isLocked = input.status === "LOCKED";
  const isTaskCompleted = input.status === "COMPLETED";
  const isCompletedMonthlyTask =
    input.taskType === "MONTHLY_PER_MEMBER" && isDone;
  const canRemoveWeeklyTick = isWeeklyTask && isDone;
  const weeklyLimitReached =
    isWeeklyTask &&
    input.maxPerWeek != null &&
    (input.weeklyCompletion ?? 0) >= input.maxPerWeek;

  const nextCount = isCountTotal
    ? input.optimisticCount + 1
    : isWeeklyTask
      ? isDone
        ? 0
        : 1
      : isDone
        ? 0
        : Math.max(1, input.optimisticCount);

  return {
    disabled:
      isPending ||
      isLocked ||
      isCompletedMonthlyTask ||
      (input.isGoalComplete && !canRemoveWeeklyTick) ||
      (weeklyLimitReached && !canRemoveWeeklyTick) ||
      (isTaskCompleted && !isDone),
    isCountTotal,
    isDone,
    isLocked,
    isTaskCompleted,
    isWeeklyTask,
    nextCount,
    shouldRenderButton: !(input.isGoalComplete && !canRemoveWeeklyTick),
    shouldRenderChecked: isDone && !isCountTotal,
    submitCount: isCountTotal ? 1 : isWeeklyTask ? nextCount : isDone ? 0 : undefined,
    submitMode: isCountTotal ? "increment" as const : isWeeklyTask ? "set" as const : isDone ? "set" as const : undefined,
    weeklyLimitReached,
  };
}
