import {readPublicCatalog, readPublicCatalogForProbe} from "./publicCatalog";
import {resolvePublicRoute} from "./publicRoute";
/** Cloud Monitoring's uptime checker, which names itself in every request. */
export function isUptimeProbe(request: Request): boolean {
  return (request.headers.get("user-agent") ?? "").startsWith("GoogleStackdriverMonitoring-UptimeChecks");
}
export async function publicCatalogResponse(request: Request) {
  const headers = {"Cache-Control": "private, no-store", "X-Robots-Tag": "noindex"};
  try {
    const path = new URL(request.url).searchParams.get("path") ?? "";
    const detail = path.length <= 240 && /^\/(?:events\/[A-Za-z0-9_-]+|organizers\/(?:[a-z0-9-]+\/)?[a-z0-9-]+)\/?$/u.test(path);
    // Re-run publication and review gates on refresh; never merge stale reviews in the browser.
    const catalog = detail ? (await resolvePublicRoute(path)).catalog : await (isUptimeProbe(request) ? readPublicCatalogForProbe() : readPublicCatalog());
    return Response.json(catalog, {headers});
  }
  catch { return Response.json({listings: [], unavailable: true}, {status: 503, headers}); }
}
