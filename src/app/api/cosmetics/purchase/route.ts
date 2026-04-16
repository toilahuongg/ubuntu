import { NextResponse, type NextRequest } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { purchase } from "@/lib/services/cosmetics-service";

export async function POST(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  let body: { cosmeticId?: string };
  try {
    body = (await request.json()) as { cosmeticId?: string };
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }
  if (!body.cosmeticId) {
    return NextResponse.json(
      { error: "Thiếu mã trang bị." },
      { status: 400 },
    );
  }
  try {
    const result = await purchase(session.id, body.cosmeticId);
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Lỗi không xác định.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
