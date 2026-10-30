import assert from "node:assert/strict";
import {explorePageCopy} from "../../src/content/explorePage.ts";
import {homePageCopy} from "../../src/content/homePage.ts";
import {hostLandingCopy} from "../../src/content/hostLanding.ts";
import {inMarket as activeMarket} from "../../src/content/markets/in.ts";
const base = process.argv[2];
assert.match(base ?? "", /^http:\/\/127\.0\.0\.1:\d+$/u);
async function get(path) {
  return fetch(`${base}${path}`, {redirect: "manual", signal: AbortSignal.timeout(15_000)});
}
let response;
for (let attempt = 0; attempt < 30; attempt++) {
  try { response = await get("/host/"); break; }
  catch (error) { if (attempt === 29) throw error; await new Promise(resolve => setTimeout(resolve, 1000)); }
}
assert.equal(response.status, 200, "Production-eligible container must render the authored Host page");
const hostHtml = await response.text();
assert.ok(hostHtml.includes(hostLandingCopy.hero.title), "Container must serve the redesigned Host page");
assert.ok(hostHtml.includes(hostLandingCopy.adoption.circlesLabel), "Adoption circles must survive packaging");
assert.equal((await get("/not-a-real-preview-route/")).status, 404);
// Without credentials nothing public can be read. Home, Explore and the city
// pages keep their own unavailable message, but answer an uncached 503 at once,
// so neither the CDN nor a monitor takes them for a healthy page.
const city = activeMarket.cities.find(candidate => candidate.status === "live") ?? activeMarket.cities[0];
for (const [path, marker] of [["/", homePageCopy.week.unavailable], ["/explore/", explorePageCopy.unavailable],
  [`/${city.slug}/`, explorePageCopy.unavailable]]) {
  const started = performance.now();
  const unavailable = await get(path);
  const html = await unavailable.text();
  const seconds = (performance.now() - started) / 1000;
  assert.equal(unavailable.status, 503, `${path} must fail closed on public database reads`);
  assert.match(unavailable.headers.get("cache-control") ?? "", /no-store/u, `${path} must not be cached`);
  assert.equal(unavailable.headers.get("retry-after"), "30", `${path} retry hint`);
  assert.ok(html.includes("<h1") && html.includes(marker), `${path} must keep its unavailable message`);
  assert.ok(seconds < 5, `${path} took ${seconds.toFixed(1)}s to say it is unavailable`);
}
// Organiser and event pages fail closed before rendering anything.
for (const path of ["/organizers/preview-smoke-organizer/", "/events/preview-smoke-event/"]) {
  const unavailable = await get(path);
  assert.equal(unavailable.status, 503, `${path} must fail closed on public database reads`);
  assert.match(unavailable.headers.get("cache-control") ?? "", /no-store/u, `${path} must not be cached`);
}
const privatePage = await get("/f/preview-secret-token/");
assert.equal(privatePage.status, 200);
assert.match(privatePage.headers.get("x-robots-tag"), /noindex/u);
assert.doesNotMatch(await privatePage.text(), /preview-secret-token/u);
const association = await get("/.well-known/apple-app-site-association");
assert.equal(association.status, 200);
assert.ok((await association.json()).applinks);
console.log("Container source, production eligibility, failure, private-shell and app-link checks passed.");
