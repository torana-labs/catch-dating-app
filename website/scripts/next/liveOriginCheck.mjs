import assert from "node:assert/strict";
import fs from "node:fs";
import {fileURLToPath} from "node:url";
/**
 * Live production checks that still work with Cloudflare in front of the
 * public domain. On the free plan, Bot Fight Mode answers GitHub-hosted
 * runners with 403 on every path, and no rule can let them past (#1272). So
 * each check covers its own leg of a visitor's path:
 * - origin: the production Firebase host serves `/api/` without its canonical
 *   redirect and never caches it, so its `x-catch-release` is what live
 *   Hosting serves. Promotion proved the pages themselves on the next-release
 *   channel, with this same Hosting version, before cloning it to live.
 * - redirect: every other path on that host still sends the visitor to the
 *   public domain, so the host never becomes a way round Cloudflare.
 * - edge: the public domain answers through Cloudflare. A 200 must carry the
 *   same release. A Cloudflare 403 proves only that the edge is up.
 * Cloudflare Pro would let one rule pass a signed probe and restore a single
 * end-to-end check (docs/release_operations.md).
 */
export const firebaseOrigin = "https://catch-dating-app-64e51.web.app";
export const publicOrigin = JSON.parse(fs.readFileSync(
  new URL("../../../packages/brand/brand.json", import.meta.url), "utf8")).web.origin;
const releasePath = "/api/public-catalog", release = /^[a-f0-9]{40}$/u;

export async function checkLiveOrigin({sourceSha = null, attempts = 1, delayMs = 10_000, fetchImpl = fetch,
  sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))} = {}) {
  if (sourceSha !== null) assert.match(sourceSha, release);
  assert.ok(Number.isInteger(attempts) && attempts >= 1);
  const get = url => fetchImpl(url, {redirect: "manual", headers: {"user-agent": "catch-production-probe/1"},
    signal: AbortSignal.timeout(30_000)});
  // A Hosting release does not reach every edge the instant its API call
  // returns, so promotion waits, within a bound, for the origin to serve it.
  let origin;
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await get(`${firebaseOrigin}${releasePath}`);
      const text = await response.text();
      origin = {attempt, status: response.status, release: response.headers.get("x-catch-release"),
        cache: response.headers.get("cache-control")};
      if (response.status === 200 && (sourceSha ? origin.release === sourceSha : release.test(origin.release ?? ""))) {
        assert.match(origin.cache ?? "", /no-store/u, `${releasePath} must not be cached`);
        assert.ok(Array.isArray(JSON.parse(text).listings), `${releasePath} listings`);
        break;
      }
    } catch (error) {
      if (error instanceof assert.AssertionError) throw error;
      origin = {attempt, error: String(error?.message ?? error)};
    }
    if (attempt >= attempts) {
      assert.fail(`${firebaseOrigin}${releasePath} did not serve ${sourceSha ?? "a release"} after ${attempts} ` +
        `attempt(s); last answer ${JSON.stringify(origin)}`);
    }
    await sleep(delayMs);
  }
  const home = await get(`${firebaseOrigin}/`); await home.body?.cancel();
  const redirect = {status: home.status, location: home.headers.get("location")};
  assert.equal(redirect.status, 301, `${firebaseOrigin}/ must redirect to the public domain`);
  assert.equal(redirect.location, `${publicOrigin}/`, `${firebaseOrigin}/ redirect target`);
  // The release path is uncached and outside the challenged page families, so
  // a 200 here carries no stale shared-cache release.
  const front = await get(`${publicOrigin}${releasePath}`); await front.body?.cancel();
  const edge = {status: front.status, server: front.headers.get("server"), ray: front.headers.get("cf-ray"),
    release: front.headers.get("x-catch-release")};
  assert.equal(edge.server?.toLowerCase(), "cloudflare", `${publicOrigin} must answer through Cloudflare`);
  assert.ok(edge.ray, `${publicOrigin} answered without a cf-ray`);
  if (edge.status === 200) assert.equal(edge.release, origin.release, `${publicOrigin} serves another release`);
  else assert.equal(edge.status, 403, `${publicOrigin}${releasePath} HTTP status`);
  return {origin, redirect, edge: {...edge, challenged: edge.status === 403}};
}

function parseArgs(argv) {
  const parsed = {sourceSha: null, attempts: 1};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--release") parsed.sourceSha = argv[++index];
    else if (argv[index] === "--attempts") parsed.attempts = Number(argv[++index]);
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  return parsed;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await checkLiveOrigin(parseArgs(process.argv.slice(2))), null, 2));
}
