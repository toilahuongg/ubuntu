# Nhiệm Vụ Mỗi Ngày

Web app vận hành nội bộ theo phân cấp `KVT > ĐV > NT > Thành viên`. Đăng nhập bằng Telegram WebApp, chạy trên Next.js App Router + MongoDB.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- shadcn/ui + Tailwind v4 + `@base-ui/react`
- MongoDB + Mongoose
- Telegram WebApp auth + bot webhook (`jose` cho session)
- Server Actions cho quản trị, template, submission
- Vitest + `mongodb-memory-server` cho test

## Cấu trúc

- `src/app/(app)` — UI chính: `admin`, `region`, `zone`, `dashboard`, `tasks`, `templates`, `leaderboard`, `profile`
- `src/app/api` — `auth/{telegram,dev-login,logout}`, `telegram/webhook`, `jobs/{daily-occurrences,reminders}`
- `src/lib/models` — `user`, `region`, `zone`, `team`, `task-template`, `task-occurrence`, `submission`, `xp-transaction`, `audit-log`
- `src/lib/services` — `auth-service`, `organization-service`, `task-service`, `gamification-service`
- `src/scripts` — `seed`, `seed-cosmetics`, `telegram-webhook`, `fix-telegram-index`

## Setup

1. Tạo `.env.local` từ `.env.example`
2. Cài dependency:

```bash
npm install
```

3. Tạo tài khoản quản trị local:

```bash
npm run seed
```

Nếu cần thêm bộ `cosmetics` mặc định, chạy riêng:

```bash
npm run seed:cosmetics
```

4. Chạy app:

```bash
npm run dev
```

## Cài WSL 2 và Docker Desktop trên Windows

### Docker chạy trên Windows hay WSL 2?

Docker Desktop là ứng dụng được cài và mở từ **Windows**. Khi chọn WSL 2 backend, Docker Engine và các Linux container chạy bên trong môi trường WSL 2 do Docker Desktop quản lý. Có thể dùng lệnh `docker` từ cả PowerShell lẫn terminal Ubuntu WSL.

Với dự án này, cách khuyến nghị là:

- Cài và quản lý Docker Desktop trên Windows.
- Bật WSL 2 backend và tích hợp với Ubuntu.
- Lưu source code trong filesystem Ubuntu WSL, ví dụ `~/projects/ubuntu`, thay vì `/mnt/c/...`.
- Chạy `docker compose` từ terminal Ubuntu WSL để bind mount, hot reload và thao tác file nhanh hơn.
- Không cài thêm Docker Engine hoặc Docker Desktop bên trong Ubuntu WSL vì sẽ tạo hai Docker daemon và dễ xung đột.

### 1. Kiểm tra điều kiện máy

Máy cần Windows 10/11 64-bit còn được hỗ trợ, tối thiểu 8 GB RAM và đã bật hardware virtualization trong BIOS/UEFI. Có thể kiểm tra virtualization tại **Task Manager > Performance > CPU > Virtualization**.

Nếu hiển thị `Disabled`, vào BIOS/UEFI và bật Intel VT-x/Intel Virtualization Technology hoặc AMD-V/SVM Mode trước khi tiếp tục.

### 2. Cài WSL 2 và Ubuntu

Mở **PowerShell bằng Run as administrator** rồi chạy:

```powershell
wsl --install
```

Lệnh này bật các thành phần cần thiết và mặc định cài Ubuntu dưới WSL 2. Khởi động lại Windows khi được yêu cầu. Sau khi restart, mở **Ubuntu** từ Start Menu và tạo Linux username/password khi màn hình hỏi.

Nếu WSL đã được cài nhưng chưa có Ubuntu:

```powershell
wsl --list --online
wsl --install -d Ubuntu
```

Nếu quá trình tải bị đứng ở `0.0%`:

```powershell
wsl --install --web-download -d Ubuntu
```

Cập nhật WSL và đặt WSL 2 làm mặc định:

```powershell
wsl --update
wsl --set-default-version 2
```

Kiểm tra kết quả:

```powershell
wsl --version
wsl --list --verbose
```

Ubuntu phải hiển thị `VERSION 2`. Nếu đang là WSL 1, chuyển đổi bằng:

```powershell
wsl --set-version Ubuntu 2
```

Docker Desktop yêu cầu WSL 2.1.5 trở lên; nên luôn chạy `wsl --update` trước khi cài hoặc nâng cấp Docker Desktop.

### 3. Cài Docker Desktop

1. Tải Docker Desktop for Windows từ trang chính thức: <https://docs.docker.com/desktop/setup/install/windows-install/>.
2. Chạy `Docker Desktop Installer.exe`.
3. Chọn **Use WSL 2 instead of Hyper-V** nếu installer hiển thị lựa chọn này.
4. Hoàn tất cài đặt, mở Docker Desktop từ Start Menu và chấp nhận điều khoản sử dụng.
5. Trong **Settings > General**, bảo đảm tùy chọn dùng WSL 2 engine được bật.
6. Trong **Settings > Resources > WSL Integration**, bật integration cho Ubuntu rồi chọn **Apply & restart**.

Kiểm tra từ PowerShell:

```powershell
docker version
docker compose version
docker run --rm hello-world
```

Sau đó mở terminal Ubuntu và kiểm tra lại:

```bash
docker version
docker compose version
```

Nếu lệnh trong Ubuntu báo không tìm thấy Docker, mở lại Docker Desktop, kiểm tra WSL Integration đã bật cho đúng distro Ubuntu, rồi chạy từ PowerShell:

```powershell
wsl --shutdown
```

Mở lại Docker Desktop và Ubuntu sau lệnh này.

### 4. Đặt source code trong WSL

Trong terminal Ubuntu:

```bash
mkdir -p ~/projects
cd ~/projects
git clone <repository-url> ubuntu
cd ubuntu
```

Có thể mở thư mục WSL từ Windows Explorer bằng đường dẫn:

```txt
\\wsl$\Ubuntu\home\<linux-username>\projects\ubuntu
```

Không nên clone dự án vào `C:\...` rồi chạy qua `/mnt/c/...` nếu thường xuyên dùng hot reload, vì bind mount từ filesystem Windows vào Linux container chậm hơn và có thể không truyền file-change event ổn định.

Tài liệu chính thức:

- [Cài WSL trên Windows](https://learn.microsoft.com/windows/wsl/install)
- [Cài Docker Desktop trên Windows](https://docs.docker.com/desktop/setup/install/windows-install/)
- [Khuyến nghị Docker Desktop với WSL 2](https://docs.docker.com/desktop/features/wsl/best-practices/)

## Chạy local bằng Docker trên Windows

Từ terminal Ubuntu WSL tại thư mục dự án (khuyến nghị), hoặc từ PowerShell nếu source đang nằm trên Windows, chạy:

```powershell
docker compose up --build -d
docker compose exec web npm run seed
```

Mở `http://localhost:3000`. Stack local gồm Next.js, MongoDB và reminder worker; dữ liệu MongoDB được giữ trong Docker volume khi container khởi động lại. Dev login được bật sẵn để không cần Telegram khi phát triển local.

Xem log hoặc dừng stack:

```powershell
docker compose logs -f web
docker compose down
```

Muốn xóa cả database local và tạo lại từ đầu:

```powershell
docker compose down -v
docker compose up --build -d
docker compose exec web npm run seed
```

Các tích hợp Telegram, Google OAuth và Web Push là tùy chọn. Khi cần, sao chép `docker.env.example` thành `docker.env`, điền token rồi khởi động lại stack. Không commit `docker.env`.

Nếu port `3000` hoặc `27017` đang được dùng trên Windows, đổi phần port tương ứng ở `compose.yaml`, ví dụ `3001:3000`. Khi đổi port web, cập nhật đồng thời `AUTH_URL` và `NEXT_PUBLIC_APP_URL`.

### Cấu hình tích hợp tùy chọn

Tạo file cấu hình local từ PowerShell:

```powershell
Copy-Item docker.env.example docker.env
```

`docker.env` chứa secret local và đã được Git bỏ qua. Sau khi thay đổi env, chạy lại container:

```powershell
docker compose up -d --force-recreate
```

#### Telegram

Tạo bot bằng BotFather rồi điền các giá trị sau vào `docker.env`:

```env
TELEGRAM_BOT_TOKEN=token_lay_tu_BotFather
TELEGRAM_WEBHOOK_SECRET=mot_chuoi_bi_mat_ngau_nhien
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=ten_bot_khong_co_dau_at
ENABLE_TELEGRAM_NOTIFICATIONS=true
```

Nếu chỉ đăng nhập bằng tài khoản admin local thì không cần cấu hình Telegram. Telegram WebApp và webhook không thể gọi trực tiếp `localhost`; để kiểm thử chúng, cần một URL HTTPS công khai từ Cloudflare Tunnel, ngrok hoặc dịch vụ tương đương, ví dụ:

```txt
https://ubuntu-dev.example.com
```

Khi dùng tunnel, cập nhật `AUTH_URL` và `NEXT_PUBLIC_APP_URL` trong `compose.yaml` sang URL HTTPS đó. Đồng thời đặt Web App/Menu Button URL trong BotFather về cùng domain. Sau khi recreate container, đăng ký và kiểm tra webhook:

```powershell
docker compose up -d --force-recreate
docker compose exec web npm run tg:webhook:set
docker compose exec web npm run tg:webhook:info
```

Webhook sẽ trỏ tới:

```txt
https://ubuntu-dev.example.com/api/telegram/webhook
```

Khi URL tunnel thay đổi, phải cập nhật app URL và đăng ký webhook lại. Để gỡ webhook:

```powershell
docker compose exec web npm run tg:webhook:delete
```

#### Google OAuth

Tạo OAuth Client loại **Web application** trong Google Cloud Console. Khi chạy bằng localhost, cấu hình:

```txt
Authorized JavaScript origin:
http://localhost:3000

Authorized redirect URI:
http://localhost:3000/api/auth/callback/google
```

Điền credentials vào `docker.env`:

```env
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx
```

Nếu dùng domain HTTPS, thêm origin và redirect URI tương ứng trong Google Cloud Console, ví dụ:

```txt
https://ubuntu-dev.example.com
https://ubuntu-dev.example.com/api/auth/callback/google
```

Sau đó cập nhật `AUTH_URL` và `NEXT_PUBLIC_APP_URL` trong `compose.yaml` về cùng domain rồi recreate container.

#### Web Push

Sinh cặp VAPID key bằng image của dự án:

```powershell
docker compose run --rm web npx web-push generate-vapid-keys
```

Điền kết quả vào `docker.env`:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=public_key
VAPID_PRIVATE_KEY=private_key
VAPID_SUBJECT=mailto:admin@ubuntu.misoapps.com
```

Recreate cả web và reminder worker để nhận key mới:

```powershell
docker compose up -d --force-recreate web reminders
```

Đăng nhập admin, bật quyền thông báo trong app rồi gửi thông báo thử. Web Push hoạt động trên `localhost`; khi mở app từ thiết bị khác cần HTTPS. Trên iPhone/iPad, cần thêm app vào Home Screen trước khi đăng ký Web Push.

Có thể kiểm tra các biến đã được nạp trong container bằng:

```powershell
docker compose exec web node -e "console.log({telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN), google: Boolean(process.env.GOOGLE_CLIENT_ID), webPush: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)})"
```

## Biến môi trường

| Biến | Mô tả |
| --- | --- |
| `MONGODB_URI` | Kết nối MongoDB |
| `SESSION_SECRET` | Secret ký JWT session |
| `TELEGRAM_BOT_TOKEN` | Token bot Telegram |
| `TELEGRAM_WEBHOOK_SECRET` | Secret header xác thực webhook |
| `NEXT_PUBLIC_APP_URL` | URL app (dùng cho webhook & link) |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | Username bot để mở WebApp |
| `CRON_SECRET` | Secret header cho jobs |
| `APP_TIMEZONE` | Mặc định `Asia/Ho_Chi_Minh` |

## Vai trò & trạng thái

- Roles: `ADMIN`, `TEAM_LEAD`, `ZONE_LEAD`, `REGIONAL_LEAD`, `NGV`, `MEMBER`
- Trạng thái user: `ACTIVE`, `INACTIVE`, `PENDING`
- Scope template: `REGION`, `ZONE`, `TEAM`

## API jobs & Telegram

- `POST /api/telegram/webhook` — webhook bot Telegram
- `POST /api/jobs/daily-occurrences` — sinh occurrence cho ngày hiện tại
- `POST /api/jobs/reminders` — chạy một lượt reminder task đang đến giờ
- `POST /api/jobs/monthly-reminders` — chạy một lượt reminder đặt mục tiêu tháng đang đến giờ

Hai route jobs yêu cầu header:

```txt
x-cron-secret: <CRON_SECRET>
```

## Scripts

| Lệnh | Mô tả |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Build & chạy production |
| `npm run cron:reminders` | Worker `node-cron` quét reminder mỗi phút theo `APP_TIMEZONE` |
| `npm run lint` | ESLint |
| `npm run test` / `test:watch` | Vitest |
| `npm run seed` | Xóa dữ liệu seed cũ và tạo một tài khoản admin local |
| `npm run seed:cosmetics` | Seed hoặc cập nhật riêng bộ cosmetics |
| `npm run fix-indexes` | Fix partial index `telegramId` |
| `npm run tg:webhook:set\|delete\|info` | Quản lý webhook Telegram |

## Tài khoản seed local

Lệnh `npm run seed` xóa dữ liệu seed cũ và chỉ tạo một tài khoản quản trị:

- Email: `admin@ubuntu.misoapps.com`
- Mật khẩu: `12345678`
- Vai trò: `ADMIN`
