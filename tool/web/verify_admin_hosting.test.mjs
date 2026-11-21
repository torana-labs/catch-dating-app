import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {chunkRetryDelaysMs, verifyAdminHosting} from "./verify_admin_hosting.mjs";

const html = '<script type="module" src="/assets/index-abc.js"></script>';
const healthy = {
  "/": [200, "text/html; charset=utf-8", "no-cache", html],
  "/index.html": [200, "text/html; charset=utf-8", "no-cache", html],
  "/now": [200, "text/html; charset=utf-8", "no-cache", html],
  "/assets/index-abc.js": [200, "text/javascript", "public, max-age=31536000, immutable", ""],
};

// A route is one response, or a list served in order with the last repeating.
function fakeFetch(routes, served = {}) {
  return async (url) => {
    const path = new URL(url).pathname;
    const route = routes[path] ?? [404, "text/html", "", ""];
    const index = served[path] = (served[path] ?? -1) + 1;
    const responses = Array.isArray(route[0]) ? route : [route];
    const [status, type, cache, body] = responses[Math.min(index, responses.length - 1)];
    return new Response(body, {status, headers: {"content-type": type, "cache-control": cache}});
  };
}

const check = (routes, options = {}) => verifyAdminHosting("https://admin.test", {
  fetchImpl: fakeFetch(routes, options.served),
  now: 1,
  sleep: async () => {},
  ...options,
});

// Right after a deploy the CDN served the previous index.html, whose chunk the
// release had just removed; a moment later / named the new chunk.
const staleHtml = '<script type="module" src="/assets/index-old.js"></script>';
const staleShell = [200, "text/html; charset=utf-8", "no-cache", staleHtml];
const goneChunk = [404, "text/html", "no-cache", ""];

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

test("the retries wait about a minute in all", () => {
  const total = chunkRetryDelaysMs.reduce((sum, ms) => sum + ms, 0);
  assert.ok(total >= 45000 && total <= 60000, `waits ${total}ms`);
});

test("a stale shell naming a removed chunk passes once / names the new chunk", async () => {
  const waits = [];
  const served = {};
  const failures = await check(
    {...healthy, "/": [staleShell, staleShell, healthy["/"]], "/assets/index-old.js": goneChunk},
    {served, sleep: async (ms) => waits.push(ms)},
  );
  assert.deepEqual(failures, []);
  assert.deepEqual(waits, chunkRetryDelaysMs.slice(0, 2));
  assert.equal(served["/"], 2);
  assert.equal(served["/assets/index-abc.js"], 0);
});

test("a chunk that stays 404 fails after the retries with the same messages", async () => {
  const waits = [];
  const failures = await check(
    {...healthy, "/": staleShell, "/assets/index-old.js": goneChunk},
    {sleep: async (ms) => waits.push(ms)},
  );
  assert.deepEqual(waits, chunkRetryDelaysMs);
  assert.deepEqual(failures, [
    '/assets/index-old.js should exist: got 404',
    '/assets/index-old.js should be immutable: got "no-cache"',
  ]);
});

test("a new shell whose chunk is also missing still fails", async () => {
  const failures = await check({...healthy, "/": [staleShell, healthy["/"]], "/assets/index-abc.js": goneChunk});
  assert.match(failures.join(), /\/assets\/index-abc\.js should exist: got 404/u);
});

test("chunks that aren't immutable fail without waiting", async () => {
  const waits = [];
  const failures = await check(
    {...healthy, "/assets/index-abc.js": [200, "text/javascript", "max-age=3600", ""]},
    {sleep: async (ms) => waits.push(ms)},
  );
  assert.deepEqual(waits, []);
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
