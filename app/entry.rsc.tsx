import {
  createTemporaryReferenceSet,
  decodeAction,
  decodeFormState,
  decodeReply,
  loadServerAction,
  renderToReadableStream,
} from "@vitejs/plugin-rsc/rsc";
import {
  RouterContextProvider,
  unstable_matchRSCServerRequest as matchRSCServerRequest,
} from "react-router";

import routes from "virtual:react-router/unstable_rsc/routes";
import routeDiscovery from "virtual:react-router/unstable_rsc/route-discovery";
import basename from "virtual:react-router/unstable_rsc/basename";
import unstable_reactRouterServeConfig from "virtual:react-router/unstable_rsc/react-router-serve-config";

import {
  applySetCookieHeaders,
  withRequestContext,
} from "@/lib/rr-request-context";

export { unstable_reactRouterServeConfig };

function fetchServer(
  request: Request,
  requestContext?: RouterContextProvider,
) {
  return matchRSCServerRequest({
    basename,
    createTemporaryReferenceSet,
    decodeAction,
    decodeFormState,
    decodeReply,
    loadServerAction,
    request,
    requestContext,
    routes: routes as any,
    routeDiscovery: routeDiscovery as any,
    generateResponse(match, options) {
      return new Response(renderToReadableStream(match.payload, options), {
        headers: match.headers,
        status: match.statusCode,
      });
    },
  });
}

export default {
  fetch(request: Request, requestContext?: RouterContextProvider) {
    const context =
      requestContext instanceof RouterContextProvider
        ? requestContext
        : new RouterContextProvider();

    return withRequestContext(request, async () => {
      const ssr = await import.meta.viteRsc.loadModule<any>("ssr", "index");
      const response = await ssr.generateHTML(
        request,
        await fetchServer(request, context),
      );
      return applySetCookieHeaders(response);
    });
  },
};

if (import.meta.hot) {
  import.meta.hot.accept();
}
