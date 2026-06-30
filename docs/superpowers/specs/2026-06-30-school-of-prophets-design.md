# Thiết kế tính năng: Trường học Đấng Tiên Tri (Trường học ĐTT)

Tính năng này cho phép CS - ĐL (Team Lead) quản lý danh sách học viên tham gia Trường học ĐTT trong nhóm của mình bằng cách phân chia lớp học, đồng thời thiết lập nhanh các nhiệm vụ dành riêng cho toàn bộ học viên này.

---

## 1. Thiết kế Cơ sở Dữ liệu & Xác thực (Database & Validation)

### 1.1. Model Lớp học Mới: `DttClass`
Lưu thông tin các lớp học ĐTT do CS - ĐL tự tạo cho nhóm của mình.
*   **Đường dẫn file**: `src/lib/models/dtt-class.ts`
*   **Schema**:
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

    // Tên lớp là duy nhất trong phạm vi mỗi nhóm
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

### 1.2. Model Tuyển sinh: `DttEnrollment`
Ghi nhận học viên tham gia học ĐTT và lớp học cụ thể của họ.
*   **Đường dẫn file**: `src/lib/models/dtt-enrollment.ts`
*   **Schema**:
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

    // Mỗi thành viên chỉ học duy nhất 1 lớp tại một thời điểm
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

### 1.3. Cập nhật Model `Task` (Nhiệm vụ mẫu)
*   **Đường dẫn file**: `src/lib/models/task.ts`
*   **Thay đổi**: Thêm trường `isDtt` để đánh dấu nhiệm vụ thuộc Trường học ĐTT.
    ```typescript
    isDtt: { default: false, type: Boolean }
    ```

### 1.4. Cập nhật Schema Xác thực `zod`
*   **Đường dẫn file**: `src/lib/validation.ts`
*   **Thay đổi**: Thêm trường `isDtt` vào `taskBaseSchema` để xác thực dữ liệu khi tạo/sửa nhiệm vụ.
    ```typescript
    isDtt: z.boolean().default(false)
    ```

---

## 2. Logic Hiển thị & Xử lý (Visibility & Business Logic)

### 2.1. Cập nhật hàm kiểm tra hiển thị nhiệm vụ `appliesToUser`
*   **Đường dẫn file**: `src/lib/tasks/policy.ts`
*   **Mô tả**: Một nhiệm vụ hiển thị cho người dùng nếu người dùng thỏa mãn một trong hai điều kiện (có vai trò khớp với `targetRoles` của nhiệm vụ HOẶC nhiệm vụ đó thuộc Trường học ĐTT và người dùng đang học ĐTT), đồng thời vẫn phải trùng khớp về phạm vi (nhóm/địa vực/khu vực).
*   **Chi tiết sửa đổi**:
    ```typescript
    export type ScopeContext = {
      scope: TaskScope;
      teamId: string;
      zoneId: string | null;
      regionId: string | null;
      targetRoles?: TaskTargetRole[] | null;
      isDtt?: boolean; // Thêm mới
    };

    type UserScope = Pick<SessionUser, "teamId" | "zoneId" | "regionId"> & {
      role?: Role;
      isDttUser?: boolean; // Thêm mới
    };

    export function appliesToUser(task: ScopeContext, user: UserScope): boolean {
      if (!user.teamId) return false;
      const targetRoles = normalizeTargetRoles(task.targetRoles, task.scope);
      if (user.role === "ADMIN") return false;

      // Logic kiểm tra vai trò hoặc học viên ĐTT
      const roleMatches = user.role && targetRoles.includes(user.role);
      const dttMatches = !!task.isDtt && !!user.isDttUser;

      if (!roleMatches && !dttMatches) return false;

      // Logic so khớp phạm vi (giữ nguyên)
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

### 2.2. Tích hợp cờ `isDttUser` vào Dashboard và Reminders
*   **Trang Dashboard** (`src/lib/tasks/dashboard-service.ts`):
    *   Trong `loadScopeDataForVisibleUsers`, truy vấn bảng `DttEnrollmentModel` để lấy danh sách học viên ĐTT trong phạm vi.
    *   Tạo một Set chứa các `userId` đang học ĐTT để gán giá trị `isDttUser` vào các đối tượng thông tin người dùng được truyền vào `appliesToUser`.
*   **Hệ thống nhắc nhở** (`src/lib/tasks/reminder-service.ts`):
    *   Nạp danh sách `DttEnrollment` tương tự khi gửi thông báo/nhắc nhở để áp dụng đúng bộ lọc nhiệm vụ.
*   **Dịch vụ vận hành** (`src/lib/services/admin-operations-service.ts`):
    *   Tích hợp cờ để Admin/Leads xem chính xác tiến trình làm việc của học viên ĐTT.

---

## 3. Giao diện & Luồng Thao tác (UI & Flow)

### 3.1. Thêm Checkbox/Toggle vào Form Tạo/Sửa nhiệm vụ mẫu
*   **Đường dẫn file**:
    *   `src/app/(app)/templates/create-template-form.tsx`
    *   `src/app/(app)/templates/edit-template-form.tsx`
*   **Giao diện**: Thêm một Switch component đẹp mắt với nhãn **"Dành cho Trường học ĐTT"**.
*   **Server Actions**: Cập nhật `src/app/(app)/templates/actions.ts` để đọc và lưu trường `isDtt` từ form data gửi lên.

### 3.2. Đăng ký Menu tại trang Quản trị (Admin Menu)
*   **Đường dẫn file**: `src/app/(app)/admin/page.tsx`
*   **Thay đổi**: Thêm nút liên kết đến trang `/admin/dtt` trong mục **"Vận hành"**.

### 3.3. Trang Quản lý Tập trung `/admin/dtt`
*   **Tạo mới trang**: `src/app/(app)/admin/dtt/page.tsx`
*   **Giao diện**: Thiết kế giao diện với 2 tab chính:
    1.  **Tab "Học viên & Lớp học"**:
        *   **Quản lý lớp**: Nút "Tạo lớp học mới" (mở modal/form nhỏ). Hiển thị danh sách các lớp học ĐTT của nhóm, cho phép đổi tên hoặc xóa lớp (chỉ cho phép xóa khi lớp trống).
        *   **Danh sách học viên theo lớp**: Khi chọn một lớp học, hiển thị danh sách học viên hiện tại thuộc lớp đó kèm nút "Rút khỏi lớp" (Xóa khỏi trường học ĐTT) và nút "Chuyển lớp".
        *   **Thêm học viên**: Hiển thị danh sách thành viên nhóm chưa tham gia ĐTT, cho phép chọn lớp học bằng dropdown và ấn nút "Thêm vào lớp".
    2.  **Tab "Nhiệm vụ ĐTT"**:
        *   Hiển thị danh sách toàn bộ nhiệm vụ của nhóm kèm nút Toggle nhanh **"Dành cho Trường học ĐTT"**.
*   **Tập tin Server Actions**: Tạo mới `src/app/(app)/admin/dtt/actions.ts` chứa các hàm xử lý:
    *   `createClassAction(name: string)`: Tạo lớp học mới.
    *   `updateClassAction(classId: string, name: string)`: Đổi tên lớp học.
    *   `deleteClassAction(classId: string)`: Xóa lớp học (nếu không có học viên).
    *   `enrollStudentAction(userId: string, classId: string)`: Thêm một học viên vào lớp học ĐTT.
    *   `unenrollStudentAction(userId: string)`: Xóa học viên khỏi lớp học ĐTT (rút học).
    *   `changeStudentClassAction(userId: string, classId: string)`: Chuyển lớp cho học viên.
    *   `toggleTaskDttAction(taskId: string, isDtt: boolean)`: Thiết lập nhanh trạng thái nhiệm vụ ĐTT.
    *   Tất cả actions này đều gọi `revalidatePath` để làm mới UI ngay lập tức.
