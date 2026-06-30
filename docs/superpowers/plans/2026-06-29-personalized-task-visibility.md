# Cá nhân hóa Hiển thị Nhiệm vụ cho Thành viên Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm tính năng cá nhân hóa hiển thị nhiệm vụ cho thành viên, cho phép KVT ẩn các nhiệm vụ nhất định đối với từng thành viên và hiển thị nút quản lý nhiệm vụ cho KVT/ĐVT.

**Architecture:** Sử dụng một model Mongoose mới `UserTaskVisibility` để lưu ghi đè trạng thái hiển thị của nhiệm vụ với từng thành viên. Logic nghiệp vụ trong dashboard, nhắc nhở, nộp bài, báo cáo vận hành sẽ truy vấn bảng này để loại trừ các nhiệm vụ bị cấu hình ẩn (`isVisible = false`). Cung cấp trang cấu hình dạng danh sách toggle tại `/admin/users/[userId]/tasks` cho quản lý.

**Tech Stack:** Next.js (App Router, Server Actions), MongoDB (Mongoose), TailwindCSS, Lucide Icons, Vitest.

---

### Task 1: Cơ sở dữ liệu và Model `UserTaskVisibility`

**Files:**
- Create: `src/lib/models/user-task-visibility.ts`
- Modify: `src/lib/models/index.ts`
- Test: `src/lib/models/user-task-visibility.test.ts`

- [ ] **Step 1: Định nghĩa model `UserTaskVisibility`**
  Tạo file `src/lib/models/user-task-visibility.ts` với Schema và Indexes:
  ```typescript
  import { model, models, Schema, Types } from "mongoose";

  const userTaskVisibilitySchema = new Schema(
    {
      userId: { ref: "User", required: true, type: Schema.Types.ObjectId },
      taskId: { ref: "Task", required: true, type: Schema.Types.ObjectId },
      isVisible: { required: true, type: Boolean },
      updatedBy: { ref: "User", required: true, type: Schema.Types.ObjectId },
    },
    { timestamps: true }
  );

  userTaskVisibilitySchema.index({ userId: 1, taskId: 1 }, { unique: true });

  export const UserTaskVisibilityModel =
    models.UserTaskVisibility || model("UserTaskVisibility", userTaskVisibilitySchema);
  ```

- [ ] **Step 2: Export model mới**
  Cập nhật file `src/lib/models/index.ts` để export `UserTaskVisibilityModel`.
  ```typescript
  export * from "@/lib/models/user-task-visibility";
  ```

- [ ] **Step 3: Viết unit test cho model mới**
  Tạo file `src/lib/models/user-task-visibility.test.ts` để kiểm tra việc lưu dữ liệu và index unique:
  ```typescript
  import { describe, it, expect, beforeEach } from "vitest";
  import { connectToDatabase } from "@/lib/mongoose";
  import { UserTaskVisibilityModel } from "./user-task-visibility";
  import { Types } from "mongoose";

  describe("UserTaskVisibilityModel", () => {
    beforeEach(async () => {
      await connectToDatabase();
      await UserTaskVisibilityModel.deleteMany({});
    });

    it("should save visibility override successfully", async () => {
      const doc = await UserTaskVisibilityModel.create({
        userId: new Types.ObjectId(),
        taskId: new Types.ObjectId(),
        isVisible: false,
        updatedBy: new Types.ObjectId(),
      });
      expect(doc._id).toBeDefined();
      expect(doc.isVisible).toBe(false);
    });
  });
  ```

- [ ] **Step 4: Chạy test để xác nhận**
  Run: `npx vitest run src/lib/models/user-task-visibility.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add src/lib/models/user-task-visibility.ts src/lib/models/index.ts src/lib/models/user-task-visibility.test.ts
  git commit -m "db: add UserTaskVisibility model and tests"
  ```

---

### Task 2: Cập nhật điều hướng trang quản lý nhiệm vụ cho KVT và ĐVT

**Files:**
- Modify: `src/app/(app)/admin/page.tsx`

- [ ] **Step 1: Hiển thị liên kết "Nhiệm vụ" cho KVT/ĐVT**
  Mở file `src/app/(app)/admin/page.tsx`, nhập hàm `canManageTasks` từ `@/lib/permissions` (nếu chưa có).
  Cập nhật menu "Công cụ vận hành" của khối `if (!canManageStructure)` để hiển thị liên kết quản lý nhiệm vụ:
  ```typescript
  // Trong src/app/(app)/admin/page.tsx
  import { canManageTasks } from "@/lib/permissions";
  // ...
  // Dưới menu scopedStructureItems, hiển thị các công cụ vận hành:
  <nav className="grid gap-2" aria-label="Công cụ vận hành">
    {canManageTasks(session) && (
      <AdminNavLink
        href="/templates"
        icon={ClipboardList}
        label="Nhiệm vụ"
        description={
          isRegionalLead
            ? "Quản lý nhiệm vụ trong khu vực"
            : isZoneLead
            ? "Quản lý nhiệm vụ trong địa vực"
            : "Quản lý mẫu nhiệm vụ"
        }
      />
    )}
    {canManageUsers && (
      <AdminNavLink ... />
    )}
  </nav>
  ```

- [ ] **Step 2: Commit**
  ```bash
  git add src/app/(app)/admin/page.tsx
  git commit -m "ui: display templates link for regional and zone leads in admin page"
  ```

---

### Task 3: Tích hợp ghi đè hiển thị nhiệm vụ vào các dịch vụ lõi

**Files:**
- Modify: `src/lib/tasks/dashboard-service.ts`
- Modify: `src/lib/tasks/task-service.ts`
- Modify: `src/lib/tasks/submission-service.ts`
- Modify: `src/lib/tasks/reminder-service.ts`
- Modify: `src/lib/services/admin-operations-service.ts`
- Modify: `src/lib/services/analytics-service.ts`

- [ ] **Step 1: Cập nhật `dashboard-service.ts`**
  * Tải và trả về `visibilityOverrides` trong `loadVisibleTasksAndSubs`:
    ```typescript
    // Thêm UserTaskVisibilityModel import
    import { UserTaskVisibilityModel } from "@/lib/models/user-task-visibility";
    
    // Trong loadVisibleTasksAndSubs:
    const visibilities = await UserTaskVisibilityModel.find({
      userId: { $in: visibleUsers.map((u) => toObjectId(u.id)) },
      taskId: { $in: allTasks.map((t) => t._id) },
    }).lean();
    const visibilityOverrides = new Map(
      visibilities.map((v) => [`${v.taskId.toString()}:${v.userId.toString()}`, v.isVisible])
    );
    return { ...data, allTasks, relevantTasks, submissions, visibilityOverrides };
    ```
  * Cập nhật `buildDashboardLookup` để dùng `visibilityOverrides`:
    ```typescript
    // Thay đổi chữ ký và bộ lọc trong buildDashboardLookup:
    function buildDashboardLookup(
      tasks: TaskRecord[],
      visibleUsers: DashboardVisibleUser[],
      submissions: SubmissionRecordModel[],
      visibilityOverrides?: Map<string, boolean>,
    ) {
      // ...
      for (const task of tasks) {
        const taskId = task._id.toString();
        const scope = taskToScope(task);
        const applicableUsers = visibleUsers.filter((user) => {
          const override = visibilityOverrides?.get(`${taskId}:${user.id}`);
          if (override !== undefined) return override;
          return appliesToUser(scope, userShape(user));
        });
        // ...
      }
    }
    ```
  * Cập nhật `buildDashboardView` để gọi `buildDashboardLookup` với `visibilityOverrides`.
  * Cập nhật `buildMemberDashboard` và `buildMemberPrayerDashboard` để lọc `personalTasks` / `prayerTasks` dựa trên `visibilityOverrides` của actor.
  * Cập nhật `buildTaskCard` để tính toán `isApplicableToActor` bằng cách kiểm tra:
    ```typescript
    const isApplicableToActor = ctx.lookup.applicableUserIdsByTaskId.get(taskId)?.has(ctx.actorId) ?? false;
    ```

- [ ] **Step 2: Cập nhật `task-service.ts` (`getTaskDetail`)**
  Truy vấn `UserTaskVisibilityModel` cho `visibleUsers` và `taskId` cụ thể:
  ```typescript
  import { UserTaskVisibilityModel } from "@/lib/models/user-task-visibility";

  // Trong getTaskDetail:
  const visibilities = await UserTaskVisibilityModel.find({
    taskId: toObjectId(taskId),
    userId: { $in: [...new Set([...visibleUsers, ...viewableUsers, actor].map((u) => toObjectId(u.id)))] },
  }).lean();
  const overridesMap = new Map(visibilities.map((v) => [v.userId.toString(), v.isVisible]));
  const checkVisible = (u: any) => {
    const override = overridesMap.get(u.id);
    if (override !== undefined) return override;
    return appliesToUser(scope, userShape(u));
  };
  const isApplicableToActor = checkVisible(actor);
  const rosterMembers = visibleUsers.filter(checkVisible);
  const displayMembers = viewableUsers.filter(checkVisible);
  ```

- [ ] **Step 3: Cập nhật `submission-service.ts`**
  Chặn nộp bài nếu nhiệm vụ bị ẩn:
  ```typescript
  import { UserTaskVisibilityModel } from "@/lib/models/user-task-visibility";

  // Trong submitTask:
  const override = await UserTaskVisibilityModel.findOne({
    userId: toObjectId(subjectSession.id),
    taskId: taskRaw._id,
  }).lean();
  const isApplicable = override ? override.isVisible : appliesToUser(scope, subjectSession);
  if (!isApplicable) {
    throw new Error("Nhiệm vụ này không áp dụng cho người dùng đã chọn.");
  }
  ```

- [ ] **Step 4: Cập nhật `reminder-service.ts`**
  Chặn gửi nhắc nhở cho nhiệm vụ bị ẩn:
  ```typescript
  import { UserTaskVisibilityModel } from "@/lib/models/user-task-visibility";

  // Trong getReminderCandidates:
  const visibilities = await UserTaskVisibilityModel.find({
    userId: { $in: userIds },
    taskId: { $in: taskIds },
  }).lean();
  const visibilityMap = new Map(
    visibilities.map((v) => [`${v.taskId.toString()}:${v.userId.toString()}`, v.isVisible])
  );

  // Truyền visibilityMap vào buildDueTaskReminderCandidatesFromData và kiểm tra:
  const override = visibilityMap.get(key);
  const isApplicable = override !== undefined ? override : appliesToUser(scope, recordUserShape(user));
  if (!isApplicable) continue;
  ```

- [ ] **Step 5: Cập nhật `admin-operations-service.ts`**
  Loại trừ nhiệm vụ bị ẩn trong thống kê:
  ```typescript
  import { UserTaskVisibilityModel } from "@/lib/models/user-task-visibility";

  // Trong buildAdminOperationsView:
  const visibilities = await UserTaskVisibilityModel.find({
    userId: { $in: visibleUsers.map((u) => toObjectId(u.id)) },
    taskId: { $in: tasks.map((t) => t._id) },
  }).lean();
  const visibilityMap = new Map(
    visibilities.map((v) => [`${v.taskId.toString()}:${v.userId.toString()}`, v.isVisible])
  );

  // Khi duyệt appliesToUser ở cả hai vòng lặp:
  const override = visibilityMap.get(`${taskId}:${userId}`);
  const isApplicable = override !== undefined ? override : appliesToUser(taskToScope(task), userShape(user));
  if (!isApplicable) continue;
  ```

- [ ] **Step 6: Cập nhật `analytics-service.ts`**
  Loại trừ nhiệm vụ bị ẩn trong biểu đồ thống kê cá nhân:
  ```typescript
  import { UserTaskVisibilityModel } from "@/lib/models/user-task-visibility";

  // Trong getUserAnalytics:
  const overrides = await UserTaskVisibilityModel.find({
    userId: toObjectId(user.id),
    taskId: { $in: tasks.map((t) => t._id) },
  }).lean();
  const overrideByTaskId = new Map(overrides.map((o) => [o.taskId.toString(), o.isVisible]));

  const applicableTasks = sortTasksForDisplay(
    tasks.filter((task) => {
      const override = overrideByTaskId.get(task._id.toString());
      if (override !== undefined) return override;
      return appliesToUser(taskToScope(task), userScopeShape(user));
    }),
  );
  ```

- [ ] **Step 7: Chạy tất cả các test hiện có**
  Run: `npm run test`
  Expected: PASS (các logic nghiệp vụ cũ hoạt động bình thường).

- [ ] **Step 8: Commit**
  ```bash
  git commit -am "feat: integrate task visibility overrides into core services"
  ```

---

### Task 4: Giao diện cấu hình ẩn/hiện nhiệm vụ cho từng thành viên

**Files:**
- Modify: `src/app/(app)/admin/user-section.tsx`
- Create: `src/app/(app)/admin/users/[userId]/tasks/actions.ts`
- Create: `src/app/(app)/admin/users/[userId]/tasks/page.tsx`
- Create: `src/app/(app)/admin/users/[userId]/tasks/task-visibility-list.tsx`

- [ ] **Step 1: Thêm nút liên kết cấu hình trên danh sách thành viên**
  Mở file `src/app/(app)/admin/user-section.tsx`, thêm biểu tượng `ClipboardList` và import `Link` từ `next/link`.
  Trong hàm `UserRow`, thêm liên kết cấu hình:
  ```typescript
  // Trong UserRow:
  {canEdit && (user.role === "MEMBER" || user.role === "TDM" || user.role === "NGV") && (
    <Link
      href={`/admin/users/${user.id}/tasks`}
      className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-overlay-medium hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      aria-label={`Cấu hình hiển thị nhiệm vụ cho ${user.fullName}`}
    >
      <ClipboardList className="h-4 w-4" aria-hidden />
    </Link>
  )}
  ```

- [ ] **Step 2: Tạo Server Action lưu cấu hình**
  Tạo file `src/app/(app)/admin/users/[userId]/tasks/actions.ts`:
  ```typescript
  "use server";

  import { revalidatePath } from "next/cache";
  import { getSessionUser } from "@/lib/auth/session";
  import { runAction, type ActionResult } from "@/lib/actions/result";
  import { canManageUser } from "@/lib/permissions";
  import { getUserById } from "@/lib/services/organization-service";
  import { UserTaskVisibilityModel } from "@/lib/models/user-task-visibility";
  import { connectToDatabase } from "@/lib/mongoose";
  import { toObjectId } from "@/lib/mongoose";

  export async function toggleTaskVisibilityAction(
    targetUserId: string,
    taskId: string,
    isVisible: boolean,
  ): Promise<ActionResult> {
    return runAction(async () => {
      const actor = await getSessionUser();
      if (!actor) throw new Error("Chưa đăng nhập.");

      await connectToDatabase();
      const targetUser = await getUserById(targetUserId);
      if (!targetUser) throw new Error("Thành viên không tồn tại.");

      if (!canManageUser(actor, targetUser)) {
        throw new Error("Bạn không có quyền quản lý thành viên này.");
      }

      await UserTaskVisibilityModel.updateOne(
        { userId: toObjectId(targetUserId), taskId: toObjectId(taskId) },
        {
          userId: toObjectId(targetUserId),
          taskId: toObjectId(taskId),
          isVisible,
          updatedBy: toObjectId(actor.id),
        },
        { upsert: true }
      );

      revalidatePath("/dashboard");
      revalidatePath("/admin/users");
      revalidatePath(`/admin/users/${targetUserId}/tasks`);
    });
  }
  ```

- [ ] **Step 3: Tạo component Client để toggle hiển thị**
  Tạo file `src/app/(app)/admin/users/[userId]/tasks/task-visibility-list.tsx` chứa danh sách các nhiệm vụ và Switch bật/tắt:
  ```typescript
  "use client";

  import { useState, useTransition } from "react";
  import { toggleTaskVisibilityAction } from "./actions";
  import { SCOPE_LABELS, ROLE_LABELS } from "@/lib/domain";

  type TaskItem = {
    id: string;
    title: string;
    description: string;
    scope: string;
    targetRoles: string[];
    defaultVisible: boolean;
    currentVisible: boolean;
  };

  export function TaskVisibilityList({
    userId,
    tasks,
  }: {
    userId: string;
    tasks: TaskItem[];
  }) {
    const [taskList, setTaskList] = useState(tasks);
    const [isPending, startTransition] = useTransition();

    const handleToggle = (taskId: string, currentVal: boolean) => {
      const newVal = !currentVal;
      startTransition(async () => {
        const result = await toggleTaskVisibilityAction(userId, taskId, newVal);
        if (result.success) {
          setTaskList((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, currentVisible: newVal } : t))
          );
        } else {
          alert(result.error || "Có lỗi xảy ra khi cập nhật hiển thị.");
        }
      });
    };

    return (
      <div className="glass-card divide-y divide-border overflow-hidden">
        {taskList.map((task) => (
          <div key={task.id} className="flex items-center justify-between p-4">
            <div className="mr-4 space-y-1">
              <h3 className="text-sm font-medium">{task.title}</h3>
              <p className="text-[11px] text-muted-foreground">
                Phạm vi: {SCOPE_LABELS[task.scope as any]} · Vai trò: {task.targetRoles.map(r => ROLE_LABELS[r as any]).join(", ")}
              </p>
              {task.defaultVisible !== task.currentVisible && (
                <span className="inline-block text-[9px] bg-yellow-500/10 text-yellow-700 font-medium px-1 rounded">
                  Đã cá nhân hóa
                </span>
              )}
            </div>
            <button
              onClick={() => handleToggle(task.id, task.currentVisible)}
              disabled={isPending}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/60 ${
                task.currentVisible ? "bg-primary" : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  task.currentVisible ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    );
  }
  ```

- [ ] **Step 4: Tạo trang cấu hình hiển thị nhiệm vụ `/admin/users/[userId]/tasks/page.tsx`**
  Tạo file `src/app/(app)/admin/users/[userId]/tasks/page.tsx`:
  ```typescript
  import { redirect } from "next/navigation";
  import { getSessionUser } from "@/lib/auth/session";
  import { canManageUser } from "@/lib/permissions";
  import { getUserById } from "@/lib/services/organization-service";
  import { TaskModel } from "@/lib/models/task";
  import { UserTaskVisibilityModel } from "@/lib/models/user-task-visibility";
  import { appliesToUser, taskToScope } from "@/lib/tasks/policy";
  import { TaskVisibilityList } from "./task-visibility-list";
  import { toObjectId } from "@/lib/mongoose";
  import Link from "next/link";
  import { ChevronLeft } from "lucide-react";

  export default async function MemberTasksPage({
    params,
  }: {
    params: Promise<{ userId: string }>;
  }) {
    const { userId } = await params;
    const actor = await getSessionUser();
    if (!actor) redirect("/login");

    const targetUser = await getUserById(userId);
    if (!targetUser) redirect("/admin/users");

    if (!canManageUser(actor, targetUser)) {
      redirect("/admin/users");
    }

    // Lấy danh sách tất cả nhiệm vụ đang hoạt động trong nhóm
    const tasks = await TaskModel.find({
      isActive: true,
      teamId: toObjectId(targetUser.teamId ?? ""),
    }).lean();

    // Lấy ghi đè cấu hình hiển thị hiện tại
    const overrides = await UserTaskVisibilityModel.find({
      userId: toObjectId(userId),
      taskId: { $in: tasks.map((t) => t._id) },
    }).lean();

    const overrideMap = new Map(overrides.map((o) => [o.taskId.toString(), o.isVisible]));
    const targetUserShape = {
      teamId: targetUser.teamId,
      zoneId: targetUser.zoneId,
      regionId: targetUser.regionId,
      role: targetUser.role,
    };

    const taskItems = tasks.map((t) => {
      const defaultVisible = appliesToUser(taskToScope(t), targetUserShape);
      const customOverride = overrideMap.get(t._id.toString());
      return {
        id: t._id.toString(),
        title: t.title,
        description: t.description,
        scope: t.scope,
        targetRoles: t.targetRoles || [],
        defaultVisible,
        currentVisible: customOverride !== undefined ? customOverride : defaultVisible,
      };
    });

    return (
      <div className="space-y-4 animate-slide-up">
        <div className="flex items-center gap-2">
          <Link
            href="/admin/users"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold font-display">Cá nhân hóa Nhiệm vụ</h1>
            <p className="text-xs text-muted-foreground">
              Thiết lập hiển thị nhiệm vụ cho {targetUser.fullName} ({targetUser.role})
            </p>
          </div>
        </div>

        <TaskVisibilityList userId={userId} tasks={taskItems} />
      </div>
    );
  }
  ```

- [ ] **Step 5: Commit**
  ```bash
  git add src/app/(app)/admin/user-section.tsx src/app/(app)/admin/users/[userId]/tasks/
  git commit -m "feat: add user task visibility settings page and toggle UI"
  ```

---

### Task 5: Viết thêm unit tests để xác minh tính đúng đắn của logic hiển thị mới

**Files:**
- Create: `src/lib/tasks/personalized-visibility.test.ts`

- [ ] **Step 1: Viết test case tích hợp cho logic ẩn/hiện**
  Tạo file `src/lib/tasks/personalized-visibility.test.ts` kiểm tra xem nhiệm vụ bị cấu hình ẩn thực tế có biến mất khỏi hàm `buildMemberDashboard` và bị từ chối nộp không:
  ```typescript
  import { describe, it, expect, beforeEach } from "vitest";
  import { connectToDatabase } from "@/lib/mongoose";
  import { TaskModel } from "@/lib/models/task";
  import { UserModel } from "@/lib/models/user";
  import { UserTaskVisibilityModel } from "@/lib/models/user-task-visibility";
  import { buildMemberDashboard } from "@/lib/tasks/dashboard-service";
  import { submitTask } from "@/lib/tasks/submission-service";
  import { Types } from "mongoose";

  describe("Personalized Task Visibility Integration", () => {
    beforeEach(async () => {
      await connectToDatabase();
      await TaskModel.deleteMany({});
      await UserModel.deleteMany({});
      await UserTaskVisibilityModel.deleteMany({});
    });

    it("should hide task on member dashboard and block submission if overridden to invisible", async () => {
      const teamId = new Types.ObjectId();
      const regionId = new Types.ObjectId();
      const zoneId = new Types.ObjectId();

      const member = await UserModel.create({
        fullName: "Test Member",
        role: "MEMBER",
        status: "ACTIVE",
        teamId,
        zoneId,
        regionId,
      });

      const task = await TaskModel.create({
        title: "Test Daily Task",
        createdBy: new Types.ObjectId(),
        deadlineTime: "22:00",
        scope: "TEAM",
        teamId,
        isActive: true,
        taskType: "DAILY",
        targetRoles: ["MEMBER"],
      });

      // Tạo SessionUser giả lập
      const memberSession = {
        id: member._id.toString(),
        fullName: member.fullName,
        role: member.role as any,
        status: member.status as any,
        teamId: teamId.toString(),
        zoneId: zoneId.toString(),
        regionId: regionId.toString(),
      };

      // Trước khi ẩn: Nhiệm vụ phải xuất hiện trên dashboard
      let dashboard = await buildMemberDashboard(memberSession, "2026-06-29");
      expect(dashboard.cards.some((c) => c.id === task._id.toString())).toBe(true);

      // Cấu hình ẩn nhiệm vụ này cho thành viên
      await UserTaskVisibilityModel.create({
        userId: member._id,
        taskId: task._id,
        isVisible: false,
        updatedBy: new Types.ObjectId(),
      });

      // Sau khi ẩn: Nhiệm vụ KHÔNG được xuất hiện trên dashboard nữa
      dashboard = await buildMemberDashboard(memberSession, "2026-06-29");
      expect(dashboard.cards.some((c) => c.id === task._id.toString())).toBe(false);

      // Con, cố tình nộp bài phải bị chặn
      await expect(
        submitTask({
          actor: memberSession,
          subjectUserId: member._id.toString(),
          taskId: task._id.toString(),
          dateKey: "2026-06-29",
          count: 1,
          mode: "add",
        })
      ).rejects.toThrow("Nhiệm vụ này không áp dụng cho người dùng đã chọn");
    });
  });
  ```

- [ ] **Step 2: Chạy test để xác minh**
  Run: `npx vitest run src/lib/tasks/personalized-visibility.test.ts`
  Expected: PASS

- [ ] **Step 3: Chạy toàn bộ test suite**
  Run: `npm run test`
  Expected: All 120+ tests PASS.

- [ ] **Step 4: Commit**
  ```bash
  git add src/lib/tasks/personalized-visibility.test.ts
  git commit -m "test: add integration tests for personalized task visibility"
  ```
