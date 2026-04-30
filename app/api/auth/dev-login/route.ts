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
  // Fail-closed: only allow dev-login when NODE_ENV is explicitly
  // "development" AND an opt-in flag is set. Any other value (production,
  // test, undefined, typos) disables this route.
  const nodeEnv = process.env.NODE_ENV;
  const devLoginEnabled = process.env.ENABLE_DEV_LOGIN === "true";
  if (nodeEnv !== "development" || !devLoginEnabled) {
    return Response.json(
      { error: "Dev login bi tat." },
      { status: 403 },
    );
  }

  const formData = await request.formData();
  const userId = formData.get("userId")?.toString();

  if (!userId) {
    return Response.redirect(resolveRedirect(request, "/login?error=Missing+userId"), 303);
  }

  const user = await getUserById(userId);

  if (!user) {
    return Response.redirect(resolveRedirect(request, "/login?error=User+not+found"), 303);
  }

  await setSessionCookie(user);
  return Response.redirect(resolveRedirect(request, "/dashboard"), 303);
}
