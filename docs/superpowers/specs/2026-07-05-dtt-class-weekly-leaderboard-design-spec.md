# Thiết kế tính năng: Bảng xếp hạng Lớp học ĐTT theo tuần & Thứ bắt đầu tuần

Tính năng này bổ sung cấu hình **"Thứ bắt đầu trong tuần"** cho mỗi lớp học ĐTT. Dựa trên ngày bắt đầu này, hệ thống sẽ xác định phạm vi tuần học hiện tại và hiển thị bảng xếp hạng thành viên trong lớp cho từng nhiệm vụ ĐTT hoặc tổng hợp điểm theo tuần học đó.

---

## 1. Thay đổi Cơ sở Dữ liệu (Database Schema)

### 1.1. Model Lớp học `DttClass` (`src/lib/models/dtt-class.ts`)
Bổ sung trường `startDayOfWeek` để xác định thứ bắt đầu trong tuần (1 = Thứ hai, 7 = Chủ nhật).

```typescript
const dttClassSchema = new Schema(
  {
    name: { required: true, trim: true, type: String },
    teamId: { ref: "Team", required: true, type: Schema.Types.ObjectId, index: true },
    createdBy: { ref: "User", required: true, type: Schema.Types.ObjectId },
    startDayOfWeek: { required: true, type: Number, default: 1, min: 1, max: 7 }, // Thêm mới
  },
  { timestamps: true }
);

export type DttClassRecord = {
  _id: Types.ObjectId;
  name: string;
  teamId: Types.ObjectId;
  createdBy: Types.ObjectId;
  startDayOfWeek: number; // Thêm mới
  createdAt: Date;
  updatedAt: Date;
};
```

---

## 2. Xử lý logic tuần học & Tính toán xếp hạng

### 2.1. Xác định khoảng thời gian tuần học (`src/lib/dates.ts`)
Thêm hàm `getWeekRangeFromDateKey` để tìm khoảng thời gian tuần học hiện tại của lớp dựa trên `startDayOfWeek` của nó:

```typescript
export function getWeekRangeFromDateKey(dateKey: string, startDayOfWeek: number) {
  const currentWeekday = getIsoWeekdayFromDateKey(dateKey); // 1 = Thứ hai, ..., 7 = Chủ nhật
  
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

### 2.2. Dịch vụ tính toán Bảng xếp hạng (`src/lib/services/leaderboard-service.ts`)
Thêm hàm `getDttClassLeaderboard` để lấy danh sách xếp hạng học viên trong lớp theo tuần:

```typescript
export async function getDttClassLeaderboard(
  classId: string,
  taskId: string | undefined, // undefined hoặc "weekly-total"
): Promise<{
  classInfo: { name: string; startDayOfWeek: number; startStr: string; endStr: string };
  entries: LeaderboardEntry[];
  tasks: { id: string; title: string }[];
}>
```

Chi tiết truy vấn:
1. Lấy thông tin lớp học từ `DttClassModel`.
2. Xác định ngày bắt đầu/kết thúc tuần học hiện tại bằng hàm `getWeekRangeFromDateKey(getTodayDateKey(), startDayOfWeek)`.
3. Lấy tất cả học viên trong lớp từ `DttEnrollmentModel` có `classId`.
4. Tìm tất cả nhiệm vụ ĐTT của nhóm (`TaskModel` có `isDtt: true` và `isActive: true`) để hiển thị trong bộ lọc dropdown.
5. Truy vấn `SubmissionModel` trong khoảng ngày tuần học cho các học viên trên:
   * **Nếu `taskId` là "weekly-total" hoặc undefined**:
     * Gom nhóm theo `subjectUserId`.
     * Tính điểm: `totalXp = sum(task.pointReward * completionCount)`.
     * Sắp xếp giảm dần.
   * **Nếu `taskId` là một nhiệm vụ cụ thể**:
     * Lọc theo `taskId`.
     * Gom nhóm theo `subjectUserId`.
     * Tính tổng số lần nộp: `totalXp = sum(completionCount)`.
     * Sắp xếp giảm dần.
6. Lấy avatar và trang bị thời trang của học viên bằng `getEquippedPayloadsForUsers`.

---

## 3. Giao diện người dùng (UI / Routing)

### 3.1. Tạo trang xếp hạng `/dtt/leaderboard/page.tsx`
* Hiển thị bảng chọn lớp học (nếu là quản lý), chọn nhiệm vụ (Dropdown select).
* Hiển thị banner tuần học: *"Tuần học hiện tại: 01/07/2026 - 07/07/2026 (Bắt đầu từ Thứ tư)"*.
* Hiển thị bảng xếp hạng dạng Podium cho top 3 và danh sách bảng xếp hạng tương tự như trang `/leaderboard` chính nhưng thu gọn và hiển thị rõ điểm/số lần hoàn thành nhiệm vụ.

### 3.2. Quản lý lớp học (`src/app/(app)/admin/dtt/dtt-class-tab.tsx` & `actions.ts`)
* Bổ sung chọn Thứ bắt đầu trong tuần vào Form tạo lớp học mới.
* Bổ sung chọn Thứ bắt đầu trong tuần vào Form sửa tên lớp học khi click "Đổi tên".
* Cập nhật `createClassAction` và `updateClassAction` để nhận và lưu `startDayOfWeek`.

### 3.3. Thêm liên kết trên trang `/leaderboard/page.tsx`
* Kiểm tra nếu người dùng tham gia lớp ĐTT hoặc là Quản lý ĐTT, hiển thị một nút bấm điều hướng cao cấp dẫn đến trang `/dtt/leaderboard`.

---

## 4. Kế hoạch kiểm thử (Verification Plan)
* Thêm unit test kiểm tra hàm `getWeekRangeFromDateKey` với các thứ bắt đầu tuần khác nhau (Thứ hai, Thứ tư, Chủ nhật).
* Viết test kiểm tra schema validation mới của `DttClassModel` với trường `startDayOfWeek`.
* Viết test kiểm tra việc tạo, sửa lớp học kèm trường `startDayOfWeek` hoạt động bình thường trong file action test.
