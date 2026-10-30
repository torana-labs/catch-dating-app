import {brand} from "@catch/brand";

export function isCatchWebsiteHost(hostname: string): boolean {
  const firebaseSite = hostname.match(
    /^([a-z0-9-]+)\.(?:web\.app|firebaseapp\.com)$/u)?.[1];
  const knownSite = firebaseSite === "catchdates-dev" ||
    firebaseSite === "catchdates-staging" ||
    firebaseSite === "catch-dating-app-64e51" ||
    /^(?:catchdates-dev|catchdates-staging|catch-dating-app-64e51)--[a-z0-9-]+$/u
      .test(firebaseSite ?? "");
  return hostname === brand.web.domain || hostname === new URL(brand.web.wwwOrigin).hostname ||
    hostname === "localhost" || hostname === "127.0.0.1" ||
    hostname === "[::1]" || knownSite;
}

/** Parse only a Host authority. Never trust Next's listen-host URL or forwarded input. */
export function requestHostname(authority: string | null): string | null {
  if (!authority || /[\s,/@?#\\]/.test(authority)) return null;
  try {
    const url = new URL(`http://${authority}`);
    return url.hostname.toLowerCase();
  } catch {return null;}
}

/**
 * The production site is also reachable on its Firebase Hosting domains, which
 * bypass the Cloudflare protection in front of the primary domain. A production
 * runtime answers those hosts with a permanent redirect to the canonical
 * domain. Firebase's reserved `/__/` paths (Auth handlers) and API calls are
 * left alone; preview channels (`site--channel.web.app`) never redirect.
 */
export function canonicalProductionRedirect(hostname: string | null, pathname: string, search: string,
  production: boolean): string | null {
  if (!production || !hostname || !["catch-dating-app-64e51.web.app", "catch-dating-app-64e51.firebaseapp.com"]
    .includes(hostname)) return null;
  if (pathname.startsWith("/__/") || pathname.startsWith("/api/")) return null;
  return `${brand.web.origin}${pathname}${search}`;
}

/** Only canonical production domains may be indexed, even on a production image. */
export function isCatchIndexingHost(hostname: string | null): boolean {
  return hostname === brand.web.domain || hostname === new URL(brand.web.wwwOrigin).hostname;
}

/**
 * Hosting replaces Host with its Cloud Run target and supplies the original
 * authority in X-Forwarded-Host. This is a public routing hint, never an Auth,
 * tenant-ownership or publication grant. Private routes retain their shell and
 * every public document still passes the independent publication projection.
 * Ignore forwarding on local servers, custom hosts and unrelated runtimes.
 */
export function websiteRequestHostname(headers: Pick<Headers, "get">, service?: string): string | null {
  const host = requestHostname(headers.get("host"));
  if (!host || !["catch-website-next", "catch-website-next-preview"].includes(service ?? "")) return host;
  const backend = new RegExp(`^(?:[a-z0-9-]+---)?${service}-[a-z0-9-]+(?:\\.[a-z0-9-]+)*\\.run\\.app$`, "u");
  if (!backend.test(host)) return host;
  const forwarded = requestHostname(headers.get("x-forwarded-host"));
  // Only deployed public site hosts qualify; never forward localhost or a
  // customer domain into the public server surface.
  return forwarded && isCatchWebsiteHost(forwarded) &&
    (forwarded.endsWith(".web.app") || forwarded.endsWith(".firebaseapp.com") || isCatchIndexingHost(forwarded))
    ? forwarded : host;
}
