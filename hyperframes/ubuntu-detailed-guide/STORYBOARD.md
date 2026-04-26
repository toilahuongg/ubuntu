**Format:** 1080×1920
**Audio:** on-screen guidance only, no VO, no music
**VO direction:** copywriting ngắn, trực diện, đọc như checklist thao tác
**Style basis:** `DESIGN.md` với nền sáng, gradient sky-cyan, font Outfit + DM Sans, frame mobile làm trung tâm

## Global Direction

- Video đi theo nhịp dọc như một Telegram WebApp thực thụ, không giả desktop.
- Mỗi beat phải có ít nhất một frame điện thoại thật từ `assets/screenshots/`.
- Motion ưu tiên slide, float, draw-path, parallax nhẹ và quét sáng trên chip CTA.
- Nội dung chữ là chỉ dẫn thao tác, không phải quảng cáo.
- Cảm giác tổng thể: sáng, sạch, chi tiết nhưng vẫn thân thiện.

## Asset Audit

| Asset | Type | Assign to Beat | Role |
| --- | --- | --- | --- |
| `assets/branding/logo.svg` | SVG logo | Beat 1, Beat 7 | mở và đóng video |
| `assets/screenshots/login-mobile.png` | Product screenshot | Beat 1 | đăng nhập và vào app |
| `assets/screenshots/member-dashboard-mobile.png` | Product screenshot | Beat 2 | tổng quan nhiệm vụ, XP, tiến độ |
| `assets/screenshots/member-task-detail-mobile.png` | Product screenshot | Beat 3 | mở task, đặt mục tiêu, hoàn thành |
| `assets/screenshots/customers-mobile.png` | Product screenshot | Beat 4 | danh sách khách hàng và bộ lọc |
| `assets/screenshots/customer-detail-mobile.png` | Product screenshot | Beat 4 | ghi tương tác và xem lịch sử |
| `assets/screenshots/leaderboard-mobile.png` | Product screenshot | Beat 5 | theo dõi xếp hạng |
| `assets/screenshots/profile-mobile.png` | Product screenshot | Beat 5 | hồ sơ cá nhân |
| `assets/screenshots/shop-mobile-viewport.png` | Product screenshot | Beat 5 | cửa hàng trang bị |
| `assets/screenshots/admin-mobile.png` | Product screenshot | Beat 6 | trung tâm quản trị |

## Beats

### BEAT 1 — ĐĂNG NHẬP (0.0s–6.0s)

**Concept:** Mở bằng một khung giới thiệu rất sáng, logo Ubuntu nổi lên trên nền halo xanh rồi nhanh chóng nhường chỗ cho màn login thật. Người xem phải hiểu ngay: đây là WebApp vận hành hằng ngày, mở ra là thao tác được ngay.

**VO cue:** "Mở Ubuntu từ Telegram hoặc môi trường dev, rồi đăng nhập để vào ngay dashboard cá nhân."

**Visual description:** Logo nằm ở góc trên như một con dấu, tiêu đề lớn xuất hiện trước, rồi frame điện thoại của trang login trượt lên từ đáy màn hình. Quanh frame là các chip nhỏ "Telegram", "Google", "Dev login" và một vòng sáng mềm xoay chậm.

**Mood direction:** clean product onboarding, App Store feature card, nhẹ và sáng.

**Assets:** `assets/branding/logo.svg`, `assets/screenshots/login-mobile.png`

**Animation choreography:** logo nhẹ nhàng POP vào; heading CASCADE theo hai dòng; frame điện thoại SLIDES từ đáy lên và FLOATS; các chip nhỏ DRIFT quanh khung; cuối beat toàn bộ cụm ZOOM nhẹ để sang bước tiếp.

**Transition:** zoom through, exit `scale:1→1.06, blur:16px, 0.55s power2.in`

**Depth layers:** BG radial glow + mesh, MG headline panels, FG phone frame + chips

### BEAT 2 — DASHBOARD (6.0s–14.0s)

**Concept:** Đây là trung tâm điều phối ngày làm việc. Frame dashboard đứng giữa, còn xung quanh là các pill làm rõ ba ý: nhiệm vụ hôm nay, XP và tiến độ cấp độ.

**VO cue:** "Tại đây, bạn thấy nhiệm vụ hôm nay, nhiệm vụ tháng, XP và tiến độ lên cấp trong cùng một màn."

**Visual description:** Dashboard member chiếm phần lớn chiều cao. Ở nửa trên, heading và mô tả neo cố định; ở nửa dưới, một panel trong suốt chứa ba bullet nổi. Một đường cong SVG nối từ hero card trong screenshot ra ngoài các điểm chú thích.

**Mood direction:** operational clarity, bright mission control, gamified but not childish.

**Assets:** `assets/screenshots/member-dashboard-mobile.png`

**Animation choreography:** title DROPS; screenshot RISES và phóng to nhẹ; path SVG DRAWS từ trái sang phải; các stat pill COUNT / FILL / SHIMMER; cuối beat text trượt sang trái còn screenshot giữ đà.

**Transition:** whip pan upward, exit `y:-140, blur:24px, 0.4s power3.in`

**Depth layers:** BG mesh + grid, MG dashboard frame, FG bullets + stat pills + path

### BEAT 3 — CHI TIẾT NHIỆM VỤ (14.0s–21.5s)

**Concept:** Từ bức tranh tổng quan, camera đi sâu vào một task cụ thể. Mục tiêu ở đây là cho thấy việc cập nhật rất nhanh: mở task, đặt mục tiêu, bật nhắc nhở, đánh dấu hoàn thành.

**VO cue:** "Chạm vào từng task để đặt mục tiêu, bật nhắc nhở, rồi đánh dấu hoàn thành ngay khi xong việc."

**Visual description:** Màn task detail đứng thẳng ở trung tâm. Bên trên là ba capsule "Mục tiêu", "Nhắc nhở", "Hoàn thành". Một ribbon gradient chạy ngang nút CTA, đồng thời một path nhỏ nối ba capsule với ảnh màn hình.

**Mood direction:** focused task action, precise and tactile.

**Assets:** `assets/screenshots/member-task-detail-mobile.png`

**Animation choreography:** screenshot STAMPS vào giữa; ba capsule CASCADE từ trên xuống; path DRAWS quanh chúng; highlight ribbon SWEEPS ngang nút; cuối beat cụm nội dung trôi sang phải.

**Transition:** velocity-matched rightward, exit `x:120, blur:20px, 0.35s power2.in`

**Depth layers:** BG halo + floating dots, MG task screen, FG action capsules + ribbon

### BEAT 4 — KHÁCH HÀNG (21.5s–30.5s)

**Concept:** Chuyển từ tác vụ cá nhân sang chăm sóc mục vụ. Hai frame điện thoại cùng xuất hiện: bên trái là danh sách khách hàng có bộ lọc, bên phải là hồ sơ chi tiết và form ghi tương tác.

**VO cue:** "Nếu cần theo dõi mục vụ, phần khách hàng cho phép lọc danh sách, mở hồ sơ và ghi lại từng lần tương tác."

**Visual description:** Hai phone frame lệch tầng như một cascade. Tiêu đề lớn nằm trên cùng, dưới đó là panel mô tả ba bước: lọc, mở hồ sơ, ghi tương tác. Một đường path cong nối từ frame danh sách sang frame chi tiết để gợi luồng thao tác.

**Mood direction:** warm operational CRM, human and structured.

**Assets:** `assets/screenshots/customers-mobile.png`, `assets/screenshots/customer-detail-mobile.png`

**Animation choreography:** left phone SLIDES từ trái; right phone SLIDES từ phải; path DRAWS giữa hai màn; badge step numbers POP; bullet panel FADE + RISE; cuối beat cả hai frame nghiêng nhẹ rồi co lại.

**Transition:** blur through, exit `blur:18px, opacity:0.35, 0.4s`

**Depth layers:** BG pattern + light blobs, MG twin phone frames, FG step badges + connector path

### BEAT 5 — THEO DÕI & PHẦN THƯỞNG (30.5s–38.0s)

**Concept:** Đây là beat nhiều thông tin nhất nhưng phải đọc nhanh. Ba frame nhỏ hơn tạo thành một cột nhịp dọc: bảng xếp hạng, hồ sơ cá nhân, cửa hàng.

**VO cue:** "Bảng xếp hạng, hồ sơ cá nhân và cửa hàng giúp bạn nhìn tiến độ, thành tích và phần thưởng đang có."

**Visual description:** Ba screenshot đứng chồng bậc thang, mỗi ảnh đi kèm một nhãn ngắn: "Xếp hạng", "Hồ sơ", "Cửa hàng". Một dải progress line chạy từ trên xuống dưới để nối ba điểm.

**Mood direction:** dynamic utility stack, quick scan, mobile-first.

**Assets:** `assets/screenshots/leaderboard-mobile.png`, `assets/screenshots/profile-mobile.png`, `assets/screenshots/shop-mobile-viewport.png`

**Animation choreography:** ba frame CASCADE theo nhịp 0.18s; progress line FILLS từ trên xuống; nhãn từng frame PUNCH in; frame cửa hàng có glow reward mềm; cuối beat nhóm card kéo lên.

**Transition:** hard cut feel với exit `y:-90, opacity:0.85, 0.25s power1.in`

**Depth layers:** BG subtle grid, MG 3 screenshot cards, FG line connector + labels

### BEAT 6 — QUẢN TRỊ (38.0s–45.5s)

**Concept:** Vai trò quản lý mở ra một tầng vận hành khác. Admin screen nằm lớn một bên, còn bên kia là những block số liệu ngắn để nhấn cấu trúc, địa vực và người dùng.

**VO cue:** "Với vai trò quản lý, Ubuntu mở thêm trung tâm điều hành để kiểm soát cấu trúc, người dùng và vận hành."

**Visual description:** Admin screenshot nằm gần full-height. Trên khoảng trống còn lại là ba stat card nổi: "1 Nhóm", "2 Địa vực", "13 Người dùng". Các tia sáng mảnh quét qua những con số, như một bảng điều phối đang cập nhật.

**Mood direction:** command center in a light product system, authoritative without turning dark.

**Assets:** `assets/screenshots/admin-mobile.png`

**Animation choreography:** screenshot LIFTS vào vị trí; stat cards DROP từng khối; số liệu GLOW rồi settle; nền grid trôi rất nhẹ; cuối beat cả bố cục lui dần để dành chỗ cho outro.

**Transition:** zoom out `scale:0.96, opacity:0.5, blur:14px, 0.45s power2.in`

**Depth layers:** BG soft grid + cyan halo, MG admin screen, FG stat cards + numeric glow

### BEAT 7 — TÓM TẮT (45.5s–51.0s)

**Concept:** Khép lại bằng một wall nhỏ gồm các thumbnail của toàn bộ hành trình. Tiêu đề chốt nhịp: đăng nhập, làm nhiệm vụ, chăm khách hàng, theo dõi kết quả.

**VO cue:** "Đó là toàn bộ vòng sử dụng cốt lõi: đăng nhập, làm nhiệm vụ, chăm sóc khách hàng và theo dõi kết quả mỗi ngày."

**Visual description:** Logo quay trở lại ở phần đầu frame. Bên dưới là mosaic các screenshot nhỏ đang nổi lên theo từng tầng. Một card tổng kết lớn ở dưới cùng nhấn bốn bước cốt lõi.

**Mood direction:** confident wrap-up, polished product recap.

**Assets:** tất cả screenshot chính và `assets/branding/logo.svg`

**Animation choreography:** logo FADE + SCALE vào; thumbnail mosaic CASCADE; summary card FILLS; một light sweep đi ngang câu chốt; kết thúc bằng hold sạch 0.8s.

**Transition:** none, end on hold

**Depth layers:** BG halo, MG mosaic thumbnails, FG summary card + logo

## Production Architecture

```text
hyperframes/ubuntu-detailed-guide/
├── index.html
├── DESIGN.md
├── SCRIPT.md
├── STORYBOARD.md
├── assets/
│   ├── branding/logo.svg
│   ├── fonts/
│   └── screenshots/
└── compositions/
    ├── beat-1-login.html
    ├── beat-2-dashboard.html
    ├── beat-3-task.html
    ├── beat-4-customers.html
    ├── beat-5-stats-shop.html
    ├── beat-6-admin.html
    └── beat-7-outro.html
```
