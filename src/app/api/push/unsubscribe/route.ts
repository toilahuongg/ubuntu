import { NextResponse, type NextRequest } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { PushSubscriptionModel } from "@/lib/models/push-subscription";
import { connectToDatabase } from "@/lib/mongoose";

export async function POST(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  let body: { endpoint?: string };
  try {
    body = (await request.json()) as { endpoint?: string };
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  const endpoint = body.endpoint?.trim();
  if (!endpoint) {
    return NextResponse.json({ error: "Thiếu endpoint." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const result = await PushSubscriptionModel.deleteOne({
      endpoint,
      userId: session.id,
    });
    return NextResponse.json({ ok: true, deleted: result.deletedCount ?? 0 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
