# Design Spec: Weekly Task Max Per-Week Limit

**Date:** 2026-07-14
**Author:** Claude
**Status:** Draft

## Problem Statement

Nhiệm vụ loại `WEEKLY_PER_MEMBER` hiện không có cơ chế giới hạn số lần hoàn thành tối đa trong tuần. Admin cần khả năng đặt giới hạn cho từng task (VD: task "Đọc Kinh Thánh" tối đa 3 lần/tuần), và hệ thống tự động ngăn user nộp thêm khi đã đạt giới hạn — bao gồm cả nhập bù và nhập hộ.

## Architecture

### 1. Data Model

**Task model** (`src/lib/models/task.ts`):

```
maxPerWeek: { default: null, min: 1, type: Number }
```

- Chỉ áp dụng cho `WEEKLY_PER_MEMBER` tasks
- `null` = không giới hạn (backward compatible với task cũ)
- Giá trị: số nguyên ≥ 1

**Type** (`TaskRecord`): thêm `maxPerWeek: number | null`

### 2. Week Definition

Tuần tính từ **Chủ Nhật đến Thứ Bảy**.

Sử dụng `getWeekRangeFromDateKey(dateKey, 7)` từ `src/lib/dates.ts`:
- Tham số `7` = ISO weekday cho Chủ Nhật (ISO: 1=Thứ 2, 7=Chủ Nhật)
- Trả về `{ startStr: "YYYY-MM-DD", endStr: "YYYY-MM-DD" }`

### 3. Submission Validation

**File:** `src/lib/tasks/submission-service.ts`

Trong `saveSubmission()`, sau block kiểm tra `MONTHLY_PER_MEMBER` (line ~200):

```typescript
if (taskType === "WEEKLY_PER_MEMBER" && taskRaw.maxPerWeek && count > 0) {
  const weekRange = getWeekRangeFromDateKey(dateKey, 7);
  const weekSubmissions = await SubmissionModel.find({
    completionCount: { $gt: 0 },
    date: { $gte: weekRange.startStr, $lte: weekRange.endStr },
    subjectUserId: subjectRaw._id,
    taskId: taskRaw._id,
  }).session(session ?? null).select({ date: 1, completionCount: 1 }).lean();

  const currentTotal = weekSubmissions.reduce(
    (sum, s) => sum + (s.completionCount ?? 0), 0
  );
  if (currentTotal + count > taskRaw.maxPerWeek) {
    throw new Error("Đã đạt giới hạn số lần hoàn thành tuần này.");
  }
}
```

**Rule thống nhất:** Giới hạn áp dụng cho MỌI hình thức nộp — submit thường, nhập bù (backfill ngày cũ), và nhập hộ (proxy). Chỉ `mode: "set"` với count giảm hoặc xoá là không cần kiểm tra giới hạn.

### 4. Admin UI — Task Form

**File:** `src/app/(app)/admin/campaigns/campaign-task-form.tsx`

Khi `taskType === "WEEKLY_PER_MEMBER"`, hiển thị thêm field:

```
Label: "Giới hạn mỗi tuần"
Type: number input
Placeholder: "Để trống = không giới hạn"
Validation: number ≥ 1 hoặc null
```

### 5. Dashboard & Task Card

**File:** `src/lib/tasks/dashboard-service.ts`

- `buildDashboardSubmissionDateFilter`: thêm clause cho `WEEKLY_PER_MEMBER` — query submissions trong khoảng tuần (CN→T7)
- `buildTaskCard`: thêm `weeklyCompletion` và `maxPerWeek` vào `TaskCard`

**TaskCard type** (`src/lib/tasks/types.ts`):
```typescript
weeklyCompletion?: number;  // số lần đã hoàn thành trong tuần hiện tại
maxPerWeek?: number | null; // giới hạn từ task
```

### 6. User UI — Submit Section

**File:** `src/app/(app)/tasks/[taskId]/submit-section.tsx`

Khi `taskType === "WEEKLY_PER_MEMBER"` và `maxPerWeek` được set:
- Hiển thị: "Đã X/Y lần tuần này" (progress)
- Khi `weeklyCompletion >= maxPerWeek`: disable nút submit, hiện "Đã đạt giới hạn tuần này"

### 7. Task Detail Page

**File:** `src/app/(app)/tasks/[taskId]/page.tsx`

- Truyền `weeklyCompletion` và `maxPerWeek` từ server xuống client
- Hiển thị thanh tiến độ tuần (tương tự monthly goal)
- Liệt kê các ngày đã nộp trong tuần hiện tại

### 8. Testing

**Test mới** (`src/lib/tasks/submission-service.test.ts`):
- Submit với `count > maxPerWeek` → bị reject với error message đúng
- Submit đúng `maxPerWeek` → thành công
- Submit lần tiếp theo (đã đạt giới hạn) → bị reject
- `mode: "set"` giảm count → thành công (không check giới hạn)
- Task có `maxPerWeek: null` → hoạt động như cũ (không giới hạn)
- Nhập bù (dateKey cũ trong tuần) → vẫn tính vào giới hạn
- Nhập hộ cho user đã đạt giới hạn → bị reject

**Test cũ cần cập nhật:**
- `"does not cap weekly per-member submissions"` → đổi thành `"caps weekly per-member at maxPerWeek when set, no cap when null"`

## Files Affected

| File | Change |
|------|--------|
| `src/lib/models/task.ts` | Thêm `maxPerWeek` field |
| `src/lib/models/index.ts` | Export `maxPerWeek` trong TaskRecord type (nếu cần) |
| `src/lib/tasks/submission-service.ts` | Validation logic + import `getWeekRangeFromDateKey` |
| `src/lib/tasks/dashboard-service.ts` | Weekly aggregate trong submission filter + TaskCard |
| `src/lib/tasks/types.ts` | Thêm `weeklyCompletion`, `maxPerWeek` vào TaskCard |
| `src/lib/tasks/task-service.ts` | Truyền `maxPerWeek` trong mapTask |
| `src/app/(app)/admin/campaigns/campaign-task-form.tsx` | Admin UI input |
| `src/app/(app)/tasks/[taskId]/submit-section.tsx` | UI progress + lock |
| `src/app/(app)/tasks/[taskId]/page.tsx` | Server data + client props |
| `src/lib/tasks/submission-service.test.ts` | Tests mới |
| `src/lib/tasks/constants.ts` | (Optional) helper `isWeeklyTaskType()` |

## Migration

Không cần migration script riêng. MongoDB/Mongoose tạo field `maxPerWeek` tự động với `default: null`. Task cũ giữ nguyên `null` (không giới hạn).
