import { NextResponse, type NextRequest } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { PushSubscriptionModel } from "@/lib/models/push-subscription";
import { connectToDatabase } from "@/lib/mongoose";

type SubscribeBody = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
  userAgent?: string;
};

export async function POST(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) {
    console.warn("[push] subscribe rejected: no session", {
      userAgent: request.headers.get("user-agent")?.slice(0, 120),
    });
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  let body: SubscribeBody;
  try {
    body = (await request.json()) as SubscribeBody;
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  const endpoint = body.endpoint?.trim();
  const p256dh = body.keys?.p256dh?.trim();
  const auth = body.keys?.auth?.trim();

  if (!endpoint || !p256dh || !auth) {
    console.warn("[push] subscribe rejected: missing subscription fields", {
      hasEndpoint: Boolean(endpoint),
      hasP256dh: Boolean(p256dh),
      hasAuth: Boolean(auth),
      userId: session.id,
    });
    return NextResponse.json(
      { error: "Thiếu thông tin subscription." },
      { status: 400 },
    );
  }

  try {
    await connectToDatabase();
    await PushSubscriptionModel.findOneAndUpdate(
      { endpoint },
      {
        userId: session.id,
        endpoint,
        p256dh,
        auth,
        userAgent: body.userAgent?.slice(0, 300),
        lastUsedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    console.info("[push] subscription saved", {
      endpoint: `${endpoint.slice(0, 40)}...`,
      userId: session.id,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định.";
    console.error("[push] subscribe save failed", {
      error: message,
      userId: session.id,
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
