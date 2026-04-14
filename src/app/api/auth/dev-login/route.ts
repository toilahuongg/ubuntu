import { NextResponse } from "next/server";

import { setSessionCookie } from "@/lib/auth/session";
import { getUserById } from "@/lib/services/organization-service";

// Build an absolute redirect URL that honors proxy/tunnel headers
// (x-forwarded-host / x-forwarded-proto). Using `request.url` directly
// leaks the internal origin (e.g. localhost:3000) when the app is
// accessed through a tunnel like ngrok or Telegram's WebApp proxy.
function resolveRedirect(request: Request, path: string) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = forwardedHost ?? request.headers.get("host");

  if (!host) {
    return new URL(path, request.url);
  }

  const proto = forwardedProto ?? (host.startsWith("localhost") ? "http" : "https");
  return new URL(path, `${proto}://${host}`);
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Dev login bi tat trong production." }, { status: 403 });
  }

  const formData = await request.formData();
  const userId = formData.get("userId")?.toString();

  if (!userId) {
    return NextResponse.redirect(resolveRedirect(request, "/login?error=Missing+userId"), 303);
  }

  const user = await getUserById(userId);

  if (!user) {
    return NextResponse.redirect(resolveRedirect(request, "/login?error=User+not+found"), 303);
  }

  await setSessionCookie(user);
  return NextResponse.redirect(resolveRedirect(request, "/dashboard"), 303);
}
