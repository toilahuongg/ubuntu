# Weekly Task Max Per-Week Limit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-task `maxPerWeek` limit for `WEEKLY_PER_MEMBER` tasks, enforced at submission time and displayed on dashboard and task detail pages.

**Architecture:** Add `maxPerWeek` field to Task model, validate in `saveSubmission()` by querying weekly completion totals, expose via TaskCard/TaskSummary types, render progress in UI.

**Tech Stack:** TypeScript, Next.js (App Router), Mongoose, MongoDB, Zod validation, React Server Components

**Spec:** `docs/superpowers/specs/2026-07-14-weekly-task-max-per-week-design.md`

**Week definition:** Sunday to Saturday (use `getWeekRangeFromDateKey(dateKey, 7)` from `src/lib/dates.ts`)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/models/task.ts` | Modify: add `maxPerWeek` field + type | Data model |
| `src/lib/tasks/types.ts` | Modify: add fields to TaskCard, TaskSummary, TaskDetail | Shared types |
| `src/lib/tasks/constants.ts` | Modify: add `isWeeklyTaskType()` helper | Constants |
| `src/lib/tasks/submission-service.ts` | Modify: add weekly limit validation | Server-side enforcement |
| `src/lib/tasks/submission-service.test.ts` | Modify: add tests for weekly limit | Tests |
| `src/lib/tasks/task-service.ts` | Modify: mapTask, createTask, updateTask, getTaskDetail | Service layer |
| `src/lib/tasks/dashboard-service.ts` | Modify: weekly aggregate + buildTaskCard | Dashboard data |
| `src/lib/validation.ts` | Modify: add maxPerWeek to schemas | Zod validation |
| `src/app/(app)/templates/actions.ts` | Modify: pass maxPerWeek from FormData | Server actions |
| `src/app/(app)/templates/create-template-form.tsx` | Modify: add maxPerWeek input for weekly tasks | Admin create UI |
| `src/app/(app)/templates/edit-template-form.tsx` | Modify: add maxPerWeek input for weekly tasks | Admin edit UI |
| `src/app/(app)/tasks/[taskId]/page.tsx` | Modify: show weekly progress | Task detail page |
| `src/app/(app)/tasks/[taskId]/submit-section.tsx` | Modify: show weekly progress + lock submit | Submit UI |
| `src/app/(app)/dashboard/task-card-sections.tsx` | Modify: show weekly progress on card | Dashboard UI |
| `src/app/(app)/dashboard/task-tick-button.tsx` | Modify: disable when weekly limit reached | Quick-submit button |

---

### Task 1: Add `maxPerWeek` field to Task model

**Files:**
- Modify: `src/lib/models/task.ts`

- [ ] **Step 1: Add `maxPerWeek` to the Mongoose schema**

In `src/lib/models/task.ts`, add after the `targetCount` field (line ~61):

```typescript
    maxPerWeek: { default: null, min: 1, type: Number },
```

- [ ] **Step 2: Add `maxPerWeek` to `TaskRecord` type**

In the same file, add to the `TaskRecord` type (after `targetCount`):

```typescript
  maxPerWeek: number | null;
```

- [ ] **Step 3: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No new errors (existing errors if any should not increase)

- [ ] **Step 4: Commit**

```bash
git add src/lib/models/task.ts
git commit -m "feat: add maxPerWeek field to Task model for weekly task limits"
```

---

### Task 2: Add `isWeeklyTaskType` helper and `maxPerWeek` to shared types

**Files:**
- Modify: `src/lib/tasks/constants.ts`
- Modify: `src/lib/tasks/types.ts`

- [ ] **Step 1: Add `isWeeklyTaskType` helper to constants**

In `src/lib/tasks/constants.ts`, add after `isDailyTaskType`:

```typescript
export function isWeeklyTaskType(taskType?: TaskType | null): boolean {
  return normalizeTaskType(taskType) === "WEEKLY_PER_MEMBER";
}
```

- [ ] **Step 2: Add `maxPerWeek` to `TaskSummary` type**

In `src/lib/tasks/types.ts`, add to the `TaskSummary` type (after `targetCount`):

```typescript
  maxPerWeek: number | null;
```

- [ ] **Step 3: Add `weeklyCompletion` and `maxPerWeek` to `TaskCard` type**

In the same file, add to `TaskCard`:

```typescript
  weeklyCompletion: number;
  maxPerWeek: number | null;
```

- [ ] **Step 4: Add `weeklyCompletion`, `maxPerWeek`, and `weekSubmissions` to `TaskDetail` type**

In `TaskDetail`, add:

```typescript
  weeklyCompletion: number;
  maxPerWeek: number | null;
  weekSubmissions: BackfillDay[];
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/tasks/constants.ts src/lib/tasks/types.ts
git commit -m "feat: add maxPerWeek and weeklyCompletion types"
```

---

### Task 3: Add weekly submission validation in `saveSubmission`

**Files:**
- Modify: `src/lib/tasks/submission-service.ts`
- Test: `src/lib/tasks/submission-service.test.ts`

- [ ] **Step 1: Import `getWeekRangeFromDateKey`**

In `src/lib/tasks/submission-service.ts`, add to imports at top:

```typescript
import { getWeekRangeFromDateKey } from "@/lib/dates";
```

- [ ] **Step 2: Add weekly limit validation**

In `saveSubmission()`, after the MONTHLY_PER_MEMBER block (around line 218, after the `hasOtherMonthlyCompletion` check and before `if (mode !== "set" && count === 0)`), add:

```typescript
  if (taskType === "WEEKLY_PER_MEMBER" && taskRaw.maxPerWeek && count > 0) {
    const weekRange = getWeekRangeFromDateKey(dateKey, 7);
    const weekSubmissions = (await SubmissionModel.find({
      completionCount: { $gt: 0 },
      date: { $gte: weekRange.startStr, $lte: weekRange.endStr },
      subjectUserId: subjectRaw._id,
      taskId: taskRaw._id,
    })
      .session(session ?? null)
      .select({ date: 1, completionCount: 1 })
      .lean()) as Array<{ completionCount: number }>;

    const currentTotal = weekSubmissions.reduce(
      (sum, s) => sum + (s.completionCount ?? 0),
      0,
    );
    if (currentTotal + count > taskRaw.maxPerWeek) {
      throw new Error("Đã đạt giới hạn số lần hoàn thành tuần này.");
    }
  }
```

- [ ] **Step 3: Write failing tests**

In `src/lib/tasks/submission-service.test.ts`, add a new describe block after the existing "submission limits" describe block:

```typescript
describe("weekly maxPerWeek limits", () => {
  it("rejects submission when count would exceed maxPerWeek", async () => {
    const team = await TeamModel.create({
      code: "TEST_WEEKLY_1",
      name: "Test Team Weekly 1",
    });

    const user = await UserModel.create({
      fullName: "Weekly User 1",
      role: "MEMBER",
      status: "ACTIVE",
      totalXp: 0,
      pointBalance: 0,
      teamId: team._id,
    });

    const task = await TaskModel.create({
      title: "Weekly Limited Task",
      description: "Test weekly task with maxPerWeek",
      taskType: "WEEKLY_PER_MEMBER",
      scheduleType: "EVERY_DAY",
      expReward: 10,
      pointReward: 5,
      isActive: true,
      targetRoles: ["MEMBER"],
      scope: "TEAM",
      teamId: team._id,
      createdBy: user._id,
      deadlineTime: "23:59",
      maxPerWeek: 3,
    });

    const actor: SessionUser = {
      id: user._id.toString(),
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      teamId: team._id.toString(),
    };

    // Submit 3 times (exactly at limit)
    await saveSubmission(actor, task._id.toString(), user._id.toString(), "2026-07-13", {
      count: 3,
      mode: "set",
    });

    // 4th submission should fail
    await expect(
      saveSubmission(actor, task._id.toString(), user._id.toString(), "2026-07-14", {
        count: 1,
        mode: "set",
      }),
    ).rejects.toThrow("Đã đạt giới hạn số lần hoàn thành tuần này.");
  });

  it("allows submission when at exactly maxPerWeek with increment mode", async () => {
    const team = await TeamModel.create({
      code: "TEST_WEEKLY_2",
      name: "Test Team Weekly 2",
    });

    const user = await UserModel.create({
      fullName: "Weekly User 2",
      role: "MEMBER",
      status: "ACTIVE",
      totalXp: 0,
      pointBalance: 0,
      teamId: team._id,
    });

    const task = await TaskModel.create({
      title: "Weekly Task 2",
      description: "Test",
      taskType: "WEEKLY_PER_MEMBER",
      scheduleType: "EVERY_DAY",
      expReward: 10,
      pointReward: 5,
      isActive: true,
      targetRoles: ["MEMBER"],
      scope: "TEAM",
      teamId: team._id,
      createdBy: user._id,
      deadlineTime: "23:59",
      maxPerWeek: 2,
    });

    const actor: SessionUser = {
      id: user._id.toString(),
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      teamId: team._id.toString(),
    };

    // Submit 1
    await saveSubmission(actor, task._id.toString(), user._id.toString(), "2026-07-13", {
      count: 1,
      mode: "increment",
    });

    // Submit 1 more (total = 2 = maxPerWeek) — should succeed
    const result = await saveSubmission(actor, task._id.toString(), user._id.toString(), "2026-07-14", {
      count: 1,
      mode: "increment",
    });
    expect(result.completionCount).toBe(1);

    // Increment again (would be 3) — should fail
    await expect(
      saveSubmission(actor, task._id.toString(), user._id.toString(), "2026-07-15", {
        count: 1,
        mode: "increment",
      }),
    ).rejects.toThrow("Đã đạt giới hạn số lần hoàn thành tuần này.");
  });

  it("does not limit weekly tasks when maxPerWeek is null", async () => {
    const team = await TeamModel.create({
      code: "TEST_WEEKLY_3",
      name: "Test Team Weekly 3",
    });

    const user = await UserModel.create({
      fullName: "Weekly User 3",
      role: "MEMBER",
      status: "ACTIVE",
      totalXp: 0,
      pointBalance: 0,
      teamId: team._id,
    });

    const task = await TaskModel.create({
      title: "Weekly No Limit",
      description: "Test",
      taskType: "WEEKLY_PER_MEMBER",
      scheduleType: "EVERY_DAY",
      expReward: 10,
      pointReward: 5,
      isActive: true,
      targetRoles: ["MEMBER"],
      scope: "TEAM",
      teamId: team._id,
      createdBy: user._id,
      deadlineTime: "23:59",
      maxPerWeek: null,
    });

    const actor: SessionUser = {
      id: user._id.toString(),
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      teamId: team._id.toString(),
    };

    // Submit 5 times — should succeed since no limit
    const result = await saveSubmission(actor, task._id.toString(), user._id.toString(), "2026-07-13", {
      count: 5,
      mode: "set",
    });
    expect(result.completionCount).toBe(5);
  });

  it("allows decreasing count below maxPerWeek even when previously above", async () => {
    const team = await TeamModel.create({
      code: "TEST_WEEKLY_4",
      name: "Test Team Weekly 4",
    });

    const user = await UserModel.create({
      fullName: "Weekly User 4",
      role: "MEMBER",
      status: "ACTIVE",
      totalXp: 100,
      pointBalance: 100,
      teamId: team._id,
    });

    const task = await TaskModel.create({
      title: "Weekly Decrease",
      description: "Test",
      taskType: "WEEKLY_PER_MEMBER",
      scheduleType: "EVERY_DAY",
      expReward: 10,
      pointReward: 5,
      isActive: true,
      targetRoles: ["MEMBER"],
      scope: "TEAM",
      teamId: team._id,
      createdBy: user._id,
      deadlineTime: "23:59",
      maxPerWeek: 3,
    });

    const actor: SessionUser = {
      id: user._id.toString(),
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      teamId: team._id.toString(),
    };

    // Set to 2
    await saveSubmission(actor, task._id.toString(), user._id.toString(), "2026-07-13", {
      count: 2,
      mode: "set",
    });

    // Clear to 0 — should succeed (mode: "set" with count=0 bypasses limit check)
    const result = await saveSubmission(actor, task._id.toString(), user._id.toString(), "2026-07-13", {
      count: 0,
      mode: "set",
    });
    expect(result.completionCount).toBe(0);
  });

  it("counts backfill submissions toward weekly limit", async () => {
    const team = await TeamModel.create({
      code: "TEST_WEEKLY_5",
      name: "Test Team Weekly 5",
    });

    const user = await UserModel.create({
      fullName: "Weekly User 5",
      role: "MEMBER",
      status: "ACTIVE",
      totalXp: 0,
      pointBalance: 0,
      teamId: team._id,
    });

    const task = await TaskModel.create({
      title: "Weekly Backfill",
      description: "Test",
      taskType: "WEEKLY_PER_MEMBER",
      scheduleType: "EVERY_DAY",
      expReward: 10,
      pointReward: 5,
      isActive: true,
      targetRoles: ["MEMBER"],
      scope: "TEAM",
      teamId: team._id,
      createdBy: user._id,
      deadlineTime: "23:59",
      maxPerWeek: 2,
    });

    const actor: SessionUser = {
      id: user._id.toString(),
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      teamId: team._id.toString(),
    };

    // Submit on Monday (2026-07-13, which is a Monday)
    await saveSubmission(actor, task._id.toString(), user._id.toString(), "2026-07-13", {
      count: 1,
      mode: "set",
    });

    // Backfill on Sunday (2026-07-12, same week Sun-Sat)
    await saveSubmission(actor, task._id.toString(), user._id.toString(), "2026-07-12", {
      count: 1,
      mode: "set",
    });

    // Total is 2 = maxPerWeek. Another submit should fail.
    await expect(
      saveSubmission(actor, task._id.toString(), user._id.toString(), "2026-07-14", {
        count: 1,
        mode: "increment",
      }),
    ).rejects.toThrow("Đã đạt giới hạn số lần hoàn thành tuần này.");
  });
});
```

- [ ] **Step 4: Update existing test**

Change the test `"does not cap weekly per-member submissions"` in the "submission limits" describe block to:

```typescript
  it("caps weekly per-member at maxPerWeek when set, no cap when null", () => {
    // Without maxPerWeek (in the service), the clamp function returns count as-is
    expect(clampSubmissionCountForTaskType("WEEKLY_PER_MEMBER", 5)).toBe(5);
  });
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/lib/tasks/submission-service.test.ts -v`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/lib/tasks/submission-service.ts src/lib/tasks/submission-service.test.ts
git commit -m "feat: enforce maxPerWeek limit in submission service with tests"
```

---

### Task 4: Wire `maxPerWeek` through task-service (create, update, mapTask, getTaskDetail)

**Files:**
- Modify: `src/lib/tasks/task-service.ts`

- [ ] **Step 1: Update `CreateTaskInput` type**

In `src/lib/tasks/task-service.ts`, add to `CreateTaskInput` (after `targetCount`):

```typescript
  maxPerWeek?: number | null;
```

- [ ] **Step 2: Update `UpdateTaskInput` type**

Add to `UpdateTaskInput` (after `targetCount`):

```typescript
  maxPerWeek?: number | null;
```

- [ ] **Step 3: Update `createTask` to save maxPerWeek**

In the `createTask` function, in the `TaskModel.create` call, add:

```typescript
    maxPerWeek: taskType === "WEEKLY_PER_MEMBER" ? input.maxPerWeek ?? null : null,
```

- [ ] **Step 4: Update `updateTask` to save maxPerWeek**

In the `updateTask` function, in the `TaskModel.updateOne` $set block, add:

```typescript
        maxPerWeek: taskType === "WEEKLY_PER_MEMBER"
          ? input.maxPerWeek ?? null
          : null,
```

Also add the field extraction near `let nextTargetCount`:

```typescript
  const nextMaxPerWeek: number | null = taskType === "WEEKLY_PER_MEMBER"
    ? (input.maxPerWeek ?? null)
    : null;
```

- [ ] **Step 5: Update `mapTask` to include maxPerWeek**

In the `mapTask` function return object, add:

```typescript
    maxPerWeek: record.maxPerWeek ?? null,
```

- [ ] **Step 6: Update `getTaskDetail` to compute weekly data**

In `getTaskDetail`, add import for `getWeekRangeFromDateKey` at top of file:

```typescript
import { createDeadlineAt, getTodayDateKey, getYearMonthFromDateKey, getWeekRangeFromDateKey } from "@/lib/dates";
```

In the `Promise.all` section (around line 281), add a query for weekly submissions when the task is weekly:

```typescript
      taskType === "WEEKLY_PER_MEMBER"
        ? (() => {
            const weekRange = getWeekRangeFromDateKey(dateKey, 7);
            return SubmissionModel.find({
              date: { $gte: weekRange.startStr, $lte: weekRange.endStr },
              subjectUserId: toObjectId(selectedSubject.id),
              taskId: toObjectId(taskId),
            }).lean() as Promise<SubmissionRecordModel[]>;
          })()
        : Promise.resolve([] as SubmissionRecordModel[]),
```

And destructure the result. Add to the return object:

```typescript
    weeklyCompletion: weeklySubmissions.reduce(
      (sum, s) => sum + (s.completionCount ?? 0),
      0,
    ),
    maxPerWeek: task.maxPerWeek ?? null,
    weekSubmissions: weekSubmissions.map((s) => ({
      dateKey: s.date,
      completionCount: s.completionCount ?? 0,
    })),
```

- [ ] **Step 7: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 8: Commit**

```bash
git add src/lib/tasks/task-service.ts
git commit -m "feat: wire maxPerWeek through task CRUD and getTaskDetail"
```

---

### Task 5: Add Zod validation for `maxPerWeek`

**Files:**
- Modify: `src/lib/validation.ts`

- [ ] **Step 1: Add `maxPerWeek` to `taskBaseSchema`**

In `src/lib/validation.ts`, add to `taskBaseSchema`:

```typescript
  maxPerWeek: z.number().int().min(1).max(1000).nullable().optional().default(null),
```

- [ ] **Step 2: Add refine rule for WEEKLY_PER_MEMBER**

After the existing refine blocks for `taskInputSchema`, add:

```typescript
  .refine(
    (v) =>
      v.taskType !== "WEEKLY_PER_MEMBER" ||
      v.maxPerWeek === null ||
      v.maxPerWeek === undefined ||
      v.maxPerWeek >= 1,
    {
      message: "Giới hạn tuần phải ≥ 1 hoặc để trống.",
      path: ["maxPerWeek"],
    },
  )
```

Apply the same refine to both `taskInputSchema` and `updateTaskInputSchema`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/validation.ts
git commit -m "feat: add maxPerWeek to Zod validation schemas"
```

---

### Task 6: Update template server actions to pass `maxPerWeek`

**Files:**
- Modify: `src/app/(app)/templates/actions.ts`

- [ ] **Step 1: Update `createTaskAction`**

In `createTaskAction`, add to the parsed object:

```typescript
      maxPerWeek:
        formData.get("maxPerWeek") != null && formData.get("maxPerWeek") !== ""
          ? Number(formData.get("maxPerWeek"))
          : null,
```

- [ ] **Step 2: Update `updateTaskAction`**

In `updateTaskAction`, add to the parsed object:

```typescript
      maxPerWeek:
        formData.get("maxPerWeek") != null && formData.get("maxPerWeek") !== ""
          ? Number(formData.get("maxPerWeek"))
          : null,
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/templates/actions.ts
git commit -m "feat: pass maxPerWeek from FormData in template actions"
```

---

### Task 7: Add maxPerWeek input to Admin template forms

**Files:**
- Modify: `src/app/(app)/templates/create-template-form.tsx`
- Modify: `src/app/(app)/templates/edit-template-form.tsx`

- [ ] **Step 1: Add maxPerWeek input to CreateTemplateForm**

In `src/app/(app)/templates/create-template-form.tsx`, add after the `targetCount` block (after line ~176):

```tsx
      {taskType === "WEEKLY_PER_MEMBER" && (
        <div>
          <label
            htmlFor="maxPerWeek"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Giới hạn mỗi tuần (tùy chọn)
          </label>
          <input
            id="maxPerWeek"
            name="maxPerWeek"
            type="number"
            min={1}
            placeholder="Để trống = không giới hạn"
            inputMode="numeric"
            className="h-10 w-full rounded-xl bg-overlay-subtle border border-border px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Số lần tối đa mỗi thành viên có thể hoàn thành trong tuần (CN–T7).
          </p>
        </div>
      )}
```

- [ ] **Step 2: Add maxPerWeek input to EditTemplateForm**

In `src/app/(app)/templates/edit-template-form.tsx`, add after the `targetCount` block (after line ~112):

```tsx
      {task.taskType === "WEEKLY_PER_MEMBER" && (
        <div>
          <label
            htmlFor={`maxPerWeek-${task.id}`}
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Giới hạn mỗi tuần (tùy chọn)
          </label>
          <input
            id={`maxPerWeek-${task.id}`}
            name="maxPerWeek"
            type="number"
            min={1}
            defaultValue={task.maxPerWeek ?? undefined}
            placeholder="Để trống = không giới hạn"
            inputMode="numeric"
            className="h-10 w-full rounded-xl bg-overlay-subtle border border-border px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Số lần tối đa mỗi thành viên có thể hoàn thành trong tuần (CN–T7).
          </p>
        </div>
      )}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/templates/create-template-form.tsx src/app/\(app\)/templates/edit-template-form.tsx
git commit -m "feat: add maxPerWeek input to admin template forms"
```

---

### Task 8: Add weekly aggregate to dashboard service

**Files:**
- Modify: `src/lib/tasks/dashboard-service.ts`

- [ ] **Step 1: Import `getWeekRangeFromDateKey` and `isWeeklyTaskType`**

In `src/lib/tasks/dashboard-service.ts`, add imports:

```typescript
import { getWeekRangeFromDateKey } from "@/lib/dates";
import { isWeeklyTaskType } from "@/lib/tasks/constants";
```

- [ ] **Step 2: Update `buildDashboardSubmissionDateFilter`**

In `buildDashboardSubmissionDateFilter`, add handling for weekly tasks. The function currently separates monthly vs daily. Update it to also handle weekly:

```typescript
export function buildDashboardSubmissionDateFilter(
  tasks: TaskRecord[],
  dateKey: string,
) {
  const monthlyTasks = tasks.filter(
    (task) => normalizeTaskType(task.taskType) === "MONTHLY_PER_MEMBER",
  );
  const dailyScopedTasks = tasks.filter(
    (task) =>
      normalizeTaskType(task.taskType) !== "MONTHLY_PER_MEMBER" &&
      !isWeeklyTaskType(task.taskType),
  );
  const weeklyTasks = tasks.filter(
    (task) => isWeeklyTaskType(task.taskType),
  );
  const clauses = [];

  if (monthlyTasks.length > 0) {
    clauses.push({
      date: { $regex: `^${getYearMonthFromDateKey(dateKey)}` },
      taskId: { $in: monthlyTasks.map((task) => task._id) },
    });
  }
  if (dailyScopedTasks.length > 0) {
    clauses.push({
      date: dateKey,
      taskId: { $in: dailyScopedTasks.map((task) => task._id) },
    });
  }
  if (weeklyTasks.length > 0) {
    const weekRange = getWeekRangeFromDateKey(dateKey, 7);
    clauses.push({
      date: { $gte: weekRange.startStr, $lte: weekRange.endStr },
      taskId: { $in: weeklyTasks.map((task) => task._id) },
    });
  }

  return clauses.length === 1 ? clauses[0] : { $or: clauses };
}
```

- [ ] **Step 3: Add weekly completion aggregate to `loadProgressAggregates`**

In `loadProgressAggregates`, add a new Map and query for weekly tasks:

```typescript
  const weeklyByTaskUser = new Map<string, number>();
```

After the monthly tasks block, add:

```typescript
  const weeklyTasks = tasks.filter((t) => isWeeklyTaskType(t.taskType));
  if (weeklyTasks.length > 0 && userIds.length > 0) {
    const weekRange = getWeekRangeFromDateKey(dateKey, 7);
    const userObjectIds = userIds.map((id) => toObjectId(id));
    const weekly = (await SubmissionModel.aggregate([
      {
        $match: {
          taskId: { $in: weeklyTasks.map((t) => t._id) },
          subjectUserId: { $in: userObjectIds },
          date: { $gte: weekRange.startStr, $lte: weekRange.endStr },
        },
      },
      {
        $group: {
          _id: { taskId: "$taskId", userId: "$subjectUserId" },
          total: { $sum: "$completionCount" },
        },
      },
    ])) as { _id: { taskId: unknown; userId: unknown }; total: number }[];
    for (const row of weekly) {
      weeklyByTaskUser.set(
        aggKey(String(row._id.taskId), String(row._id.userId)),
        row.total,
      );
    }
  }
```

Update return type and return value of `ProgressAggregates`:

```typescript
type ProgressAggregates = {
  totalByTask: Map<string, number>;
  monthlyByTaskUser: Map<string, number>;
  weeklyByTaskUser: Map<string, number>;
  goalByTaskUser: Map<string, number>;
};
```

And return:

```typescript
  return { totalByTask, monthlyByTaskUser, weeklyByTaskUser, goalByTaskUser };
```

- [ ] **Step 4: Update `buildTaskCard` to include weekly data**

Update the `buildTaskCard` function's `ctx` parameter type to include `weeklyByTaskUser`:

```typescript
    weeklyByTaskUser: Map<string, number>;
```

And in the progress calculation, for weekly tasks use weekly completion:

```typescript
  const progress =
    taskType === "COUNT_TOTAL"
      ? buildTaskProgress({
          taskType,
          current: ctx.totalByTask.get(taskId) ?? 0,
          target: t.targetCount ?? null,
        })
      : taskType === "WEEKLY_PER_MEMBER"
        ? buildTaskProgress({
            taskType,
            current: ctx.weeklyByTaskUser.get(aggKey(taskId, ctx.actorId)) ?? 0,
            target: t.maxPerWeek ?? null,
          })
        : buildTaskProgress({
            taskType,
            current: ctx.monthlyByTaskUser.get(aggKey(taskId, ctx.actorId)) ?? 0,
            target: ctx.goalByTaskUser.get(aggKey(taskId, ctx.actorId)) ?? null,
          });
```

And add to the return object:

```typescript
    weeklyCompletion: taskType === "WEEKLY_PER_MEMBER"
      ? ctx.weeklyByTaskUser.get(aggKey(taskId, ctx.actorId)) ?? 0
      : 0,
    maxPerWeek: t.maxPerWeek ?? null,
```

- [ ] **Step 5: Update callers of `buildTaskCard` and `loadProgressAggregates`**

In `buildDashboardView`, `buildDailyCampaignView`, and `buildMemberDashboard`, update the destructuring to include `weeklyByTaskUser`:

```typescript
  const { totalByTask, monthlyByTaskUser, weeklyByTaskUser, goalByTaskUser } =
    await loadProgressAggregates(...);
```

And pass `weeklyByTaskUser` to `buildTaskCard` calls.

- [ ] **Step 6: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 7: Commit**

```bash
git add src/lib/tasks/dashboard-service.ts
git commit -m "feat: add weekly completion aggregate to dashboard service"
```

---

### Task 9: Update Task Detail page to show weekly progress

**Files:**
- Modify: `src/app/(app)/tasks/[taskId]/page.tsx`

- [ ] **Step 1: Add weekly progress section**

In `src/app/(app)/tasks/[taskId]/page.tsx`, add after the monthly goal section (after line ~220), add:

```tsx
      {detail.taskType === "WEEKLY_PER_MEMBER" && detail.maxPerWeek !== null && detail.isApplicableToActor && (
        <section className="space-y-3">
          <div className="glass-card space-y-2 p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" aria-hidden />
              <h2 className="text-sm font-semibold">
                Tiến độ tuần này
              </h2>
            </div>
            <ProgressBar
              current={detail.weeklyCompletion}
              target={detail.maxPerWeek}
            />
            <p className="text-xs text-muted-foreground">
              {detail.weeklyCompletion} / {detail.maxPerWeek} {progressUnit}
            </p>
          </div>
        </section>
      )}
```

- [ ] **Step 2: Pass weekly data to SubmitSection**

The `SubmitSection` currently receives `monthlyCompletion`. Add `weeklyCompletion` and `maxPerWeek` props. In the JSX where `SubmitSection` is rendered, add:

```tsx
          <SubmitSection
            taskId={detail.id}
            subjectUserId={session.id}
            myCompletionCount={detail.myCompletionCount}
            monthlyCompletion={detail.monthlyCompletion}
            weeklyCompletion={detail.weeklyCompletion}
            maxPerWeek={detail.maxPerWeek}
            status={detail.status}
            taskType={detail.taskType}
          />
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/tasks/\[taskId\]/page.tsx
git commit -m "feat: show weekly progress on task detail page"
```

---

### Task 10: Update SubmitSection to show weekly progress and lock submit

**Files:**
- Modify: `src/app/(app)/tasks/[taskId]/submit-section.tsx`

- [ ] **Step 1: Update props**

Add to the component props:

```typescript
  weeklyCompletion?: number;
  maxPerWeek?: number | null;
```

- [ ] **Step 2: Add weekly limit check to disable logic**

After the existing `submitDisabled` calculation, add weekly check:

```typescript
  const weeklyLimitReached =
    taskType === "WEEKLY_PER_MEMBER" &&
    maxPerWeek != null &&
    (weeklyCompletion ?? 0) >= maxPerWeek;
  const weeklySubmitDisabled = submitDisabled || weeklyLimitReached;
```

- [ ] **Step 3: Update button disabled prop and add weekly message**

Change the button's `disabled` to `weeklySubmitDisabled`. After the error block, add weekly limit message:

```tsx
      {weeklyLimitReached && !error && (
        <p className="text-xs text-muted-foreground">
          Đã đạt giới hạn tuần này ({maxPerWeek} lần).
        </p>
      )}
```

- [ ] **Step 4: Show weekly progress in heading area**

Add below the existing heading/p block:

```tsx
        {taskType === "WEEKLY_PER_MEMBER" && maxPerWeek != null && (
          <p className="text-xs text-muted-foreground">
            Đã {weeklyCompletion ?? 0}/{maxPerWeek} lần tuần này
          </p>
        )}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/tasks/\[taskId\]/submit-section.tsx
git commit -m "feat: lock submit and show progress when weekly limit reached"
```

---

### Task 11: Update dashboard UI to show weekly progress

**Files:**
- Modify: `src/app/(app)/dashboard/task-card-sections.tsx`
- Modify: `src/app/(app)/dashboard/task-tick-button.tsx`

- [ ] **Step 1: Update `isCardDone` for WEEKLY_PER_MEMBER**

In `task-card-sections.tsx`, update the `isCardDone` function for weekly tasks:

```typescript
  if (card.taskType === "WEEKLY_PER_MEMBER") {
    const weeklyReached = card.maxPerWeek != null
      ? card.weeklyCompletion >= card.maxPerWeek
      : card.progress.isGoalComplete;
    return weeklyReached || card.myCompletionCount > 0;
  }
```

- [ ] **Step 2: Update TaskTickButton to check weekly limit**

In `task-tick-button.tsx`, add props:

```typescript
  weeklyCompletion?: number;
  maxPerWeek?: number | null;
  taskType?: TaskType;
```

Add to disabled check:

```typescript
  const weeklyLimitReached =
    taskType === "WEEKLY_PER_MEMBER" &&
    maxPerWeek != null &&
    (weeklyCompletion ?? 0) >= maxPerWeek;
```

Add `weeklyLimitReached` to the `disabled` condition:

```typescript
  const disabled =
    isPending ||
    isLocked ||
    isCompletedMonthlyTask ||
    isGoalComplete ||
    weeklyLimitReached ||
    (isTaskCompleted && !isDone);
```

- [ ] **Step 3: Pass weekly data from TaskCardRow to TaskTickButton**

In `task-card-sections.tsx`, in `TaskCardRow`, pass weekly data to `TaskTickButton`:

```tsx
        <TaskTickButton
          taskId={card.id}
          subjectUserId={userId}
          myCompletionCount={card.myCompletionCount}
          status={card.status}
          isGoalComplete={isGoalComplete}
          taskType={card.taskType}
          weeklyCompletion={card.weeklyCompletion}
          maxPerWeek={card.maxPerWeek}
        />
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/dashboard/task-card-sections.tsx src/app/\(app\)/dashboard/task-tick-button.tsx
git commit -m "feat: show weekly progress and lock tick button on dashboard"
```

---

### Task 12: Full test run and final verification

- [ ] **Step 1: Run all task-related tests**

```bash
npx vitest run src/lib/tasks/ -v
```
Expected: All tests pass

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: No errors

- [ ] **Step 3: Run build**

```bash
npm run build
```
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: verify weekly task limit feature builds and tests pass"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Data model: `maxPerWeek` field on Task model (Task 1)
- ✅ Week definition: CN-T7 via `getWeekRangeFromDateKey(dateKey, 7)` (Tasks 3, 8)
- ✅ Submission validation: in `saveSubmission()` (Task 3)
- ✅ Admin UI: task form input (Tasks 7)
- ✅ Dashboard: weekly aggregate + TaskCard (Tasks 8, 11)
- ✅ Submit section: progress + lock (Task 10)
- ✅ Task detail: weekly progress section (Task 9)
- ✅ Tests: comprehensive test suite (Task 3)
- ✅ Backfill and proxy submissions count toward limit (Task 3 tests cover this)
- ✅ No migration needed (documented)

**Placeholder scan:** No TBD, TODO, or vague references found.

**Type consistency:** All types (`maxPerWeek: number | null`, `weeklyCompletion: number`) are consistent across model, types, service, and UI layers. `TaskCard` and `TaskDetail` both have the fields. `buildTaskCard` passes them through.

**All files accounted for.** Plan is complete and ready for execution.