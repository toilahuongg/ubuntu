# Tài liệu thiết kế: Tách nhiệm vụ Cầu Nguyện sang trang riêng

Tài liệu đặc tả (Spec) mô tả việc tách nhóm nhiệm vụ theo số lần (Cầu Nguyện) thành một trang riêng biệt trên ứng dụng, thêm vào thanh điều hướng Bottom Bar dưới tên viết tắt "CN", và tối ưu hóa trải nghiệm người dùng.

## Bối cảnh & Yêu cầu
* **Nhiệm vụ Cầu Nguyện:** Là các nhiệm vụ thuộc kiểu `COUNT_TOTAL` (Theo số lần). Hiện tại, các nhiệm vụ này đang hiển thị chung ở trang Dashboard (Tổng quan) trong phần "Nhiệm vụ hôm nay".
* **Mục tiêu:**
  * Tách biệt hoàn toàn các nhiệm vụ này khỏi Dashboard chính.
  * Tạo trang riêng `/prayer` (Cầu Nguyện) có giao diện tinh giản, hiển thị câu Kinh Thánh ngày và danh sách nhiệm vụ Cầu Nguyện.
  * Thêm biểu tượng `Sparkles` với nhãn viết tắt **"CN"** vào thanh điều hướng Bottom Bar.
  * Điều chỉnh nút "Quay lại" trên trang chi tiết nhiệm vụ `COUNT_TOTAL` để quay lại trang `/prayer` thay vì `/dashboard`.

## 1. Thành phần Điều hướng (Navigation)
### Thay đổi trên `src/components/bottom-nav.tsx`
* Bổ sung mục mới vào danh sách `NAV_ITEMS`:
  * `href`: `/prayer`
  * `label`: `"CN"` (Viết tắt của Cầu Nguyện để tối ưu hiển thị trên di động)
  * `icon`: `Sparkles` từ thư viện `lucide-react`
* Đưa `/prayer` vào mảng `CORE_HREFS` để luôn hiển thị ở hàng chính thay vì bị đẩy vào menu "Thêm" (overflow).

## 2. Xử lý Dữ liệu Backend (Service Layer)
### Thay đổi trên `src/lib/tasks/dashboard-service.ts`

#### Thay đổi 1: Loại bỏ `COUNT_TOTAL` khỏi Dashboard chính
* Cập nhật `buildMemberDashboard` và `buildLeaderDashboard` (hoặc `buildDashboardView` dùng chung) để lọc bỏ nhiệm vụ `COUNT_TOTAL`.
* Ví dụ:
  ```typescript
  // Trong buildMemberDashboard hoặc buildDashboardView
  const personalTasks = relevantTasks.filter(
    (t) =>
      appliesToUser(taskToScope(t), actorShape) &&
      normalizeTaskType(t.taskType) !== "COUNT_TOTAL"
  );
  ```

#### Thay đổi 2: Bổ sung các hàm lấy dữ liệu cho trang Cầu Nguyện
* Định nghĩa thêm `buildMemberPrayerDashboard(actor, dateKey)` và `buildLeaderPrayerDashboard(actor, dateKey)`.
* Các hàm này chỉ truy vấn các nhiệm vụ thuộc loại `COUNT_TOTAL`:
  ```typescript
  const prayerTasks = relevantTasks.filter(
    (t) =>
      appliesToUser(taskToScope(t), actorShape) &&
      normalizeTaskType(t.taskType) === "COUNT_TOTAL"
  );
  ```
* Trả về dữ liệu tối giản:
  * `date`: `dateKey`
  * `cards`: Danh sách `TaskCard` lọc theo loại `COUNT_TOTAL`
  * `dailyScripture`: Câu Kinh Thánh hàng ngày
  * Các thông tin tiến trình cấp độ (chỉ truyền nếu Component cần, nhưng phương án B sẽ lược bỏ hiển thị).

## 3. Trang Giao Diện Mới (`src/app/(app)/prayer/page.tsx`)
* **URL:** `/prayer`
* **Cơ chế tải dữ liệu:** Tương tự `src/app/(app)/dashboard/page.tsx`, xác định vai trò của người dùng (`MEMBER`/`NGV`/`TDM` vs `LEADER`...) để gọi hàm Service tương ứng:
  * `buildMemberPrayerDashboard`
  * `buildLeaderPrayerDashboard`
* **Giao diện (Layout):**
  * Tiêu đề: **Cầu Nguyện**
  * Phần 1: Thẻ câu Kinh Thánh hàng ngày (sử dụng lại Component hoặc hiển thị trực quan).
  * Phần 2: Danh sách nhiệm vụ sử dụng `TaskCardSection` với nhãn nhóm "Chưa xong" / "Đã xong".

## 4. Chi tiết Nhiệm vụ (`src/app/(app)/tasks/[taskId]/page.tsx`)
* Kiểm tra `detail.taskType`. Nếu là `COUNT_TOTAL`:
  * Liên kết của nút "Quay lại" sẽ là `/prayer`.
  * Ngược lại, giữ nguyên liên kết `/dashboard`.

## 5. Kế hoạch Kiểm thử (Verification)
* **Kiểm tra Bottom Nav:** Xác nhận biểu tượng `Sparkles` và nhãn `"CN"` hiển thị đúng trên điện thoại và máy tính, nhấn vào chuyển đến `/prayer`.
* **Kiểm tra Dashboard chính:** Đảm bảo không còn nhiệm vụ loại `COUNT_TOTAL` xuất hiện.
* **Kiểm tra Trang Cầu Nguyện:** Đảm bảo chỉ có các nhiệm vụ loại `COUNT_TOTAL` hiển thị, tính năng tích chọn hoạt động bình thường và câu Kinh Thánh hiển thị đúng.
* **Kiểm tra Quay lại:** Truy cập chi tiết một nhiệm vụ Cầu Nguyện, nhấn nút "Quay lại" và kiểm tra xem có về trang `/prayer` hay không.
