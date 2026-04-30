import { getSessionUser } from "@/lib/auth/session";
import { PushSubscriptionModel } from "@/lib/models/push-subscription";
import { connectToDatabase } from "@/lib/mongoose";
import { methodNotAllowed, runApiHandler } from "./api._utils";

async function post(request: Request) {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Chưa đăng nhập." }, { status: 401 });
  let body: { endpoint?: string };
  try { body = (await request.json()) as { endpoint?: string }; } catch {
    return Response.json({ error: "Body không hợp lệ." }, { status: 400 });
  }
  const endpoint = body.endpoint?.trim();
  if (!endpoint) return Response.json({ error: "Thiếu endpoint." }, { status: 400 });
  try {
    await connectToDatabase();
    const result = await PushSubscriptionModel.deleteOne({ endpoint, userId: session.id });
    return Response.json({ ok: true, deleted: result.deletedCount ?? 0 });
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
