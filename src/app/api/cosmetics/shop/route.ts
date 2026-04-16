import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { listShop } from "@/lib/services/cosmetics-service";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  try {
    const items = await listShop(session.id);
    return NextResponse.json({ items });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Lỗi không xác định.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
