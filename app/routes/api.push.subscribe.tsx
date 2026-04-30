import { getSessionUser } from "@/lib/auth/session";
import { PushSubscriptionModel } from "@/lib/models/push-subscription";
import { connectToDatabase } from "@/lib/mongoose";
import { methodNotAllowed, runApiHandler } from "./api._utils";

type SubscribeBody = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
  userAgent?: string;
};

async function post(request: Request) {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Chưa đăng nhập." }, { status: 401 });
  let body: SubscribeBody;
  try { body = (await request.json()) as SubscribeBody; } catch {
    return Response.json({ error: "Body không hợp lệ." }, { status: 400 });
  }
  const endpoint = body.endpoint?.trim();
  const p256dh = body.keys?.p256dh?.trim();
  const auth = body.keys?.auth?.trim();
  if (!endpoint || !p256dh || !auth) {
    return Response.json({ error: "Thiếu thông tin subscription." }, { status: 400 });
  }
  try {
    await connectToDatabase();
    await PushSubscriptionModel.findOneAndUpdate(
      { endpoint },
      { userId: session.id, endpoint, p256dh, auth, userAgent: body.userAgent?.slice(0, 300), lastUsedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định.";
    return Response.json({ error: message }, { status: 400 });
  }
}

export function loader() { return methodNotAllowed(); }
export function action({ request }: { request: Request }) {
  if (request.method.toUpperCase() !== "POST") return methodNotAllowed();
  return runApiHandler(request, post);
}
