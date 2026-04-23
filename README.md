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

3. Seed dữ liệu mẫu:

```bash
npm run seed
```

Lệnh này sẽ seed cả dữ liệu người dùng mẫu và bộ `cosmetics` mặc định. Nếu chỉ muốn seed lại cosmetics:

```bash
npm run seed:cosmetics
```

4. Chạy app:

```bash
npm run dev
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
| `npm run seed` | Seed dữ liệu mẫu + cosmetics mặc định |
| `npm run seed:cosmetics` | Seed hoặc cập nhật riêng bộ cosmetics |
| `npm run fix-indexes` | Fix partial index `telegramId` |
| `npm run tg:webhook:set\|delete\|info` | Quản lý webhook Telegram |

## Tài khoản seed mẫu

Sau khi chạy `npm run seed`, có sẵn các tài khoản (đã map `telegramId` để test):

- `Admin Ubuntu` — `ADMIN`
- `Tran Nhom Truong` — `TEAM_LEAD`
- `Ho Dia Vuc Sai Gon` / `Mai Dia Vuc Mien Tay` — `ZONE_LEAD`
- `Le Khu Vuc Quan 1` / `Pham Khu Vuc Quan 7` / `Dang Khu Vuc Can Tho` — `REGIONAL_LEAD`
- `Nguyen NGV Quan 1` — `NGV`
- `Nguyen Thanh Vien A1`, `Nguyen Thanh Vien A2`, `Vo Thanh Vien B1`, `Tran Thanh Vien C1` — `MEMBER`
- `Tai Khoan Cho Duyet` — `PENDING`
