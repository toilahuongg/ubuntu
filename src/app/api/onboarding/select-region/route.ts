import { NextResponse } from "next/server";

import { getSessionUser, setSessionCookie } from "@/lib/auth/session";
import { refreshSessionUser } from "@/lib/services/auth-service";
import { updateUserRegion } from "@/lib/services/organization-service";

export async function POST(request: Request) {
  try {
    const session = await getSessionUser();

    if (!session) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    const user = await refreshSessionUser(session.id);

    if (!user || user.status !== "PENDING") {
      return NextResponse.json(
        { error: "Tài khoản không ở trạng thái chờ duyệt." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as { regionId?: string | null };
    const regionId = body.regionId ?? null;

    const updated = await updateUserRegion(user.id, regionId);
    await setSessionCookie(updated);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Không thể lưu khu vực.",
      },
      { status: 500 },
    );
  }
}
