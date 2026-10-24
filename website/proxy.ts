import {productionIndexing, validatePublicRuntimeEnvironment} from "./src/server/publicEnvironment";
import {isCatchWebsiteHost, isCatchIndexingHost, websiteRequestHostname} from "./src/app/surfaceHostPolicy";
import {resolvePublicRoute} from "./src/server/publicRoute";
import {availabilityCopy} from "./src/content/availability";
import {NextRequest, NextResponse} from "next/server";
import {retiredMarketingDestination} from "./src/app/retiredMarketingRoutes";
import {isPrivateShellPath, privateShellFamily} from "./src/server/privateShellMetadata";

async function handleRequest(request: NextRequest) {
  const url = request.nextUrl;
  // Behind Hosting, Next can replay the shell rewrite as a fresh request that
  // lacks the forwarded public host; re-applying the host policy would drop
  // its family and serve generic metadata on every private page.
  if (isPrivateShellPath(url.pathname)) return NextResponse.next();
  const privateFamily = privateShellFamily(url.pathname);
  const asset = /^\/(_next\/|_legacy\/|assets\/|fonts\/|\.well-known\/)/.test(url.pathname) ||
    ["/favicon.ico", "/form-embed-resize.js", "/organizer-tracking-runtime.js", "/organizer-tracking-runtime.html"].includes(url.pathname);
  const api = url.pathname.startsWith("/api/");
  const hostname = websiteRequestHostname(request.headers, process.env.K_SERVICE);
  const allowedHost = hostname && (isCatchWebsiteHost(hostname) || hostname === process.env.CATCH_PREVIEW_HOST);
  if ((!allowedHost && !asset && !api) || privateFamily) {
    const shell = url.clone(); shell.pathname = "/private-shell"; shell.search = "";
    if (privateFamily) shell.searchParams.set("surface", privateFamily);
    const response = NextResponse.rewrite(shell);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }
  if (!allowedHost && api && url.pathname !== "/api/form-domain") {
    return new NextResponse(null, {status: 404, headers: {"Cache-Control": "no-store"}});
  }
  const publicOrigin = hostname && isCatchWebsiteHost(hostname) &&
    !["localhost", "127.0.0.1", "[::1]"].includes(hostname) ? `https://${hostname}` : url.origin;
  const destination = retiredMarketingDestination({pathname: url.pathname, search: url.search, hash: ""});
  if (destination) return NextResponse.redirect(new URL(destination, publicOrigin), 301);
  if (!asset && !api && !["/robots.txt", "/sitemap.xml", "/private-shell"].includes(url.pathname)) {
    try {
      const pathname = url.pathname.replace(/\/+$/, "") + "/";
      const route = await resolvePublicRoute(pathname);
      const catalog = route.catalog;
      const aliases = catalog.listings.filter(listing => listing.legacyPaths?.includes(pathname));
      if (!catalog.listings.some(listing => listing.path === pathname) && aliases.length === 1) {
        const canonical = new URL(url.pathname + url.search, publicOrigin); canonical.pathname = aliases[0].path;
        return NextResponse.redirect(canonical, 301);
      }
      // RSC can stream notFound() with HTTP 200. Decide the status before that
      // stream starts, using the same authorized catalog and route resolvers.
      if (route.page === "not_found") {
        const response = NextResponse.next({status: 404});
        response.headers.set("Cache-Control", "private, no-store");
        response.headers.set("X-Robots-Tag", "noindex, nofollow");
        return response;
      }
    } catch {
      return new NextResponse(`<!doctype html><html lang="en"><head><meta name="robots" content="noindex"><title>${availabilityCopy.title}</title></head><body><h1>${availabilityCopy.title}</h1><p>${availabilityCopy.body}</p></body></html>`,
        {status: 503, headers: {"Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "Retry-After": "30", "X-Robots-Tag": "noindex"}});
    }
  }
  const response = NextResponse.next();
  if (url.pathname.startsWith("/_legacy/")) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.headers.set("Referrer-Policy", "no-referrer");
    if (url.pathname.endsWith(".html")) response.headers.set("Cache-Control", "private, no-store");
  }
  return response;
}
export async function proxy(request: NextRequest) {
  try {validatePublicRuntimeEnvironment();}
  catch {return new NextResponse(null, {status: 503, headers: {
    "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow", "Retry-After": "30",
  }});}
  const indexable = productionIndexing() && isCatchIndexingHost(websiteRequestHostname(request.headers, process.env.K_SERVICE));
  const response = !indexable && request.nextUrl.pathname === "/robots.txt"
    ? new NextResponse("User-agent: *\nDisallow: /\n", {headers: {"Content-Type": "text/plain", "Cache-Control": "no-store"}})
    : await handleRequest(request);
  if (!indexable) response.headers.set("X-Robots-Tag", "noindex, nofollow");
  if (/^[a-f0-9]{40}$/.test(process.env.CATCH_RELEASE_SHA ?? "")) response.headers.set("X-Catch-Release", process.env.CATCH_RELEASE_SHA!);
  return response;
}
export const config = {matcher: "/:path*"};
