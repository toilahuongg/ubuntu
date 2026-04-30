import { getSessionUser } from "@/lib/auth/session";
import { isWebPushConfigured, safeSendWebPush } from "@/lib/notifications/web-push";
import { methodNotAllowed, runApiHandler } from "./api._utils";

async function post() {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Chưa đăng nhập." }, { status: 401 });
  if (!isWebPushConfigured()) {
    return Response.json({ error: "VAPID chưa được cấu hình." }, { status: 503 });
  }
  const result = await safeSendWebPush(session.id, {
    title: "Thử nghiệm Web Push",
    body: "Nếu bạn thấy thông báo này nghĩa là push hoạt động 🎉",
    url: "/profile",
  });
  return Response.json({ ok: true, ...result });
}

export function loader() { return methodNotAllowed(); }
export function action({ request }: { request: Request }) {
  if (request.method.toUpperCase() !== "POST") return methodNotAllowed();
  return runApiHandler(request, () => post());
}
