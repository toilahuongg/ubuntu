import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";

import { AdminSubHeader } from "../sub-header";
import { TelegramSection } from "../telegram-section";

export default async function AdminTelegramPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

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
