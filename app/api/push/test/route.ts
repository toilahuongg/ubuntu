import { getSessionUser } from "@/lib/auth/session";
import { safeSendWebPush, isWebPushConfigured } from "@/lib/notifications/web-push";

export async function POST() {
  const session = await getSessionUser();
  if (!session) {
    return Response.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  if (!isWebPushConfigured()) {
    return Response.json(
      { error: "VAPID chưa được cấu hình." },
      { status: 503 },
    );
  }

  const result = await safeSendWebPush(session.id, {
    title: "Thử nghiệm Web Push",
    body: "Nếu bạn thấy thông báo này nghĩa là push hoạt động 🎉",
    url: "/profile",
  });

  return Response.json({ ok: true, ...result });
}
