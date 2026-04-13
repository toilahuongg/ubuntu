import { NextResponse } from "next/server";

import { setSessionCookie } from "@/lib/auth/session";
import { authenticateTelegramUser } from "@/lib/services/auth-service";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { initData?: string };

    if (!body.initData) {
      return NextResponse.json(
        { error: "Thieu initData tu Telegram WebApp." },
        { status: 400 },
      );
    }

    const user = await authenticateTelegramUser(body.initData);
    await setSessionCookie(user);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Xac thuc Telegram that bai.",
      },
      { status: 401 },
    );
  }
}
