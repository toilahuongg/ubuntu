import { getSessionUser } from "@/lib/auth/session";
import { equip } from "@/lib/services/cosmetics-service";
import { COSMETIC_SLOTS, type CosmeticSlot } from "@/lib/models";
import { methodNotAllowed, runApiHandler } from "./api._utils";

async function post(request: Request) {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Chưa đăng nhập." }, { status: 401 });
  let body: { slot?: string; cosmeticId?: string | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Body không hợp lệ." }, { status: 400 });
  }
  if (!body.slot || !COSMETIC_SLOTS.includes(body.slot as CosmeticSlot)) {
    return Response.json({ error: "Slot không hợp lệ." }, { status: 400 });
  }
  try {
    await equip(session.id, body.slot as CosmeticSlot, body.cosmeticId ?? null);
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
