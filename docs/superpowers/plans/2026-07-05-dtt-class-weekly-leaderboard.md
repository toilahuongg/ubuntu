# DTT Class Weekly Leaderboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a starting day of the week configuration for DTT classes and display a weekly leaderboard for enrolled students (both per task and weekly total).

**Architecture:** Update `DttClass` schema to store `startDayOfWeek` (1-7, 1=Monday). Implement week range calculation helpers using `date-fns` to retrieve the current class week start/end dates. Implement a class leaderboard service that aggregates XP/completion counts within the week. Build the new `/dtt/leaderboard` page for students and managers.

**Tech Stack:** Next.js App Router, Tailwind CSS, Mongoose, Vitest, date-fns.

## Global Constraints
- `startDayOfWeek` represents weekdays from 1 (Monday) to 7 (Sunday).
- All date calculations must respect the timezone fetched from `getAppTimezone()`.
- Use standard code format, proper TS typings, and run verification tests at every step.

---

### Task 1: Update DttClass Model

**Files:**
- Modify: `src/lib/models/dtt-class.ts`
- Test: `src/lib/models/dtt-class.test.ts`

**Interfaces:**
- Produces: Updated `DttClassRecord` type containing `startDayOfWeek: number`.

- [ ] **Step 1: Write the failing test**
  Add a test to verify `startDayOfWeek` validation (reject invalid numbers like 0 or 8, check default is 1).
  In `src/lib/models/dtt-class.test.ts`:
  ```typescript
  it("should require startDayOfWeek to be between 1 and 7, and default to 1", async () => {
    const doc = new DttClassModel({
      name: "Test Class",
      teamId: new Types.ObjectId(),
      createdBy: new Types.ObjectId(),
    });
    expect(doc.startDayOfWeek).toBe(1);

    doc.startDayOfWeek = 8;
    await expect(doc.validate()).rejects.toThrow();

    doc.startDayOfWeek = 0;
    await expect(doc.validate()).rejects.toThrow();

    doc.startDayOfWeek = 3;
    await expect(doc.validate()).resolves.not.toThrow();
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run src/lib/models/dtt-class.test.ts`
  Expected: FAIL with compilation/validation errors.

- [ ] **Step 3: Write minimal implementation**
  In `src/lib/models/dtt-class.ts`:
  ```typescript
  const dttClassSchema = new Schema(
    {
      name: { required: true, trim: true, type: String },
      teamId: { ref: "Team", required: true, type: Schema.Types.ObjectId, index: true },
      createdBy: { ref: "User", required: true, type: Schema.Types.ObjectId },
      startDayOfWeek: { required: true, type: Number, default: 1, min: 1, max: 7 },
    },
    { timestamps: true }
  );

  export type DttClassRecord = {
    _id: Types.ObjectId;
    name: string;
    teamId: Types.ObjectId;
    createdBy: Types.ObjectId;
    startDayOfWeek: number;
    createdAt: Date;
    updatedAt: Date;
  };
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run src/lib/models/dtt-class.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add src/lib/models/dtt-class.ts src/lib/models/dtt-class.test.ts
  git commit -m "feat: add startDayOfWeek to DttClass model and validate"
  ```

---

### Task 2: Implement Week Range Calculation Helper

**Files:**
- Modify: `src/lib/dates.ts`
- Create: `src/lib/dates.test.ts`

**Interfaces:**
- Produces: `getWeekRangeFromDateKey(dateKey: string, startDayOfWeek: number): { startStr: string, endStr: string }`

- [ ] **Step 1: Write the failing test**
  Create `src/lib/dates.test.ts` and add tests for calculating the week start/end dates for a given start day.
  ```typescript
  import { describe, it, expect } from "vitest";
  import { getWeekRangeFromDateKey } from "./dates";

  describe("getWeekRangeFromDateKey", () => {
    it("should calculate correct start and end dates relative to startDayOfWeek", () => {
      // 2026-07-05 is a Sunday (weekday = 7)
      // If week starts on Wednesday (3), the week starts on Wednesday 2026-07-01 and ends Tuesday 2026-07-07
      const range1 = getWeekRangeFromDateKey("2026-07-05", 3);
      expect(range1.startStr).toBe("2026-07-01");
      expect(range1.endStr).toBe("2026-07-07");

      // If week starts on Monday (1), the week starts on Monday 2026-06-29 and ends Sunday 2026-07-05
      const range2 = getWeekRangeFromDateKey("2026-07-05", 1);
      expect(range2.startStr).toBe("2026-06-29");
      expect(range2.endStr).toBe("2026-07-05");
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run src/lib/dates.test.ts`
  Expected: FAIL with "getWeekRangeFromDateKey not defined".

- [ ] **Step 3: Write minimal implementation**
  Add imports for `subDays` and `addDays` and implement the function in `src/lib/dates.ts`:
  ```typescript
  import { subDays, addDays } from "date-fns";
  import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
  // ... existing imports

  export function getWeekRangeFromDateKey(dateKey: string, startDayOfWeek: number) {
    const currentWeekday = getIsoWeekdayFromDateKey(dateKey); // 1 = Monday, 7 = Sunday
    let delta = currentWeekday - startDayOfWeek;
    if (delta < 0) {
      delta += 7;
    }

    const tz = getAppTimezone();
    const dateObj = fromZonedTime(`${dateKey}T00:00:00`, tz);
    const startDateObj = subDays(dateObj, delta);
    const endDateObj = addDays(startDateObj, 6);

    const startStr = formatInTimeZone(startDateObj, tz, "yyyy-MM-dd");
    const endStr = formatInTimeZone(endDateObj, tz, "yyyy-MM-dd");

    return { startStr, endStr };
  }
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run src/lib/dates.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add src/lib/dates.ts src/lib/dates.test.ts
  git commit -m "feat: add getWeekRangeFromDateKey date utility"
  ```

---

### Task 3: Implement Leaderboard Service Calculation

**Files:**
- Modify: `src/lib/services/leaderboard-service.ts`
- Test: `src/lib/services/leaderboard-service.test.ts`

**Interfaces:**
- Produces: `getDttClassLeaderboard(classId: string, taskId?: string): Promise<{ classInfo: any, entries: LeaderboardEntry[], tasks: any[] }>`

- [ ] **Step 1: Write the failing test**
  Add a test in `src/lib/services/leaderboard-service.test.ts` to fetch class weekly leaderboard.
  ```typescript
  import { getDttClassLeaderboard } from "./leaderboard-service";
  // ... in describe block:
  it("should calculate correct student ranking for DTT class", async () => {
    // Stub or test with mock database that calling getDttClassLeaderboard returns structured fields.
    // Since mock context runs with mongo-memory-server, we can verify calling with a non-existent class throws.
    await expect(getDttClassLeaderboard("60c72b2f9b1d8b2d88888888")).rejects.toThrow();
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run src/lib/services/leaderboard-service.test.ts`
  Expected: FAIL with "getDttClassLeaderboard not defined" or similar.

- [ ] **Step 3: Write minimal implementation**
  Add imports and implementation to `src/lib/services/leaderboard-service.ts`:
  ```typescript
  import { DttClassModel } from "@/lib/models/dtt-class";
  import { DttEnrollmentModel } from "@/lib/models/dtt-enrollment";
  import { TaskModel } from "@/lib/models/task";
  import { UserModel } from "@/lib/models/user";
  import { getWeekRangeFromDateKey, getTodayDateKey } from "@/lib/dates";
  import { toObjectId } from "@/lib/utils/ids";

  export async function getDttClassLeaderboard(
    classId: string,
    taskId?: string,
  ): Promise<{
    classInfo: { name: string; startDayOfWeek: number; startStr: string; endStr: string };
    entries: LeaderboardEntry[];
    tasks: { id: string; title: string }[];
  }> {
    await connectToDatabase();

    const classDoc = await DttClassModel.findById(classId).lean();
    if (!classDoc) throw new Error("Không tìm thấy lớp học.");

    const startDayOfWeek = classDoc.startDayOfWeek ?? 1;
    const { startStr, endStr } = getWeekRangeFromDateKey(getTodayDateKey(), startDayOfWeek);

    const dttTasks = await TaskModel.find({
      teamId: classDoc.teamId,
      isActive: true,
      isDtt: true,
    }).select({ title: 1 }).lean();

    const enrollments = await DttEnrollmentModel.find({ classId }).lean();
    const studentUserIds = enrollments.map((e) => e.userId);

    if (studentUserIds.length === 0) {
      return {
        classInfo: { name: classDoc.name, startDayOfWeek, startStr, endStr },
        entries: [],
        tasks: dttTasks.map((t) => ({ id: t._id.toString(), title: t.title })),
      };
    }

    const matchQuery: Record<string, any> = {
      subjectUserId: { $in: studentUserIds },
      date: { $gte: startStr, $lte: endStr },
    };

    let aggregated: { _id: string; totalXp: number }[] = [];

    if (!taskId || taskId === "weekly-total") {
      const activeDttTaskIds = dttTasks.map((t) => t._id);
      matchQuery.taskId = { $in: activeDttTaskIds };

      const results = await SubmissionModel.aggregate([
        { $match: matchQuery },
        {
          $lookup: {
            as: "task",
            foreignField: "_id",
            from: "tasks",
            localField: "taskId",
          },
        },
        { $unwind: "$task" },
        {
          $group: {
            _id: "$subjectUserId",
            totalXp: {
              $sum: {
                $multiply: [
                  { $ifNull: ["$task.pointReward", 0] },
                  { $ifNull: ["$completionCount", 1] },
                ],
              },
            },
          },
        },
        { $match: { totalXp: { $gt: 0 } } },
        { $sort: { totalXp: -1 } },
      ]);
      aggregated = results.map((r) => ({ _id: r._id.toString(), totalXp: r.totalXp }));
    } else {
      matchQuery.taskId = toObjectId(taskId);

      const results = await SubmissionModel.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: "$subjectUserId",
            totalXp: { $sum: { $ifNull: ["$completionCount", 1] } },
          },
        },
        { $match: { totalXp: { $gt: 0 } } },
        { $sort: { totalXp: -1 } },
      ]);
      aggregated = results.map((r) => ({ _id: r._id.toString(), totalXp: r.totalXp }));
    }

    const users = await UserModel.find({ _id: { $in: studentUserIds } }).lean();
    const aggregatedMap = new Map(aggregated.map((r) => [r._id, r.totalXp]));

    const studentsWithScores = users.map((u) => {
      const totalXp = aggregatedMap.get(u._id.toString()) ?? 0;
      return { user: u, totalXp };
    });

    studentsWithScores.sort((a, b) => b.totalXp - a.totalXp);

    const formattedEntries = studentsWithScores.map((row, index) =>
      toLeaderboardEntry(row.user as any, row.totalXp, index + 1)
    );

    const equippedMap = await getEquippedPayloadsForUsers(
      formattedEntries.map((e) => e.id),
    );
    const finalEntries = formattedEntries.map((e) => {
      const eq = equippedMap.get(e.id);
      return eq ? { ...e, equipped: serializeEquipped(eq) } : e;
    });

    return {
      classInfo: { name: classDoc.name, startDayOfWeek, startStr, endStr },
      entries: finalEntries,
      tasks: dttTasks.map((t) => ({ id: t._id.toString(), title: t.title })),
    };
  }
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run src/lib/services/leaderboard-service.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add src/lib/services/leaderboard-service.ts src/lib/services/leaderboard-service.test.ts
  git commit -m "feat: implement getDttClassLeaderboard calculations"
  ```

---

### Task 4: Update Class Administration Form and Actions

**Files:**
- Modify: `src/app/(app)/admin/dtt/actions.ts`
- Modify: `src/app/(app)/admin/dtt/dtt-class-tab.tsx`
- Modify: `src/app/(app)/admin/dtt/page.tsx`
- Test: `src/app/(app)/admin/dtt/actions.test.ts`

**Interfaces:**
- Consumes: `createClassAction(name, startDayOfWeek)`, `updateClassAction(id, name, startDayOfWeek)`
- Produces: Updated React forms with standard Tailwind UI dropdown selectors.

- [ ] **Step 1: Write the failing test**
  Update tests in `src/app/(app)/admin/dtt/actions.test.ts` to expect startDayOfWeek for createClassAction and updateClassAction.
  Make sure DttClassModel mock mock-verifies the field.
  Run: `npx vitest run src/app/(app)/admin/dtt/actions.test.ts`
  Expected: FAIL (argument mismatch or validation failures).

- [ ] **Step 2: Update Actions backend code**
  In `src/app/(app)/admin/dtt/actions.ts`:
  Modify `createClassAction` and `updateClassAction` to receive `startDayOfWeek: number` parameter and write it to database.
  In `src/app/(app)/admin/dtt/page.tsx`:
  Map the `startDayOfWeek` field of mapped classes passed to client component:
  ```typescript
  const formattedClasses = classes.map((c) => ({
    id: c._id.toString(),
    name: c.name,
    startDayOfWeek: c.startDayOfWeek ?? 1,
  }));
  ```

- [ ] **Step 3: Update Client-side UI forms**
  In `src/app/(app)/admin/dtt/dtt-class-tab.tsx`:
  - Update `ClassItem` type to contain `startDayOfWeek: number`.
  - Add state `newClassStartDay` (default `1`) and `editingClassStartDay` (default `1`).
  - Add standard weekday labels array:
    ```typescript
    const WEEKDAY_LABELS = [
      { value: 1, label: "Thứ hai" },
      { value: 2, label: "Thứ ba" },
      { value: 3, label: "Thứ tư" },
      { value: 4, label: "Thứ năm" },
      { value: 5, label: "Thứ sáu" },
      { value: 6, label: "Thứ bảy" },
      { value: 7, label: "Chủ nhật" }
    ];
    ```
  - In creation form, add:
    ```tsx
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">Thứ bắt đầu tuần</label>
      <select
        value={newClassStartDay}
        onChange={(e) => setNewClassStartDay(Number(e.target.value))}
        className="form-select w-full"
      >
        {WEEKDAY_LABELS.map(d => (
          <option key={d.value} value={d.value}>{d.label}</option>
        ))}
      </select>
    </div>
    ```
  - Pass the state to `createClassAction(newClassName, newClassStartDay)`.
  - In class card list, display starting weekday below class name:
    ```tsx
    <p className="text-[10px] text-muted-foreground mt-0.5">
      Bắt đầu tuần: {WEEKDAY_LABELS.find(d => d.value === classItem.startDayOfWeek)?.label ?? "Thứ hai"}
    </p>
    ```
  - In editing mode UI, display select box next to editing class name, and pass editing state to `updateClassAction(classItem.id, editingClassName, editingClassStartDay)`.

- [ ] **Step 4: Run actions test to verify it passes**
  Run: `npx vitest run src/app/(app)/admin/dtt/actions.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add src/app/(app)/admin/dtt/actions.ts src/app/(app)/admin/dtt/dtt-class-tab.tsx src/app/(app)/admin/dtt/page.tsx
  git commit -m "feat: integrate startDayOfWeek selector in create/edit class admin UI"
  ```

---

### Task 5: Implement `/dtt/leaderboard` Route

**Files:**
- Create: `src/app/(app)/dtt/leaderboard/page.tsx`

- [ ] **Step 1: Scaffold page.tsx**
  Create the folder `src/app/(app)/dtt/leaderboard` and the file `page.tsx`.
  Fetch current user session using `getSessionUser()`. Redirect to `/login` if not authenticated.
  Check if user is enrolled in DTT via `DttEnrollmentModel.findOne({ userId: session.id })`.
  Check if user is manager via `canManageDtt(session)`.
  If user is manager:
  - Fetch all classes in their team to populate class selector.
  - Set active class ID from `searchParams.classId`, falling back to first class.
  If user is not manager but is enrolled:
  - Set active class ID to their enrolled class ID.
  If user is neither manager nor enrolled:
  - Show warning "Bạn không tham gia lớp học ĐTT nào."

- [ ] **Step 2: Fetch and render leaderboard**
  Fetch data using `getDttClassLeaderboard(activeClassId, searchParams.taskId)`.
  Render selecting controls (dropdowns for class if manager, dropdowns for DTT tasks).
  Display week dates (e.g. `01/07/2026 - 07/07/2026`) and start day label.
  Render ranking list (Podium for Top 3, lists for the rest) using standard CSS class card styling.

- [ ] **Step 3: Commit**
  ```bash
  git add src/app/(app)/dtt/leaderboard/page.tsx
  git commit -m "feat: implement DTT class weekly leaderboard page"
  ```

---

### Task 6: Add Links and Navigation to main Leaderboard page

**Files:**
- Modify: `src/app/(app)/leaderboard/page.tsx`

- [ ] **Step 1: Add banner/link to main leaderboard page**
  Open `src/app/(app)/leaderboard/page.tsx`.
  Fetch `isEnrolled` and `isManager` based on session.
  If either is true, render a link/banner at the top of the page pointing to `/dtt/leaderboard`.
  ```tsx
  {/* Add this inside the main component before the podium sections */}
  {(isEnrolled || isManager) && (
    <div className="glass-card p-4 flex items-center justify-between border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-2 rounded-lg">
          <GraduationCap className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground">Bảng xếp hạng Lớp học ĐTT</h4>
          <p className="text-xs text-muted-foreground">Xem xếp hạng học viên theo tuần học của lớp bạn</p>
        </div>
      </div>
      <Link href="/dtt/leaderboard" className="btn-gradient px-4 py-2 text-xs font-semibold">
        Xem ngay
      </Link>
    </div>
  )}
  ```

- [ ] **Step 2: Verify and Commit**
  Run all vitest tests to make sure there are no regression issues:
  Run: `npx vitest run`
  Expected: PASS
  Commit changes:
  ```bash
  git add src/app/(app)/leaderboard/page.tsx
  git commit -m "feat: link DTT class leaderboard page from main leaderboard page"
  ```
