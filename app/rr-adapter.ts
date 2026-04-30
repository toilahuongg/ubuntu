import {
  applySetCookieHeaders,
  withRequestContext,
} from "@/lib/rr-request-context";

type RouteModule = Partial<
  Record<
    "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS",
    (request: any) => Promise<Response> | Response
  >
>;

export async function handleResourceRoute(
  mod: RouteModule,
  request: Request,
) {
  return withRequestContext(request, async () => {
    const method = request.method.toUpperCase() as keyof RouteModule;
    const handler = mod[method] ?? (method === "HEAD" ? mod.GET : undefined);

    if (!handler) {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const response = await handler(request);
    return applySetCookieHeaders(response);
  });
}

export function asNextPageProps(input: {
  params?: Record<string, string | undefined>;
  searchParams?: Record<string, string | string[] | undefined>;
}): any {
  return {
    params: Promise.resolve(input.params ?? {}),
    searchParams: Promise.resolve(input.searchParams ?? {}),
  };
}

export function getSearchParams(request: Request) {
  const url = new URL(request.url);
  const result: Record<string, string | string[]> = {};

  for (const [key, value] of url.searchParams) {
    const current = result[key];
    if (Array.isArray(current)) {
      current.push(value);
    } else if (current !== undefined) {
      result[key] = [current, value];
    } else {
      result[key] = value;
    }
  }

  return result;
}
