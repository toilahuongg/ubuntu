# Thiết kế: Thay đổi thuật toán thông báo cho nhiệm vụ Cầu Nguyện (CN)

## Tổng quan
Hiện tại, khi một người dùng hoàn thành nhiệm vụ, hệ thống chỉ thông báo cho các Trưởng nhóm liên quan trực tiếp theo chiều dọc (Nhóm trưởng - NT, Địa vực trưởng - ĐVT, Khu vực trưởng - KVT).
Yêu cầu mới: Đối với các nhiệm vụ Cầu Nguyện (CN - được biểu diễn bằng loại nhiệm vụ `COUNT_TOTAL`), khi nộp hoặc hoàn thành nhiệm vụ, thông báo đẩy (web push) cần gửi đến **tất cả các thành viên trong nhóm** (những người có cùng `teamId` với người nộp).

## Hướng tiếp cận
Chúng ta sẽ truyền loại nhiệm vụ (`taskType`) từ `submission-service.ts` sang bộ phận gửi thông báo (`submission-notifier.ts`). Tại đây, nếu `taskType === "COUNT_TOTAL"`, chúng ta sẽ lấy danh sách toàn bộ người dùng có cùng `teamId` với người nộp (loại trừ chính người nộp) để làm danh sách nhận thông báo, thay vì chỉ lọc các vai trò trưởng nhóm như thông thường.

## Thay đổi đề xuất

### 1. `src/lib/notifications/submission-notifier.ts`
- Import `TaskType` từ `@/lib/tasks/constants`.
- Cập nhật hàm `resolveNotificationRecipientIds` để nhận thêm tham số `taskType?: TaskType | null`.
- Trong hàm `resolveNotificationRecipientIds`, nếu `taskType === "COUNT_TOTAL"`, lọc và thêm tất cả người dùng có `user.teamId === teamId` vào tập hợp ID người nhận.
- Cập nhật hàm `findNotificationRecipientUserIds` để nhận và truyền tiếp `taskType`.
- Cập nhật `notifySubmissionToGroups` và `notifyTaskCompletionToGroups` để nhận thêm `taskType?: TaskType` trong tham số đầu vào và truyền tiếp vào hàm `findNotificationRecipientUserIds`.

### 2. `src/lib/tasks/submission-service.ts`
- Cập nhật các lệnh gọi hàm `notifySubmissionToGroups` và `notifyTaskCompletionToGroups` để truyền thêm thuộc tính `taskType: taskRaw.taskType` (hoặc `taskType` được chuẩn hóa).

### 3. `src/lib/notifications/submission-notifier.test.ts`
- Thêm các unit test kiểm thử:
  - Khi nộp nhiệm vụ loại `COUNT_TOTAL`, danh sách người nhận phải bao gồm tất cả thành viên trong nhóm (có cùng `teamId`), ngoại trừ người nộp.
  - Khi hoàn thành nhiệm vụ loại khác, hành vi lọc trưởng nhóm dọc/ngang cũ vẫn được giữ nguyên.

## Kế hoạch kiểm thử
- Chạy toàn bộ các test hiện có bằng lệnh `npm test` để đảm bảo không bị ảnh hưởng (regression).
- Chạy trực tiếp các test mới viết để xác minh tính đúng đắn của logic phân giải ID người nhận mới.
