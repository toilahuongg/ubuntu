import { NextResponse, type NextRequest } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { equip } from "@/lib/services/cosmetics-service";
import { COSMETIC_SLOTS, type CosmeticSlot } from "@/lib/models";

export async function POST(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  let body: { slot?: string; cosmeticId?: string | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }
  if (!body.slot || !COSMETIC_SLOTS.includes(body.slot as CosmeticSlot)) {
    return NextResponse.json({ error: "Slot không hợp lệ." }, { status: 400 });
  }
  try {
    await equip(
      session.id,
      body.slot as CosmeticSlot,
      body.cosmeticId ?? null,
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Lỗi không xác định.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
