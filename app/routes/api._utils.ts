import {
  applySetCookieHeaders,
  withRequestContext,
} from "@/lib/rr-request-context";

export async function runApiHandler(
  request: Request,
  handler: (request: Request) => Promise<Response> | Response,
) {
  return withRequestContext(request, async () => {
    const response = await handler(request);
    return applySetCookieHeaders(response);
  });
}

export function methodNotAllowed() {
  return new Response("Method Not Allowed", { status: 405 });
}
