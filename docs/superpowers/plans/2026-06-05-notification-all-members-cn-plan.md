# Thay đổi thuật toán thông báo cho nhiệm vụ Cầu Nguyện (CN) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay đổi thuật toán phân giải người nhận thông báo cho nhiệm vụ loại `COUNT_TOTAL` (Cầu Nguyện) để gửi thông báo cho tất cả các thành viên trong nhóm (có cùng `teamId`), ngoại trừ người nộp.

**Architecture:** Mở rộng chữ ký hàm `resolveNotificationRecipientIds` và các hàm trung gian gửi thông báo để nhận thêm tham số `taskType`. Nếu `taskType === "COUNT_TOTAL"`, lọc toàn bộ thành viên cùng `teamId` thay vì chỉ lọc trưởng nhóm.

**Tech Stack:** TypeScript, Next.js, Mongoose, Vitest

---

### Task 1: Cập nhật hàm phân giải người nhận thông báo (`submission-notifier.ts`)

**Files:**
- Modify: [submission-notifier.ts](file:///Users/devhugon/Desktop/Workspaces/miso-apps/ubuntu/src/lib/notifications/submission-notifier.ts)
- Modify: [submission-notifier.test.ts](file:///Users/devhugon/Desktop/Workspaces/miso-apps/ubuntu/src/lib/notifications/submission-notifier.test.ts)

- [ ] **Step 1: Viết test failing**
  Thêm trường hợp test mới vào file `src/lib/notifications/submission-notifier.test.ts` để kiểm thử khi loại nhiệm vụ là `COUNT_TOTAL` (CN).
  
  Mở file `src/lib/notifications/submission-notifier.test.ts` và thêm đoạn code sau vào cuối khối `describe("resolveNotificationRecipientIds", ...)` trước dấu đóng `});`:
  ```typescript
    it("sends COUNT_TOTAL (CN) submissions to all team members", () => {
      const recipientIds = resolveNotificationRecipientIds({
        excludeUserId: "member-a",
        scope: {
          teamId: "team-a",
          zoneId: "zone-a",
          regionId: "region-a",
        },
        subjectRole: "MEMBER",
        users,
        taskType: "COUNT_TOTAL",
      });

      expect(recipientIds).toEqual([
        "nt-a",
        "dvt-a1",
        "dvt-a2",
        "kvt-a1",
        "kvt-a2",
        "kvt-a3",
      ]);
    });
  ```

- [ ] **Step 2: Chạy test để xác nhận test bị lỗi**
  Run: `npx vitest run src/lib/notifications/submission-notifier.test.ts`
  Expected: Lỗi biên dịch vì `resolveNotificationRecipientIds` chưa nhận tham số `taskType`.

- [ ] **Step 3: Cập nhật code triển khai**
  Sửa file `src/lib/notifications/submission-notifier.ts` để nhận và xử lý `taskType`:
  
  Thêm import `TaskType`:
  ```typescript
  import type { TaskType } from "@/lib/tasks/constants";
  ```
  
  Cập nhật kiểu dữ liệu đầu vào cho `resolveNotificationRecipientIds` và triển khai logic lọc mới:
  ```typescript
  export function resolveNotificationRecipientIds(input: {
    excludeUserId?: string | null;
    scope: NotificationScope;
    subjectRole?: Role | null;
    users: NotificationUser[];
    taskType?: TaskType | null;
  }): string[] {
    const recipientIds = new Set<string>();
    const { regionId, scope, teamId, zoneId } = input.scope;

    if (input.taskType === "COUNT_TOTAL" && teamId) {
      addMatchingUserIds(
        recipientIds,
        input.users,
        (user) => user.teamId === teamId,
      );
    } else {
      if (teamId) {
        addMatchingUserIds(
          recipientIds,
          input.users,
          (user) => user.role === "TEAM_LEAD" && user.teamId === teamId,
        );
      }

      if (zoneId) {
        addMatchingUserIds(
          recipientIds,
          input.users,
          (user) => user.role === "ZONE_LEAD" && user.zoneId === zoneId,
        );
      }

      if (regionId) {
        addMatchingUserIds(
          recipientIds,
          input.users,
          (user) => user.role === "REGIONAL_LEAD" && user.regionId === regionId,
        );
      }

      const horizontalRole =
        input.subjectRole ??
        (scope === "TEAM"
          ? "TEAM_LEAD"
          : scope === "ZONE"
            ? "ZONE_LEAD"
            : scope === "REGION"
              ? "REGIONAL_LEAD"
              : null);

      if (horizontalRole === "TEAM_LEAD" && teamId) {
        addMatchingUserIds(
          recipientIds,
          input.users,
          (user) => user.role === "TEAM_LEAD" && user.teamId === teamId,
        );
      }

      if (horizontalRole === "ZONE_LEAD" && teamId) {
        addMatchingUserIds(
          recipientIds,
          input.users,
          (user) => user.role === "ZONE_LEAD" && user.teamId === teamId,
        );
      }

      if (horizontalRole === "REGIONAL_LEAD" && zoneId) {
        addMatchingUserIds(
          recipientIds,
          input.users,
          (user) => user.role === "REGIONAL_LEAD" && user.zoneId === zoneId,
        );
      }
    }

    if (input.excludeUserId) {
      recipientIds.delete(input.excludeUserId);
    }

    return [...recipientIds];
  }
  ```

  Cập nhật hàm `findNotificationRecipientUserIds` và `notifySubmissionToGroups`, `notifyTaskCompletionToGroups` để nhận `taskType` và truyền xuống dưới:
  ```typescript
  async function findNotificationRecipientUserIds(input: {
    excludeUserId?: string | null;
    scope: NotificationScope;
    subjectRole?: Role | null;
    taskType?: TaskType | null;
  }): Promise<string[]> {
    const teamId = input.scope.teamId ? toObjectId(input.scope.teamId) : null;
    const zoneId = input.scope.zoneId ? toObjectId(input.scope.zoneId) : null;
    const regionId = input.scope.regionId ? toObjectId(input.scope.regionId) : null;
    if (!teamId && !zoneId && !regionId) return [];

    const query = {
      $or: [
        ...(teamId ? [{ teamId }] : []),
        ...(zoneId ? [{ zoneId }] : []),
        ...(regionId ? [{ regionId }] : []),
      ],
    };

    const users = await UserModel.find(query)
      .select({ _id: 1, regionId: 1, role: 1, teamId: 1, zoneId: 1 })
      .lean();

    return resolveNotificationRecipientIds({
      excludeUserId: input.excludeUserId,
      scope: input.scope,
      subjectRole: input.subjectRole,
      taskType: input.taskType,
      users: (
        users as Array<{
          _id: unknown;
          role: Role;
          teamId?: unknown;
          zoneId?: unknown;
          regionId?: unknown;
        }>
      ).map((user) => ({
        id: String(user._id),
        role: user.role,
        teamId: user.teamId ? String(user.teamId) : null,
        zoneId: user.zoneId ? String(user.zoneId) : null,
        regionId: user.regionId ? String(user.regionId) : null,
      })),
    });
  }

  export async function notifySubmissionToGroups(input: {
    subject: {
      id?: string | null;
      fullName: string;
      role: Role;
      teamId?: string | null;
      zoneId?: string | null;
      regionId?: string | null;
    };
    taskTitle: string;
    xpAwarded: number;
    completionCount: number;
    template?: string;
    taskType?: TaskType;
  }): Promise<void> {
    await connectToDatabase();

    const userIds = await findNotificationRecipientUserIds({
      excludeUserId: input.subject.id,
      scope: input.subject,
      subjectRole: input.subject.role,
      taskType: input.taskType,
    });
    if (userIds.length === 0) return;

    const body = formatGroupSubmissionMessage({
      fullName: input.subject.fullName,
      taskTitle: input.taskTitle,
      xpAwarded: input.xpAwarded,
      completionCount: input.completionCount,
      template: input.template,
    });

    await Promise.allSettled(
      userIds.map((userId) =>
        safeSendWebPush(userId, {
          title: "Nhiệm vụ hoàn thành",
          body,
          url: "/",
          tag: `submission:${input.subject.id ?? ""}`,
        }),
      ),
    );
  }

  export async function notifyTaskCompletionToGroups(input: {
    scope: {
      scope: TaskScope;
      teamId?: string | null;
      zoneId?: string | null;
      regionId?: string | null;
    };
    excludeUserId?: string | null;
    taskTitle: string;
    targetCount: number;
    template?: string;
    taskType?: TaskType;
  }): Promise<void> {
    await connectToDatabase();

    const userIds = await findNotificationRecipientUserIds({
      excludeUserId: input.excludeUserId,
      scope: input.scope,
      taskType: input.taskType,
    });
    if (userIds.length === 0) return;

    const body = input.template
      ? renderTemplate(input.template, {
          task: input.taskTitle,
          target: input.targetCount,
        })
      : `Nhiệm vụ "${input.taskTitle}" đã đạt mục tiêu ${input.targetCount}!`;

    await Promise.allSettled(
      userIds.map((userId) =>
        safeSendWebPush(userId, {
          title: "Nhiệm vụ đạt mục tiêu",
          body,
          url: "/",
          tag: `task-complete:${input.scope.teamId ?? ""}`,
        }),
      ),
    );
  }
  ```

- [ ] **Step 4: Chạy test để xác nhận test đã pass**
  Run: `npx vitest run src/lib/notifications/submission-notifier.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  Run: `git commit -am "feat(notification): support taskType in submission recipient resolver"`

---

### Task 2: Truyền `taskType` từ `submission-service.ts`

**Files:**
- Modify: [submission-service.ts](file:///Users/devhugon/Desktop/Workspaces/miso-apps/ubuntu/src/lib/tasks/submission-service.ts)

- [ ] **Step 1: Truyền `taskType` vào `notifySubmissionToGroups` và `notifyTaskCompletionToGroups`**
  Tìm đoạn gọi `notifySubmissionToGroups` trong `saveSubmission` ở file `src/lib/tasks/submission-service.ts` (khoảng dòng 488):
  ```typescript
      void notifySubmissionToGroups({
        subject: {
          id: subjectSession.id,
          fullName: decoratedSubjectName,
          role: subjectSession.role,
          teamId: subjectSession.teamId,
          zoneId: subjectSession.zoneId,
          regionId: subjectSession.regionId,
        },
        taskTitle: taskRaw.title,
        xpAwarded: result.xpAwarded,
        completionCount: result.completionCount,
        template: taskRaw.submissionMessage || undefined,
        taskType, // thêm dòng này
      }).catch((err) => {
        console.error("[submission-notifier]", err);
      });
  ```

  Tìm đoạn gọi `notifyTaskCompletionToGroups` (khoảng dòng 506):
  ```typescript
      if (result.taskJustCompleted && taskRaw.targetCount) {
        void notifyTaskCompletionToGroups({
          excludeUserId: subjectSession.id,
          scope: {
            scope: taskRaw.scope,
            teamId: taskRaw.teamId.toString(),
            zoneId: taskRaw.zoneId?.toString() ?? null,
            regionId: taskRaw.regionId?.toString() ?? null,
          },
          taskTitle: taskRaw.title,
          targetCount: taskRaw.targetCount,
          template: taskRaw.completionMessage || undefined,
          taskType, // thêm dòng này
        }).catch((err) => {
          console.error("[submission-notifier]", err);
        });
      }
  ```

- [ ] **Step 2: Chạy toàn bộ test suite để xác minh tính ổn định**
  Run: `npm test`
  Expected: Tất cả 108 test đều PASS.

- [ ] **Step 3: Commit**
  Run: `git commit -am "feat(submission): pass taskType to notification functions"`
