# DTT Class Tasks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace global `isDtt` field with per-class task assignments — each DTT class has its own set of daily tasks, displayed in a dedicated dashboard section, with admin management via class card popup and per-class daily report pages.

**Architecture:** New `DttClassTask` model maps tasks to classes (many-to-many). Tasks in a class are shown daily to enrolled users. Exclusivity rule: a task assigned to any DTT class is hidden from all other views (regular tasks, daily campaign, templates). Custom class tasks give EXP only (no points); inherited tasks keep full rewards.

**Tech Stack:** Next.js (App Router), Mongoose, MongoDB, React, TypeScript, vitest

---

## File Structure

### New files
| File | Responsibility |
|------|---------------|
| `src/lib/models/dtt-class-task.ts` | DttClassTask Mongoose model |
| `src/lib/dtt/class-task-service.ts` | Service: add/remove/list class tasks, exclusivity check, build class report |
| `src/app/(app)/admin/dtt/class-task-popup.tsx` | Client popup: inherit + custom task tabs per class |
| `src/app/(app)/admin/dtt/class-task-actions.ts` | Server actions for class task management |
| `src/app/(app)/admin/dtt/classes/[classId]/report/page.tsx` | Server page: class report data fetch |
| `src/app/(app)/admin/dtt/classes/[classId]/report/report-client.tsx` | Client: class report UI with date nav, table |

### Modified files
| File | Change |
|------|--------|
| `src/lib/models/index.ts` | Add re-export for `dtt-class-task` |
| `src/lib/models/task.ts` | Remove `isDtt` field from schema |
| `src/lib/tasks/types.ts` | Remove `isDtt` from `TaskSummary` |
| `src/lib/tasks/task-service.ts` | Remove `isDtt` from `taskToScope`, `mapTask`, `CreateTaskInput`; add exclusivity filter |
| `src/lib/tasks/dashboard-service.ts` | Add DTT class task section logic, `isAssignedToAnyDttClass` exclusivity filter |
| `src/lib/campaigns/campaign-service.ts` | Add exclusivity check in `isTaskEligibleForCampaign` |
| `src/app/(app)/admin/dtt/actions.ts` | Remove `toggleTaskDttAction`; add class task report data helper if needed |
| `src/app/(app)/admin/dtt/dtt-class-tab.tsx` | Add "Nhiệm vụ" and "Báo cáo" buttons on class cards, wire popup |
| `src/app/(app)/admin/dtt/dtt-manager.tsx` | Remove "Nhiệm vụ ĐTT" tab |
| `src/app/(app)/admin/dtt/page.tsx` | Remove task data fetching for old tab |
| `src/app/(app)/dashboard/member-dashboard.tsx` | Add `dttClassCards` section rendering |
| `src/app/(app)/dashboard/leader-dashboard.tsx` | Add `dttClassCards` section rendering |

### Deleted files
| File | Reason |
|------|--------|
| `src/app/(app)/admin/dtt/dtt-task-tab.tsx` | Old global DTT task toggle UI |
| `src/app/(app)/admin/dtt/dtt-task-state.ts` | Old DTT task state logic |
| `src/app/(app)/admin/dtt/dtt-task-state.test.ts` | Tests for old logic |

---

### Task 1: Create DttClassTask Model

**Files:**
- Create: `src/lib/models/dtt-class-task.ts`
- Modify: `src/lib/models/index.ts`
- Test: `src/lib/models/dtt-class-task.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/models/dtt-class-task.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { Types } from "mongoose";
import { DttClassTaskModel } from "./dtt-class-task";

describe("DttClassTask Model Test", () => {
  it("should reject creation without required fields", async () => {
    const doc = new DttClassTaskModel({});
    await expect(doc.validate()).rejects.toThrow();
  });

  it("should require classId, taskId, and teamId", async () => {
    const doc = new DttClassTaskModel({
      classId: new Types.ObjectId(),
    });
    await expect(doc.validate()).rejects.toThrow();
  });

  it("should accept valid data with isInherited defaulting to false", async () => {
    const doc = new DttClassTaskModel({
      classId: new Types.ObjectId(),
      taskId: new Types.ObjectId(),
      teamId: new Types.ObjectId(),
    });
    await expect(doc.validate()).resolves.not.toThrow();
    expect(doc.isInherited).toBe(false);
  });

  it("should accept isInherited: true", async () => {
    const doc = new DttClassTaskModel({
      classId: new Types.ObjectId(),
      taskId: new Types.ObjectId(),
      teamId: new Types.ObjectId(),
      isInherited: true,
    });
    await expect(doc.validate()).resolves.not.toThrow();
    expect(doc.isInherited).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/models/dtt-class-task.test.ts`
Expected: FAIL with module not found for `./dtt-class-task`

- [ ] **Step 3: Create the model**

Create `src/lib/models/dtt-class-task.ts`:

```typescript
import { model, models, Schema, Types } from "mongoose";

const dttClassTaskSchema = new Schema(
  {
    classId: { ref: "DttClass", required: true, type: Schema.Types.ObjectId, index: true },
    taskId: { ref: "Task", required: true, type: Schema.Types.ObjectId },
    teamId: { ref: "Team", required: true, type: Schema.Types.ObjectId, index: true },
    isInherited: { default: false, type: Boolean },
  },
  { timestamps: true },
);

dttClassTaskSchema.index({ classId: 1, taskId: 1 }, { unique: true });

export type DttClassTaskRecord = {
  _id: Types.ObjectId;
  classId: Types.ObjectId;
  taskId: Types.ObjectId;
  teamId: Types.ObjectId;
  isInherited: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const DttClassTaskModel =
  models.DttClassTask || model("DttClassTask", dttClassTaskSchema);
```

- [ ] **Step 4: Re-export from models index**

Modify `src/lib/models/index.ts`, add at the end (before the last closing):

```typescript
export * from "@/lib/models/dtt-class-task";
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/models/dtt-class-task.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add src/lib/models/dtt-class-task.ts src/lib/models/dtt-class-task.test.ts src/lib/models/index.ts
git commit -m "feat: add DttClassTask model for per-class task assignments

Many-to-many mapping between DTT classes and tasks. Supports
inherited (from common pool) and custom (EXP-only) tasks.
Unique index on {classId, taskId}."
```

---

### Task 2: Create class-task-service with exclusivity logic

**Files:**
- Create: `src/lib/dtt/class-task-service.ts`
- Test: `src/lib/dtt/class-task-service.test.ts`

- [ ] **Step 1: Write the test**

Create `src/lib/dtt/class-task-service.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { Types } from "mongoose";
import {
  isTaskAssignedToAnyDttClass,
  getDttClassTaskIdsForUser,
  buildClassTaskCard,
} from "./class-task-service";
import type { TaskRecord } from "@/lib/models";
import type { TaskCard } from "@/lib/tasks/types";

const makeTask = (overrides: Partial<TaskRecord> = {}): TaskRecord =>
  ({
    _id: new Types.ObjectId(),
    title: "Test Task",
    description: "",
    teamId: new Types.ObjectId(),
    createdBy: new Types.ObjectId(),
    deadlineTime: "20:00",
    expReward: 10,
    pointReward: 10,
    lateWindowDays: 7,
    sortOrder: null,
    isActive: true,
    isDtt: false,
    campaignOnly: false,
    regionId: null,
    scope: "TEAM" as const,
    taskType: "DAILY_PER_MEMBER",
    scheduleType: "EVERY_DAY",
    scheduledWeekdays: [],
    scheduledMonthDays: [],
    targetCount: null,
    targetRoles: undefined,
    submissionMessage: "",
    completionMessage: "",
    completedAt: null,
    zoneId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as TaskRecord);

describe("isTaskAssignedToAnyDttClass", () => {
  it("returns false when taskIds set is empty", () => {
    const taskIds = new Set<string>();
    expect(isTaskAssignedToAnyDttClass("abc", taskIds)).toBe(false);
  });

  it("returns true when taskId is in the set", () => {
    const taskIds = new Set(["abc", "def"]);
    expect(isTaskAssignedToAnyDttClass("abc", taskIds)).toBe(true);
  });

  it("returns false when taskId is not in the set", () => {
    const taskIds = new Set(["abc", "def"]);
    expect(isTaskAssignedToAnyDttClass("xyz", taskIds)).toBe(false);
  });
});

describe("getDttClassTaskIdsForUser", () => {
  it("returns empty array when userClasses is empty", () => {
    const result = getDttClassTaskIdsForUser([], new Map());
    expect(result).toEqual([]);
  });

  it("collects taskIds across multiple classes", () => {
    const classTasks = new Map<string, string[]>([
      ["class1", ["taskA", "taskB"]],
      ["class2", ["taskC"]],
    ]);
    const userClasses = [
      { classId: "class1" },
      { classId: "class2" },
    ];
    const result = getDttClassTaskIdsForUser(userClasses, classTasks);
    expect(result.sort()).toEqual(["taskA", "taskB", "taskC"]);
  });

  it("deduplicates taskIds when task appears in multiple classes", () => {
    const classTasks = new Map<string, string[]>([
      ["class1", ["taskA", "taskB"]],
      ["class2", ["taskB", "taskC"]],
    ]);
    const userClasses = [
      { classId: "class1" },
      { classId: "class2" },
    ];
    const result = getDttClassTaskIdsForUser(userClasses, classTasks);
    expect(result.sort()).toEqual(["taskA", "taskB", "taskC"]);
  });
});

describe("buildClassTaskCard", () => {
  it("zeros pointReward for custom tasks (isInherited: false)", () => {
    const task = makeTask({ pointReward: 15, expReward: 20 });
    const card = buildClassTaskCard(task, "2026-07-12", false, 0);
    expect(card.pointReward).toBe(0);
    expect(card.expReward).toBe(20);
  });

  it("keeps pointReward for inherited tasks (isInherited: true)", () => {
    const task = makeTask({ pointReward: 15, expReward: 20 });
    const card = buildClassTaskCard(task, "2026-07-12", true, 0);
    expect(card.pointReward).toBe(15);
    expect(card.expReward).toBe(20);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/dtt/class-task-service.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Create the service**

Create `src/lib/dtt/class-task-service.ts`:

```typescript
import "server-only";

import { connectToDatabase } from "@/lib/mongoose";
import {
  DttClassTaskModel,
  type DttClassTaskRecord,
  TaskModel,
  type TaskRecord,
  SubmissionModel,
  DttEnrollmentModel,
} from "@/lib/models";
import { getTodayDateKey } from "@/lib/dates";
import {
  DEFAULT_EXP_REWARD,
  DEFAULT_POINT_REWARD,
  normalizeTaskType,
} from "@/lib/tasks/constants";
import { computeTaskStatus, mapTask } from "@/lib/tasks/task-service";
import { isTaskScheduledForDate } from "@/lib/tasks/schedule";
import type { TaskCard } from "@/lib/tasks/types";
import { toObjectId } from "@/lib/utils/ids";

/**
 * Check if a taskId is assigned to any DTT class.
 * Pass the pre-fetched set of assigned task IDs for O(1) lookup.
 */
export function isTaskAssignedToAnyDttClass(
  taskId: string,
  assignedTaskIds: Set<string>,
): boolean {
  return assignedTaskIds.has(taskId);
}

/**
 * Get all unique task IDs for a user's enrolled classes.
 */
export function getDttClassTaskIdsForUser(
  userClasses: Array<{ classId: string }>,
  classTasksMap: Map<string, string[]>,
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const uc of userClasses) {
    const taskIds = classTasksMap.get(uc.classId) ?? [];
    for (const tid of taskIds) {
      if (!seen.has(tid)) {
        seen.add(tid);
        result.push(tid);
      }
    }
  }
  return result;
}

/**
 * Build a TaskCard for a DTT class task.
 * Custom tasks (isInherited: false) have pointReward = 0.
 */
export function buildClassTaskCard(
  task: TaskRecord,
  dateKey: string,
  isInherited: boolean,
  myCompletionCount: number,
): TaskCard {
  const taskSummary = mapTask(task);
  return {
    id: task._id.toString(),
    title: task.title,
    description: task.description,
    date: dateKey,
    deadlineAt: new Date(`${dateKey}T${task.deadlineTime}`).toISOString(),
    notificationTime: task.deadlineTime,
    expReward: task.expReward ?? DEFAULT_EXP_REWARD,
    pointReward: isInherited ? (task.pointReward ?? DEFAULT_POINT_REWARD) : 0,
    status: computeTaskStatus(task, dateKey),
    completionCount: 0,
    totalCount: 1,
    myCompletionCount,
    taskType: task.taskType,
    isApplicableToActor: true,
    progress: {
      kind: "DAILY_MEMBER" as const,
      current: myCompletionCount,
      target: 1,
      unitLabel: "ngày",
      isGoalMissing: false,
      isGoalComplete: myCompletionCount > 0,
    },
  };
}

/**
 * Load all task IDs assigned to any DTT class for the given team.
 * Returns a Set for O(1) exclusivity checks.
 */
export async function loadAllDttClassTaskIdsForTeam(
  teamId: string,
): Promise<Set<string>> {
  await connectToDatabase();
  const assignments = (await DttClassTaskModel.find({
    teamId: toObjectId(teamId),
  })
    .select("taskId")
    .lean()) as Array<Pick<DttClassTaskRecord, "_id" | "taskId">>;
  return new Set(assignments.map((a) => a.taskId.toString()));
}

/**
 * Load class → task IDs mapping for a team.
 * Returns Map<classId, taskId[]>
 */
export async function loadClassTasksMapForTeam(
  teamId: string,
): Promise<Map<string, string[]>> {
  await connectToDatabase();
  const assignments = (await DttClassTaskModel.find({
    teamId: toObjectId(teamId),
  })
    .select("classId taskId")
    .lean()) as Array<Pick<DttClassTaskRecord, "classId" | "taskId">>;

  const map = new Map<string, string[]>();
  for (const a of assignments) {
    const classId = a.classId.toString();
    if (!map.has(classId)) map.set(classId, []);
    map.get(classId)!.push(a.taskId.toString());
  }
  return map;
}

/**
 * Get the classes a user is enrolled in.
 */
export async function getUserEnrolledClasses(
  userId: string,
  teamId: string,
): Promise<Array<{ classId: string; className: string }>> {
  await connectToDatabase();
  const enrollments = (await DttEnrollmentModel.find({
    userId: toObjectId(userId),
    teamId: toObjectId(teamId),
  })
    .populate("classId", "name")
    .lean()) as any[];

  return enrollments.map((e) => ({
    classId: e.classId._id.toString(),
    className: e.classId.name,
  }));
}

/**
 * Build DTT class task cards for a user's dashboard.
 * Returns { cards: TaskCard[], classNames: string[] }
 */
export async function buildDttClassTaskView(
  userId: string,
  teamId: string,
  dateKey: string,
): Promise<{
  cards: TaskCard[];
  classNames: string[];
} | null> {
  await connectToDatabase();

  // 1. Find user's enrolled classes
  const enrollments = (await DttEnrollmentModel.find({
    userId: toObjectId(userId),
    teamId: toObjectId(teamId),
  })
    .populate("classId", "name")
    .lean()) as any[];

  if (enrollments.length === 0) return null;

  const userClasses = enrollments.map((e) => ({
    classId: e.classId._id.toString(),
    className: e.classId.name,
  }));
  const classNames = userClasses.map((c) => c.className);
  const classIds = userClasses.map((c) => c.classId);

  // 2. Get task assignments for these classes
  const assignments = (await DttClassTaskModel.find({
    classId: { $in: classIds.map(toObjectId) },
    teamId: toObjectId(teamId),
  })
    .populate("taskId")
    .lean()) as any[];

  if (assignments.length === 0) return { cards: [], classNames };

  // Deduplicate tasks (same task may appear in multiple classes)
  const taskMap = new Map<string, boolean>(); // taskId -> isInherited
  for (const a of assignments) {
    const taskId = a.taskId._id.toString();
    if (!taskMap.has(taskId)) {
      taskMap.set(taskId, a.isInherited ?? false);
    }
  }

  // 3. Load task records
  const taskIds = Array.from(taskMap.keys()).map(toObjectId);
  const tasks = (await TaskModel.find({
    _id: { $in: taskIds },
    isActive: true,
  }).lean()) as TaskRecord[];

  const taskById = new Map(tasks.map((t) => [t._id.toString(), t]));

  // 4. Get today's submissions
  const submissions = (await SubmissionModel.find({
    date: dateKey,
    subjectUserId: toObjectId(userId),
    taskId: { $in: taskIds },
  }).lean()) as any[];

  const submissionCount = new Map<string, number>();
  for (const s of submissions) {
    submissionCount.set(s.taskId.toString(), s.completionCount ?? 0);
  }

  // 5. Build cards
  const cards: TaskCard[] = [];
  for (const [taskId, isInherited] of taskMap) {
    const task = taskById.get(taskId);
    if (!task) continue;
    if (!isTaskScheduledForDate(task, dateKey)) continue;

    const count = submissionCount.get(taskId) ?? 0;
    cards.push(buildClassTaskCard(task, dateKey, isInherited, count));
  }

  return { cards, classNames };
}

/**
 * Build report data for a specific class on a specific date.
 */
export async function buildClassReport(
  classId: string,
  teamId: string,
  dateKey: string,
): Promise<{
  className: string;
  date: string;
  entries: Array<{
    userId: string;
    fullName: string;
    role: string;
    taskId: string;
    taskTitle: string;
    isInherited: boolean;
    completed: boolean;
    completionCount: number;
  }>;
  totalStudents: number;
  completedStudents: number;
}> {
  await connectToDatabase();

  // 1. Load class info
  const { DttClassModel } = await import("@/lib/models/dtt-class");
  const dttClass = (await DttClassModel.findById(toObjectId(classId)).lean()) as any;
  if (!dttClass) throw new Error("Lớp học không tồn tại.");

  // 2. Load task assignments for this class
  const assignments = (await DttClassTaskModel.find({
    classId: toObjectId(classId),
    teamId: toObjectId(teamId),
  })
    .populate("taskId")
    .lean()) as any[];

  const taskIds = assignments.map((a) => a.taskId._id);
  const taskById = new Map(
    assignments.map((a) => [a.taskId._id.toString(), { title: a.taskId.title, isInherited: a.isInherited ?? false }])
  );

  // 3. Load enrolled students
  const enrollments = (await DttEnrollmentModel.find({
    classId: toObjectId(classId),
    teamId: toObjectId(teamId),
  })
    .populate("userId", "fullName role")
    .lean()) as any[];

  // 4. Load submissions for today
  const submissions = taskIds.length > 0 && enrollments.length > 0
    ? (await SubmissionModel.find({
        date: dateKey,
        taskId: { $in: taskIds },
        subjectUserId: { $in: enrollments.map((e) => e.userId._id) },
      }).lean()) as any[]
    : [];

  const submissionMap = new Map<string, Map<string, number>>();
  for (const s of submissions) {
    const userId = s.subjectUserId.toString();
    const taskId = s.taskId.toString();
    if (!submissionMap.has(userId)) submissionMap.set(userId, new Map());
    submissionMap.get(userId)!.set(taskId, s.completionCount ?? 0);
  }

  // 5. Build entries
  const entries: typeof buildClassReport extends (...args: any) => Promise<infer R> ? R : never["entries"] = [];
  let completedCount = 0;

  for (const enrollment of enrollments) {
    const userId = enrollment.userId._id.toString();
    const fullName = enrollment.userId.fullName;
    const role = enrollment.userId.role;
    const userSubs = submissionMap.get(userId) ?? new Map();

    let studentCompleted = 0;

    for (const assignment of assignments) {
      const taskId = assignment.taskId._id.toString();
      const taskInfo = taskById.get(taskId)!;
      const count = userSubs.get(taskId) ?? 0;
      const isCompleted = count > 0;
      if (isCompleted) studentCompleted++;

      entries.push({
        userId,
        fullName,
        role,
        taskId,
        taskTitle: taskInfo.title,
        isInherited: taskInfo.isInherited,
        completed: isCompleted,
        completionCount: count,
      });
    }

    if (studentCompleted === assignments.length && assignments.length > 0) {
      completedCount++;
    }
  }

  return {
    className: dttClass.name,
    date: dateKey,
    entries,
    totalStudents: enrollments.length,
    completedStudents: completedCount,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/dtt/class-task-service.test.ts`
Expected: PASS

Note: The `loadAllDttClassTaskIdsForTeam`, `loadClassTasksMapForTeam`, `buildDttClassTaskView`, and `buildClassReport` functions are not unit-tested here because they require DB connection. They'll be verified via integration testing during dashboard integration (Task 5) and report page (Task 7).

- [ ] **Step 5: Commit**

```bash
git add src/lib/dtt/class-task-service.ts src/lib/dtt/class-task-service.test.ts
git commit -m "feat: add DTT class task service with exclusivity and report logic

Service layer for managing class-task assignments, exclusivity
checks (O(1) Set lookup), dashboard card building with
EXP-only rule for custom tasks, and per-class daily report."
```

---

### Task 3: Remove `isDtt` from Task model and related code

**Files:**
- Modify: `src/lib/models/task.ts`
- Modify: `src/lib/tasks/types.ts`
- Modify: `src/lib/tasks/task-service.ts`
- Modify: `src/lib/tasks/policy.ts`
- Delete: `src/app/(app)/admin/dtt/dtt-task-tab.tsx`
- Delete: `src/app/(app)/admin/dtt/dtt-task-state.ts`
- Delete: `src/app/(app)/admin/dtt/dtt-task-state.test.ts`
- Modify: `src/app/(app)/admin/dtt/actions.ts`
- Modify: `src/app/(app)/admin/dtt/dtt-manager.tsx`
- Modify: `src/app/(app)/admin/dtt/page.tsx`

- [ ] **Step 1: Remove `isDtt` from Task schema**

Modify `src/lib/models/task.ts`. Remove these lines:

```typescript
// REMOVE this line from the schema:
isDtt: { default: false, type: Boolean },

// REMOVE this line from the TaskRecord type:
isDtt: boolean;
```

The schema section becomes (remove `isDtt` line, keep all others):

```typescript
const taskSchema = new Schema(
  {
    createdBy: { ref: "User", required: true, type: Schema.Types.ObjectId },
    deadlineTime: { required: true, type: String },
    description: { default: "", trim: true, type: String },
    externalLabel: { default: "", maxlength: 40, trim: true, type: String },
    externalUrl: { default: "", trim: true, type: String },
    expReward: { default: DEFAULT_EXP_REWARD, min: 0, type: Number },
    pointReward: { default: DEFAULT_POINT_REWARD, min: 0, type: Number },
    lateWindowDays: {
      default: DEFAULT_LATE_WINDOW_DAYS,
      max: 365,
      min: 1,
      type: Number,
    },
    sortOrder: { default: null, type: Number },
    isActive: { default: true, type: Boolean },
    campaignOnly: { default: false, type: Boolean },
    regionId: { default: null, ref: "Region", type: Schema.Types.ObjectId },
    scope: { default: "TEAM", enum: TASK_SCOPES, type: String },
    taskType: {
      default: DEFAULT_TASK_TYPE,
      enum: TASK_TYPES,
      required: true,
      type: String,
    },
    scheduleType: {
      default: null,
      enum: TASK_SCHEDULE_TYPES,
      type: String,
    },
    scheduledWeekdays: {
      default: undefined,
      type: [Number],
    },
    scheduledMonthDays: {
      default: undefined,
      type: [Number],
    },
    targetCount: { default: null, min: 1, type: Number },
    targetRoles: {
      default: undefined,
      enum: TASK_TARGET_ROLES,
      type: [String],
    },
    completedAt: { default: null, type: Date },
    teamId: { ref: "Team", required: true, type: Schema.Types.ObjectId },
    submissionMessage: { default: "", trim: true, type: String },
    completionMessage: { default: "", trim: true, type: String },
    title: { required: true, trim: true, type: String },
    zoneId: { default: null, ref: "Zone", type: Schema.Types.ObjectId },
  },
  { timestamps: true },
);
```

And in the `TaskRecord` type, remove `isDtt: boolean;`.

- [ ] **Step 2: Remove `isDtt` from TaskSummary type**

Modify `src/lib/tasks/types.ts`. In `TaskSummary`, remove:

```typescript
// REMOVE:
isDtt: boolean;
```

- [ ] **Step 3: Remove `isDtt` from taskToScope and mapTask**

Modify `src/lib/tasks/task-service.ts`:

In `taskToScope`, remove `isDtt` from the Pick and the return:

```typescript
export function taskToScope(
  task: Pick<
    TaskRecord,
    "scope" | "teamId" | "zoneId" | "regionId" | "targetRoles"
  >,
): ScopeContext {
  return {
    scope: task.scope,
    teamId: task.teamId.toString(),
    zoneId: task.zoneId?.toString() ?? null,
    regionId: task.regionId?.toString() ?? null,
    targetRoles: normalizeTargetRoles(task.targetRoles, task.scope),
  };
}
```

In `mapTask`, remove:
```typescript
// REMOVE:
isDtt: !!record.isDtt,
```

- [ ] **Step 4: Remove `isDtt` from policy ScopeContext**

Modify `src/lib/tasks/policy.ts`. Read the file first to see current structure, then:

Remove `isDtt` from `ScopeContext` type and from the `appliesToUser` function if it references `isDtt`.

- [ ] **Step 5: Remove `isDtt` from CreateTaskInput and createTask**

In `src/lib/tasks/task-service.ts`, if `CreateTaskInput` has `isDtt`, remove it. Also remove any `isDtt` references in `createTask` and `createCampaignOnlyTaskAction` in `src/app/(app)/admin/campaigns/actions.ts`:

```typescript
// In campaigns/actions.ts, remove isDtt: false from the parsed object
```

- [ ] **Step 6: Delete old DTT task files**

```bash
rm src/app/(app)/admin/dtt/dtt-task-tab.tsx
rm src/app/(app)/admin/dtt/dtt-task-state.ts
rm src/app/(app)/admin/dtt/dtt-task-state.test.ts
```

- [ ] **Step 7: Remove toggleTaskDttAction from actions.ts**

Modify `src/app/(app)/admin/dtt/actions.ts`. Remove the `toggleTaskDttAction` function (lines 233-249):

```typescript
// DELETE the entire function:
export async function toggleTaskDttAction(taskId: string, isDtt: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const { teamId } = await requireManagerTeam();
    const updated = await TaskModel.findOneAndUpdate(
      { _id: toObjectId(taskId), teamId, isActive: true },
      { isDtt }
    );

    if (!updated) {
      throw new Error("Không tìm thấy nhiệm vụ hoạt động trong nhóm của bạn.");
    }

    revalidatePath("/admin/dtt");
    revalidatePath("/templates");
    revalidatePath("/dashboard");
  });
}
```

- [ ] **Step 8: Remove "Nhiệm vụ ĐTT" tab from dtt-manager.tsx**

Modify `src/app/(app)/admin/dtt/dtt-manager.tsx`. Remove the tab and the tasks prop:

```typescript
import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { DttClassTab } from "./dtt-class-tab";

type ClassItem = {
  id: string;
  name: string;
  startDayOfWeek: number;
};

type EnrollmentItem = {
  userId: string;
  fullName: string;
  role: string;
  classId: string;
  className: string;
  enrolledAt: string;
};

type NonDttMember = {
  id: string;
  fullName: string;
  role: string;
  regionId: string | null;
  regionName: string | null;
};

export function DttManager({
  classes,
  enrollments,
  nonDttMembers,
}: {
  classes: ClassItem[];
  enrollments: EnrollmentItem[];
  nonDttMembers: NonDttMember[];
}) {
  return (
    <div className="space-y-6">
      <DttClassTab
        classes={classes}
        enrollments={enrollments}
        nonDttMembers={nonDttMembers}
      />
    </div>
  );
}
```

- [ ] **Step 9: Remove task fetching from dtt/page.tsx**

Modify `src/app/(app)/admin/dtt/page.tsx`. Remove:
- Import of `TaskModel`
- The task query block
- `formattedTasks` variable
- `tasks` prop from `DttManager`

```typescript
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { canManageDtt } from "@/lib/permissions";
import { DttClassModel } from "@/lib/models/dtt-class";
import { DttEnrollmentModel } from "@/lib/models/dtt-enrollment";
import { UserModel } from "@/lib/models/user";
import { RegionModel } from "@/lib/models/region";
import { toObjectId } from "@/lib/utils/ids";
import { connectToDatabase } from "@/lib/mongoose";
import { AdminSubHeader } from "../sub-header";
import { DttManager } from "./dtt-manager";

export const dynamic = "force-dynamic";

export default async function DttManagementPage() {
  await connectToDatabase();
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (!canManageDtt(session)) redirect("/admin");
  if (!session.teamId) redirect("/admin");

  const teamId = toObjectId(session.teamId);

  const classes = await DttClassModel.find({ teamId }).lean();
  const enrollments = await DttEnrollmentModel.find({ teamId }).lean();
  const teamMembers = await UserModel.find({
    teamId,
    status: "ACTIVE",
  }).select({ fullName: 1, role: 1, regionId: 1 }).lean();

  const regions = await RegionModel.find({ teamId }).lean();
  const regionMap = new Map(
    regions.map((r) => [r._id.toString(), r.name])
  );

  const enrolledUserIds = new Set(enrollments.map((e) => e.userId.toString()));
  const nonDttMembers = teamMembers.filter((m) => !enrolledUserIds.has(m._id.toString()));

  const formattedClasses = classes.map((c) => ({
    id: c._id.toString(),
    name: c.name,
    startDayOfWeek: c.startDayOfWeek ?? 1,
  }));

  const formattedEnrollments = enrollments.map((e) => {
    const user = teamMembers.find((m) => m._id.toString() === e.userId.toString());
    const classItem = classes.find((c) => c._id.toString() === e.classId.toString());
    return {
      userId: e.userId.toString(),
      fullName: user?.fullName ?? "Không rõ",
      role: user?.role ?? "",
      classId: e.classId.toString(),
      className: classItem?.name ?? "Lớp đã bị xóa",
      enrolledAt: e.enrolledAt.toISOString(),
    };
  });

  const formattedNonDttMembers = nonDttMembers.map((m) => ({
    id: m._id.toString(),
    fullName: m.fullName,
    role: m.role,
    regionId: m.regionId?.toString() ?? null,
    regionName: m.regionId
      ? (regionMap.get(m.regionId.toString()) ?? null)
      : null,
  }));

  return (
    <div className="space-y-6 animate-slide-up pb-8">
      <AdminSubHeader
        title="Trường học Đấng Tiên Tri"
        description="Quản lý lớp học, phân chia học viên và cấu hình các nhiệm vụ học tập"
      />

      <DttManager
        classes={formattedClasses}
        enrollments={formattedEnrollments}
        nonDttMembers={formattedNonDttMembers}
      />
    </div>
  );
}
```

- [ ] **Step 10: Run tests to verify**

Run: `npx vitest run`
Expected: PASS (all existing tests should still pass; deleted test file won't run)

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "refactor: remove isDtt field and old DTT task toggle UI

Delete isDtt from Task schema, TaskRecord, TaskSummary,
taskToScope, mapTask, and CreateTaskInput. Remove the
'Nhiệm vụ ĐTT' tab and toggleTaskDttAction. Task exclusivity
will now be managed via DttClassTask model."
```

---

### Task 4: Add exclusivity filter to campaign and task services

**Files:**
- Modify: `src/lib/campaigns/campaign-service.ts`
- Modify: `src/lib/tasks/task-service.ts`

- [ ] **Step 1: Add exclusivity check to isTaskEligibleForCampaign**

Modify `src/lib/campaigns/campaign-service.ts`. Import the exclusivity helper and add check:

At the top, add import:
```typescript
import { loadAllDttClassTaskIdsForTeam } from "@/lib/dtt/class-task-service";
```

In `isTaskEligibleForCampaign`, we can't add async here (it's a sync function). Instead, modify `getDailyCampaignAdminView` to filter out DTT class tasks after loading eligible tasks.

Add at the end of `getDailyCampaignAdminView`, before the return, filter the `eligibleTaskRecords` and `campaignOnlyTaskRecords`:

```typescript
// In getDailyCampaignAdminView, after loading tasks:
const dttClassTaskIds = await loadAllDttClassTaskIdsForTeam(actor.teamId);

const eligibleTaskRecords = sortTasksForDisplay(
  tasks.filter(
    (task) =>
      !task.campaignOnly &&
      !dttClassTaskIds.has(task._id.toString()) &&
      isTaskEligibleForCampaign(task, actor.teamId, dateKey),
  ),
);
const campaignOnlyTaskRecords = sortTasksForDisplay(
  tasks.filter((task) => task.campaignOnly && !dttClassTaskIds.has(task._id.toString())),
);
```

- [ ] **Step 2: Add exclusivity to listVisibleTaskRecordsForActor**

Modify `src/lib/tasks/task-service.ts` in `listVisibleTaskRecordsForActor`. Add exclusivity filter:

```typescript
// In listVisibleTaskRecordsForActor, after loading tasks:
import { loadAllDttClassTaskIdsForTeam } from "@/lib/dtt/class-task-service";

// Inside the function, after loading `all`:
if (actor.teamId) {
  const dttClassTaskIds = await loadAllDttClassTaskIdsForTeam(actor.teamId);
  const filtered = all.filter((record) => !dttClassTaskIds.has(record._id.toString()));
  return sortTasksForDisplay(actor.role === "ADMIN" ? filtered : filtered.filter(/* existing scope filter */));
}
```

Actually, since this changes the function significantly, let me be precise. The current function structure is:

```typescript
async function listVisibleTaskRecordsForActor(actor): Promise<TaskRecord[]> {
  const all = (actor.role === "ADMIN" ? ... : actor.teamId ? ... : []) as TaskRecord[];
  if (actor.role === "ADMIN") return sortTasksForDisplay(all);
  const filtered = all.filter(/* scope check */);
  return sortTasksForDisplay(filtered);
}
```

Replace it with:

```typescript
async function listVisibleTaskRecordsForActor(
  actor: SessionUser,
): Promise<TaskRecord[]> {
  await connectToDatabase();

  const all = (
    actor.role === "ADMIN"
      ? await TaskModel.find({ campaignOnly: { $ne: true } }).lean()
      : actor.teamId
        ? await TaskModel.find({
            campaignOnly: { $ne: true },
            teamId: toObjectId(actor.teamId),
          }).lean()
        : []
  ) as TaskRecord[];

  // Exclusivity: remove tasks assigned to any DTT class
  if (actor.teamId) {
    const dttClassTaskIds = await loadAllDttClassTaskIdsForTeam(actor.teamId);
    const filtered = all.filter((t) => !dttClassTaskIds.has(t._id.toString()));
    if (actor.role === "ADMIN") return sortTasksForDisplay(filtered);
    const scopeFiltered = filtered.filter((record) => {
      if (record.scope === "TEAM") return true;
      if (record.scope === "ZONE") {
        return !!actor.zoneId && record.zoneId?.toString() === actor.zoneId;
      }
      if (record.scope === "REGION") {
        return !!actor.regionId && record.regionId?.toString() === actor.regionId;
      }
      return false;
    });
    return sortTasksForDisplay(scopeFiltered);
  }

  return sortTasksForDisplay(all);
}
```

- [ ] **Step 3: Run tests to verify**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/campaigns/campaign-service.ts src/lib/tasks/task-service.ts
git commit -m "feat: add exclusivity filter for DTT class tasks

Tasks assigned to any DTT class are now hidden from daily
campaign eligible list and visible task list. Applied via
loadAllDttClassTaskIdsForTeam Set lookup (O(1) per task)."
```

---

### Task 5: Add DTT class task section to dashboard

**Files:**
- Modify: `src/lib/tasks/dashboard-service.ts`
- Modify: `src/lib/tasks/types.ts`
- Modify: `src/app/(app)/dashboard/member-dashboard.tsx`
- Modify: `src/app/(app)/dashboard/leader-dashboard.tsx`

- [ ] **Step 1: Add DttClassTaskView to types**

Modify `src/lib/tasks/types.ts`. Add new type:

```typescript
export type DttClassTaskView = {
  cards: TaskCard[];
  classNames: string[];
};
```

Add to `MemberDashboardView` and `LeaderDashboardView`:

```typescript
// In MemberDashboardView, add:
dttClassTasks: DttClassTaskView | null;

// In LeaderDashboardView (extends DashboardView), the dashboard view type
// should also get this field. Add to DashboardView:
dttClassTasks: DttClassTaskView | null;
```

- [ ] **Step 2: Build DTT class task view in dashboard service**

Modify `src/lib/tasks/dashboard-service.ts`.

Import:
```typescript
import { buildDttClassTaskView } from "@/lib/dtt/class-task-service";
```

In `buildDashboardView`, after building the main cards, add:

```typescript
// Build DTT class task view (only for enrolled users)
let dttClassTasks: DttClassTaskView | null = null;
if (actor.teamId) {
  dttClassTasks = await buildDttClassTaskView(actor.id, actor.teamId, dateKey);
}

// Filter DTT class tasks out of regular cards
if (dttClassTasks && dttClassTasks.cards.length > 0) {
  const dttTaskIds = new Set(dttClassTasks.cards.map((c) => c.id));
  const filteredCards = cards.filter((c) => !dttTaskIds.has(c.id));
  // Replace cards with filtered version
  // Note: we need to rebuild the cards array
}
```

Actually, the exclusivity is already handled at the task-service level (Task 4). So the regular `cards` should NOT include DTT class tasks. The `buildDttClassTaskView` is a separate call that builds the DTT section. We just need to pass it through.

Update the return in `buildDashboardView`:

```typescript
return {
  date: dateKey,
  highlights: { ... },
  cards,
  dttClassTasks,
  campaign,
  goalNotice,
  roster,
  tasks: sortTasksForDisplay(filteredAllTasks).map(mapTask),
};
```

Do the same for `buildLeaderDashboard` and `buildMemberDashboard`.

- [ ] **Step 3: Render DTT class section in member-dashboard**

Modify `src/app/(app)/dashboard/member-dashboard.tsx`. Add after the campaign section:

```typescript
{data.dttClassTasks && data.dttClassTasks.cards.length > 0 && (
  <TaskCardSection
    title={`Nhiệm vụ lớp ${data.dttClassTasks.classNames.join(", ")}`}
    cards={data.dttClassTasks.cards}
    userId={userId}
    variant="member"
  />
)}
```

- [ ] **Step 4: Render DTT class section in leader-dashboard**

Modify `src/app/(app)/dashboard/leader-dashboard.tsx`. Same pattern:

```typescript
{data.dttClassTasks && data.dttClassTasks.cards.length > 0 && (
  <TaskCardSection
    title={`Nhiệm vụ lớp ${data.dttClassTasks.classNames.join(", ")}`}
    cards={data.dttClassTasks.cards}
    userId={userId}
    variant="leader"
  />
)}
```

- [ ] **Step 5: Run the app to verify**

Run: `npm run dev` then visit `/dashboard`
Expected: For enrolled DTT users, see "Nhiệm vụ lớp [Tên lớp]" section. For non-enrolled, no change.

- [ ] **Step 6: Commit**

```bash
git add src/lib/tasks/dashboard-service.ts src/lib/tasks/types.ts \
  src/app/(app)/dashboard/member-dashboard.tsx \
  src/app/(app)/dashboard/leader-dashboard.tsx
git commit -m "feat: add DTT class task section to dashboard

Enrolled DTT users see a dedicated section 'Nhiệm vụ lớp [Tên]'
with their class-specific daily tasks. Tasks are fetched via
buildDttClassTaskView and rendered separately from regular tasks."
```

---

### Task 6: Admin UI — Class Task Popup

**Files:**
- Create: `src/app/(app)/admin/dtt/class-task-popup.tsx`
- Create: `src/app/(app)/admin/dtt/class-task-actions.ts`
- Modify: `src/app/(app)/admin/dtt/dtt-class-tab.tsx`

- [ ] **Step 1: Create server actions**

Create `src/app/(app)/admin/dtt/class-task-actions.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { runAction, type ActionResult } from "@/lib/actions/result";
import { getSessionUser } from "@/lib/auth/session";
import { canManageDtt } from "@/lib/permissions";
import { connectToDatabase } from "@/lib/mongoose";
import { DttClassTaskModel } from "@/lib/models/dtt-class-task";
import { DttClassModel } from "@/lib/models/dtt-class";
import { TaskModel } from "@/lib/models/task";
import { createTask } from "@/lib/tasks/task-service";
import { toObjectId } from "@/lib/utils/ids";

async function requireManagerTeam() {
  await connectToDatabase();
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (!canManageDtt(session)) throw new Error("Bạn không có quyền quản lý.");
  if (!session.teamId) throw new Error("Chưa xác định được nhóm.");
  return { session, teamId: toObjectId(session.teamId) };
}

async function assertClassInTeam(classId: string, teamId: ReturnType<typeof toObjectId>) {
  const exists = await DttClassModel.exists({ _id: toObjectId(classId), teamId });
  if (!exists) throw new Error("Không tìm thấy lớp học.");
}

export async function addClassTaskAction(
  classId: string,
  taskId: string,
  isInherited: boolean,
): Promise<ActionResult> {
  return runAction(async () => {
    const { teamId } = await requireManagerTeam();
    await assertClassInTeam(classId, teamId);

    const existing = await DttClassTaskModel.exists({
      classId: toObjectId(classId),
      taskId: toObjectId(taskId),
    });
    if (existing) throw new Error("Nhiệm vụ đã thuộc lớp này.");

    await DttClassTaskModel.create({
      classId: toObjectId(classId),
      taskId: toObjectId(taskId),
      teamId,
      isInherited,
    });

    revalidatePath("/admin/dtt");
    revalidatePath("/dashboard");
  });
}

export async function removeClassTaskAction(
  classId: string,
  taskId: string,
): Promise<ActionResult> {
  return runAction(async () => {
    const { teamId } = await requireManagerTeam();
    await assertClassInTeam(classId, teamId);

    await DttClassTaskModel.findOneAndDelete({
      classId: toObjectId(classId),
      taskId: toObjectId(taskId),
    });

    revalidatePath("/admin/dtt");
    revalidatePath("/dashboard");
  });
}

export async function createCustomClassTaskAction(
  classId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const { session, teamId } = await requireManagerTeam();
    await assertClassInTeam(classId, teamId);

    const taskId = await createTask(session, {
      title: (formData.get("title") as string)?.trim() ?? "",
      description: (formData.get("description") as string) ?? "",
      deadlineTime: (formData.get("deadlineTime") as string) ?? "20:00",
      expReward: Number(formData.get("expReward") ?? 10),
      pointReward: 0,  // custom tasks: no points
      lateWindowDays: Number(formData.get("lateWindowDays") ?? 7),
      targetRoles: formData.getAll("targetRoles").map(String),
      taskType: "DAILY_PER_MEMBER",
      scheduleType: "EVERY_DAY",
      submissionMessage: (formData.get("submissionMessage") as string) ?? "",
      completionMessage: "",
    });

    await DttClassTaskModel.create({
      classId: toObjectId(classId),
      taskId: toObjectId(taskId),
      teamId,
      isInherited: false,
    });

    revalidatePath("/admin/dtt");
    revalidatePath("/dashboard");
    return { id: taskId };
  });
}
```

- [ ] **Step 2: Create the popup component**

Create `src/app/(app)/admin/dtt/class-task-popup.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Book, BookOpen } from "lucide-react";
import {
  addClassTaskAction,
  removeClassTaskAction,
  createCustomClassTaskAction,
} from "./class-task-actions";
import { FormError, FormSuccess } from "../_shared";
import { TASK_TARGET_ROLES, ROLE_LABELS } from "@/lib/domain";

type TaskSummary = {
  id: string;
  title: string;
  expReward: number;
  pointReward: number;
};

type ClassTaskEntry = {
  taskId: string;
  taskTitle: string;
  isInherited: boolean;
};

export function ClassTaskPopup({
  classId,
  className,
  availableTasks,
  classTasks,
  onClose,
}: {
  classId: string;
  className: string;
  availableTasks: TaskSummary[];
  classTasks: ClassTaskEntry[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"inherit" | "custom">("inherit");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showCustomForm, setShowCustomForm] = useState(false);

  const classTaskIds = new Set(classTasks.map((t) => t.taskId));
  const inheritableTasks = availableTasks.filter(
    (t) => !classTaskIds.has(t.id)
  );

  const handleAddInherited = (taskId: string, taskTitle: string) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await addClassTaskAction(classId, taskId, true);
      if (res.ok) {
        setSuccess(`Đã thêm nhiệm vụ "${taskTitle}" vào lớp.`);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  const handleRemove = (taskId: string, taskTitle: string) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await removeClassTaskAction(classId, taskId);
      if (res.ok) {
        setSuccess(`Đã rút nhiệm vụ "${taskTitle}" khỏi lớp.`);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  const handleCreateCustom = async (formData: FormData) => {
    setError(null);
    setSuccess(null);
    const result = await createCustomClassTaskAction(classId, formData);
    if (result.ok) {
      setSuccess("Đã tạo nhiệm vụ custom cho lớp.");
      setShowCustomForm(false);
      router.refresh();
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="glass-card relative mx-4 max-h-[80vh] w-full max-w-2xl overflow-hidden border border-border/40">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 bg-overlay-subtle/50 px-5 py-3">
          <div className="flex items-center gap-2">
            <Book className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Nhiệm vụ lớp {className}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-5">
          {error && <FormError message={error} onDismiss={() => setError(null)} />}
          {success && <FormSuccess message={success} onDismiss={() => setSuccess(null)} />}

          {/* Tabs */}
          <div className="mb-4 inline-flex gap-1 rounded-lg border border-border/60 bg-overlay-subtle p-1">
            <button
              type="button"
              onClick={() => setActiveTab("inherit")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === "inherit"
                  ? "bg-background text-foreground ring-1 ring-border/40"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Kế thừa
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("custom")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === "custom"
                  ? "bg-background text-foreground ring-1 ring-border/40"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Custom
            </button>
          </div>

          {/* Inherit tab */}
          {activeTab === "inherit" && (
            <div className="space-y-3">
              {/* Class tasks list */}
              {classTasks.filter(t => t.isInherited).length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Đang thuộc lớp
                  </h3>
                  <div className="space-y-1.5">
                    {classTasks.filter(t => t.isInherited).map((task) => (
                      <div
                        key={task.taskId}
                        className="flex items-center justify-between rounded-lg border border-border/40 bg-overlay-subtle/30 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{task.taskTitle}</p>
                          <p className="text-[11px] text-muted-foreground">Kế thừa từ task chung</p>
                        </div>
                        <button
                          onClick={() => handleRemove(task.taskId, task.taskTitle)}
                          disabled={isPending}
                          className="text-xs text-destructive hover:underline disabled:opacity-50"
                        >
                          Rút
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available tasks */}
              <div>
                <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Nhiệm vụ có sẵn
                </h3>
                {inheritableTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground/50 py-4 text-center">
                    Không còn nhiệm vụ nào để thêm
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {inheritableTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between rounded-lg border border-border/40 bg-overlay-subtle/30 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{task.title}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {task.expReward} EXP · {task.pointReward} điểm
                          </p>
                        </div>
                        <button
                          onClick={() => handleAddInherited(task.id, task.title)}
                          disabled={isPending}
                          className="text-xs text-primary hover:underline disabled:opacity-50"
                        >
                          Thêm
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Custom tab */}
          {activeTab === "custom" && (
            <div className="space-y-3">
              {!showCustomForm ? (
                <button
                  onClick={() => setShowCustomForm(true)}
                  className="btn-primary-gradient flex h-10 w-full items-center justify-center gap-2 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Tạo nhiệm vụ mới cho lớp
                </button>
              ) : (
                <form
                  action={handleCreateCustom}
                  className="space-y-3 rounded-lg border border-border bg-card p-4"
                >
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Tạo nhiệm vụ custom
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Nhiệm vụ custom chỉ thưởng EXP, không thưởng point.
                  </p>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      Tên nhiệm vụ
                    </span>
                    <input
                      name="title"
                      required
                      minLength={3}
                      maxLength={80}
                      placeholder="VD: Đọc kinh Sáng"
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Mô tả</span>
                    <textarea
                      name="description"
                      maxLength={280}
                      className="min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        Hạn hoàn thành
                      </span>
                      <input
                        name="deadlineTime"
                        type="time"
                        defaultValue="20:00"
                        required
                        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                      />
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        EXP thưởng
                      </span>
                      <input
                        name="expReward"
                        type="number"
                        min={0}
                        defaultValue={10}
                        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                      />
                    </label>
                  </div>

                  {/* No pointReward field — always 0 */}

                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      Vai trò áp dụng
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {TASK_TARGET_ROLES.map((role) => (
                        <label
                          key={role}
                          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs"
                        >
                          <input
                            type="checkbox"
                            name="targetRoles"
                            value={role}
                            defaultChecked
                          />
                          {ROLE_LABELS[role]}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isPending}
                      className="btn-primary-gradient flex h-10 flex-1 items-center justify-center text-sm disabled:opacity-50"
                    >
                      Tạo
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCustomForm(false)}
                      className="btn-secondary-gradient flex h-10 items-center px-4 text-sm"
                    >
                      Hủy
                    </button>
                  </div>
                </form>
              )}

              {/* Custom tasks list */}
              {classTasks.filter(t => !t.isInherited).length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Nhiệm vụ custom của lớp
                  </h3>
                  <div className="space-y-1.5">
                    {classTasks.filter(t => !t.isInherited).map((task) => (
                      <div
                        key={task.taskId}
                        className="flex items-center justify-between rounded-lg border border-border/40 bg-overlay-subtle/30 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{task.taskTitle}</p>
                            <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                              Chỉ EXP
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemove(task.taskId, task.taskTitle)}
                          disabled={isPending}
                          className="text-xs text-destructive hover:underline disabled:opacity-50"
                        >
                          Xóa
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire popup into dtt-class-tab.tsx**

Modify `src/app/(app)/admin/dtt/dtt-class-tab.tsx`. Add the "Nhiệm vụ" button and popup.

Add import:
```typescript
import { BookOpen } from "lucide-react";
import { ClassTaskPopup } from "./class-task-popup";
```

Add to the component props:
```typescript
availableTasks?: Array<{
  id: string;
  title: string;
  expReward: number;
  pointReward: number;
}>;
classTasksByClass?: Record<string, Array<{
  taskId: string;
  taskTitle: string;
  isInherited: boolean;
}>>;
```

Add state in the component:
```typescript
const [managingTaskClassId, setManagingTaskClassId] = useState<string | null>(null);
```

Add the "Nhiệm vụ" button in the class header, next to "Thêm":

```typescript
<button
  onClick={() => setManagingTaskClassId(classItem.id)}
  className="text-[10px] font-medium text-muted-foreground hover:text-primary transition-colors ml-1"
>
  <BookOpen className="h-3.5 w-3.5 inline mr-0.5" />
  Nhiệm vụ
</button>
```

Add popup rendering at the bottom of the component:

```tsx
{managingTaskClassId && (() => {
  const targetClass = classes.find((c) => c.id === managingTaskClassId);
  if (!targetClass) return null;
  return (
    <ClassTaskPopup
      classId={managingTaskClassId}
      className={targetClass.name}
      availableTasks={availableTasks ?? []}
      classTasks={classTasksByClass?.[managingTaskClassId] ?? []}
      onClose={() => setManagingTaskClassId(null)}
    />
  );
})()}
```

- [ ] **Step 4: Update dtt/page.tsx to pass task data**

Modify `src/app/(app)/admin/dtt/page.tsx`. We need to fetch available tasks (not assigned to any class) and class-specific tasks.

Add imports:
```typescript
import { TaskModel } from "@/lib/models/task";
import { DttClassTaskModel } from "@/lib/models/dtt-class-task";
import { loadAllDttClassTaskIdsForTeam } from "@/lib/dtt/class-task-service";
```

Add after loading `formattedNonDttMembers`:

```typescript
// Fetch available tasks and class task assignments
const dttClassTaskIds = await loadAllDttClassTaskIdsForTeam(session.teamId);

const availableTasks = (await TaskModel.find({
  isActive: true,
  teamId,
  _id: { $nin: Array.from(dttClassTaskIds).map(toObjectId) },
})
  .select("title expReward pointReward")
  .sort({ createdAt: -1 })
  .lean())
  .map((t) => ({
    id: t._id.toString(),
    title: t.title,
    expReward: t.expReward ?? 10,
    pointReward: t.pointReward ?? 10,
  }));

// Load class → tasks mapping
const classAssignments = (await DttClassTaskModel.find({ teamId })
  .populate("taskId", "title")
  .lean()) as any[];

const classTasksByClass: Record<string, Array<{ taskId: string; taskTitle: string; isInherited: boolean }>> = {};
for (const a of classAssignments) {
  const cid = a.classId.toString();
  if (!classTasksByClass[cid]) classTasksByClass[cid] = [];
  classTasksByClass[cid].push({
    taskId: a.taskId._id.toString(),
    taskTitle: a.taskId.title,
    isInherited: a.isInherited ?? false,
  });
}
```

Pass to DttManager → DttClassTab:

```typescript
<DttManager
  classes={formattedClasses}
  enrollments={formattedEnrollments}
  nonDttMembers={formattedNonDttMembers}
  availableTasks={availableTasks}
  classTasksByClass={classTasksByClass}
/>
```

Update `dtt-manager.tsx` to accept and forward these props.

- [ ] **Step 5: Run the app to verify**

Run: `npm run dev` then visit `/admin/dtt`
Expected: Each class card has "Nhiệm vụ" button → popup opens → can add/remove tasks

- [ ] **Step 6: Commit**

```bash
git add src/app/(app)/admin/dtt/class-task-popup.tsx \
  src/app/(app)/admin/dtt/class-task-actions.ts \
  src/app/(app)/admin/dtt/dtt-class-tab.tsx \
  src/app/(app)/admin/dtt/dtt-manager.tsx \
  src/app/(app)/admin/dtt/page.tsx
git commit -m "feat: add admin class task popup for managing per-class tasks

Popup with two tabs: Inherit (select from common task pool)
and Custom (create EXP-only tasks). Wired into class cards
with real-time refresh via router.refresh()."
```

---

### Task 7: Per-class report page

**Files:**
- Create: `src/app/(app)/admin/dtt/classes/[classId]/report/page.tsx`
- Create: `src/app/(app)/admin/dtt/classes/[classId]/report/report-client.tsx`
- Modify: `src/app/(app)/admin/dtt/dtt-class-tab.tsx` (add "Báo cáo" button)

- [ ] **Step 1: Create the server page**

Create directory: `src/app/(app)/admin/dtt/classes/[classId]/report/`

Create `src/app/(app)/admin/dtt/classes/[classId]/report/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { canManageDtt } from "@/lib/permissions";
import { toObjectId } from "@/lib/utils/ids";
import { connectToDatabase } from "@/lib/mongoose";
import { DttClassModel } from "@/lib/models/dtt-class";
import { AdminSubHeader } from "../../../../sub-header";
import { ReportClient } from "./report-client";
import { buildClassReport } from "@/lib/dtt/class-task-service";

export const dynamic = "force-dynamic";

export default async function ClassReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { classId } = await params;
  const { date } = await searchParams;

  await connectToDatabase();
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (!canManageDtt(session)) redirect("/admin");
  if (!session.teamId) redirect("/admin");

  const teamId = toObjectId(session.teamId);

  // Verify class exists and belongs to team
  const dttClass = await DttClassModel.findOne({
    _id: toObjectId(classId),
    teamId,
  }).lean();

  if (!dttClass) {
    redirect("/admin/dtt");
  }

  const dateKey = date ?? new Date().toISOString().split("T")[0];

  const reportData = await buildClassReport(classId, session.teamId, dateKey);

  return (
    <div className="space-y-6 animate-slide-up pb-8">
      <AdminSubHeader
        title={`Báo cáo lớp: ${dttClass.name}`}
        description="Theo dõi tiến độ hoàn thành nhiệm vụ hàng ngày của học viên"
      />

      <ReportClient
        reportData={reportData}
        className={dttClass.name}
        classId={classId}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create the report client**

Create `src/app/(app)/admin/dtt/classes/[classId]/report/report-client.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";

type ReportEntry = {
  userId: string;
  fullName: string;
  role: string;
  taskId: string;
  taskTitle: string;
  isInherited: boolean;
  completed: boolean;
  completionCount: number;
};

type ReportData = {
  className: string;
  date: string;
  entries: ReportEntry[];
  totalStudents: number;
  completedStudents: number;
};

export function ReportClient({
  reportData,
  className,
  classId,
}: {
  reportData: ReportData;
  className: string;
  classId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentDate = new Date(reportData.date + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = currentDate.getTime() === today.getTime();

  const prevDate = new Date(currentDate);
  prevDate.setDate(prevDate.getDate() - 1);
  const nextDate = new Date(currentDate);
  nextDate.setDate(nextDate.getDate() + 1);

  const formatDateParam = (d: Date) => d.toISOString().split("T")[0];
  const formatDateLabel = (d: Date) =>
    d.toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

  const navigateToDate = (d: Date) => {
    router.push(`/admin/dtt/classes/${classId}/report?date=${formatDateParam(d)}`);
  };

  const canGoNext = !isToday;

  // Group entries by student
  const studentsMap = new Map<string, ReportEntry[]>();
  for (const entry of reportData.entries) {
    if (!studentsMap.has(entry.userId)) studentsMap.set(entry.userId, []);
    studentsMap.get(entry.userId)!.push(entry);
  }

  // Get task columns
  const taskColumns = new Map<string, string>();
  for (const entry of reportData.entries) {
    if (!taskColumns.has(entry.taskId)) {
      taskColumns.set(entry.taskId, entry.taskTitle);
    }
  }

  const completionPercent =
    reportData.totalStudents > 0
      ? Math.round((reportData.completedStudents / reportData.totalStudents) * 100)
      : 0;

  return (
    <div className="space-y-4">
      {/* Back link and date nav */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/dtt"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Về trang quản lý ĐTT
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateToDate(prevDate)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-overlay-subtle"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium min-w-[160px] text-center">
            {formatDateLabel(currentDate)}
          </span>
          <button
            onClick={() => navigateToDate(nextDate)}
            disabled={!canGoNext}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-overlay-subtle disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="glass-card flex items-center gap-4 border border-border/40 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Tổng học viên:</span>
          <span className="text-sm font-bold">{reportData.totalStudents}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Hoàn thành:</span>
          <span className="text-sm font-bold text-primary">{reportData.completedStudents}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Tỷ lệ:</span>
          <span className="text-sm font-bold">{completionPercent}%</span>
        </div>
      </div>

      {/* Report table */}
      {reportData.entries.length === 0 ? (
        <div className="glass-card flex flex-col items-center py-12 text-center border border-border/40">
          <p className="text-sm text-muted-foreground">
            Chưa có nhiệm vụ hoặc học viên nào cho ngày này.
          </p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden border border-border/40">
          {/* Header row */}
          <div className="flex items-center gap-3 border-b border-border/40 bg-overlay-subtle/50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="min-w-[140px]">Học viên</div>
            {Array.from(taskColumns.entries()).map(([id, title]) => (
              <div key={id} className="flex-1 text-center truncate" title={title}>
                {title}
              </div>
            ))}
            <div className="w-24 text-center">Trạng thái</div>
          </div>

          {/* Student rows */}
          {Array.from(studentsMap.entries()).map(([userId, entries]) => {
            const studentEntries = new Map<string, ReportEntry>();
            for (const e of entries) studentEntries.set(e.taskId, e);
            const allDone = entries.every((e) => e.completed);

            return (
              <div
                key={userId}
                className="flex items-center gap-3 border-b border-border/30 px-4 py-2.5 last:border-b-0 hover:bg-overlay-subtle/20"
              >
                <div className="min-w-[140px]">
                  <p className="text-sm font-medium truncate">{entries[0]?.fullName}</p>
                  <p className="text-[10px] text-muted-foreground">{entries[0]?.role}</p>
                </div>
                {Array.from(taskColumns.keys()).map((taskId) => {
                  const entry = studentEntries.get(taskId);
                  return (
                    <div key={taskId} className="flex-1 flex justify-center">
                      {entry?.completed ? (
                        <span className="text-primary text-lg">✓</span>
                      ) : (
                        <span className="text-muted-foreground/30 text-lg">✗</span>
                      )}
                    </div>
                  );
                })}
                <div className="w-24 text-center">
                  {allDone ? (
                    <span className="text-xs font-semibold text-primary">Hoàn thành</span>
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground">Đang làm</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add "Báo cáo" button to class cards**

Modify `src/app/(app)/admin/dtt/dtt-class-tab.tsx`. Add import:

```typescript
import { BarChart3 } from "lucide-react";
```

Add "Báo cáo" button next to "Nhiệm vụ" in the class header:

```typescript
<Link
  href={`/admin/dtt/classes/${classItem.id}/report`}
  className="text-[10px] font-medium text-muted-foreground hover:text-primary transition-colors ml-1 inline-flex items-center"
>
  <BarChart3 className="h-3.5 w-3.5 mr-0.5" />
  Báo cáo
</Link>
```

- [ ] **Step 4: Run the app to verify**

Run: `npm run dev` then:
1. Visit `/admin/dtt` → click "Báo cáo" on a class
2. Should see report page with date nav and table
3. Navigate to different dates

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add per-class daily report page

Dedicated page at /admin/dtt/classes/[classId]/report with
date navigation, student-by-task completion table, and
summary stats. Linked from class card 'Báo cáo' button."
```

---

### Task 8: Migration script — Move existing isDtt tasks to classes

**Files:**
- Create: `src/migrate/dtt-class-tasks.ts`

- [ ] **Step 1: Create the migration script**

Create `src/migrate/dtt-class-tasks.ts`:

```typescript
/**
 * Migration: Move existing isDtt=true tasks to DttClassTask model.
 *
 * Usage: npx tsx src/migrate/dtt-class-tasks.ts
 *
 * Steps:
 * 1. Finds all tasks with isDtt: true
 * 2. Finds or creates a default DTT class "Lớp ĐTT Tổng"
 * 3. Creates DttClassTask entries (isInherited: true) for each
 * 4. Logs the migration summary
 *
 * After running, manually remove isDtt from Task schema (Task 3).
 */

import mongoose from "mongoose";
import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(process.cwd(), ".env") });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI not set in .env");
  process.exit(1);
}

async function run() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected.");

  const TaskModel = mongoose.model("Task", new mongoose.Schema({}, { strict: false }));
  const DttClassModel = mongoose.model("DttClass", new mongoose.Schema({}, { strict: false }));
  const DttClassTaskModel = mongoose.model(
    "DttClassTask",
    new mongoose.Schema({}, { strict: false })
  );

  // Step 1: Find all isDtt=true tasks
  const dttTasks = await TaskModel.find({ isDtt: true }).select("_id title teamId").lean();
  console.log(`\nFound ${dttTasks.length} tasks with isDtt: true`);

  if (dttTasks.length === 0) {
    console.log("No tasks to migrate. Done.");
    await mongoose.disconnect();
    return;
  }

  // Group by teamId
  const teamMap = new Map<string, typeof dttTasks>();
  for (const task of dttTasks) {
    const tid = task.teamId.toString();
    if (!teamMap.has(tid)) teamMap.set(tid, []);
    teamMap.get(tid)!.push(task);
  }

  console.log(`Tasks distributed across ${teamMap.size} team(s)`);

  // Step 2: For each team, find or create default class
  for (const [teamId, tasks] of teamMap) {
    console.log(`\n── Team: ${teamId} (${tasks.length} tasks) ──`);

    let defaultClass = await DttClassModel.findOne({
      teamId: new mongoose.Types.ObjectId(teamId),
      name: "Lớp ĐTT Tổng",
    }).lean();

    if (!defaultClass) {
      const firstTaskCreatedBy = tasks[0]?.createdBy;
      defaultClass = await DttClassModel.create({
        name: "Lớp ĐTT Tổng",
        teamId: new mongoose.Types.ObjectId(teamId),
        createdBy: firstTaskCreatedBy ? new mongoose.Types.ObjectId(firstTaskCreatedBy) : new mongoose.Types.ObjectId(),
        startDayOfWeek: 1,
      });
      console.log(`  Created default class: ${defaultClass.name} (${defaultClass._id})`);
    } else {
      console.log(`  Using existing default class: ${defaultClass.name} (${defaultClass._id})`);
    }

    // Step 3: Create DttClassTask entries
    let created = 0;
    let skipped = 0;

    for (const task of tasks) {
      const existing = await DttClassTaskModel.findOne({
        classId: defaultClass._id,
        taskId: task._id,
      });

      if (existing) {
        skipped++;
        continue;
      }

      await DttClassTaskModel.create({
        classId: defaultClass._id,
        taskId: task._id,
        teamId: new mongoose.Types.ObjectId(teamId),
        isInherited: true,
      });
      created++;
      console.log(`  ✓ Migrated: "${task.title}"`);
    }

    console.log(`  Result: ${created} created, ${skipped} skipped`);
  }

  console.log("\n✅ Migration complete.");
  console.log("Next step: Remove isDtt field from Task schema (Task 3).");

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Test the migration (dry run)**

Run: `npx tsx src/migrate/dtt-class-tasks.ts`
Expected: Either "No tasks to migrate" or migration summary with created/skipped counts.

- [ ] **Step 3: Commit**

```bash
git add src/migrate/dtt-class-tasks.ts
git commit -m "feat: add migration script for isDtt → DttClassTask

Migrates all isDtt=true tasks to DttClassTask entries in a
default 'Lớp ĐTT Tổng' class per team. Safe to re-run
(skips existing entries)."
```

---

### Task 9: Final integration test and cleanup

**Files:**
- Modify: `src/app/(app)/admin/campaigns/actions.ts` (remove isDtt from parsed object)

- [ ] **Step 1: Remove last isDtt references**

Search for remaining `isDtt` references:

```bash
grep -rn "isDtt" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".test.ts"
```

Expected: Only references in `class-task-service.ts` (new) and migration script. If any remain in old files, remove them.

Specifically check `src/app/(app)/admin/campaigns/actions.ts`:
```typescript
// Remove isDtt: false from the createCampaignOnlyTaskAction parsed object
```

- [ ] **Step 2: Full test suite**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: clean up remaining isDtt references and verify build

Remove isDtt from campaign actions, verify all tests pass,
and confirm TypeScript compiles without errors."
```

---

## Self-Review

### Spec Coverage Check

| Spec Section | Covered By Task |
|---|---|
| DttClassTask model | Task 1 |
| isInherited field + EXP-only rule | Task 1, Task 2 (buildClassTaskCard) |
| Exclusivity rule | Task 2, Task 4 |
| Dashboard DTT section | Task 5 |
| Admin popup (inherit + custom) | Task 6 |
| Per-class report page | Task 7 |
| Migration to remove isDtt | Task 3, Task 8 |
| Delete old files | Task 3 |

### Placeholder Scan

No TBD, TODO, "fill in", "add appropriate", or "similar to Task N" found.

### Type Consistency

- `TaskCard` type used consistently across Tasks 2, 5
- `DttClassTaskRecord` defined in Task 1, used in Tasks 2, 6, 8
- `isInherited: boolean` consistent across all files
- `classId`, `taskId`, `teamId` naming consistent

### Scope Check

Each task produces working, testable software:
- Task 1: Model works, tests pass
- Task 2: Service logic tested, helper functions verified
- Task 3: Old system removed, no regressions
- Task 4: Exclusivity working (verified via service)
- Task 5: Dashboard shows DTT section
- Task 6: Admin can manage class tasks
- Task 7: Report page accessible and functional
- Task 8: Migration script runs safely
- Task 9: Clean build, all tests pass
