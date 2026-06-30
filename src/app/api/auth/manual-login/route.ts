import { NextResponse } from "next/server";

import { setSessionCookie } from "@/lib/auth/session";
import { authenticateUsernamePassword } from "@/lib/services/auth-service";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      password?: string;
      username?: string;
    };
    const user = await authenticateUsernamePassword({
      password: body.password ?? "",
      username: body.username ?? "",
    });
    await setSessionCookie(user);
    return NextResponse.json({ status: user.status });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Đăng nhập bằng username thất bại.",
      },
      { status: 400 },
    );
  }
}
