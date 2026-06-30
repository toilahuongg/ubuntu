# Trường học Đấng Tiên Tri (Trường học ĐTT) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng tính năng Trường học Đấng Tiên Tri (Trường học ĐTT) cho phép CS - ĐL (Team Lead) quản lý danh sách học viên theo lớp học và gán nhanh các nhiệm vụ mẫu dành riêng cho các học viên này.

**Architecture:** Tạo hai model mới `DttClass` và `DttEnrollment` để quản lý các lớp học và học viên ĐTT theo từng nhóm (Team). Cập nhật model `Task` để thêm trường `isDtt`, và sửa hàm chính `appliesToUser` để hiển thị nhiệm vụ cho học viên ĐTT bất kể vai trò của họ, đồng thời hiển thị song song cho các thành viên khớp với vai trò đích (`targetRoles`).

**Tech Stack:** Next.js 16 App Router, React 19, MongoDB, Mongoose, Tailwind CSS v4, Zod, Vitest.

## Global Constraints
- Naming rules: Dùng tiếng Việt cho nhãn hiển thị giao diện (Trường học ĐTT, Lớp học, Học viên), dùng tiếng Anh cho tên biến, API và Database.
- Phân quyền: Chỉ các vai trò quản trị (ADMIN, REGIONAL_LEAD, ZONE_LEAD, TEAM_LEAD) mới được truy cập trang quản lý `/admin/dtt` và gọi các DTT server actions.
- Trạng thái học viên ĐTT: Mỗi người dùng chỉ được tham gia tối đa 1 lớp học ĐTT tại một thời điểm.

---

### Task 1: Tạo các Model DttClass và DttEnrollment

**Files:**
- Create: `src/lib/models/dtt-class.ts`
- Create: `src/lib/models/dtt-enrollment.ts`
- Modify: `src/lib/models/index.ts:1-22`
- Test: `src/lib/models/dtt-class.test.ts`

**Interfaces:**
- Produces: `DttClassModel` and `DttEnrollmentModel`.

- [ ] **Step 1: Viết test kiểm tra tính hợp lệ của Model DttClass và DttEnrollment**
  Tạo file `src/lib/models/dtt-class.test.ts`:
  ```typescript
  import { describe, it, expect, beforeEach } from "vitest";
  import { connectToDatabase } from "@/lib/mongoose";
  import { DttClassModel } from "./dtt-class";
  import { DttEnrollmentModel } from "./dtt-enrollment";
  import { Types } from "mongoose";

  describe("DTT Models Test", () => {
    it("should reject creation without required fields in DttClass", async () => {
      const doc = new DttClassModel({});
      let err: any = null;
      try {
        await doc.validate();
      } catch (e) {
        err = e;
      }
      expect(err).toBeNotNull();
    });

    it("should reject creation without required fields in DttEnrollment", async () => {
      const doc = new DttEnrollmentModel({});
      let err: any = null;
      try {
        await doc.validate();
      } catch (e) {
        err = e;
      }
      expect(err).toBeNotNull();
    });
  });
  ```

- [ ] **Step 2: Chạy test và xác nhận thất bại**
  Chạy lệnh: `npx vitest run src/lib/models/dtt-class.test.ts`
  Kết quả mong đợi: FAIL (do chưa định nghĩa các model này).

- [ ] **Step 3: Tạo Schema và Model DttClass**
  Tạo file `src/lib/models/dtt-class.ts`:
  ```typescript
  import { model, models, Schema, Types } from "mongoose";

  const dttClassSchema = new Schema(
    {
      name: { required: true, trim: true, type: String },
      teamId: { ref: "Team", required: true, type: Schema.Types.ObjectId, index: true },
      createdBy: { ref: "User", required: true, type: Schema.Types.ObjectId },
    },
    { timestamps: true }
  );

  dttClassSchema.index({ name: 1, teamId: 1 }, { unique: true });

  export type DttClassRecord = {
    _id: Types.ObjectId;
    name: string;
    teamId: Types.ObjectId;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
  };

  export const DttClassModel =
    models.DttClass || model("DttClass", dttClassSchema);
  ```

- [ ] **Step 4: Tạo Schema và Model DttEnrollment**
  Tạo file `src/lib/models/dtt-enrollment.ts`:
  ```typescript
  import { model, models, Schema, Types } from "mongoose";

  const dttEnrollmentSchema = new Schema(
    {
      userId: { ref: "User", required: true, type: Schema.Types.ObjectId, index: true },
      classId: { ref: "DttClass", required: true, type: Schema.Types.ObjectId, index: true },
      teamId: { ref: "Team", required: true, type: Schema.Types.ObjectId, index: true },
      enrolledBy: { ref: "User", required: true, type: Schema.Types.ObjectId },
      enrolledAt: { default: Date.now, type: Date },
    },
    { timestamps: true }
  );

  dttEnrollmentSchema.index({ userId: 1 }, { unique: true });

  export type DttEnrollmentRecord = {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    classId: Types.ObjectId;
    teamId: Types.ObjectId;
    enrolledBy: Types.ObjectId;
    enrolledAt: Date;
    createdAt: Date;
    updatedAt: Date;
  };

  export const DttEnrollmentModel =
    models.DttEnrollment || model("DttEnrollment", dttEnrollmentSchema);
  ```

- [ ] **Step 5: Xuất bản các model mới từ Models index**
  Sửa `src/lib/models/index.ts` để thêm hai dòng exports:
  ```typescript
  export * from "@/lib/models/dtt-class";
  export * from "@/lib/models/dtt-enrollment";
  ```

- [ ] **Step 6: Chạy test và xác nhận thành công**
  Chạy lệnh: `npx vitest run src/lib/models/dtt-class.test.ts`
  Kết quả mong đợi: PASS.

- [ ] **Step 7: Commit các thay đổi**
  ```bash
  git add src/lib/models/dtt-class.ts src/lib/models/dtt-enrollment.ts src/lib/models/index.ts src/lib/models/dtt-class.test.ts
  git commit -m "feat: add DttClass and DttEnrollment models"
  ```

---

### Task 2: Cập nhật Model Task và Validation Schemas

**Files:**
- Modify: `src/lib/models/task.ts:38-72`
- Modify: `src/lib/validation.ts:53-89`
- Test: `src/lib/models/task-dtt.test.ts`

**Interfaces:**
- Produces: `isDtt` field inside `TaskRecord` and zod schema validation helper.

- [ ] **Step 1: Viết test kiểm tra zod validation hỗ trợ isDtt**
  Tạo file `src/lib/models/task-dtt.test.ts`:
  ```typescript
  import { describe, it, expect } from "vitest";
  import { taskInputSchema } from "@/lib/validation";

  describe("Task DTT Field Validation", () => {
    it("should accept optional isDtt field in validation", () => {
      const parsed = taskInputSchema.safeParse({
        title: "Test Task Name",
        deadlineTime: "21:00",
        isDtt: true,
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.isDtt).toBe(true);
      }
    });

    it("should default isDtt to false if omitted", () => {
      const parsed = taskInputSchema.safeParse({
        title: "Test Task Name",
        deadlineTime: "21:00",
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.isDtt).toBe(false);
      }
    });
  });
  ```

- [ ] **Step 2: Chạy test và xác nhận thất bại**
  Chạy lệnh: `npx vitest run src/lib/models/task-dtt.test.ts`
  Kết quả mong đợi: FAIL (do validation schema chưa nhận diện hoặc lọc bỏ `isDtt`).

- [ ] **Step 3: Thêm isDtt vào Mongoose Task Schema**
  Sửa `src/lib/models/task.ts` để thêm trường `isDtt` bên trong `taskSchema`:
  ```typescript
  // Thêm vào dưới sortOrder hoặc isActive:
  isDtt: { default: false, type: Boolean },
  ```
  Và cập nhật kiểu `TaskRecord`:
  ```typescript
  isDtt: boolean;
  ```

- [ ] **Step 4: Thêm isDtt vào Validation Schema**
  Sửa `src/lib/validation.ts` bên trong `taskBaseSchema` để khai báo trường `isDtt`:
  ```typescript
  // Thêm vào dưới completionMessage hoặc các trường khác:
  isDtt: z.boolean().default(false),
  ```

- [ ] **Step 5: Chạy test và xác nhận thành công**
  Chạy lệnh: `npx vitest run src/lib/models/task-dtt.test.ts`
  Kết quả mong đợi: PASS.

- [ ] **Step 6: Commit các thay đổi**
  ```bash
  git add src/lib/models/task.ts src/lib/validation.ts src/lib/models/task-dtt.test.ts
  git commit -m "feat: add isDtt property to Task model and validation schemas"
  ```

---

### Task 3: Cập nhật Logic Hiển thị nhiệm vụ appliesToUser

**Files:**
- Modify: `src/lib/tasks/policy.ts:13-77`
- Modify: `src/lib/tasks/policy.test.ts:35-100`

**Interfaces:**
- Consumes: Updated `appliesToUser` signature and logic checks.

- [ ] **Step 1: Thêm ca kiểm thử mới trong file policy.test.ts**
  Sửa `src/lib/tasks/policy.test.ts` để kiểm tra hiển thị nhiệm vụ với điều kiện DTT:
  ```typescript
  // Thêm các ca kiểm thử trong describe("appliesToUser")
  it("should return true if task is for DTT and user is in DTT, even if roles do not match", () => {
    const taskContext = {
      scope: "TEAM" as const,
      teamId: "team-a",
      zoneId: null,
      regionId: null,
      targetRoles: ["NGV" as const],
      isDtt: true,
    };
    const userScope = {
      teamId: "team-a",
      zoneId: null,
      regionId: null,
      role: "MEMBER" as const, // Vai trò không khớp targetRoles
      isDttUser: true,          // Nhưng là học viên ĐTT
    };
    expect(appliesToUser(taskContext, userScope)).toBe(true);
  });

  it("should return false if task is for DTT but user is NOT in DTT and role doesn't match", () => {
    const taskContext = {
      scope: "TEAM" as const,
      teamId: "team-a",
      zoneId: null,
      regionId: null,
      targetRoles: ["NGV" as const],
      isDtt: true,
    };
    const userScope = {
      teamId: "team-a",
      zoneId: null,
      regionId: null,
      role: "MEMBER" as const,
      isDttUser: false,
    };
    expect(appliesToUser(taskContext, userScope)).toBe(false);
  });
  ```

- [ ] **Step 2: Chạy test và xác nhận thất bại**
  Chạy lệnh: `npx vitest run src/lib/tasks/policy.test.ts`
  Kết quả mong đợi: FAIL (do hàm `appliesToUser` chưa xử lý thuộc tính `isDtt` và `isDttUser`).

- [ ] **Step 3: Cập nhật hàm appliesToUser trong policy.ts**
  Sửa `src/lib/tasks/policy.ts`:
  Cập nhật kiểu `ScopeContext`:
  ```typescript
  export type ScopeContext = {
    scope: TaskScope;
    teamId: string;
    zoneId: string | null;
    regionId: string | null;
    targetRoles?: TaskTargetRole[] | null;
    isDtt?: boolean; // Thêm
  };
  ```
  Cập nhật kiểu `UserScope`:
  ```typescript
  type UserScope = Pick<SessionUser, "teamId" | "zoneId" | "regionId"> & {
    role?: Role;
    isDttUser?: boolean; // Thêm
  };
  ```
  Sửa thân hàm `appliesToUser`:
  ```typescript
  export function appliesToUser(
    task: ScopeContext,
    user: UserScope,
  ): boolean {
    if (!user.teamId) return false;
    const targetRoles = normalizeTargetRoles(task.targetRoles, task.scope);
    if (user.role === "ADMIN") return false;

    // logic mới
    const roleMatches = user.role && targetRoles.includes(user.role);
    const dttMatches = !!task.isDtt && !!user.isDttUser;

    if (!roleMatches && !dttMatches) return false;

    // So khớp scope (giữ nguyên)
    if (task.scope === "TEAM") return task.teamId === user.teamId;
    if (task.scope === "ZONE") {
      if (user.role === "TEAM_LEAD") return task.teamId === user.teamId;
      return !!user.zoneId && task.zoneId === user.zoneId;
    }
    if (task.scope === "REGION") {
      if (user.role === "TEAM_LEAD") return task.teamId === user.teamId;
      if (user.role === "ZONE_LEAD") {
        return !!user.zoneId && task.zoneId === user.zoneId;
      }
      return !!user.regionId && task.regionId === user.regionId;
    }
    return false;
  }
  ```

- [ ] **Step 4: Chạy test và xác nhận thành công**
  Chạy lệnh: `npx vitest run src/lib/tasks/policy.test.ts`
  Kết quả mong đợi: PASS.

- [ ] **Step 5: Commit các thay đổi**
  ```bash
  git add src/lib/tasks/policy.ts src/lib/tasks/policy.test.ts
  git commit -m "feat: update appliesToUser task visibility checking logic for DTT"
  ```

---

### Task 4: Nạp thông tin DTT vào các Dịch vụ Dashboard & Reminders

**Files:**
- Modify: `src/lib/tasks/dashboard-service.ts:82-130`, `536-560`
- Modify: `src/lib/tasks/reminder-service.ts:210-230`, `280-300`, `410-430`
- Modify: `src/lib/services/admin-operations-service.ts:240-260`, `280-300`, `580-600`

**Interfaces:**
- Consumes: `DttEnrollmentModel` querying.

- [ ] **Step 1: Cập nhật hàm loadScopeDataForVisibleUsers trong dashboard-service.ts**
  Sửa `src/lib/tasks/dashboard-service.ts`:
  Import `DttEnrollmentModel`:
  ```typescript
  import { DttEnrollmentModel } from "@/lib/models/dtt-enrollment";
  ```
  Trong hàm `loadScopeDataForVisibleUsers` (khoảng dòng 82), nạp thêm các lượt ghi danh DTT của các thành viên đang hoạt động:
  ```typescript
  // Thêm truy vấn:
  const dttEnrollments = await DttEnrollmentModel.find({
    userId: { $in: visibleUsers.map((u) => toObjectId(u.id)) },
  }).lean();
  const dttUserIdsSet = new Set(dttEnrollments.map((e) => e.userId.toString()));
  ```
  Khi chuyển đổi sang user shape (cho cả `appliesToUser` trong vòng lặp lọc nhiệm vụ), gán thêm trường `isDttUser`:
  ```typescript
  // Cập nhật hàm userShape cục bộ:
  function userShape(
    u: Pick<SerializedUser, "id" | "teamId" | "zoneId" | "regionId" | "role">,
    dttUserIdsSet: Set<string>,
  ) {
    return {
      teamId: u.teamId ?? null,
      zoneId: u.zoneId ?? null,
      regionId: u.regionId ?? null,
      role: u.role,
      isDttUser: dttUserIdsSet.has(u.id),
    };
  }
  ```
  Cập nhật logic `relevantTasks` và các hàm gọi `appliesToUser` tương tự trong file này để truyền thêm tham số `isDttUser`. Đồng thời cập nhật kiểu `ScopeContext` truyền cho task map.

- [ ] **Step 2: Cập nhật các hàm kiểm tra tương tự trong reminder-service.ts**
  Sửa `src/lib/tasks/reminder-service.ts`:
  Nạp bảng `DttEnrollmentModel` để điền `isDttUser` chính xác trước khi gọi `appliesToUser` khi gửi reminder.

- [ ] **Step 3: Cập nhật các hàm kiểm tra tương tự trong admin-operations-service.ts**
  Sửa `src/lib/services/admin-operations-service.ts`:
  Nạp dữ liệu DttEnrollment và điền cờ `isDttUser` cho các thành viên trong các trang quản trị để hiển thị tiến độ và hoạt động chính xác.

- [ ] **Step 4: Chạy bộ test hệ thống để xác nhận không lỗi biên dịch**
  Chạy lệnh: `npx vitest run`
  Kết quả mong đợi: Các bài test hiện tại và test mới đều hoạt động trơn tru, không gặp lỗi cú pháp hay thiếu import.

- [ ] **Step 5: Commit các thay đổi**
  ```bash
  git add src/lib/tasks/dashboard-service.ts src/lib/tasks/reminder-service.ts src/lib/services/admin-operations-service.ts
  git commit -m "feat: integrate DttEnrollment checks inside dashboard, reminders, and operations services"
  ```

---

### Task 5: Xây dựng các Server Actions cho Trường học ĐTT

**Files:**
- Create: `src/app/(app)/admin/dtt/actions.ts`

**Interfaces:**
- Produces: Server actions (`createClassAction`, `updateClassAction`, `deleteClassAction`, `enrollStudentAction`, `unenrollStudentAction`, `changeStudentClassAction`, `toggleTaskDttAction`).

- [ ] **Step 1: Tạo tệp actions.ts**
  Tạo file `src/app/(app)/admin/dtt/actions.ts`:
  ```typescript
  "use server";

  import { revalidatePath } from "next/cache";
  import { redirect } from "next/navigation";
  import { getSessionUser } from "@/lib/auth/session";
  import { runAction, type ActionResult } from "@/lib/actions/result";
  import { canManageTasks } from "@/lib/permissions";
  import { DttClassModel } from "@/lib/models/dtt-class";
  import { DttEnrollmentModel } from "@/lib/models/dtt-enrollment";
  import { TaskModel } from "@/lib/models/task";
  import { toObjectId } from "@/lib/utils/ids";

  async function requireManager() {
    const session = await getSessionUser();
    if (!session) redirect("/login");
    if (!canManageTasks(session)) {
      throw new Error("Bạn không có quyền quản lý.");
    }
    return session;
  }

  export async function createClassAction(name: string): Promise<ActionResult> {
    return runAction(async () => {
      const session = await requireManager();
      if (!session.teamId) throw new Error("Tài khoản của bạn chưa thuộc nhóm nào.");
      
      await DttClassModel.create({
        name: name.trim(),
        teamId: toObjectId(session.teamId),
        createdBy: toObjectId(session.id),
      });

      revalidatePath("/admin/dtt");
    });
  }

  export async function updateClassAction(classId: string, name: string): Promise<ActionResult> {
    return runAction(async () => {
      await requireManager();
      await DttClassModel.findByIdAndUpdate(toObjectId(classId), {
        name: name.trim(),
      });
      revalidatePath("/admin/dtt");
    });
  }

  export async function deleteClassAction(classId: string): Promise<ActionResult> {
    return runAction(async () => {
      await requireManager();
      
      const hasStudents = await DttEnrollmentModel.exists({ classId: toObjectId(classId) });
      if (hasStudents) {
        throw new Error("Không thể xóa lớp học đang có học viên.");
      }

      await DttClassModel.findByIdAndDelete(toObjectId(classId));
      revalidatePath("/admin/dtt");
    });
  }

  export async function enrollStudentAction(userId: string, classId: string): Promise<ActionResult> {
    return runAction(async () => {
      const session = await requireManager();
      if (!session.teamId) throw new Error("Chưa xác định được nhóm của bạn.");

      await DttEnrollmentModel.create({
        userId: toObjectId(userId),
        classId: toObjectId(classId),
        teamId: toObjectId(session.teamId),
        enrolledBy: toObjectId(session.id),
      });

      revalidatePath("/admin/dtt");
      revalidatePath("/dashboard");
    });
  }

  export async function unenrollStudentAction(userId: string): Promise<ActionResult> {
    return runAction(async () => {
      await requireManager();
      await DttEnrollmentModel.findOneAndDelete({ userId: toObjectId(userId) });
      revalidatePath("/admin/dtt");
      revalidatePath("/dashboard");
    });
  }

  export async function changeStudentClassAction(userId: string, classId: string): Promise<ActionResult> {
    return runAction(async () => {
      await requireManager();
      await DttEnrollmentModel.findOneAndUpdate(
        { userId: toObjectId(userId) },
        { classId: toObjectId(classId) }
      );
      revalidatePath("/admin/dtt");
      revalidatePath("/dashboard");
    });
  }

  export async function toggleTaskDttAction(taskId: string, isDtt: boolean): Promise<ActionResult> {
    return runAction(async () => {
      await requireManager();
      await TaskModel.findByIdAndUpdate(toObjectId(taskId), { isDtt });
      revalidatePath("/admin/dtt");
      revalidatePath("/templates");
      revalidatePath("/dashboard");
    });
  }
  ```

- [ ] **Step 2: Commit các thay đổi**
  ```bash
  git add src/app/(app)/admin/dtt/actions.ts
  git commit -m "feat: add Server Actions for DTT classes and enrollments"
  ```

---

### Task 6: Xây dựng Giao diện Trang Quản lý ĐTT và cập nhật Form Nhiệm vụ

**Files:**
- Create: `src/app/(app)/admin/dtt/page.tsx`
- Modify: `src/app/(app)/admin/page.tsx:210-240`
- Modify: `src/app/(app)/templates/create-template-form.tsx:140-155`
- Modify: `src/app/(app)/templates/edit-template-form.tsx:70-85`
- Modify: `src/app/(app)/templates/actions.ts:60-120`

**Interfaces:**
- Consumes: Server actions from Task 5.

- [ ] **Step 1: Tạo trang quản lý ĐTT /admin/dtt/page.tsx**
  Tạo file `src/app/(app)/admin/dtt/page.tsx` hiển thị giao diện Tabs gồm "Học viên & Lớp học" và "Nhiệm vụ ĐTT":
  ```typescript
  import { redirect } from "next/navigation";
  import { getSessionUser } from "@/lib/auth/session";
  import { canManageTasks } from "@/lib/permissions";
  import { DttClassModel } from "@/lib/models/dtt-class";
  import { DttEnrollmentModel } from "@/lib/models/dtt-enrollment";
  import { TaskModel } from "@/lib/models/task";
  import { UserModel } from "@/lib/models/user";
  import { toObjectId } from "@/lib/utils/ids";
  import { AdminSubHeader } from "../sub-header";
  import { DttClassTab } from "./dtt-class-tab"; // Client component xử lý UI tương tác lớp học
  import { DttTaskTab } from "./dtt-task-tab";   // Client component xử lý nhanh switch bật tắt nhiệm vụ

  export default async function DttManagementPage() {
    const session = await getSessionUser();
    if (!session) redirect("/login");
    if (!canManageTasks(session)) redirect("/admin");

    const teamId = toObjectId(session.teamId ?? "");

    // Load tất cả các lớp của nhóm
    const classes = await DttClassModel.find({ teamId }).lean();
    
    // Load tất cả học viên đang học ĐTT của nhóm
    const enrollments = await DttEnrollmentModel.find({ teamId }).lean();
    
    // Load tất cả thành viên trong nhóm đang hoạt động
    const teamMembers = await UserModel.find({
      teamId,
      status: "ACTIVE",
    }).select({ fullName: 1, role: 1 }).lean();

    // Lọc ra các thành viên chưa gia nhập ĐTT
    const enrolledUserIds = new Set(enrollments.map((e) => e.userId.toString()));
    const nonDttMembers = teamMembers.filter((m) => !enrolledUserIds.has(m._id.toString()));

    // Load tất cả nhiệm vụ đang hoạt động của nhóm
    const tasks = await TaskModel.find({
      isActive: true,
      teamId,
    }).sort({ createdAt: -1 }).lean();

    const formattedClasses = classes.map((c) => ({
      id: c._id.toString(),
      name: c.name,
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
    }));

    const formattedTasks = tasks.map((t) => ({
      id: t._id.toString(),
      title: t.title,
      isDtt: !!t.isDtt,
    }));

    // Bố cục giao diện có Header và tabs
    return (
      <div className="space-y-4 animate-slide-up pb-8">
        <AdminSubHeader
          title="Trường học Đấng Tiên Tri"
          description="Quản lý lớp học, phân chia học viên và cấu hình các nhiệm vụ học tập"
        />

        <div className="flex flex-col gap-6">
          <DttClassTab
            classes={formattedClasses}
            enrollments={formattedEnrollments}
            nonDttMembers={formattedNonDttMembers}
          />
          
          <hr className="border-border/40" />

          <DttTaskTab tasks={formattedTasks} />
        </div>
      </div>
    );
  }
  ```
  *(Chú ý: Ta cũng sẽ cần viết client components `DttClassTab` và `DttTaskTab` đẹp mắt với các nút gọi server actions ở trên. Hãy viết chúng trong cùng thư mục `src/app/(app)/admin/dtt/`).*

- [ ] **Step 2: Viết Client Component DttClassTab và DttTaskTab**
  Tạo file `src/app/(app)/admin/dtt/dtt-class-tab.tsx` và `src/app/(app)/admin/dtt/dtt-task-tab.tsx` xử lý các nút tương tác, form và toggle switch sử dụng server actions vừa viết ở Task 5.

- [ ] **Step 3: Thêm nút menu Trường học ĐTT vào Admin page**
  Sửa `src/app/(app)/admin/page.tsx` trong mục `operationItems` để hiển thị menu mới:
  ```typescript
  // Thêm vào trong mảng operationItems:
  {
    href: "/admin/dtt",
    icon: Shield, // Sử dụng icon Shield hoặc tương đương
    label: "Trường học ĐTT",
    description: "Quản lý lớp học, học viên và gán nhanh nhiệm vụ",
  },
  ```

- [ ] **Step 4: Cấu hình isDtt vào Form Tạo/Sửa nhiệm vụ**
  Sửa `src/app/(app)/templates/create-template-form.tsx` và `edit-template-form.tsx` để bổ sung Switch/Checkbox cho trường `isDtt`.
  Sửa `src/app/(app)/templates/actions.ts` tại hàm `createTaskAction` và `updateTaskAction` để phân tích `isDtt` từ `formData.get("isDtt") === "true"` và chuyển tiếp vào database.

- [ ] **Step 5: Chạy ứng dụng chế độ dev và kiểm thử thủ công**
  Chạy lệnh: `npm run dev`
  Xác nhận ứng dụng khởi động thành công và truy cập được `/admin/dtt`.
  Chạy các test tự động để đảm bảo mọi thứ vẫn pass: `npx vitest run`

- [ ] **Step 6: Commit toàn bộ phần giao diện**
  ```bash
  git add src/app/(app)/admin/dtt/ src/app/(app)/admin/page.tsx src/app/(app)/templates/
  git commit -m "feat: implement DTT UI components, page, templates form and actions integration"
  ```
