import { NextResponse } from "next/server";

import { setSessionCookie } from "@/lib/auth/session";
import { getUserById } from "@/lib/services/organization-service";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Dev login bi tat trong production." }, { status: 403 });
  }

  const formData = await request.formData();
  const userId = formData.get("userId")?.toString();

  if (!userId) {
    return NextResponse.redirect(new URL("/login?error=Missing+userId", request.url));
  }

  const user = await getUserById(userId);

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=User+not+found", request.url));
  }

  await setSessionCookie(user);
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
