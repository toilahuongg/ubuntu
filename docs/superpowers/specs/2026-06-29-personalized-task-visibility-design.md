# Thiết kế Tính năng Cá nhân hóa Hiển thị Nhiệm vụ cho Thành viên (Personalized Task Visibility)

Tài liệu thiết kế chi tiết cơ chế cho phép Khu Vực Trưởng (KVT) cấu hình ẩn/hiện nhiệm vụ đối với từng thành viên trong khu vực của mình.

---

## 1. Yêu cầu & Mục tiêu

* **Mở rộng quyền cho KVT/ĐVT**: Cho phép KVT (Regional Lead) và ĐVT (Zone Lead) truy cập chức năng quản lý nhiệm vụ mẫu (`/templates`) tương ứng với phạm vi của họ.
* **Cá nhân hóa nhiệm vụ**: Mặc định, nhiệm vụ hiển thị theo vai trò (`role`) của thành viên. KVT có thể thiết lập ghi đè ẩn nhiệm vụ ("Ẩn với...") cho từng thành viên trong khu vực quản lý.
* **Đồng bộ hệ thống**: Khi một nhiệm vụ bị ẩn đối với thành viên:
  * Không hiển thị trên Dashboard của thành viên.
  * Không gửi nhắc nhở (Telegram / Push notification) cho thành viên về nhiệm vụ đó.
  * Không tính vào danh sách chỉ tiêu / tiến độ hoàn thành trong báo cáo thống kê của khu vực/địa vực.
  * Không cho phép thành viên (hoặc quản lý nộp hộ) nộp báo cáo cho nhiệm vụ đó.

---

## 2. Thiết kế Cơ sở Dữ liệu

Tạo Schema mới `UserTaskVisibility` trong MongoDB:

### File: `src/lib/models/user-task-visibility.ts`
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

// Tránh trùng lặp cấu hình cho cùng một cặp User - Task
userTaskVisibilitySchema.index({ userId: 1, taskId: 1 }, { unique: true });

export const UserTaskVisibilityModel =
  models.UserTaskVisibility || model("UserTaskVisibility", userTaskVisibilitySchema);
```

Đồng thời xuất model này trong [index.ts](file:///Users/devhugon/Desktop/Workspaces/miso-apps/ubuntu/src/lib/models/index.ts).

---

## 3. Sửa đổi Logic Nghiệp vụ (Core Services)

### 3.1. Trang quản trị `/admin/page.tsx`
* Bổ dung hiển thị liên kết "Nhiệm vụ" dẫn tới trang `/templates` đối với KVT và ĐVT (hiện tại chỉ hiển thị đối với ADMIN và TEAM_LEAD). Điều kiện kiểm tra: `canManageTasks(session)`.

### 3.2. Kiểm tra Hiển thị Dashboard (`src/lib/tasks/dashboard-service.ts`)
* Cập nhật hàm `loadVisibleTasksAndSubs` để truy vấn danh sách ghi đè từ `UserTaskVisibilityModel` cho các thành viên hiển thị.
* Trả về thêm trường `visibilityOverrides` dạng Map từ `loadVisibleTasksAndSubs`.
* Cập nhật `buildDashboardLookup` và `buildTaskCard` để kiểm tra ghi đè trước khi kiểm tra `appliesToUser` mặc định.

### 3.3. Nhắc nhở Nhiệm vụ (`src/lib/tasks/reminder-service.ts`)
* Trong hàm `getReminderCandidates`, tải dữ liệu ghi đè `UserTaskVisibility` cho các cặp User-Task đang cần nhắc nhở.
* Loại bỏ các ứng viên nhận nhắc nhở nếu nhiệm vụ đã bị ẩn với thành viên đó (`isVisible === false`).

### 3.4. Kiểm tra nộp bài (`src/lib/tasks/submission-service.ts`)
* Trước khi lưu bài nộp, kiểm tra xem nhiệm vụ có bị ẩn đối với thành viên đó không. Nếu bị ẩn, ném ra lỗi `"Nhiệm vụ này không áp dụng cho người dùng đã chọn"`.

### 3.5. Báo cáo & Thống kê (`src/lib/services/admin-operations-service.ts` & `src/lib/services/analytics-service.ts`)
* Khi tổng hợp danh sách nhiệm vụ được giao (assigned slots) và tỷ lệ hoàn thành, loại trừ các nhiệm vụ đã bị cấu hình ẩn cho thành viên để số liệu thống kê phản ánh chính xác tiến độ thực tế được cá nhân hóa.

---

## 4. Giao diện Người dùng (UI/UX)

### 4.1. Danh sách thành viên `/admin/users`
* Trên mỗi hàng thành viên của bảng `UserSection` (file `user-section.tsx`), nếu thành viên đó có vai trò thuộc nhóm thành viên (`MEMBER`, `TDM`, `NGV`) và quản lý đăng nhập có quyền chỉnh sửa thành viên đó (`canManageUser`), hiển thị thêm biểu tượng `ClipboardList` liên kết tới trang cấu hình `/admin/users/[userId]/tasks`.

### 4.2. Trang Cấu hình Cá nhân hóa Nhiệm vụ
* Thư mục trang mới: `src/app/(app)/admin/users/[userId]/tasks/page.tsx`.
* **Giao diện**:
  * Tiêu đề: "Cá nhân hóa nhiệm vụ của [Tên thành viên]" và vai trò của họ.
  * Danh sách các nhiệm vụ đang hoạt động trong nhóm.
  * Mỗi nhiệm vụ hiển thị: Tên, Mô tả ngắn, Phạm vi (Nhóm/Địa vực/Khu vực), trạng thái mặc định (Hiện/Ẩn).
  * Một nút gạt (Toggle Switch):
    * Bật (On): Nhiệm vụ hiển thị với thành viên.
    * Tắt (Off): Nhiệm vụ bị ẩn đối với thành viên.
  * Khi KVT gạt thay đổi, gọi Server Action để cập nhật dữ liệu vào database và revalidate cache hiển thị dashboard/analytics.

---

## 5. Kế hoạch Kiểm thử & Xác minh

### Kiểm thử Tự động (Unit Tests)
* Tạo các test case kiểm thử độ chính xác của logic hiển thị mới trong:
  * `dashboard-service.test.ts`
  * `reminder-service.test.ts`
  * `policy.test.ts`

### Kiểm thử Thủ công (Manual Verification)
1. Đăng nhập bằng tài khoản KVT.
2. Kiểm tra xem có liên kết "Nhiệm vụ" trên trang `/admin` và có thể truy cập trang `/templates` hay không.
3. Vào danh sách thành viên `/admin/users`, chọn một thành viên trong khu vực quản lý và bấm vào biểu tượng "Nhiệm vụ".
4. Thử gạt tắt (Ẩn) một nhiệm vụ cụ thể của thành viên đó.
5. Đăng nhập bằng tài khoản của thành viên đó và kiểm tra Dashboard: Nhiệm vụ bị ẩn phải không còn xuất hiện trên màn hình.
6. Xác nhận trên trang quản trị `/admin` của KVT: tiến độ và các số liệu thống kê liên quan đến nhiệm vụ đó cho thành viên trên đã được loại trừ hợp lý.
