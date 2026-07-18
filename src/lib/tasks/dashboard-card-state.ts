import type { TaskCard } from "@/lib/tasks/types";

export function isDashboardCardDone(card: TaskCard) {
  if (card.taskType === "MONTHLY_PER_MEMBER") {
    return card.progress.isGoalComplete || card.myCompletionCount > 0;
  }
  if (card.taskType === "WEEKLY_PER_MEMBER") {
    return card.progress.isGoalComplete;
  }
  if (card.taskType === "COUNT_TOTAL") {
    return card.progress.target !== null
      ? card.progress.isGoalComplete
      : card.myCompletionCount > 0;
  }
  return card.myCompletionCount > 0;
}

export function countDashboardDoneCards(cards: TaskCard[]) {
  return cards.filter(isDashboardCardDone).length;
}
