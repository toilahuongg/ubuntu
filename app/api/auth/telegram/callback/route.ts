import { setSessionCookie } from "@/lib/auth/session";
import type { TelegramLoginWidgetData } from "@/lib/auth/telegram";
import { authenticateTelegramWidget } from "@/lib/services/auth-service";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<TelegramLoginWidgetData>;

    if (!body.id || !body.auth_date || !body.hash) {
      return Response.json(
        { error: "Thiếu dữ liệu từ Telegram Login Widget." },
        { status: 400 },
      );
    }

    const user = await authenticateTelegramWidget(
      body as TelegramLoginWidgetData,
    );
    await setSessionCookie(user);

    return Response.json({ ok: true, status: user.status });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Xác thực Telegram thất bại.",
      },
      { status: 401 },
    );
  }
}
