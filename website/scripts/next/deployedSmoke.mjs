import assert from "node:assert/strict";
import {fileURLToPath} from "node:url";
import {homePageCopy} from "../../src/content/homePage.ts";
import {hostLandingCopy} from "../../src/content/hostLanding.ts";
import {explorePageCopy} from "../../src/content/explorePage.ts";
import {inMarket as activeMarket} from "../../src/content/markets/in.ts";
import {PUBLIC_PAGE_CACHE_CONTROL} from "../../src/app/next/publicPageCache.ts";
import {productionProbeContracts} from "../probeProduction.mjs";
/** Home and the organiser, event and Explore families; never Host, legal, claim or private routes. */
export function sharedCachePage(path) {
  return path === "/" || /^\/(?:explore|organizers|events)\/(?:[^?#]*)$/u.test(path) ||
    activeMarket.cities.some((city) => path === `/${city.slug}/`);
}
/**
 * How long a shared cache such as the Hosting CDN may keep a response. `public`
 * alone does not let it: Next sends `public, max-age=0, must-revalidate` for
 * the live robots file, which is stale on arrival.
 */
export function sharedCacheSeconds(cache) {
  const directives = cache.toLowerCase().split(",").map(part => part.trim());
  if (directives.some(part => part === "private" || part === "no-store")) return 0;
  const seconds = name => Number(directives.find(part => part.startsWith(`${name}=`))?.slice(name.length + 1) ?? NaN);
  const shared = seconds("s-maxage");
  if (Number.isFinite(shared)) return shared;
  return directives.includes("public") && Number.isFinite(seconds("max-age")) ? seconds("max-age") : 0;
}
export async function verifyDeployedWebsite(base, sourceSha, {fetchImpl = fetch} = {}) {
  assert.match(base ?? "", /^https:\/\/(?:catchdates\.com|catch-dating-app-64e51--next-(?:candidate|release)-[a-z0-9-]+\.web\.app)$/u);
  assert.match(sourceSha ?? "", /^[a-f0-9]{40}$/u);
  const live = base === "https://catchdates.com";
  const evidence = [];
  async function get(path, status = 200, source = true) {
    const response = await fetchImpl(`${base}${path}`, {redirect: "manual", signal: AbortSignal.timeout(30_000)});
    assert.equal(response.status, status, `${path} HTTP status`);
    // A shared cache may hold only an authorized catalog page, for one minute.
    // Older releases send no-store there, so promotion stays release-neutral.
    // Static association files are Hosting's, not the runtime's, policy.
    const cache = response.headers.get("cache-control") ?? "";
    if (source && sharedCacheSeconds(cache) > 0) {
      assert.equal(cache, PUBLIC_PAGE_CACHE_CONTROL, `${path} shared cache policy`);
      assert.ok(status === 200 && sharedCachePage(path), `${path} must not enter a shared cache`);
    }
    if (source) {
      assert.equal(response.headers.get("x-catch-release"), sourceSha, `${path} is not the selected release`);
      if (!live) assert.match(response.headers.get("x-robots-tag") ?? "", /noindex/u);
    }
    const text = await response.text(); evidence.push({path, status: response.status}); return {response, text};
  }
  for (const [path, title] of [["/", homePageCopy.hero.title], ["/host/", hostLandingCopy.hero.title], ["/explore/", explorePageCopy.lead], ["/mumbai/", explorePageCopy.lead]]) {
    const {response, text} = await get(path);
    assert.ok(text.includes(title) && text.includes("<h1"), `${path} rendered content`);
    if (live && ["/", "/host/"].includes(path)) assert.doesNotMatch(response.headers.get("x-robots-tag") ?? "", /noindex/u);
  }
  // The directory is Explore's organisers view; its query comes along (CAT-261).
  const directory = await get("/organizers/?q=run", 308);
  assert.equal(directory.response.headers.get("location"), "/explore/?q=run&show=organisers", "/organizers/ redirect");
  const catalog = await get("/api/public-catalog");
  assert.match(catalog.response.headers.get("cache-control"), /no-store/u);
  const data = JSON.parse(catalog.text); assert.ok(Array.isArray(data.listings));
  for (const listing of data.listings.slice(0, 2)) {
    assert.match(listing.path, /^\/organizers\/(?:[a-z0-9-]+\/)?[a-z0-9-]+\/$/u);
    assert.ok((await get(listing.path)).text.includes("<h1"));
    const event = listing.catchEvents?.[0];
    if (event) {
      assert.match(event.id, /^[^/?#]+$/u);
      assert.ok((await get(`/events/${encodeURIComponent(event.id)}/`)).text.includes("<h1"));
    }
  }
  for (const path of ["/privacy/", "/terms/", "/help/", "/delete-account/", "/refunds/", "/contact/", "/host/apply/"]) assert.ok((await get(path)).text.includes("<h1"));
  await get("/not-a-real-next-release-route/", 404);
  await get("/events/not-a-real-next-release-event/", 404);
  const privatePage = await get("/f/next-release-private-marker/");
  assert.match(privatePage.response.headers.get("x-robots-tag"), /noindex/u);
  assert.match(privatePage.response.headers.get("cache-control"), /no-store/u);
  assert.doesNotMatch(privatePage.text, /next-release-private-marker/u);
  // The preview always serves current main, so it proves the shell keeps its
  // route family's metadata through the real Hosting and Cloud Run rewrite.
  // Promotion may release older source; the production probe watches live.
  if (/--next-candidate-/u.test(base)) {
    const form = productionProbeContracts.find(contract => contract.path.startsWith("/f/"));
    assert.ok(privatePage.text.includes(`<title>${form.title}</title>`), "Private shell lost its route-family title");
    assert.ok(privatePage.text.includes(`rel="canonical" href="https://catchdates.com${form.canonicalPath}"`), "Private shell lost its canonical");
  }
  const robots = await get("/robots.txt");
  assert.ok(robots.text.includes(live ? "Allow: /" : "Disallow: /"));
  assert.ok((await get("/sitemap.xml")).text.includes("https://catchdates.com/"));
  const association = await get("/.well-known/apple-app-site-association", 200, false);
  assert.ok(JSON.parse(association.text).applinks);
  return {sourceSha, base, checks: evidence};
}
/**
 * The release a deployment must serve. Promotion runs on main's head but
 * releases the accepted preview's source (RELEASE_SHA); a preview releases
 * the commit it runs on. The routes and copy above are this file's source's,
 * so promotion runs the release's own copy of this file, never main's: main
 * may have reworked a route since (an older Explore, for one, fails main's).
 */
export function expectedRelease(env) {
  return env.RELEASE_SHA || env.GITHUB_SHA;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await verifyDeployedWebsite(process.argv[2], expectedRelease(process.env)), null, 2));
}
