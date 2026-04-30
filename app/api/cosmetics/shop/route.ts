import { getSessionUser } from "@/lib/auth/session";
import { listShop } from "@/lib/services/cosmetics-service";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return Response.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  try {
    const items = await listShop(session.id);
    return Response.json({ items });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Lỗi không xác định.";
    return Response.json({ error: message }, { status: 400 });
  }
}
