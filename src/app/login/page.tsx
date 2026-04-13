import Link from "next/link";
import { RocketIcon } from "lucide-react";

import { TelegramLoginPanel } from "@/components/login/telegram-login-panel";
import { NoticeBanner } from "@/components/notice-banner";
import { RoleBadge } from "@/components/role-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/current-user";
import { APP_NAME } from "@/lib/domain";
import { getOptionalEnv, isCoreAppConfigured } from "@/lib/env";
import { listDevLoginUsers } from "@/lib/services/organization-service";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();

  if (user) {
    return (
      <div className="surface-grid flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-xl">
          <CardContent className="space-y-4 p-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-indigo-700">
              Phien dang hoat dong
            </p>
            <p className="font-heading text-4xl font-semibold text-slate-950">
              Ban da dang nhap voi tai khoan {user.fullName}
            </p>
            <p className="text-sm leading-7 text-slate-600">
              Mo dashboard de tiep tuc cap nhat task, kiem tra tien do va xu ly cac muc dang treo.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(65,58,150,0.24)]"
            >
              Vao dashboard
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const query = await searchParams;
  const isConfigured = isCoreAppConfigured();
  const env = getOptionalEnv();
  const devUsers =
    process.env.NODE_ENV !== "production" && isConfigured
      ? await listDevLoginUsers()
      : [];

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-8 px-4 py-8 md:px-6 lg:grid lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-indigo-700">
            <RocketIcon className="size-3.5" />
            {APP_NAME}
          </div>

          <div className="space-y-5">
            <h1 className="max-w-3xl font-heading text-5xl font-semibold tracking-tight text-slate-950 md:text-6xl">
              Van hanh task trong Telegram, nhin toan canh tren mot dashboard ro rang.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-slate-600">
              Mot web app mobile-first de nhom truong giao mau task, khu vuc truong
              va thanh vien cap nhat tien do moi ngay ngay trong Telegram.
            </p>
          </div>

          <div className="section-shell overflow-hidden p-6">
            <div className="grid gap-5 md:grid-cols-3">
              {[
                {
                  eyebrow: "Step 01",
                  title: "Giao template",
                  description: "Nhóm trưởng chuẩn hoá biểu mẫu và thời hạn cho cả ngày làm việc.",
                },
                {
                  eyebrow: "Step 02",
                  title: "Cap nhat tren mobile",
                  description: "Thành viên mở trực tiếp trong Telegram để gửi kết quả nhanh, ít ma sát.",
                },
                {
                  eyebrow: "Step 03",
                  title: "Theo doi va can thiep",
                  description: "Khu vực trưởng và admin bám tiến độ, xử lý các mục còn treo theo vai trò.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-[24px] border border-slate-200/80 bg-white/80 p-4">
                  <p className="font-mono text-[0.7rem] uppercase tracking-[0.24em] text-slate-500">
                    {item.eyebrow}
                  </p>
                  <p className="mt-3 text-lg font-semibold text-slate-950">{item.title}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                description: "Tao template, theo doi tien do toan nhom, va nop thay khi can.",
                title: "Nhóm trưởng",
              },
              {
                description: "Quan ly thanh vien trong khu vuc va cap nhat thay khi can.",
                title: "Khu vực trưởng",
              },
              {
                description: "Nhan task trong ngay va dien ket qua nhanh gon tren mobile.",
                title: "Thành viên",
              },
            ].map((item) => (
              <Card key={item.title}>
                <CardContent className="space-y-3 p-5">
                  <p className="font-heading text-2xl font-semibold text-slate-900">{item.title}</p>
                  <p className="text-sm leading-7 text-slate-600">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <NoticeBanner
            tone="error"
            message={typeof query.error === "string" ? query.error : undefined}
          />
          <NoticeBanner
            tone="success"
            message={typeof query.success === "string" ? query.success : undefined}
          />

          <TelegramLoginPanel
            botUsername={env.telegramBotUsername}
            isConfigured={isConfigured}
          />

          <Card>
            <CardHeader>
              <CardTitle>Checklist truoc khi chay that</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p>
                1. Cap `.env.local` theo file `.env.example`, dac biet la
                `MONGODB_URI`, `SESSION_SECRET`, `TELEGRAM_BOT_TOKEN`.
              </p>
              <p>2. Chay `npm run seed` de tao du lieu mau cho team, khu vuc va user.</p>
              <p>
                3. Cau hinh Telegram webhook tro vao `/api/telegram/webhook`, va cron
                goi 2 route jobs de sinh occurrence va gui reminder.
              </p>
            </CardContent>
          </Card>

          {process.env.NODE_ENV !== "production" ? (
            <Card className="border-dashed border-slate-300/80 bg-white/75">
              <CardHeader>
                <CardTitle>Dev quick login</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {devUsers.length ? (
                  devUsers.map((devUser) => (
                    <form
                      key={devUser.id}
                      action="/api/auth/dev-login"
                      method="post"
                      className="flex items-center justify-between rounded-[22px] border border-slate-200 bg-white px-4 py-3"
                    >
                      <div className="space-y-1">
                        <p className="font-medium text-slate-900">{devUser.fullName}</p>
                        <div className="flex items-center gap-2">
                          <RoleBadge role={devUser.role} />
                          {devUser.telegramId ? (
                            <span className="text-xs text-slate-500">
                              Telegram: {devUser.telegramId}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <input type="hidden" name="userId" value={devUser.id} />
                      <Button type="submit" variant="outline">
                        Dang nhap
                      </Button>
                    </form>
                  ))
                ) : (
                  <p className="text-sm text-slate-600">
                    Chua co du lieu mau. Chay `npm run seed` sau khi cau hinh MongoDB.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : null}
        </section>
      </div>
    </div>
  );
}
