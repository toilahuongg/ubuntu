import { clearSessionCookie } from "@/lib/auth/session";
import { methodNotAllowed, runApiHandler } from "./api._utils";

async function post() {
  await clearSessionCookie();
  return Response.json({ ok: true });
}

export function loader() {
  return methodNotAllowed();
}

export function action({ request }: { request: Request }) {
  if (request.method.toUpperCase() !== "POST") return methodNotAllowed();
  return runApiHandler(request, () => post());
}
