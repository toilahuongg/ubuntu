import { redirect } from "react-router";

import { getSessionUser } from "@/lib/auth/session";
import { getOptionalEnv } from "@/lib/env";

import { AdminSubHeader } from "../sub-header";
import { TelegramSection } from "../telegram-section";

export default async function AdminTelegramPage() {
  const session = await getSessionUser();
  if (!session) throw redirect("/login");
  if (!getOptionalEnv().telegramNotificationsEnabled) throw redirect("/admin");

  return (
    <>
      <AdminSubHeader
        title="Thông báo Telegram"
        description="Kết nối và quản lý kênh Telegram"
      />
      <TelegramSection session={session} />
    </>
  );
}
