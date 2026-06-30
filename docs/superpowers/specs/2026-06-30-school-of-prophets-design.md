# Thiết kế tính năng: Trường học Đấng Tiên Tri (Trường học ĐTT)

Tính năng này cho phép CS - ĐL (Team Lead) quản lý danh sách học viên tham gia Trường học ĐTT trong nhóm của mình và thiết lập nhanh các nhiệm vụ dành riêng cho các học viên này.

---

## 1. Thiết kế Cơ sở Dữ liệu & Xác thực (Database & Validation)

### 1.1. Model Tuyển sinh Mới: `DttEnrollment`
Tạo một Collection mới trong MongoDB để lưu trữ thông tin học viên tham gia Trường học ĐTT.
*   **Đường dẫn file**: `src/lib/models/dtt-enrollment.ts`
*   **Schema**:
    ```typescript
    import { model, models, Schema, Types } from "mongoose";

    const dttEnrollmentSchema = new Schema(
      {
        userId: { ref: "User", required: true, type: Schema.Types.ObjectId, index: true },
        teamId: { ref: "Team", required: true, type: Schema.Types.ObjectId, index: true },
        enrolledBy: { ref: "User", required: true, type: Schema.Types.ObjectId },
        enrolledAt: { default: Date.now, type: Date },
      },
      { timestamps: true }
    );

    // Một user chỉ có tối đa 1 bản ghi tham gia học ĐTT
    dttEnrollmentSchema.index({ userId: 1 }, { unique: true });

    export type DttEnrollmentRecord = {
      _id: Types.ObjectId;
      userId: Types.ObjectId;
      teamId: Types.ObjectId;
      enrolledBy: Types.ObjectId;
      enrolledAt: Date;
      createdAt: Date;
      updatedAt: Date;
    };

    export const DttEnrollmentModel =
      models.DttEnrollment || model("DttEnrollment", dttEnrollmentSchema);
    ```

### 1.2. Cập nhật Model `Task` (Nhiệm vụ mẫu)
*   **Đường dẫn file**: `src/lib/models/task.ts`
*   **Thay đổi**: Thêm trường `isDtt` để đánh dấu nhiệm vụ thuộc Trường học ĐTT.
    ```typescript
    isDtt: { default: false, type: Boolean }
    ```

### 1.3. Cập nhật Schema Xác thực `zod`
*   **Đường dẫn file**: `src/lib/validation.ts`
*   **Thay đổi**: Thêm trường `isDtt` vào `taskBaseSchema` để xác thực dữ liệu khi tạo/sửa nhiệm vụ.
    ```typescript
    isDtt: z.boolean().default(false)
    ```

---

## 2. Logic Hiển thị & Xử lý (Visibility & Business Logic)

### 2.1. Cập nhật hàm kiểm tra hiển thị nhiệm vụ `appliesToUser`
*   **Đường dẫn file**: `src/lib/tasks/policy.ts`
*   **Mô tả**: Sửa logic để một nhiệm vụ hiển thị cho người dùng nếu người dùng thỏa mãn một trong hai điều kiện (có vai trò khớp với `targetRoles` của nhiệm vụ HOẶC nhiệm vụ đó thuộc Trường học ĐTT và người dùng đang học ĐTT), đồng thời vẫn phải trùng khớp về phạm vi (nhóm/địa vực/khu vực).
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

### 2.2. Tích hợp cờ `isDttUser` và `isDtt` vào Dashboard và Reminders
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
*   **Giao diện**: Thêm một Switch component đẹp mắt (sử dụng Tailwind v4) với nhãn **"Dành cho Trường học ĐTT"**.
*   **Server Actions**: Cập nhật `src/app/(app)/templates/actions.ts` để đọc và lưu trường `isDtt` từ form data gửi lên.

### 3.2. Đăng ký Menu tại trang Quản trị (Admin Menu)
*   **Đường dẫn file**: `src/app/(app)/admin/page.tsx`
*   **Thay đổi**: Thêm nút liên kết đến trang `/admin/dtt` trong mục **"Vận hành"**.

### 3.3. Trang Quản lý Tập trung `/admin/dtt`
*   **Tạo mới trang**: `src/app/(app)/admin/dtt/page.tsx`
*   **Giao diện**: Thiết kế giao diện hiện đại với 2 tab chính:
    1.  **Tab "Học viên ĐTT"**:
        *   Bảng hiển thị các học viên hiện tại (Họ tên, Vai trò, Ngày gia nhập).
        *   Nút **"Rút khỏi trường học"** bên cạnh mỗi học viên.
        *   Danh sách các thành viên khác trong nhóm chưa tham gia ĐTT kèm nút **"Thêm vào Trường học"**.
    2.  **Tab "Nhiệm vụ ĐTT"**:
        *   Danh sách tất cả nhiệm vụ đang hoạt động của nhóm.
        *   Bên cạnh mỗi nhiệm vụ có một Switch Toggle **"Dành cho Trường học ĐTT"** để thiết lập/gỡ bỏ nhanh trạng thái nhiệm vụ mà không cần tải lại trang.
*   **Tập tin Server Actions**: Tạo mới `src/app/(app)/admin/dtt/actions.ts` chứa các hàm xử lý:
    *   `enrollStudentAction(userId: string)`: Thêm một học viên vào cơ sở dữ liệu DttEnrollment.
    *   `unenrollStudentAction(userId: string)`: Xóa học viên khỏi cơ sở dữ liệu DttEnrollment.
    *   `toggleTaskDttAction(taskId: string, isDtt: boolean)`: Đổi trạng thái `isDtt` của một nhiệm vụ.
    *   Tất cả actions này đều gọi `revalidatePath` để cập nhật UI ngay lập tức.
