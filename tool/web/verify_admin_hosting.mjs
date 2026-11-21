#!/usr/bin/env node
// Runs in release jobs, which don't install packages: Node built-ins only.
import {pathToFileURL} from "node:url";

const noCache = /\bno-cache\b/u;
const immutable = /\bimmutable\b/u;
const chunkIn = (html) => html.match(/\/assets\/[^"']+\.js/u)?.[0];

// Right after a deploy the CDN can still hand out the previous index.html for a
// few seconds, naming a chunk the new release removed. A 404 chunk re-reads /
// and checks the chunk it names now, waiting about a minute in all before the
// 404 counts as a failure.
export const chunkRetryDelaysMs = [2000, 4000, 8000, 15000, 30000];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Admin's deploys replace its hashed chunks, so a tab left open asks for files
 * that are gone. That only recovers if a missing chunk is a real 404 and
 * index.html is never served from a stale cache.
 */
export async function verifyAdminHosting(baseUrl, {
  fetchImpl = fetch,
  now = Date.now(),
  retryDelaysMs = chunkRetryDelaysMs,
  sleep = wait,
  log = () => {},
} = {}) {
  const failures = [];
  const get = (path) => fetchImpl(`${baseUrl}${path}`, {redirect: "manual"});
  const expectShell = async (path) => {
    const response = await get(path);
    const type = response.headers.get("content-type") ?? "";
    const cache = response.headers.get("cache-control") ?? "";
    if (response.status !== 200 || !type.includes("text/html")) {
      failures.push(`${path} should serve the app: got ${response.status} ${type}`);
    }
    if (!noCache.test(cache)) failures.push(`${path} should be no-cache: got "${cache}"`);
    return response.text();
  };

  const html = await expectShell("/");
  await expectShell("/index.html");
  await expectShell("/now");

  const missing = await get(`/assets/__catch_missing_chunk_${now}__.js`);
  if (missing.status !== 404) {
    failures.push(`a missing /assets/ file should return 404: got ${missing.status}`);
  }

  let chunk = chunkIn(html);
  if (!chunk) {
    failures.push("index.html should reference a chunk in /assets/");
  } else {
    let response = await get(chunk);
    for (const delay of retryDelaysMs) {
      if (response.status !== 404) break;
      log(`${chunk} returned 404; the CDN may still serve the previous index.html. Re-reading / in ${delay / 1000}s.`);
      await sleep(delay);
      chunk = chunkIn(await (await get("/")).text()) ?? chunk;
      response = await get(chunk);
    }
    const cache = response.headers.get("cache-control") ?? "";
    if (response.status !== 200) failures.push(`${chunk} should exist: got ${response.status}`);
    if (!immutable.test(cache)) failures.push(`${chunk} should be immutable: got "${cache}"`);
  }
  return failures;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const baseUrl = String(process.argv[2] ?? "").replace(/\/+$/u, "");
  if (!/^https?:\/\//u.test(baseUrl)) {
    console.error("Usage: node tool/web/verify_admin_hosting.mjs <base-url>");
    process.exit(64);
  }
  const failures = await verifyAdminHosting(baseUrl, {log: (message) => console.warn(message)});
  if (failures.length > 0) {
    console.error(`Admin Hosting check failed for ${baseUrl}:\n- ${failures.join("\n- ")}`);
    process.exit(1);
  }
  console.log(`Admin Hosting check passed: ${baseUrl} serves no-cache HTML, immutable chunks and real 404s.`);
}
