import {
  clearSessionCookie,
  getSessionUser,
  setSessionCookie,
} from "@/lib/auth/session";
import { refreshSessionUser } from "@/lib/services/auth-service";

function safeRedirectPath(raw: string | null) {
  if (!raw) return "/dashboard";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

function redirectTo(request: Request, path: string) {
  const requestUrl = new URL(request.url);
  const proto =
    request.headers.get("x-forwarded-proto") ?? requestUrl.protocol.replace(":", "");
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    requestUrl.host;
  return Response.redirect(`${proto}://${host}${path}`);
}

export async function GET(request: Request) {
  const redirectPath = safeRedirectPath(
    new URL(request.url).searchParams.get("redirect"),
  );

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
  return redirectTo(request, redirectPath);
}
