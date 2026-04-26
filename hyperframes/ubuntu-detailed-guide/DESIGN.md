# Design System

## Overview

Ubuntu là một Telegram WebApp theo hướng light-first, thiên về vận hành hằng ngày hơn là "dashboard doanh nghiệp" nặng nề. Giao diện dùng các lớp trắng mờ, gradient xanh trời sang cyan, và card bo tròn lớn để giữ cảm giác thân thiện nhưng vẫn có cấu trúc. Typography chia rõ hai vai trò: Outfit cho tiêu đề và điểm nhấn, DM Sans cho phần thân, nhãn và dữ liệu nhỏ. Các màn hình luôn ưu tiên nhịp dọc, bottom navigation cố định và các card xếp chồng theo dòng công việc.

## Colors

- **Primary Surface**: `#f6f7fb` — nền sáng xuyên suốt toàn app.
- **Primary Content**: `#0f172a` — tiêu đề, số liệu, nội dung chính.
- **Primary Action**: `#0ea5e9` — CTA, trạng thái active, điểm neo tương tác.
- **Gradient Lift**: `#38bdf8` — đầu dải gradient cho hero card và button.
- **Gradient Edge**: `#22d3ee` — cuối dải gradient, tạo cảm giác tươi và chuyển động.
- **Muted Copy**: `#64748b` — mô tả phụ, nhãn thứ cấp, chú thích.
- **Success Accent**: `#34d399` — hoàn thành, trạng thái tốt.
- **Warning Accent**: `#f59e0b` — nhắc mục tiêu, trạng thái cần chú ý.
- **Reward Accent**: `#fb7185` — XP, phần thưởng, chips nổi bật.
- **Dark Canvas (secondary mode)**: `#061425` — màu tối dùng rất tiết chế cho chiều sâu, không dùng làm nền chính.

## Typography

- **Display**: Outfit, các weight `400/500/600/700/800`. Dùng cho heading lớn, chapter label, số liệu nổi bật.
- **Body**: DM Sans, các weight `400/500/600/700`. Dùng cho mô tả, bullet, chip, nhãn dữ liệu.
- **Hierarchy**: heading chính khoảng `64-104px` cho video; heading phụ `28-44px`; body `24-30px`; label `18-22px`.

## Elevation

Ubuntu dùng elevation kiểu "glass nhẹ": card trắng mờ, viền xám xanh rất mảnh, bóng đổ mềm và vùng blur nhẹ chứ không dùng bóng cứng. Các dải gradient xanh cyan xuất hiện ở button hoặc hero card để kéo mắt nhìn, còn phần còn lại giữ nền rất sáng để thông tin đọc nhanh. Độ sâu đến từ các lớp overlay, panel nổi, và các frame điện thoại đặt chồng nhau.

## Components

- **Glass Task Cards**: thẻ nhiệm vụ bo tròn lớn, nền trắng, viền nhạt, chip trạng thái và nhãn XP.
- **Gradient Level Hero**: card cấp độ với nền chuyển xanh trời-cyan, avatar trái, tiến độ và quote ở giữa.
- **Bottom Navigation Dock**: thanh điều hướng cố định đáy màn hình, icon outline, active state màu sky.
- **Filter Stack**: cụm select và button lọc xếp dọc, nhịp đều, tối ưu thao tác nhanh trên mobile.
- **Customer Interaction Panel**: khối nhập liệu theo tab với CTA xanh rộng toàn chiều ngang.
- **Leaderboard Tables**: card xếp hạng chia dòng rõ ràng, nhấn thứ hạng bằng hình tròn và số điểm đậm.
- **Profile Utility List**: danh sách action trong card lớn, mỗi dòng là một tác vụ như cửa hàng, thông báo, chỉnh hồ sơ.
- **Admin Command Cards**: lưới số liệu và các card điều hướng đến cấu trúc, người dùng, vận hành.

## Do's and Don'ts

### Do's

- Dùng nền sáng và gradient xanh cyan làm lực dẫn thị giác chính.
- Giữ card lớn, bo tròn rộng, khoảng cách thở thoáng.
- Cho text heading cảm giác chắc và trực diện bằng Outfit đậm.
- Tạo chuyển động kiểu trôi, nở, quét sáng; tránh cảm giác giật.
- Giữ frame điện thoại là trung tâm, text phụ trợ bọc quanh.

### Don'ts

- Không đổi sang dark-tech toàn màn hình; Ubuntu không mang mood đó.
- Không dùng tím hoặc neon không nằm trong palette gốc.
- Không nhồi quá nhiều text nhỏ trong một khung; video phải đọc nhanh.
- Không dùng bóng đổ nặng hoặc card cạnh sắc.
- Không animate quá "bouncy"; motion nên gọn, sạch, có nhịp công việc.
