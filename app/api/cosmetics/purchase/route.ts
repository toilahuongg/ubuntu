import { getSessionUser } from "@/lib/auth/session";
import { purchase } from "@/lib/services/cosmetics-service";

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return Response.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  let body: { cosmeticId?: string };
  try {
    body = (await request.json()) as { cosmeticId?: string };
  } catch {
    return Response.json({ error: "Body không hợp lệ." }, { status: 400 });
  }
  if (!body.cosmeticId) {
    return Response.json(
      { error: "Thiếu mã trang bị." },
      { status: 400 },
    );
  }
  try {
    const result = await purchase(session.id, body.cosmeticId);
    return Response.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Lỗi không xác định.";
    return Response.json({ error: message }, { status: 400 });
  }
}
