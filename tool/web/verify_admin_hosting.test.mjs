import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {verifyAdminHosting} from "./verify_admin_hosting.mjs";

const html = '<script type="module" src="/assets/index-abc.js"></script>';
const healthy = {
  "/": [200, "text/html; charset=utf-8", "no-cache", html],
  "/index.html": [200, "text/html; charset=utf-8", "no-cache", html],
  "/now": [200, "text/html; charset=utf-8", "no-cache", html],
  "/assets/index-abc.js": [200, "text/javascript", "public, max-age=31536000, immutable", ""],
};

function fakeFetch(routes) {
  return async (url) => {
    const [status, type, cache, body] = routes[new URL(url).pathname] ?? [404, "text/html", "", ""];
    return new Response(body, {status, headers: {"content-type": type, "cache-control": cache}});
  };
}

const check = (routes) => verifyAdminHosting("https://admin.test", {fetchImpl: fakeFetch(routes), now: 1});

test("healthy hosting passes", async () => {
  assert.deepEqual(await check(healthy), []);
});

test("a missing chunk rewritten to index.html fails", async () => {
  const failures = await check({
    ...healthy,
    "/assets/__catch_missing_chunk_1__.js": [200, "text/html", "no-cache", html],
  });
  assert.match(failures.join(), /missing \/assets\/ file should return 404: got 200/u);
});

test("index.html cached for an hour fails", async () => {
  const failures = await check({...healthy, "/index.html": [200, "text/html", "max-age=3600", html]});
  assert.match(failures.join(), /\/index\.html should be no-cache/u);
});

test("a deep link that stops serving the app fails", async () => {
  const failures = await check({...healthy, "/now": [404, "text/html", "no-cache", ""]});
  assert.match(failures.join(), /\/now should serve the app: got 404/u);
});

test("chunks that aren't immutable fail", async () => {
  const failures = await check({
    ...healthy,
    "/assets/index-abc.js": [200, "text/javascript", "max-age=3600", ""],
  });
  assert.match(failures.join(), /should be immutable/u);
});

test("firebase.json gives Admin no-cache HTML, immutable chunks and no asset rewrite", () => {
  const config = JSON.parse(fs.readFileSync(new URL("../../firebase.json", import.meta.url), "utf8"));
  const admin = config.hosting.find((entry) => entry.target === "admin");
  const cacheFor = (source) => admin.headers.find((rule) => rule.source === source)
    ?.headers.find((header) => header.key === "Cache-Control")?.value;
  assert.equal(cacheFor("!/assets/**"), "no-cache");
  assert.equal(cacheFor("/assets/**"), "public, max-age=31536000, immutable");
  assert.deepEqual(admin.rewrites, [{source: "!/assets/**", destination: "/index.html"}]);
});
