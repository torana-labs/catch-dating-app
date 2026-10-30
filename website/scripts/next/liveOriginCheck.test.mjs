import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {checkLiveOrigin, firebaseOrigin, publicOrigin} from "./liveOriginCheck.mjs";
const sourceSha = "a".repeat(40), previous = "b".repeat(40);
/** Production as GitHub-hosted runners see it since #1019: Cloudflare challenges every path. */
function production(change = () => {}) {
  const requests = [];
  const fetchImpl = async url => {
    requests.push(url);
    const result = {status: 404, body: "", headers: {}};
    if (url === `${firebaseOrigin}/api/public-catalog`) Object.assign(result, {status: 200,
      body: JSON.stringify({listings: []}), headers: {"x-catch-release": sourceSha, "cache-control": "private, no-store"}});
    else if (url === `${firebaseOrigin}/`) Object.assign(result, {status: 301, headers: {location: `${publicOrigin}/`}});
    else if (url.startsWith(`${publicOrigin}/`)) Object.assign(result, {status: 403, headers: {server: "cloudflare", "cf-ray": "ray-BOM"}});
    change(url, result);
    return new Response(result.status === 301 ? null : result.body, {status: result.status, headers: result.headers});
  };
  return {fetchImpl, requests};
}
const noWait = {sleep: async () => {}};

test("a challenged edge still passes once the origin serves the release", async () => {
  const {fetchImpl, requests} = production();
  const result = await checkLiveOrigin({sourceSha, fetchImpl});
  assert.equal(result.origin.release, sourceSha);
  assert.deepEqual(result.redirect, {status: 301, location: `${publicOrigin}/`});
  assert.equal(result.edge.challenged, true);
  assert.deepEqual(requests, [`${firebaseOrigin}/api/public-catalog`, `${firebaseOrigin}/`, `${publicOrigin}/api/public-catalog`]);
});

test("promotion waits for the origin to serve the release, within a bound", async () => {
  let calls = 0;
  const {fetchImpl} = production((url, result) => {
    if (url.endsWith("/api/public-catalog") && url.startsWith(firebaseOrigin) && ++calls < 3) result.headers["x-catch-release"] = previous;
  });
  assert.equal((await checkLiveOrigin({sourceSha, attempts: 3, fetchImpl, ...noWait})).origin.attempt, 3);
  calls = -10;
  await assert.rejects(checkLiveOrigin({sourceSha, attempts: 3, fetchImpl, ...noWait}),
    new RegExp(`did not serve ${sourceSha} after 3 attempt\\(s\\); last answer .*${previous}`, "u"));
});

test("monitoring accepts any well-formed release", async () => {
  const {fetchImpl} = production((url, result) => {if (url.startsWith(firebaseOrigin)) result.headers["x-catch-release"] = previous;});
  assert.equal((await checkLiveOrigin({fetchImpl})).origin.release, previous);
  const missing = production((url, result) => {if (url.startsWith(firebaseOrigin)) delete result.headers["x-catch-release"];});
  await assert.rejects(checkLiveOrigin({fetchImpl: missing.fetchImpl}), /did not serve a release/u);
});

test("the origin answer must be uncached, catalog-shaped and from the release", async () => {
  for (const [change, message] of [
    [result => {result.headers["cache-control"] = "public, s-maxage=60";}, /must not be cached/u],
    [result => {result.body = "{}";}, /listings/u],
    [result => {result.status = 503;}, /did not serve/u],
  ]) {
    const {fetchImpl} = production((url, result) => {if (url === `${firebaseOrigin}/api/public-catalog`) change(result);});
    await assert.rejects(checkLiveOrigin({sourceSha, fetchImpl}), message);
  }
});

test("the Firebase host must keep redirecting pages to the public domain", async () => {
  for (const change of [result => {result.status = 200;}, result => {result.headers.location = "https://example.com/";}]) {
    const {fetchImpl} = production((url, result) => {if (url === `${firebaseOrigin}/`) change(result);});
    await assert.rejects(checkLiveOrigin({sourceSha, fetchImpl}), /redirect/u);
  }
});

test("the public domain must answer through Cloudflare, and a 200 must carry the same release", async () => {
  const served = production((url, result) => {
    if (url.startsWith(publicOrigin)) Object.assign(result, {status: 200, headers: {...result.headers, "x-catch-release": sourceSha}});
  });
  assert.equal((await checkLiveOrigin({sourceSha, fetchImpl: served.fetchImpl})).edge.challenged, false);
  for (const [change, message] of [
    [result => {result.headers = {};}, /through Cloudflare/u],
    [result => {delete result.headers["cf-ray"];}, /cf-ray/u],
    [result => {result.status = 502;}, /HTTP status/u],
    [result => {Object.assign(result, {status: 200}); result.headers["x-catch-release"] = previous;}, /another release/u],
  ]) {
    const {fetchImpl} = production((url, result) => {if (url.startsWith(publicOrigin)) change(result);});
    await assert.rejects(checkLiveOrigin({sourceSha, fetchImpl}), message);
  }
});

test("promotion and monitoring run main's live check, not the release's page smoke", () => {
  const read = name => fs.readFileSync(new URL(`../../../.github/workflows/${name}`, import.meta.url), "utf8");
  const promote = read("website-next-promote.yml");
  const live = promote.indexOf('node website/scripts/next/liveOriginCheck.mjs --release "$RELEASE_SHA" --attempts 18');
  assert.ok(live > promote.indexOf("hostingState.mjs verify-next"), "the live check follows the clone to live");
  assert.ok(live < promote.indexOf("promoteRelease.mjs record"), "the tag moves only after the live check passes");
  const observability = read("website-production-observability.yml");
  assert.match(observability, /website\/scripts\/next\/liveOriginCheck\.mjs\n/u);
  assert.match(observability, /node website\/scripts\/next\/liveOriginCheck\.mjs$/mu);
});
