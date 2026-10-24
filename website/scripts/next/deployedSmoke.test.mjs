import assert from "node:assert/strict";
import test from "node:test";
import {expectedRelease, verifyDeployedWebsite} from "./deployedSmoke.mjs";
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

test("promotion checks the preview's release, which main may have moved past", () => {
  const release = "a".repeat(40), head = "b".repeat(40);
  assert.equal(expectedRelease({GITHUB_SHA: head, RELEASE_SHA: release}), release);
  assert.equal(expectedRelease({GITHUB_SHA: release}), release, "a preview checks its own commit");
});
