import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { getInventory } from "@/lib/services/cosmetics-service";
import {
  serializeCosmetic,
  serializeEquipped,
} from "@/lib/cosmetics/serialize";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  try {
    const inventory = await getInventory(session.id);
    return NextResponse.json({
      pointBalance: inventory.pointBalance,
      equipped: serializeEquipped(inventory.equipped),
      owned: inventory.owned.map(serializeCosmetic),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Lỗi không xác định.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
