import assert from "node:assert/strict";
import {fileURLToPath} from "node:url";
import {consumerHomeCopy} from "../../src/content/consumerHome.ts";
import {hostLandingCopy} from "../../src/content/hostLanding.ts";
import {exploreCopy} from "../../src/content/explore.ts";
import {organiserDirectoryCopy} from "../../src/content/organiserDirectory.ts";
export async function verifyDeployedWebsite(base, sourceSha, {fetchImpl = fetch} = {}) {
  assert.match(base ?? "", /^https:\/\/(?:catchdates\.com|catch-dating-app-64e51--next-(?:candidate|release)-[a-z0-9-]+\.web\.app)$/u);
  assert.match(sourceSha ?? "", /^[a-f0-9]{40}$/u);
  const live = base === "https://catchdates.com";
  const evidence = [];
  async function get(path, status = 200, source = true) {
    const response = await fetchImpl(`${base}${path}`, {redirect: "manual", signal: AbortSignal.timeout(30_000)});
    assert.equal(response.status, status, `${path} HTTP status`);
    if (source) {
      assert.equal(response.headers.get("x-catch-release"), sourceSha, `${path} is not the selected release`);
      if (!live) assert.match(response.headers.get("x-robots-tag") ?? "", /noindex/u);
    }
    const text = await response.text(); evidence.push({path, status: response.status}); return {response, text};
  }
  for (const [path, title] of [["/", consumerHomeCopy.hero.title], ["/host/", hostLandingCopy.hero.title], ["/explore/", exploreCopy.title], ["/organizers/", organiserDirectoryCopy.title]]) {
    const {response, text} = await get(path);
    assert.ok(text.includes(title) && text.includes("<h1"), `${path} rendered content`);
    if (live && ["/", "/host/"].includes(path)) assert.doesNotMatch(response.headers.get("x-robots-tag") ?? "", /noindex/u);
  }
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
  for (const path of ["/privacy/", "/terms/", "/help/", "/delete-account/", "/host/apply/"]) assert.ok((await get(path)).text.includes("<h1"));
  await get("/not-a-real-next-release-route/", 404);
  await get("/events/not-a-real-next-release-event/", 404);
  const privatePage = await get("/f/next-release-private-marker/");
  assert.match(privatePage.response.headers.get("x-robots-tag"), /noindex/u);
  assert.match(privatePage.response.headers.get("cache-control"), /no-store/u);
  assert.doesNotMatch(privatePage.text, /next-release-private-marker/u);
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
 * the commit it runs on.
 */
export function expectedRelease(env) {
  return env.RELEASE_SHA || env.GITHUB_SHA;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await verifyDeployedWebsite(process.argv[2], expectedRelease(process.env)), null, 2));
}
