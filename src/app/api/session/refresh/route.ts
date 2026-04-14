import { NextResponse, type NextRequest } from "next/server";

import {
  clearSessionCookie,
  getSessionUser,
  setSessionCookie,
} from "@/lib/auth/session";
import { refreshSessionUser } from "@/lib/services/auth-service";

function safeNext(raw: string | null) {
  if (!raw) return "/dashboard";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

function redirectTo(request: NextRequest, path: string) {
  const proto =
    request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    request.nextUrl.host;
  return NextResponse.redirect(`${proto}://${host}${path}`);
}

export async function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get("next"));

  const session = await getSessionUser();
  if (!session) {
    return redirectTo(request, "/login");
  }

  const fresh = await refreshSessionUser(session.id);
  if (!fresh) {
    await clearSessionCookie();
    return redirectTo(request, "/login");
  }

  await setSessionCookie(fresh);
  return redirectTo(request, next);
}
