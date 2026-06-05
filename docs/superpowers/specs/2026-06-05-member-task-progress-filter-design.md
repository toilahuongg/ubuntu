# Design Spec: Member Task Progress Filter in /admin/regions/[regionId]

## Overview
Currently, in the operations dashboard inside `/admin/regions/[regionId]`, the "Tiến độ thành viên" (Member Progress) section displays the aggregated monthly completion rate across all active tasks for each member. Users cannot view completion progress for a single specific task.
This design introduces a task filter dropdown in the "Tiến độ thành viên" section, allowing admins/leads to filter by any active task in the month and view each member's monthly progress (including progress bars, task counts, calendar heatmap, and daily completion list) for that specific task.

## Requirements
- Thêm danh sách các nhiệm vụ hoạt động (`tasks`) vào dữ liệu `AdminOperationsView` trả về từ server.
- Thêm thông tin tiến độ của từng nhiệm vụ cho mỗi user (`taskProgresses: { taskId: string, assigned: number, completed: number }[]`) vào dữ liệu `AdminOperationsMember`.
- Trong component `OperationsDashboard`, nếu `showMemberProgress` bằng `true`, hiển thị một thẻ `<select>` cho phép chọn một nhiệm vụ cụ thể để lọc (mặc định là "Tất cả nhiệm vụ").
- Khi chọn nhiệm vụ cụ thể:
  - Thanh tiến độ (màu sắc, tỷ lệ phần trăm) của từng thành viên phải cập nhật để phản ánh tiến độ của nhiệm vụ đó.
  - Số hiển thị dạng `{completed}/{assigned} task slot` phải cập nhật tương ứng.
  - Lịch hoàn thành của thành viên (`MemberCompletionCalendar`) phải cập nhật để chỉ làm sáng các ngày mà nhiệm vụ đó được hoàn thành.
  - Danh sách chi tiết các task đã hoàn thành theo ngày phải lọc để chỉ hiển thị nhiệm vụ được chọn.
- Viết/cập nhật unit test để đảm bảo dữ liệu `tasks` và `taskProgresses` được sinh ra đúng đắn ở server, và client hoạt động tốt.

## Proposed Changes

### 1. Types Definitions

#### [MODIFY] [admin-operations-types.ts](file:///Users/devhugon/Desktop/Workspaces/miso-apps/ubuntu/src/lib/services/admin-operations-types.ts)
- Thêm type `AdminOperationsTaskProgress` đại diện cho tiến độ một nhiệm vụ của thành viên.
- Thêm type `AdminOperationsTaskSummary` đại diện cho một nhiệm vụ hoạt động trong tháng.
- Thêm `taskProgresses: AdminOperationsTaskProgress[]` vào `AdminOperationsMember`.
- Thêm `tasks: AdminOperationsTaskSummary[]` vào `AdminOperationsView`.

### 2. Service Logic (Server-side)

#### [MODIFY] [admin-operations-service.ts](file:///Users/devhugon/Desktop/Workspaces/miso-apps/ubuntu/src/lib/services/admin-operations-service.ts)
- Cập nhật hàm `buildAdminOperationsViewModel` để:
  - Lọc và lưu trữ danh sách nhiệm vụ hoạt động (`tasks`) có schedule trong tháng.
  - Tính toán `assigned` và `completed` cho từng nhiệm vụ của mỗi thành viên trong vòng lặp.
  - Trả về `tasks` và `taskProgresses` cho từng thành viên.

### 3. UI Implementation (Client-side)

#### [MODIFY] [operations-dashboard.tsx](file:///Users/devhugon/Desktop/Workspaces/miso-apps/ubuntu/src/app/(app)/admin/operations-dashboard.tsx)
- Thêm state `selectedTaskId: string | null` trong component `OperationsDashboard`.
- Thiết kế thẻ `<select>` kiểu dáng của `.form-select` nhưng tối giản chiều cao (`h-8 py-0 pl-2 pr-7 text-[11px] font-medium rounded-md w-[150px] sm:w-[180px]`) đặt trong phần tiêu đề "Tiến độ thành viên".
- Khi render danh sách thành viên:
  - Lấy thông tin `assigned` và `completed` từ `member.taskProgresses` dựa trên `selectedTaskId` đang chọn.
  - Cập nhật thanh tiến độ và nhãn text `{completed}/{assigned} task slot`.
  - Truyền `selectedTaskId` vào component `MemberCompletionCalendar`.
- Cập nhật component `MemberCompletionCalendar` để:
  - Lọc `days` (completion days) client-side trước khi vẽ lịch nếu `selectedTaskId` được chọn:
    - `completionCount` của ngày chỉ tính các lượt hoàn thành của nhiệm vụ được chọn.
    - `tasks` hoàn thành của ngày chỉ hiển thị nhiệm vụ được chọn.

### 4. Tests Updates

#### [MODIFY] [admin-operations-service.test.ts](file:///Users/devhugon/Desktop/Workspaces/miso-apps/ubuntu/src/lib/services/admin-operations-service.test.ts)
- Cập nhật mock dữ liệu và các kỳ vọng (assertions) để đảm bảo `tasks` và `taskProgresses` được tính toán chính xác.

#### [MODIFY] [operations-dashboard.helpers.test.ts](file:///Users/devhugon/Desktop/Workspaces/miso-apps/ubuntu/src/app/(app)/admin/operations-dashboard.helpers.test.ts)
- Thêm trường `tasks` (mặc định rỗng `[]`) và `taskProgresses` (mặc định rỗng `[]`) vào mock data `view` để tránh lỗi TypeScript compile.

## Verification Plan

### Automated Tests
Chạy lệnh test:
```bash
npm run test
```
Đảm bảo tất cả test cases bao gồm các test mới viết đều pass.

### Manual Verification
1. Đăng nhập tài khoản Admin/Lead có quyền quản lý khu vực.
2. Truy cập vào trang chi tiết khu vực `/admin/regions/[regionId]`.
3. Kiểm tra phần "Tiến độ thành viên":
   - Thấy dropdown chọn nhiệm vụ xuất hiện cạnh badge số người.
   - Trạng thái mặc định là "Tất cả nhiệm vụ", hiển thị tiến độ tổng hợp đúng như cũ.
   - Chọn một nhiệm vụ cụ thể:
     - Thanh tiến độ và số lượt task slot của các thành viên thay đổi tương ứng với nhiệm vụ đó.
     - Click mở lịch một thành viên, thấy lịch chỉ highlight các ngày họ hoàn thành nhiệm vụ đó.
     - Chọn một ngày bất kỳ trên lịch để xem danh sách hoàn thành bên phải, thấy danh sách chỉ hiện lượt hoàn thành của nhiệm vụ đó (hoặc hiển thị trống nếu ngày đó không hoàn thành nhiệm vụ này).
