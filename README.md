# Nhiem Vu Moi Ngay

Web app van hanh noi bo cho luong `Nhóm trưởng > Khu vực trưởng > Thành viên`, dang nhap bang Telegram WebApp, xay bang `Next.js + shadcn/ui + MongoDB`.

## Stack

- Next.js App Router + TypeScript
- shadcn/ui
- MongoDB + Mongoose
- Telegram WebApp auth + bot webhook
- Server Actions cho admin, template, submission

## Setup

1. Tao file `.env.local` tu `.env.example`
2. Cai dependency:

```bash
npm install
```

3. Seed du lieu mau:

```bash
npm run seed
```

4. Chay app:

```bash
npm run dev
```

## Env bat buoc

- `MONGODB_URI`
- `SESSION_SECRET`
- `TELEGRAM_BOT_TOKEN`
- `NEXT_PUBLIC_APP_URL`
- `CRON_SECRET`
- `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` (khuyen nghi de mo bot nhanh)

## Jobs va Telegram

- `POST /api/telegram/webhook`: Telegram bot webhook.
- `POST /api/jobs/daily-occurrences`: sinh occurrence cho ngay hien tai.
- `POST /api/jobs/reminders`: gui reminder cho user chua nop.

Hai route jobs can header:

```txt
x-cron-secret: <CRON_SECRET>
```

## Tai khoan seed mau

Sau khi chay `npm run seed`, co cac tai khoan mau:

- `Admin He Thong` - `ADMIN`
- `Tran Nhom Truong` - `TEAM_LEAD`
- `Le Khu Vuc A` / `Pham Khu Vuc B` - `REGIONAL_LEAD`
- `Nguyen Thanh Vien A1`, `Nguyen Thanh Vien A2`, `Vo Thanh Vien B1` - `MEMBER`

Tat ca duoc map san `telegramId` de thu nghiem.

## Scripts

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run seed`
