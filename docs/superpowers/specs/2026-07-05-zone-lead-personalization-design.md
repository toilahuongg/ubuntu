# Thiết kế: Quyền cá nhân hoá nhiệm vụ cho ĐVT-NQL (ZONE_LEAD)

Cho phép ĐVT-NQL (ZONE_LEAD) cá nhân hoá nhiệm vụ cho các thành viên (NTĐ - NGV, TĐM - TDM, TĐ - MEMBER) trong cùng địa vực (`zoneId`).

## Đề xuất thay đổi

### permissions.ts
Cập nhật hàm `canPersonalizeTasks(actor, subject)` để hỗ trợ kiểm tra phân quyền cho `ZONE_LEAD`:
- Nếu `actor` có vai trò `ZONE_LEAD`:
  - `subject` phải thỏa mãn `isMemberLike(subject)` (tức là có vai trò `NGV`, `TDM`, hoặc `MEMBER`).
  - Cả hai phải có `zoneId` trùng nhau và không rỗng (`!!actor.zoneId && actor.zoneId === subject.zoneId`).

### permissions.test.ts
Cập nhật các test case để kiểm tra logic phân quyền mới:
- Cho phép `ZONE_LEAD` cá nhân hóa nhiệm vụ của thành viên trong cùng địa vực.
- Từ chối nếu `ZONE_LEAD` và thành viên khác địa vực.
- Từ chối nếu đối tượng đích không phải là thành viên giống `MEMBER`, `TDM`, `NGV` (ví dụ: `REGIONAL_LEAD`).

## Kế hoạch kiểm thử

Chạy bộ unit test bằng lệnh:
```bash
npm run test
```
