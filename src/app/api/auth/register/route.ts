import { NextResponse } from "next/server";

import { setSessionCookie } from "@/lib/auth/session";
import { createPendingManualUser } from "@/lib/services/organization-service";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      fullName?: string;
      password?: string;
      teamId?: string;
      username?: string;
      zoneId?: string;
    };
    const user = await createPendingManualUser({
      fullName: body.fullName ?? "",
      password: body.password ?? "",
      teamId: body.teamId ?? "",
      username: body.username ?? "",
      zoneId: body.zoneId ?? "",
    });
    await setSessionCookie(user);
    return NextResponse.json({ status: user.status });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể tạo tài khoản.",
      },
      { status: 400 },
    );
  }
}
