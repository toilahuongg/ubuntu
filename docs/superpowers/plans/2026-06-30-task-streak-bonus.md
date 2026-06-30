# Task Streak Bonus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add calendar-month task streak bonuses at 7, 14, 21, and 28 eligible scheduled completions with escalating milestone multipliers.

**Architecture:** Put schedule-aware streak math in a pure helper, call it from `saveSubmission` only after a positive task completion award, and return a typed `streakBonus` payload to client submit components. Keep popup UI small and local to existing client components.

**Tech Stack:** Next.js App Router, React client components, Mongoose, Vitest, TypeScript.

---

### Task 1: Streak Helper

**Files:**
- Create: `src/lib/tasks/streaks.ts`
- Create: `src/lib/tasks/streaks.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";

import { calculateTaskStreakBonus } from "@/lib/tasks/streaks";

describe("calculateTaskStreakBonus", () => {
  it("awards a 7-day milestone for everyday scheduled tasks", () => {
    const result = calculateTaskStreakBonus({
      completedDateKeys: [
        "2026-06-01",
        "2026-06-02",
        "2026-06-03",
        "2026-06-04",
        "2026-06-05",
        "2026-06-06",
        "2026-06-07",
      ],
      dateKey: "2026-06-07",
      expReward: 10,
      pointReward: 10,
      task: { taskType: "DAILY_PER_MEMBER" },
    });

    expect(result).toEqual({
      awarded: true,
      bonusExp: 20,
      bonusPoints: 20,
      milestone: 7,
      streakLength: 7,
    });
  });

  it("skips unscheduled weekend days for weekday tasks", () => {
    const result = calculateTaskStreakBonus({
      completedDateKeys: [
        "2026-06-01",
        "2026-06-02",
        "2026-06-03",
        "2026-06-04",
        "2026-06-05",
        "2026-06-08",
        "2026-06-09",
      ],
      dateKey: "2026-06-09",
      expReward: 10,
      pointReward: 10,
      task: {
        taskType: "DAILY_PER_MEMBER",
        scheduleType: "WEEKLY",
        scheduledWeekdays: [1, 2, 3, 4, 5],
      },
    });

    expect(result.streakLength).toBe(7);
    expect(result.milestone).toBe(7);
    expect(result.awarded).toBe(true);
  });

  it("resets at calendar month boundaries", () => {
    const result = calculateTaskStreakBonus({
      completedDateKeys: [
        "2026-05-30",
        "2026-05-31",
        "2026-06-01",
      ],
      dateKey: "2026-06-01",
      expReward: 10,
      pointReward: 10,
      task: { taskType: "DAILY_PER_MEMBER" },
    });

    expect(result).toMatchObject({
      awarded: false,
      milestone: null,
      streakLength: 1,
    });
  });

  it("does not award non-milestone streak lengths", () => {
    const result = calculateTaskStreakBonus({
      completedDateKeys: [
        "2026-06-01",
        "2026-06-02",
        "2026-06-03",
      ],
      dateKey: "2026-06-03",
      expReward: 10,
      pointReward: 10,
      task: { taskType: "DAILY_PER_MEMBER" },
    });

    expect(result).toEqual({
      awarded: false,
      bonusExp: 0,
      bonusPoints: 0,
      milestone: null,
      streakLength: 3,
    });
  });
});
```

- [ ] **Step 2: Verify red**

Run: `npm test -- src/lib/tasks/streaks.test.ts`

Expected: FAIL because `src/lib/tasks/streaks.ts` does not exist.

- [ ] **Step 3: Implement helper**

Create `src/lib/tasks/streaks.ts` with `calculateTaskStreakBonus`, local date-key navigation helpers, and exported result/input types. Use `isTaskScheduledForDate` to decide eligible dates while walking backward within `dateKey.slice(0, 7)`.

Milestone multipliers:
- 7 days: `2`
- 14 days: `3`
- 21 days: `4`
- 28 days: `5`

- [ ] **Step 4: Verify green**

Run: `npm test -- src/lib/tasks/streaks.test.ts`

Expected: PASS.

### Task 2: Transaction Sources

**Files:**
- Modify: `src/lib/models/xp-transaction.ts`
- Modify: `src/lib/models/point-transaction.ts`
- Modify: `src/lib/models/transaction-source.test.ts`

- [ ] **Step 1: Write failing enum tests**

Add tests that validate `task_streak_bonus` and `task_streak_bonus_reward` transactions.

- [ ] **Step 2: Verify red**

Run: `npm test -- src/lib/models/transaction-source.test.ts`

Expected: FAIL because the new source values are not accepted by the schemas.

- [ ] **Step 3: Add source enum values**

Add `"task_streak_bonus"` to `XP_SOURCES` and `"task_streak_bonus_reward"` to `POINT_SOURCES`.

- [ ] **Step 4: Verify green**

Run: `npm test -- src/lib/models/transaction-source.test.ts`

Expected: PASS.

### Task 3: Save Submission Bonus Award

**Files:**
- Modify: `src/lib/tasks/submission-service.ts`

- [ ] **Step 1: Extend result type**

Add a `streakBonus` field to `SaveSubmissionResult` with `awarded`, `streakLength`, `milestone`, `bonusExp`, and `bonusPoints`.

- [ ] **Step 2: Integrate helper**

After positive `countAwarded`, query month submissions for the subject/task, calculate the streak, create bonus transactions when `awarded`, increment `totalXp` and `pointBalance`, and include bonus XP in level calculation.

- [ ] **Step 3: Verify focused tests**

Run: `npm test -- src/lib/tasks/streaks.test.ts src/lib/models/transaction-source.test.ts`

Expected: PASS.

### Task 4: Popup UI

**Files:**
- Modify: `src/lib/tasks/client-submit.ts`
- Create: `src/app/(app)/tasks/streak-bonus-popup.tsx`
- Modify: `src/app/(app)/dashboard/task-tick-button.tsx`
- Modify: `src/app/(app)/tasks/[taskId]/submit-section.tsx`
- Modify: `src/app/(app)/tasks/[taskId]/proxy/proxy-submit-section.tsx`

- [ ] **Step 1: Type API response**

Export a `StreakBonusResult` client type matching `SaveSubmissionResult["streakBonus"]`, and make `SubmitTaskClientResult` carry typed data.

- [ ] **Step 2: Add popup component**

Create a small client component with `role="dialog"`, a simple overlay, clear milestone/reward text, and a close button.

- [ ] **Step 3: Wire submit surfaces**

When `result.status === "success"` and `result.data?.streakBonus.awarded`, set popup state before refreshing the router.

- [ ] **Step 4: Run checks**

Run: `npm test -- src/lib/tasks/streaks.test.ts src/lib/models/transaction-source.test.ts`

Expected: PASS.

### Task 5: Final Verification

**Files:**
- All changed files

- [ ] **Step 1: Type and lint check**

Run: `npm run lint`

Expected: PASS or only pre-existing unrelated warnings.

- [ ] **Step 2: Full tests**

Run: `npm test`

Expected: PASS or document unrelated failures clearly.
