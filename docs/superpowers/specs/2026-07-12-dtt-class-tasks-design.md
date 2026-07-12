# Design Spec: DTT Class Tasks System

**Date:** 2026-07-12  
**Author:** Claude  
**Status:** Draft

## Overview

Tách hệ thống nhiệm vụ Trường học ĐTT từ model `isDtt` (global boolean trên Task) sang mô hình **theo lớp** — mỗi lớp có set nhiệm vụ riêng, hiển thị hàng ngày cho học viên lớp đó, xuyên suốt khóa học.

### Nguyên tắc thiết kế

- **Exclusivity:** Task đã thuộc lớp ĐTT → chỉ hiện trong section của lớp đó, biến mất khỏi mọi nơi khác (nhiệm vụ thường, chiến dịch ngày, template).
- **Kế thừa:** Task có thể được chọn từ pool task chung (giữ EXP + point) hoặc tạo custom riêng cho lớp (chỉ EXP, không point).
- **Bỏ `isDtt`:** Xóa hoàn toàn field `isDtt` khỏi Task model.

---

## 1. Kiến trúc dữ liệu

### 1.1 Model mới: `DttClassTask`

Ánh xạ task vào lớp. Một task có thể thuộc nhiều lớp (many-to-many).

```typescript
DttClassTask {
  _id:          ObjectId
  classId:      ObjectId  (ref DttClass, required, index)
  taskId:       ObjectId  (ref Task, required)
  teamId:       ObjectId  (ref Team, required, index)  // denormalized
  isInherited:  Boolean   (default: false)
  createdAt:    Date
  updatedAt:    Date

  Unique index: { classId, taskId }
}
```

- `isInherited: true` — task được admin chọn từ pool task chung. Giữ nguyên EXP + point.
- `isInherited: false` — task custom riêng cho lớp. Chỉ EXP, `pointReward = 0`.

### 1.2 Model cũ không đổi

- **Task:** giữ nguyên schema (sẽ xóa `isDtt` ở phần Migration).
- **DailyCampaign:** giữ nguyên, không đụng.
- **Submission:** giữ nguyên.
- **DttEnrollment:** giữ nguyên, dùng để xác định học viên thuộc lớp nào.

### 1.3 Không cần model campaign riêng

Nhiệm vụ ĐTT là cố định xuyên suốt khóa học (không chọn lại mỗi ngày). Report được build real-time từ `DttClassTask` + `Submission` cho ngày hiện tại.

---

## 2. Dashboard — Section "Nhiệm vụ lớp ĐTT"

### 2.1 Luồng dữ liệu

1. Query `DttEnrollment` → user thuộc lớp nào?
2. Query `DttClassTask` theo `classId` → lấy task của lớp.
3. Check submission hôm nay cho mỗi task → build `TaskCard`.
4. Render section riêng trên dashboard.

### 2.2 Exclusivity rule

Task thuộc `DttClassTask` của bất kỳ lớp nào → **không hiện** ở:
- Section "Nhiệm vụ thường" trên dashboard
- Danh sách eligible task cho "Chiến dịch ngày"
- Template list
- Mọi nơi filter task theo scope TEAM/ZONE/REGION

Implement: helper `isAssignedToAnyDttClass(taskId) → boolean` được gọi ở tất cả các nơi filter task.

### 2.3 Giao diện

```
┌─────────────────────────────────────┐
│ 📋 Nhiệm vụ thường                  │
│ [Task A]  [Task B]                  │  ← KHÔNG thuộc lớp ĐTT nào
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🎓 Nhiệm vụ lớp Lớp ĐTT Khóa 1      │
│ [Task C]  [Task D]  [Task E]        │
│                                     │
│ [📊 Xem báo cáo lớp]                │  ← link tới trang báo cáo
└─────────────────────────────────────┘
```

- Section chỉ hiện với user đang enroll vào ít nhất 1 lớp.
- Admin **không** thấy section này trên dashboard.
- Nếu user thuộc nhiều lớp, mỗi lớp có section riêng, đặt tên theo lớp.

### 2.4 Reward logic

Khi build `TaskCard`:
- `isInherited: true` → `pointReward = task.pointReward` (giữ nguyên)
- `isInherited: false` → `pointReward = 0`, `expReward` giữ nguyên

XP luôn được tính qua gamification-service cho cả 2 loại.

---

## 3. Admin UI — Quản lý task cho lớp

### 3.1 Vị trí

Thêm nút **"Nhiệm vụ"** trên mỗi class card trong tab "Lớp học ĐTT" (dtt-class-tab.tsx), cạnh nút Sửa và Thêm:

```
┌─────────────────────────────────────────────────┐
│ Lớp ĐTT Khóa 1    [12 học viên]                  │
│ [Sửa]  [Thêm]  [Nhiệm vụ]         [Xóa]          │
├─────────────────────────────────────────────────┤
│ 📋 Danh sách học viên...                         │
└─────────────────────────────────────────────────┘
```

### 3.2 Popup quản lý nhiệm vụ

Popup 2 tab:

**Tab "Kế thừa" (task chung):**
- Danh sách task chung đang hoạt động (chưa thuộc lớp nào).
- Checkbox chọn task → "Thêm vào lớp" → tạo `DttClassTask` với `isInherited: true`.
- Danh sách task đang thuộc lớp, có nút "Rút khỏi lớp" → xóa `DttClassTask`.

**Tab "Custom" (task riêng cho lớp):**
- Nút "Tạo task mới" → mở form tạo task.
  - Ẩn field `pointReward` (luôn = 0).
  - Các field khác giữ nguyên (title, description, deadlineTime, taskType, expReward).
  - Tự động set `scope: "TEAM"`, `teamId` từ lớp.
- Danh sách task custom, có nút sửa/xóa.
- Badge "Custom — chỉ EXP" trên mỗi task.

### 3.3 Backend actions

- `addClassTaskAction(classId, taskId, isInherited)` → tạo DttClassTask
- `removeClassTaskAction(classId, taskId)` → xóa DttClassTask
- `createCustomClassTaskAction(classId, taskData)` → tạo Task + DttClassTask (`isInherited: false`)

---

## 4. Báo cáo lớp

### 4.1 Route

`/admin/dtt/classes/[classId]/report` — trang riêng cho báo cáo lớp.

### 4.2 Truy cập

- Từ class card trong admin ĐTT → nút **"Báo cáo"** → navigate tới trang report.
- Chỉ ADMIN (và TEAM_LEAD có teamId matching) được xem.

### 4.3 Giao diện

```
┌──────────────────────────────────────────────────────┐
│ 📊 Báo cáo lớp: Lớp ĐTT Khóa 1                       │
│ Ngày: [◀ 2026-07-11] 12/07/2026 [13/07/2026 ▶]       │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Học viên       | Đọc kinh | Cầu nguyện | Hoàn thành  │
│ Nguyễn Văn A   |    ✓     |      ✓      |   2/2 ✓    │
│ Trần Thị B     |    ✓     |      ✗      |   1/2      │
│ Lê Văn C       |    ✗     |      ✗      |   0/2      │
│                                                      │
│ ─────────────────────────────────────────────────    │
│ Tổng: 2/3 học viên hoàn thành hôm nay (67%)          │
└──────────────────────────────────────────────────────┘
```

### 4.4 Backend

- Không cần model mới. Report build real-time:
  1. `DttClassTask` theo `classId` → taskIds của lớp.
  2. `DttEnrollment` theo `classId` → userIds học viên.
  3. `SubmissionModel` với `{date, taskId: {$in: taskIds}, subjectUserId: {$in: userIds}}`.
  4. Reuse `buildCampaignReportRows` từ campaign-service.

---

## 5. Migration — Xóa `isDtt`

### 5.1 Audit

Đếm và liệt kê tất cả task đang có `isDtt: true`.

### 5.2 Chuyển task cũ sang lớp

1. Nếu có ≥1 lớp: tạo lớp mặc định "Lớp ĐTT Tổng" (nếu chưa có).
2. Gán tất cả task `isDtt: true` vào lớp mặc định → tạo `DttClassTask` với `isInherited: true`.
3. Log danh sách task đã migrate để admin review.

### 5.3 Xóa field `isDtt`

- Xóa field `isDtt` khỏi Task schema.
- Xóa `DttTaskTab` component và `dtt-task-tab.tsx`.
- Xóa `DttTaskItem`, `DttTaskOverrides`, `mergeDttTaskState`, `clearSettledDttOverrides` từ `dtt-task-state.ts`.
- Xóa `toggleTaskDttAction` từ `dtt/actions.ts`.
- Dọn references trong `dtt-manager.tsx` (xóa tab "Nhiệm vụ ĐTT").

### 5.4 Cập nhật dashboard-service.ts

- Bỏ logic `dttUserIdsSet` cũ (dùng để filter task `isDtt` — không còn cần).
- Thay bằng query `DttClassTask` → lấy taskIds của lớp user đang enroll → build section riêng.

### 5.5 Rollback

- Giữ migration script để có thể restore.
- Commit riêng bước migration để dễ revert.

---

## 6. File plan

### Files mới
- `src/lib/models/dtt-class-task.ts` — DttClassTask model
- `src/lib/dtt/class-task-service.ts` — service: add/remove/list class tasks, exclusivity check
- `src/app/(app)/admin/dtt/class-task-popup.tsx` — popup quản lý task cho lớp
- `src/app/(app)/admin/dtt/classes/[classId]/report/page.tsx` — trang báo cáo lớp
- `src/app/(app)/admin/dtt/classes/[classId]/report/report-client.tsx` — client component báo cáo
- `src/app/(app)/admin/dtt/class-task-actions.ts` — server actions cho popup
- `src/migrate/dtt-class-tasks.ts` — migration script

### Files sửa
- `src/lib/models/task.ts` — xóa field `isDtt`
- `src/lib/tasks/dashboard-service.ts` — thêm section ĐTT class, exclusivity filter
- `src/lib/campaigns/campaign-service.ts` — exclusivity check trong `isTaskEligibleForCampaign`
- `src/app/(app)/admin/dtt/dtt-class-tab.tsx` — thêm nút "Nhiệm vụ", "Báo cáo"
- `src/app/(app)/admin/dtt/dtt-manager.tsx` — xóa tab "Nhiệm vụ ĐTT" cũ
- `src/app/(app)/dashboard/member-dashboard.tsx` — truyền class data vào view
- `src/app/(app)/dashboard/leader-dashboard.tsx` — tương tự
- `src/lib/tasks/types.ts` — thêm `DttClassTaskView` type nếu cần

### Files xóa
- `src/app/(app)/admin/dtt/dtt-task-tab.tsx`
- `src/app/(app)/admin/dtt/dtt-task-state.ts`
- `src/app/(app)/admin/dtt/dtt-task-state.test.ts`
