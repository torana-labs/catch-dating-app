import assert from "node:assert/strict";
import test from "node:test";
import {expectedRelease, sharedCachePage, verifyDeployedWebsite} from "./deployedSmoke.mjs";
import {consumerHomeCopy} from "../../src/content/consumerHome.ts";
import {hostLandingCopy} from "../../src/content/hostLanding.ts";
import {exploreCopy} from "../../src/content/explore.ts";
import {organiserDirectoryCopy} from "../../src/content/organiserDirectory.ts";
const sourceSha = "a".repeat(40), preview = "https://catch-dating-app-64e51--next-release-proof.web.app";
function responder(base, change = () => {}) {
  return async url => {
    assert.ok(url.startsWith(base + "/"));
    const path = url.slice(base.length), live = base === "https://catchdates.com";
    const headers = {"x-catch-release": sourceSha, "cache-control": "private, no-store", ...(!live || path.startsWith("/f/") ? {"x-robots-tag": "noindex"} : {})};
    let body = "<h1>Content</h1>", status = path.includes("not-a-real") ? 404 : 200;
    const titles = {"/": consumerHomeCopy.hero.title, "/host/": hostLandingCopy.hero.title, "/explore/": exploreCopy.title, "/organizers/": organiserDirectoryCopy.title};
    if (titles[path]) body = `<h1>${titles[path]}</h1>`;
    if (path === "/api/public-catalog") body = JSON.stringify({listings: [{path: "/organizers/mumbai/club/", catchEvents: [{id: "event"}]}]});
    if (path === "/robots.txt") body = live ? "User-agent: *\nAllow: /" : "User-agent: *\nDisallow: /";
    if (path === "/sitemap.xml") body = "<url><loc>https://catchdates.com/</loc></url>";
    if (path === "/.well-known/apple-app-site-association") body = JSON.stringify({applinks: {}});
    if (path.startsWith("/f/")) body = '<title>Organizer form | Catch</title><link rel="canonical" href="https://catchdates.com/f/">';
    const result = {body, status, headers}; change(path, result);
    return new Response(result.body, {status: result.status, headers: result.headers});
  };
}
test("deployed acceptance covers public, dynamic, private, missing and native-link routes", async () => {
  for (const base of [preview, preview.replace("next-release", "next-candidate"), "https://catchdates.com"]) {
    const result = await verifyDeployedWebsite(base, sourceSha, {fetchImpl: responder(base)});
    for (const path of ["/organizers/mumbai/club/", "/events/event/", "/f/next-release-private-marker/", "/not-a-real-next-release-route/", "/.well-known/apple-app-site-association"]) {
      assert.ok(result.checks.some(check => check.path === path));
    }
  }
});
test("deployed acceptance accepts the one-minute catalog cache on either release and nothing broader", async () => {
  const cached = (path, result) => {if (result.status === 200 && sharedCachePage(path)) result.headers["cache-control"] = "public, s-maxage=60";};
  await verifyDeployedWebsite(preview, sourceSha, {fetchImpl: responder(preview, cached)});
  for (const change of [
    (path, result) => {if (path === "/host/") result.headers["cache-control"] = "public, s-maxage=60";},
    (path, result) => {if (path.startsWith("/f/")) result.headers["cache-control"] = "public, s-maxage=60";},
    (path, result) => {if (path === "/events/not-a-real-next-release-event/") result.headers["cache-control"] = "public, s-maxage=60";},
    (path, result) => {if (path === "/organizers/") result.headers["cache-control"] = "public, s-maxage=3600";},
  ]) await assert.rejects(verifyDeployedWebsite(preview, sourceSha, {fetchImpl: responder(preview, (path, result) => {cached(path, result); change(path, result);})}));
  assert.deepEqual(["/", "/explore/", "/organizers/", "/organizers/indore/club/", "/events/e/"].map(sharedCachePage), [true, true, true, true, true]);
  assert.deepEqual(["/host/", "/claim/", "/privacy/", "/f/x/", "/booking/x/", "/api/public-catalog", "/eventsx/"].map(sharedCachePage), [false, false, false, false, false, false, false]);
});
test("deployed acceptance rejects stale builds, bad status, indexing leaks and bearer echoes", async () => {
  for (const change of [
    (path, result) => {if (path === "/") result.headers["x-catch-release"] = "b".repeat(40);},
    (path, result) => {if (path === "/explore/") result.status = 503;},
    (path, result) => {if (path === "/") delete result.headers["x-robots-tag"];},
    (path, result) => {if (path.startsWith("/f/")) result.body = "next-release-private-marker";},
    (path, result) => {if (path === "/api/public-catalog") result.headers["cache-control"] = "public, max-age=600";},
  ]) await assert.rejects(verifyDeployedWebsite(preview, sourceSha, {fetchImpl: responder(preview, change)}));
  await assert.rejects(verifyDeployedWebsite("https://unrelated.example", sourceSha));
  await assert.rejects(verifyDeployedWebsite("https://catchdates.com", sourceSha, {fetchImpl: responder("https://catchdates.com", (path, result) => {result.headers["x-robots-tag"] = "noindex";})}));
});

test("the preview proves private shell metadata; promotion and live stay release-neutral", async () => {
  const candidate = preview.replace("next-release", "next-candidate");
  const bare = (path, result) => {if (path.startsWith("/f/")) result.body = "<title>Catch</title>";};
  await assert.rejects(verifyDeployedWebsite(candidate, sourceSha, {fetchImpl: responder(candidate, bare)}), /route-family title/u);
  await assert.rejects(verifyDeployedWebsite(candidate, sourceSha, {fetchImpl: responder(candidate,
    (path, result) => {if (path.startsWith("/f/")) result.body = "<title>Organizer form | Catch</title>";})}), /canonical/u);
  await verifyDeployedWebsite(preview, sourceSha, {fetchImpl: responder(preview, bare)});
  await verifyDeployedWebsite("https://catchdates.com", sourceSha, {fetchImpl: responder("https://catchdates.com", bare)});
});

test("promotion checks the preview's release, which main may have moved past", () => {
  const release = "a".repeat(40), head = "b".repeat(40);
  assert.equal(expectedRelease({GITHUB_SHA: head, RELEASE_SHA: release}), release);
  assert.equal(expectedRelease({GITHUB_SHA: release}), release, "a preview checks its own commit");
});
