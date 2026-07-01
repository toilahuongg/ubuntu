# Daily Campaign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one daily campaign per team, managed by `TEAM_LEAD`, with reusable campaign-only tasks, dashboard display, submission enforcement, and scoped completion reporting.

**Architecture:** Add `DailyCampaign` as the campaign container and add `campaignOnly` to `Task` for reusable campaign tasks. Keep completion source-of-truth in existing `Submission` records and extend dashboard/report services to compose campaign tasks with normal task cards. Add a small admin route under `/admin/campaigns` for team leads to manage today's campaign and reusable campaign-only tasks.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Mongoose, Zod, Vitest, Tailwind CSS, lucide-react.

---

## File Structure

- Create `src/lib/models/daily-campaign.ts`: Mongoose schema, indexes, and record type for campaigns.
- Modify `src/lib/models/task.ts`: add `campaignOnly` boolean field and type.
- Modify `src/lib/models/index.ts`: export `DailyCampaignModel`.
- Modify `src/lib/tasks/types.ts`: expose `campaignOnly`, campaign card section data, and report row types.
- Create `src/lib/campaigns/constants.ts`: campaign role constants and labels.
- Create `src/lib/campaigns/campaign-service.ts`: validation, create/update, task eligibility, dashboard composition helpers, and report builder.
- Create `src/lib/campaigns/campaign-service.test.ts`: service-level tests using existing model patterns.
- Modify `src/lib/tasks/task-service.ts`: create/list campaign-only tasks and exclude campaign-only tasks from normal template/dashboard lists where appropriate.
- Modify `src/lib/tasks/dashboard-service.ts`: load daily campaign, include campaign task cards, and remove campaign cards from normal daily cards.
- Modify `src/lib/tasks/submission-service.ts`: block submitting campaign-only tasks unless included in a campaign for the submitted date.
- Modify `src/app/(app)/dashboard/member-dashboard.tsx`: render `Chiến dịch hôm nay` before normal daily tasks.
- Create `src/app/(app)/admin/campaigns/page.tsx`: team lead campaign management page.
- Create `src/app/(app)/admin/campaigns/actions.ts`: server actions for saving today's campaign and campaign-only tasks.
- Create `src/app/(app)/admin/campaigns/campaign-manager.tsx`: client UI for selecting existing tasks, creating reusable special tasks, and viewing results.
- Modify `src/app/(app)/admin/page.tsx`: add nav link for `Chiến dịch ngày`.
- Modify `src/lib/validation.ts`: add campaign action schemas.

Before editing Next server actions or route files, read the relevant Next 16 guide in `node_modules/next/dist/docs/` as required by `AGENTS.md`.

---

### Task 1: Models And Shared Types

**Files:**
- Create: `src/lib/models/daily-campaign.ts`
- Modify: `src/lib/models/task.ts`
- Modify: `src/lib/models/index.ts`
- Create: `src/lib/campaigns/constants.ts`
- Modify: `src/lib/tasks/types.ts`

- [ ] **Step 1: Write the failing model/type tests**

Create `src/lib/campaigns/campaign-service.test.ts` with the initial constant/model shape tests:

```ts
import { describe, expect, it } from "vitest";

import {
  CAMPAIGN_TARGET_ROLES,
  isCampaignRole,
} from "@/lib/campaigns/constants";

describe("campaign constants", () => {
  it("uses the approved campaign roles", () => {
    expect(CAMPAIGN_TARGET_ROLES).toEqual([
      "NGV",
      "REGIONAL_LEAD",
      "ZONE_LEAD",
      "TEAM_LEAD",
    ]);
  });

  it("recognizes only campaign roles", () => {
    expect(isCampaignRole("NGV")).toBe(true);
    expect(isCampaignRole("REGIONAL_LEAD")).toBe(true);
    expect(isCampaignRole("ZONE_LEAD")).toBe(true);
    expect(isCampaignRole("TEAM_LEAD")).toBe(true);
    expect(isCampaignRole("MEMBER")).toBe(false);
    expect(isCampaignRole("ADMIN")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/campaigns/campaign-service.test.ts`

Expected: FAIL because `@/lib/campaigns/constants` does not exist.

- [ ] **Step 3: Add campaign constants**

Create `src/lib/campaigns/constants.ts`:

```ts
import type { Role, TaskTargetRole } from "@/lib/domain";

export const CAMPAIGN_TARGET_ROLES = [
  "NGV",
  "REGIONAL_LEAD",
  "ZONE_LEAD",
  "TEAM_LEAD",
] as const satisfies readonly TaskTargetRole[];

export type CampaignTargetRole = (typeof CAMPAIGN_TARGET_ROLES)[number];

export function isCampaignRole(role: Role): role is CampaignTargetRole {
  return (CAMPAIGN_TARGET_ROLES as readonly string[]).includes(role);
}
```

- [ ] **Step 4: Add `DailyCampaign` model**

Create `src/lib/models/daily-campaign.ts`:

```ts
import { InferSchemaType, model, models, Schema, Types } from "mongoose";

const dailyCampaignSchema = new Schema(
  {
    createdBy: { ref: "User", required: true, type: Schema.Types.ObjectId },
    date: { required: true, type: String },
    taskIds: {
      default: [],
      ref: "Task",
      required: true,
      type: [Schema.Types.ObjectId],
    },
    teamId: { ref: "Team", required: true, type: Schema.Types.ObjectId },
    updatedBy: { default: null, ref: "User", type: Schema.Types.ObjectId },
  },
  { timestamps: true },
);

dailyCampaignSchema.index({ teamId: 1, date: 1 }, { unique: true });
dailyCampaignSchema.index({ date: 1, teamId: 1 });

export type DailyCampaignRecord =
  InferSchemaType<typeof dailyCampaignSchema> & {
    _id: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
  };

export const DailyCampaignModel =
  models.DailyCampaign || model("DailyCampaign", dailyCampaignSchema);
```

- [ ] **Step 5: Add `campaignOnly` to task model**

In `src/lib/models/task.ts`, add the schema field near `isDtt`:

```ts
campaignOnly: { default: false, type: Boolean },
```

Add to `TaskRecord`:

```ts
campaignOnly: boolean;
```

Add an index:

```ts
taskSchema.index({ campaignOnly: 1, isActive: 1, teamId: 1, createdAt: -1 });
```

- [ ] **Step 6: Export the model**

In `src/lib/models/index.ts`, add:

```ts
export * from "@/lib/models/daily-campaign";
```

- [ ] **Step 7: Extend task/dashboard types**

In `src/lib/tasks/types.ts`, add `campaignOnly: boolean` to `TaskSummary`.

Add campaign view types:

```ts
export type CampaignTaskStatus = {
  taskId: string;
  applicable: boolean;
  completionCount: number;
};

export type CampaignReportEntry = {
  id: string;
  fullName: string;
  role: Role;
  completed: number;
  total: number;
  isComplete: boolean;
  statuses: CampaignTaskStatus[];
};

export type DailyCampaignView = {
  id: string;
  date: string;
  taskIds: string[];
  cards: TaskCard[];
  report: CampaignReportEntry[];
};
```

Add `campaign: DailyCampaignView | null` to both `DashboardView` and `MemberDashboardView`.

- [ ] **Step 8: Make `mapTask` include `campaignOnly`**

In `src/lib/tasks/task-service.ts`, inside `mapTask`, add:

```ts
campaignOnly: !!record.campaignOnly,
```

- [ ] **Step 9: Run tests**

Run: `npm test -- src/lib/campaigns/campaign-service.test.ts`

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/lib/models/daily-campaign.ts src/lib/models/task.ts src/lib/models/index.ts src/lib/campaigns/constants.ts src/lib/tasks/types.ts src/lib/tasks/task-service.ts src/lib/campaigns/campaign-service.test.ts
git commit -m "feat: add daily campaign models"
```

---

### Task 2: Campaign Service Validation And Persistence

**Files:**
- Create/Modify: `src/lib/campaigns/campaign-service.ts`
- Modify: `src/lib/campaigns/campaign-service.test.ts`
- Modify: `src/lib/validation.ts`

- [ ] **Step 1: Add failing service tests**

Append tests for permissions and persistence:

```ts
import { Types } from "mongoose";
import type { SessionUser } from "@/lib/domain";
import {
  assertCanManageDailyCampaign,
  normalizeCampaignTaskIds,
} from "@/lib/campaigns/campaign-service";

const activeTeamLead: SessionUser = {
  fullName: "Lead",
  id: new Types.ObjectId().toString(),
  role: "TEAM_LEAD",
  status: "ACTIVE",
  teamId: new Types.ObjectId().toString(),
};

describe("campaign management permissions", () => {
  it("allows team leads with a team", () => {
    expect(() => assertCanManageDailyCampaign(activeTeamLead)).not.toThrow();
  });

  it("rejects non team leads", () => {
    expect(() =>
      assertCanManageDailyCampaign({ ...activeTeamLead, role: "ZONE_LEAD" }),
    ).toThrow("Chỉ CS - ĐL");
  });

  it("deduplicates selected task ids in order", () => {
    expect(normalizeCampaignTaskIds(["a", "b", "a", "", "c"])).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});
```

- [ ] **Step 2: Run the tests to verify failure**

Run: `npm test -- src/lib/campaigns/campaign-service.test.ts`

Expected: FAIL because service exports do not exist.

- [ ] **Step 3: Implement service skeleton**

Create `src/lib/campaigns/campaign-service.ts`:

```ts
import "server-only";

import type { SessionUser } from "@/lib/domain";
import { getTodayDateKey } from "@/lib/dates";
import { connectToDatabase } from "@/lib/mongoose";
import {
  AuditLogModel,
  DailyCampaignModel,
  TaskModel,
  type DailyCampaignRecord,
  type TaskRecord,
} from "@/lib/models";
import { normalizeTaskType } from "@/lib/tasks/constants";
import { appliesToUser } from "@/lib/tasks/policy";
import { isTaskScheduledForDate } from "@/lib/tasks/schedule";
import { taskToScope } from "@/lib/tasks/task-service";
import { toObjectId } from "@/lib/utils/ids";
import { CAMPAIGN_TARGET_ROLES } from "@/lib/campaigns/constants";

export function assertCanManageDailyCampaign(actor: SessionUser): asserts actor is SessionUser & { teamId: string } {
  if (actor.role !== "TEAM_LEAD" || !actor.teamId) {
    throw new Error("Chỉ CS - ĐL có Nhóm mới được quản lý chiến dịch.");
  }
}

export function normalizeCampaignTaskIds(taskIds: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const taskId of taskIds.map((id) => id.trim()).filter(Boolean)) {
    if (seen.has(taskId)) continue;
    seen.add(taskId);
    result.push(taskId);
  }
  return result;
}

export function assertEditableCampaignDate(dateKey: string, now = new Date()) {
  if (dateKey !== getTodayDateKey(now)) {
    throw new Error("Chỉ được tạo hoặc sửa chiến dịch trong ngày hiện tại.");
  }
}

function campaignRoleUserShapes(teamId: string) {
  return CAMPAIGN_TARGET_ROLES.map((role) => ({
    role,
    teamId,
    zoneId: null,
    regionId: null,
  }));
}

export function isTaskEligibleForCampaign(task: TaskRecord, teamId: string, dateKey: string): boolean {
  if (!task.isActive) return false;
  if (task.teamId.toString() !== teamId) return false;
  if (task.scope !== "TEAM") return false;

  if (task.campaignOnly) {
    return normalizeTaskType(task.taskType) === "DAILY_PER_MEMBER";
  }

  if (!isTaskScheduledForDate(task, dateKey)) return false;
  const scope = taskToScope(task);
  return campaignRoleUserShapes(teamId).some((user) => appliesToUser(scope, user));
}

export async function saveDailyCampaign(
  actor: SessionUser,
  input: { date: string; taskIds: string[] },
): Promise<string> {
  assertCanManageDailyCampaign(actor);
  assertEditableCampaignDate(input.date);
  const taskIds = normalizeCampaignTaskIds(input.taskIds);
  if (taskIds.length === 0) {
    throw new Error("Vui lòng chọn ít nhất một nhiệm vụ cho chiến dịch.");
  }

  await connectToDatabase();
  const tasks = (await TaskModel.find({
    _id: { $in: taskIds.map(toObjectId) },
  }).lean()) as TaskRecord[];
  const taskById = new Map(tasks.map((task) => [task._id.toString(), task]));

  for (const taskId of taskIds) {
    const task = taskById.get(taskId);
    if (!task || !isTaskEligibleForCampaign(task, actor.teamId, input.date)) {
      throw new Error("Có nhiệm vụ không hợp lệ cho chiến dịch ngày này.");
    }
  }

  const updated = (await DailyCampaignModel.findOneAndUpdate(
    { date: input.date, teamId: toObjectId(actor.teamId) },
    {
      $set: {
        taskIds: taskIds.map(toObjectId),
        updatedBy: toObjectId(actor.id),
      },
      $setOnInsert: {
        createdBy: toObjectId(actor.id),
        date: input.date,
        teamId: toObjectId(actor.teamId),
      },
    },
    { new: true, upsert: true },
  ).lean()) as DailyCampaignRecord;

  await AuditLogModel.create({
    action: "daily-campaign.saved",
    actorUserId: toObjectId(actor.id),
    entityId: updated._id.toString(),
    entityType: "DailyCampaign",
    metadata: { date: input.date, taskIds, teamId: actor.teamId },
  });

  return updated._id.toString();
}
```

- [ ] **Step 4: Add validation schemas**

In `src/lib/validation.ts`, add:

```ts
export const saveDailyCampaignInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ."),
  taskIds: z.array(z.string().min(1)).min(1, "Vui lòng chọn nhiệm vụ."),
});

export const campaignOnlyTaskInputSchema = taskBaseSchema
  .extend({
    isActive: z.boolean().default(true),
  })
  .transform((value) => ({
    ...value,
    taskType: "DAILY_PER_MEMBER" as const,
    scheduleType: DEFAULT_TASK_SCHEDULE_TYPE,
    scheduledWeekdays: [],
    scheduledMonthDays: [],
    targetCount: undefined,
  }));
```

- [ ] **Step 5: Run tests**

Run: `npm test -- src/lib/campaigns/campaign-service.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/campaigns/campaign-service.ts src/lib/campaigns/campaign-service.test.ts src/lib/validation.ts
git commit -m "feat: add daily campaign service"
```

---

### Task 3: Campaign-Only Task Creation And Normal Task Exclusion

**Files:**
- Modify: `src/lib/tasks/task-service.ts`
- Modify: `src/lib/tasks/dashboard-service.ts`
- Modify: `src/lib/campaigns/campaign-service.test.ts`

- [ ] **Step 1: Add failing tests for campaign-only defaults**

Append:

```ts
import { createCampaignOnlyTaskInput } from "@/lib/tasks/task-service";

describe("campaign-only task input", () => {
  it("forces campaign-only tasks to daily team tasks", () => {
    const input = createCampaignOnlyTaskInput({
      title: "Special",
      description: "",
      deadlineTime: "20:00",
      expReward: 20,
      pointReward: 5,
      lateWindowDays: 1,
      targetRoles: ["NGV"],
      submissionMessage: "",
      completionMessage: "",
    });

    expect(input).toMatchObject({
      campaignOnly: true,
      taskType: "DAILY_PER_MEMBER",
      scheduleType: "EVERY_DAY",
      scheduledWeekdays: [],
      scheduledMonthDays: [],
      targetCount: null,
    });
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm test -- src/lib/campaigns/campaign-service.test.ts`

Expected: FAIL because `createCampaignOnlyTaskInput` is missing.

- [ ] **Step 3: Extend task input types and creation**

In `src/lib/tasks/task-service.ts`, add `campaignOnly?: boolean` to `CreateTaskInput` and `UpdateTaskInput`.

Add helper:

```ts
export function createCampaignOnlyTaskInput(
  input: Omit<CreateTaskInput, "campaignOnly" | "taskType" | "scheduleType" | "scheduledWeekdays" | "scheduledMonthDays" | "targetCount">,
): CreateTaskInput {
  return {
    ...input,
    campaignOnly: true,
    taskType: "DAILY_PER_MEMBER",
    scheduleType: "EVERY_DAY",
    scheduledWeekdays: [],
    scheduledMonthDays: [],
    targetCount: null,
  };
}
```

Inside `createTask`, set:

```ts
const campaignOnly = !!input.campaignOnly;
if (campaignOnly && actor.role !== "TEAM_LEAD") {
  throw new Error("Chỉ CS - ĐL được tạo nhiệm vụ chiến dịch.");
}
if (campaignOnly && actorScope.scope !== "TEAM") {
  throw new Error("Nhiệm vụ chiến dịch chỉ áp dụng trong toàn Nhóm.");
}
const taskType: TaskType = campaignOnly
  ? "DAILY_PER_MEMBER"
  : normalizeTaskType(input.taskType);
```

In the create payload, add:

```ts
campaignOnly,
```

Use the forced schedule for campaign-only tasks:

```ts
const schedule = normalizeTaskSchedule({
  scheduleType: campaignOnly ? "EVERY_DAY" : input.scheduleType,
  scheduledMonthDays: campaignOnly ? [] : input.scheduledMonthDays,
  scheduledWeekdays: campaignOnly ? [] : input.scheduledWeekdays,
  taskType,
});
```

Inside `updateTask`, prevent changing normal tasks into campaign-only:

```ts
if (!!input.campaignOnly !== !!record.campaignOnly) {
  throw new Error("Không thể đổi loại nhiệm vụ chiến dịch.");
}
```

- [ ] **Step 4: Exclude campaign-only tasks from normal task loading**

In `listVisibleTaskRecordsForActor`, add `campaignOnly: { $ne: true }` to both admin and team queries used for the normal templates page unless building the campaign admin page.

In `loadScopeDataForVisibleUsers` inside `src/lib/tasks/dashboard-service.ts`, add to `TaskModel.find`:

```ts
campaignOnly: { $ne: true },
```

- [ ] **Step 5: Run focused tests**

Run: `npm test -- src/lib/campaigns/campaign-service.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/tasks/task-service.ts src/lib/tasks/dashboard-service.ts src/lib/campaigns/campaign-service.test.ts
git commit -m "feat: support campaign-only tasks"
```

---

### Task 4: Dashboard Campaign Composition

**Files:**
- Modify: `src/lib/campaigns/campaign-service.ts`
- Modify: `src/lib/tasks/dashboard-service.ts`
- Modify: `src/app/(app)/dashboard/member-dashboard.tsx`
- Modify: `src/lib/campaigns/campaign-service.test.ts`

- [ ] **Step 1: Add failing pure report helper tests**

Append:

```ts
import { buildCampaignReportRows } from "@/lib/campaigns/campaign-service";

describe("campaign report rows", () => {
  it("marks a user complete only when all applicable campaign tasks are complete", () => {
    const rows = buildCampaignReportRows({
      taskIds: ["task-a", "task-b"],
      users: [
        { id: "u1", fullName: "A", role: "NGV" },
        { id: "u2", fullName: "B", role: "NGV" },
      ],
      applicableUserIdsByTaskId: new Map([
        ["task-a", new Set(["u1", "u2"])],
        ["task-b", new Set(["u1", "u2"])],
      ]),
      completionByTaskUser: new Map([
        ["task-a:u1", 1],
        ["task-b:u1", 1],
        ["task-a:u2", 1],
      ]),
    });

    expect(rows).toEqual([
      {
        id: "u1",
        fullName: "A",
        role: "NGV",
        completed: 2,
        total: 2,
        isComplete: true,
        statuses: [
          { taskId: "task-a", applicable: true, completionCount: 1 },
          { taskId: "task-b", applicable: true, completionCount: 1 },
        ],
      },
      {
        id: "u2",
        fullName: "B",
        role: "NGV",
        completed: 1,
        total: 2,
        isComplete: false,
        statuses: [
          { taskId: "task-a", applicable: true, completionCount: 1 },
          { taskId: "task-b", applicable: true, completionCount: 0 },
        ],
      },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm test -- src/lib/campaigns/campaign-service.test.ts`

Expected: FAIL because `buildCampaignReportRows` is missing.

- [ ] **Step 3: Add report helper**

In `src/lib/campaigns/campaign-service.ts`, add:

```ts
import type { CampaignReportEntry } from "@/lib/tasks/types";

export function buildCampaignReportRows(input: {
  taskIds: string[];
  users: Array<{ id: string; fullName: string; role: CampaignReportEntry["role"] }>;
  applicableUserIdsByTaskId: Map<string, Set<string>>;
  completionByTaskUser: Map<string, number>;
}): CampaignReportEntry[] {
  return input.users.map((user) => {
    const statuses = input.taskIds.map((taskId) => {
      const applicable =
        input.applicableUserIdsByTaskId.get(taskId)?.has(user.id) ?? false;
      const completionCount =
        input.completionByTaskUser.get(`${taskId}:${user.id}`) ?? 0;
      return { taskId, applicable, completionCount };
    });
    const applicableStatuses = statuses.filter((status) => status.applicable);
    const completed = applicableStatuses.filter(
      (status) => status.completionCount > 0,
    ).length;
    return {
      id: user.id,
      fullName: user.fullName,
      role: user.role,
      completed,
      total: applicableStatuses.length,
      isComplete:
        applicableStatuses.length > 0 && completed === applicableStatuses.length,
      statuses,
    };
  });
}
```

- [ ] **Step 4: Add daily campaign loader for dashboard**

In `src/lib/campaigns/campaign-service.ts`, add a function:

```ts
export async function getDailyCampaignRecordForTeam(
  teamId: string | null | undefined,
  dateKey: string,
): Promise<DailyCampaignRecord | null> {
  if (!teamId) return null;
  await connectToDatabase();
  return (await DailyCampaignModel.findOne({
    date: dateKey,
    teamId: toObjectId(teamId),
  }).lean()) as DailyCampaignRecord | null;
}
```

- [ ] **Step 5: Compose campaign cards in dashboard service**

In `buildMemberDashboard`, load campaign after `loadVisibleTasksAndSubs`. Fetch campaign tasks separately by campaign `taskIds`, build cards with existing `buildTaskCard`, and remove campaign task ids from normal `cards`.

Use this shape:

```ts
const campaignTaskIds = new Set(campaignTasks.map((task) => task._id.toString()));
const normalPersonalTasks = personalTasks.filter(
  (task) => !campaignTaskIds.has(task._id.toString()),
);
```

Return:

```ts
campaign: campaignCards.length > 0
  ? {
      id: campaign._id.toString(),
      date: dateKey,
      taskIds: campaignCards.map((card) => card.id),
      cards: campaignCards,
      report: [],
    }
  : null,
```

Apply the same composition to `buildDashboardView` for leader dashboards, with `report` built from visible users and campaign submissions.

- [ ] **Step 6: Render campaign section on member dashboard**

In `src/app/(app)/dashboard/member-dashboard.tsx`, before the normal daily section:

```tsx
{data.campaign && data.campaign.cards.length > 0 && (
  <TaskCardSection
    title="Chiến dịch hôm nay"
    cards={data.campaign.cards}
    userId={userId}
    variant="member"
  />
)}
```

- [ ] **Step 7: Run tests**

Run:

```bash
npm test -- src/lib/campaigns/campaign-service.test.ts
npm test -- src/app/'(app)'/admin/operations-dashboard.helpers.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/campaigns/campaign-service.ts src/lib/tasks/dashboard-service.ts src/app/'(app)'/dashboard/member-dashboard.tsx src/lib/campaigns/campaign-service.test.ts
git commit -m "feat: show daily campaign on dashboard"
```

---

### Task 5: Submission Guard For Campaign-Only Tasks

**Files:**
- Modify: `src/lib/tasks/submission-service.ts`
- Modify: `src/lib/campaigns/campaign-service.ts`
- Modify: `src/lib/campaigns/campaign-service.test.ts`

- [ ] **Step 1: Add pure guard test**

Append:

```ts
import { assertCampaignOnlyTaskCanSubmit } from "@/lib/campaigns/campaign-service";

describe("campaign-only submission guard", () => {
  it("rejects campaign-only tasks outside the campaign", () => {
    expect(() =>
      assertCampaignOnlyTaskCanSubmit({
        campaignOnly: true,
        taskId: "task-a",
        campaignTaskIds: ["task-b"],
      }),
    ).toThrow("Nhiệm vụ chiến dịch chỉ được nộp khi nằm trong chiến dịch ngày này.");
  });

  it("allows normal tasks and included campaign-only tasks", () => {
    expect(() =>
      assertCampaignOnlyTaskCanSubmit({
        campaignOnly: false,
        taskId: "task-a",
        campaignTaskIds: [],
      }),
    ).not.toThrow();
    expect(() =>
      assertCampaignOnlyTaskCanSubmit({
        campaignOnly: true,
        taskId: "task-a",
        campaignTaskIds: ["task-a"],
      }),
    ).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm test -- src/lib/campaigns/campaign-service.test.ts`

Expected: FAIL because guard is missing.

- [ ] **Step 3: Implement guard**

In `src/lib/campaigns/campaign-service.ts`, add:

```ts
export function assertCampaignOnlyTaskCanSubmit(input: {
  campaignOnly: boolean;
  taskId: string;
  campaignTaskIds: string[];
}) {
  if (!input.campaignOnly) return;
  if (input.campaignTaskIds.includes(input.taskId)) return;
  throw new Error(
    "Nhiệm vụ chiến dịch chỉ được nộp khi nằm trong chiến dịch ngày này.",
  );
}
```

- [ ] **Step 4: Use guard in submission service**

In `src/lib/tasks/submission-service.ts`, import:

```ts
import {
  assertCampaignOnlyTaskCanSubmit,
  getDailyCampaignRecordForTeam,
} from "@/lib/campaigns/campaign-service";
```

After `taskRaw` and `subjectRaw` are loaded and `subjectSession` is built, add:

```ts
const campaign =
  taskRaw.campaignOnly && subjectSession.teamId
    ? await getDailyCampaignRecordForTeam(subjectSession.teamId, dateKey)
    : null;
assertCampaignOnlyTaskCanSubmit({
  campaignOnly: !!taskRaw.campaignOnly,
  taskId: taskRaw._id.toString(),
  campaignTaskIds: campaign?.taskIds.map((id) => id.toString()) ?? [],
});
```

For campaign-only tasks, skip `isTaskScheduledForDate` because campaign membership controls date visibility:

```ts
if (!taskRaw.campaignOnly && !isTaskScheduledForDate(taskRaw, dateKey)) {
  throw new Error("Nhiệm vụ này không được lên lịch cho ngày đã chọn.");
}
```

- [ ] **Step 5: Run tests**

Run: `npm test -- src/lib/campaigns/campaign-service.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/tasks/submission-service.ts src/lib/campaigns/campaign-service.ts src/lib/campaigns/campaign-service.test.ts
git commit -m "feat: guard campaign task submissions"
```

---

### Task 6: Admin Campaign Management UI

**Files:**
- Create: `src/app/(app)/admin/campaigns/actions.ts`
- Create: `src/app/(app)/admin/campaigns/page.tsx`
- Create: `src/app/(app)/admin/campaigns/campaign-manager.tsx`
- Modify: `src/app/(app)/admin/page.tsx`
- Modify: `src/lib/campaigns/campaign-service.ts`

- [ ] **Step 1: Read Next 16 docs required by AGENTS.md**

Run:

```bash
ls node_modules/next/dist/docs
find node_modules/next/dist/docs -maxdepth 2 -iname '*server*' -o -iname '*app*' | head -20
```

Open the relevant App Router and server action docs found there before editing this task.

- [ ] **Step 2: Add service functions for admin page data**

In `src/lib/campaigns/campaign-service.ts`, add:

```ts
import { mapTask, sortTasksForDisplay } from "@/lib/tasks/task-service";
import type { TaskSummary } from "@/lib/tasks/types";

export type DailyCampaignAdminView = {
  date: string;
  campaignId: string | null;
  selectedTaskIds: string[];
  eligibleTasks: TaskSummary[];
  campaignOnlyTasks: TaskSummary[];
  report: CampaignReportEntry[];
};

export async function getDailyCampaignAdminView(
  actor: SessionUser,
  dateKey: string,
): Promise<DailyCampaignAdminView> {
  assertCanManageDailyCampaign(actor);
  await connectToDatabase();
  const [campaign, tasks] = await Promise.all([
    DailyCampaignModel.findOne({
      date: dateKey,
      teamId: toObjectId(actor.teamId),
    }).lean() as Promise<DailyCampaignRecord | null>,
    TaskModel.find({
      isActive: true,
      scope: "TEAM",
      teamId: toObjectId(actor.teamId),
    }).lean() as Promise<TaskRecord[]>,
  ]);

  const eligibleTasks = sortTasksForDisplay(
    tasks.filter((task) => !task.campaignOnly && isTaskEligibleForCampaign(task, actor.teamId, dateKey)),
  ).map(mapTask);

  const campaignOnlyTasks = sortTasksForDisplay(
    tasks.filter((task) => task.campaignOnly),
  ).map(mapTask);

  const selectedTaskIds = campaign?.taskIds.map((id) => id.toString()) ?? [];

  return {
    date: dateKey,
    campaignId: campaign?._id.toString() ?? null,
    selectedTaskIds,
    eligibleTasks,
    campaignOnlyTasks,
    report: [],
  };
}
```

Before implementation is complete, replace the temporary empty `report` with the same report builder used by `buildDashboardView`, scoped to all visible users in the team lead's team.

- [ ] **Step 3: Create server actions**

Create `src/app/(app)/admin/campaigns/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { runAction, type ActionResult } from "@/lib/actions/result";
import { getSessionUser } from "@/lib/auth/session";
import {
  saveDailyCampaign,
} from "@/lib/campaigns/campaign-service";
import { createTask, createCampaignOnlyTaskInput } from "@/lib/tasks/task-service";
import {
  campaignOnlyTaskInputSchema,
  saveDailyCampaignInputSchema,
} from "@/lib/validation";

async function requireSession() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  return session;
}

export async function saveDailyCampaignAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const session = await requireSession();
    const parsed = saveDailyCampaignInputSchema.parse({
      date: formData.get("date") ?? "",
      taskIds: formData.getAll("taskIds").map(String),
    });
    const id = await saveDailyCampaign(session, parsed);
    revalidatePath("/admin/campaigns");
    revalidatePath("/dashboard");
    return { id };
  });
}

export async function createCampaignOnlyTaskAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const session = await requireSession();
    const parsed = campaignOnlyTaskInputSchema.parse({
      title: formData.get("title") ?? "",
      description: (formData.get("description") as string) ?? "",
      externalLabel: (formData.get("externalLabel") as string) ?? "",
      externalUrl: (formData.get("externalUrl") as string) ?? "",
      deadlineTime: formData.get("deadlineTime") ?? "20:00",
      expReward: Number(formData.get("expReward") ?? 10),
      pointReward: Number(formData.get("pointReward") ?? 10),
      lateWindowDays: Number(formData.get("lateWindowDays") ?? 1),
      targetRoles: formData.getAll("targetRoles").map(String),
      submissionMessage: (formData.get("submissionMessage") as string) ?? "",
      completionMessage: "",
      taskType: "DAILY_PER_MEMBER",
      scheduleType: "EVERY_DAY",
      scheduledWeekdays: [],
      scheduledMonthDays: [],
      isDtt: false,
      isActive: true,
    });
    const id = await createTask(session, createCampaignOnlyTaskInput(parsed));
    revalidatePath("/admin/campaigns");
    return { id };
  });
}
```

- [ ] **Step 4: Create server page**

Create `src/app/(app)/admin/campaigns/page.tsx`:

```tsx
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { getTodayDateKey } from "@/lib/dates";
import { getDailyCampaignAdminView } from "@/lib/campaigns/campaign-service";
import { CampaignManager } from "./campaign-manager";

export default async function CampaignsPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (session.role !== "TEAM_LEAD" || !session.teamId) redirect("/dashboard");

  const dateKey = getTodayDateKey();
  const data = await getDailyCampaignAdminView(session, dateKey);
  return <CampaignManager data={data} />;
}
```

- [ ] **Step 5: Create client manager**

Create `src/app/(app)/admin/campaigns/campaign-manager.tsx` with a compact UI:

```tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import { CalendarDays, Plus, Save } from "lucide-react";

import { ROLE_LABELS } from "@/lib/domain";
import { CAMPAIGN_TARGET_ROLES } from "@/lib/campaigns/constants";
import type { DailyCampaignAdminView } from "@/lib/campaigns/campaign-service";
import {
  createCampaignOnlyTaskAction,
  saveDailyCampaignAction,
} from "./actions";

export function CampaignManager({ data }: { data: DailyCampaignAdminView }) {
  const [selected, setSelected] = useState(() => new Set(data.selectedTaskIds));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const tasks = useMemo(
    () => [...data.eligibleTasks, ...data.campaignOnlyTasks],
    [data.eligibleTasks, data.campaignOnlyTasks],
  );

  function toggle(taskId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  function saveCampaign() {
    const formData = new FormData();
    formData.set("date", data.date);
    for (const taskId of selected) formData.append("taskIds", taskId);
    setError(null);
    startTransition(async () => {
      const result = await saveDailyCampaignAction(formData);
      if (!result.ok) setError(result.error);
    });
  }

  function createSpecialTask(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createCampaignOnlyTaskAction(formData);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Chiến dịch ngày
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            {data.date}
          </p>
        </div>
        <button
          type="button"
          onClick={saveCampaign}
          disabled={isPending || selected.size === 0}
          className="btn-primary-gradient inline-flex h-10 items-center gap-2 px-4 text-sm disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          Lưu
        </button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Nhiệm vụ chọn vào chiến dịch</h2>
        <div className="grid gap-2">
          {tasks.map((task) => (
            <label
              key={task.id}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-3 text-sm"
            >
              <input
                type="checkbox"
                checked={selected.has(task.id)}
                onChange={() => toggle(task.id)}
                className="mt-1"
              />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{task.title}</span>
                <span className="block text-xs text-muted-foreground">
                  {task.campaignOnly ? "Nhiệm vụ riêng chiến dịch" : "Nhiệm vụ có sẵn"} · {task.expReward} EXP · {task.pointReward} điểm
                </span>
              </span>
            </label>
          ))}
        </div>
      </section>

      {data.report.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Kết quả chiến dịch</h2>
          <div className="overflow-hidden rounded-lg border border-border">
            {data.report.map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-3 border-b border-border px-3 py-2 last:border-b-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.completed}/{row.total} nhiệm vụ
                  </p>
                </div>
                <span className={row.isComplete ? "text-xs font-semibold text-primary" : "text-xs font-semibold text-muted-foreground"}>
                  {row.isComplete ? "Hoàn thành" : "Đang làm"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <form action={createSpecialTask} className="space-y-3 rounded-lg border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Plus className="h-4 w-4" />
          Tạo nhiệm vụ riêng
        </h2>
        <input name="title" required minLength={3} maxLength={80} placeholder="Tên nhiệm vụ" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
        <textarea name="description" maxLength={280} placeholder="Mô tả" className="min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        <div className="grid gap-2 sm:grid-cols-3">
          <input name="deadlineTime" type="time" defaultValue="20:00" required className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
          <input name="expReward" type="number" min={0} defaultValue={10} className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
          <input name="pointReward" type="number" min={0} defaultValue={10} className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CAMPAIGN_TARGET_ROLES.map((role) => (
            <label key={role} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs">
              <input type="checkbox" name="targetRoles" value={role} defaultChecked />
              {ROLE_LABELS[role]}
            </label>
          ))}
        </div>
        <button type="submit" disabled={isPending} className="btn-secondary-gradient h-10 px-4 text-sm disabled:opacity-50">
          Tạo nhiệm vụ
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 6: Add admin nav link**

In `src/app/(app)/admin/page.tsx`, import `CalendarDays` from `lucide-react` and add to `operationItems` for `TEAM_LEAD`:

```ts
{
  href: "/admin/campaigns",
  icon: CalendarDays,
  label: "Chiến dịch ngày",
  description: "Chọn nhiệm vụ đặc biệt cho hôm nay",
}
```

- [ ] **Step 7: Run checks**

Run:

```bash
npm run lint
npm test -- src/lib/campaigns/campaign-service.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/app/'(app)'/admin/campaigns src/app/'(app)'/admin/page.tsx src/lib/campaigns/campaign-service.ts
git commit -m "feat: add campaign management page"
```

---

### Task 7: Final Verification And Polish

**Files:**
- Review all changed files.

- [ ] **Step 1: Run full test suite**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 3: Build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: Manual smoke test**

Run dev server:

```bash
npm run dev
```

Smoke path:

- Login as `TEAM_LEAD`.
- Open `/admin/campaigns`.
- Create one campaign-only task.
- Select one existing eligible task and the campaign-only task.
- Save today's campaign.
- Open `/dashboard`.
- Confirm `Chiến dịch hôm nay` appears before `Nhiệm vụ hôm nay`.
- Confirm campaign task cards are not duplicated in `Nhiệm vụ hôm nay`.
- Submit the campaign-only task.
- Confirm XP/points update through the normal submission flow.

- [ ] **Step 5: Commit final fixes**

If any polish or fixes were needed:

```bash
git add <changed-files>
git commit -m "fix: polish daily campaign workflow"
```

---

## Self-Review

Spec coverage:

- One campaign per team per date: Task 1 model index, Task 2 service upsert.
- Only `TEAM_LEAD` creates/edits: Task 2 service guard, Task 6 route/action guard.
- Existing and reusable campaign-only tasks: Task 2 eligibility, Task 3 campaign-only task support.
- Campaign-only hidden outside campaign: Task 3 query exclusions, Task 5 submission guard.
- Dashboard section and no duplicates: Task 4.
- Completion from submissions and overall status: Task 4 report helper and dashboard service composition.
- Scoped reporting: Task 4 report path through visible users; Task 6 admin view renders team lead report rows.
- Past read-only: Task 2 `assertEditableCampaignDate`.

Placeholder scan: no unfinished placeholder markers remain; every new function referenced is introduced in an earlier or same task.

Type consistency: `campaignOnly`, `DailyCampaignRecord`, `DailyCampaignView`, and `CampaignReportEntry` are introduced before use.
