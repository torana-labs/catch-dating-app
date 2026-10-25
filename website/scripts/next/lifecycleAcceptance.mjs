import assert from "node:assert/strict";
import {cp, mkdtemp, readFile, rm} from "node:fs/promises";
import {spawn} from "node:child_process";
import {once} from "node:events";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import {chromium} from "playwright";
import {organizerFixture} from "./organizerFixture.mjs";
import {sharedCachePage} from "./deployedSmoke.mjs";
import {PUBLIC_PAGE_CACHE_CONTROL} from "../../src/app/next/publicPageCache.ts";
import {prepareStandalone} from "./prepareStandalone.mjs";

if (process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8765") throw new Error("Isolated emulator required");
const root = fileURLToPath(new URL("../../", import.meta.url));
const temporary = await mkdtemp(path.join(os.tmpdir(), "catch-next-portable-"));
const db = getFirestore(initializeApp({projectId: "demo-catch-nextjs"}, "next-lifecycle-acceptance"));
const ref = db.doc("organizers/next-proof");
const original = await ref.get();
const fixture = organizerFixture();
const secret = "private-owner-runtime-sentinel";
fixture.ownerUserId = secret;
const processes = [];
const output = [];
let browser;
let boundedFixtures = false;
let checks = 0;
async function request(origin, route, status, options) {
  const response = await fetch(origin + route, {...options, redirect: "manual"});
  const body = await response.text();
  assert.equal(response.status, status, `${origin}${route} Location=${response.headers.get("location")}`);
  // Only an authorized catalog page may enter the shared cache; withdrawn,
  // unavailable, data and private responses stay no-store.
  if (status === 200 && sharedCachePage(new URL(route, origin).pathname)) {
    assert.equal(response.headers.get("cache-control"), PUBLIC_PAGE_CACHE_CONTROL, route);
  } else assert.match(response.headers.get("cache-control"), /no-store/, route);
  assert(!body.includes(secret), `Private data leaked in ${route}`);
  assert.equal(response.headers.get("x-catch-public-page"), null, `${route} leaked the cache mark`);
  checks++;
  return {response, body};
}
async function start(port, configured = true, production = false) {
  const env = {...process.env, HOSTNAME: "127.0.0.1", PORT: String(port),
    CATCH_WEBSITE_STAGE: "preview", CATCH_PUBLIC_FIRESTORE_PROJECT: "demo-catch-nextjs"};
  if (!configured) delete env.CATCH_PUBLIC_FIRESTORE_PROJECT;
  if (production) {
    env.CATCH_WEBSITE_STAGE = "production";
    env.CATCH_PUBLIC_FIRESTORE_PROJECT = "catch-dating-app-64e51";
    env.CATCH_NEXT_PRODUCTION_BUILD_READY = "true"; // Cannot override the compiled build decision.
    delete env.FIRESTORE_EMULATOR_HOST;
  }
  const server = spawn(process.execPath, ["server.js"], {cwd: path.join(temporary, "website"), env,
    stdio: ["ignore", "pipe", "pipe"]});
  processes.push(server);
  server.stdout.on("data", value => output.push(value.toString()));
  server.stderr.on("data", value => output.push(value.toString()));
  const origin = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(`Standalone server exited: ${output.join("")}`);
    try {
      const response = await fetch(origin + "/privacy/");
      if (response.ok || (production && response.status === 503)) return origin;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error("Standalone server did not become ready");
}
async function verifyCatalogState(origins, visible, name = fixture.name) {
  for (const origin of origins) {
    const html = await request(origin, "/organizers/next-proof/", visible ? 200 : 404);
    assert.equal(html.body.includes(name), visible);
    const rsc = await request(origin, "/organizers/next-proof/?_rsc", visible ? 200 : 404,
      {headers: {RSC: "1"}});
    assert.match(rsc.response.headers.get("content-type"), /text\/x-component/);
    assert.equal(rsc.body.includes(name), visible);
    const data = await request(origin, "/api/public-catalog", 200,
      {headers: {Cookie: "viewer=private-user", Authorization: "Bearer private-viewer"}});
    assert.equal(JSON.parse(data.body).listings.some(listing => listing.id === "next-proof"), visible);
    // The fixture is an imported (programmatic) listing, which is never indexed.
    if (visible) assert(html.body.includes('content="noindex, follow"'));
    const sitemap = await request(origin, "/sitemap.xml", 200);
    assert(!sitemap.body.includes("/organizers/next-proof/"));
  }
}
try {
  await prepareStandalone(root);
  await cp(path.join(root, ".next/standalone"), temporary, {recursive: true, dereference: true});
  assert(!(await readFile(path.join(temporary, "website/server.js"), "utf8")).includes(root));
  await ref.set(fixture);
  const origins = [await start(3118), await start(3119)];
  await verifyCatalogState(origins, true);
  await ref.update({name: "Edited public organizer"});
  await verifyCatalogState(origins, true, "Edited public organizer");
  for (const patch of [
    {"publicPage.publishStatus": "draft"}, {"publicPage.publishStatus": "suppressed"},
    {archived: true}, {dataOrigin: "catchDemo"},
    {publicProfile: {headline: "Public", facts: [{label: "Label", value: "Value", privateToken: secret}]}},
  ]) {
    await ref.set(fixture); await ref.update(patch);
    await verifyCatalogState(origins, false);
  }
  await ref.delete(); await verifyCatalogState(origins, false);
  await ref.set(fixture); await verifyCatalogState(origins, true);

  browser = await chromium.launch({headless: true});
  const page = await browser.newPage();
  await page.goto(origins[0] + "/organizers/next-proof/");
  await page.getByRole("button", {name: "Essential only", exact: true}).click();
  // A request that never completes cannot keep already-visible data indefinitely.
  await page.route("**/api/public-catalog*", () => new Promise(() => {}));
  // Real elapsed time preserves the relationship between the browser and the
  // server readAt clock; advancing only the browser clock falsifies freshness.
  await page.getByRole("heading", {level: 1, name: fixture.name, exact: true}).waitFor({state: "hidden", timeout: 35_000});
  assert.equal(await page.locator('script[type="application/ld+json"]').count(), 0);
  await page.unrouteAll({behavior: "ignoreErrors"});
  // The in-flight refresh has an eight-second deadline. Permit recovery on
  // focus after that deadline, without requiring a reload of the document.
  await new Promise(resolve => setTimeout(resolve, 8_100));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.getByRole("heading", {level: 1, name: fixture.name, exact: true}).waitFor();
  await browser.close(); browser = null;

  // 401 query rows must fail the whole-catalog routes unavailable, not return a
  // truncated successful catalog. An organizer page reads only its own events,
  // so rows for other organizers cannot take it down.
  const batch = db.batch();
  for (let index = 0; index < 401; index++) batch.set(db.doc(`events/next-bound-proof-${index}`), {publicationState: "published"});
  boundedFixtures = true; await batch.commit();
  for (const origin of origins) {
    await request(origin, "/api/public-catalog", 503);
    await request(origin, "/", 503);
    await request(origin, "/sitemap.xml", 503);
    await request(origin, "/organizers/next-proof/", 200);
    await request(origin, "/privacy/", 200);
  }
  const unavailable = await start(3120, false);
  for (const route of ["/", "/organizers/next-proof/", "/api/public-catalog", "/sitemap.xml"]) await request(unavailable, route, 503);
  await request(unavailable, "/host/", 200);
  await request(unavailable, "/privacy/", 200);
  const unapprovedProduction = await start(3121, true, true);
  // Authored routes make no Firestore read even if this guard regresses.
  await request(unapprovedProduction, "/privacy/", 503);
  await request(unapprovedProduction, "/host/", 503);
  const shell = await request(origins[0], "/rsvp/private-signed-sentinel/?token=private-query-sentinel", 200);
  assert(!shell.body.includes("private-signed-sentinel") && !shell.body.includes("private-query-sentinel"));
  const assets = [...shell.body.matchAll(/(?:src|href)="(\/_legacy\/assets\/[^"?]+)"/g)].map(match => match[1]);
  assert(assets.length > 0);
  for (const asset of assets) assert.equal((await fetch(origins[1] + asset)).status, 200);
  assert(!output.join("").includes(secret) && !output.join("").includes("private-signed-sentinel"));
  console.log(JSON.stringify({passed: true, checks, independentInstances: 2, outsideCheckout: true,
    browser: ["hung-refresh expiry", "structured data withdrawal", "focus recovery without reload"],
    lifecycle: ["edit", "draft", "suppression", "archive", "synthetic", "malformed nested data", "delete", "republish", "query bound", "upstream unavailable"]}, null, 2));
} finally {
  await browser?.close();
  await Promise.all(processes.map(async server => {
    if (server.exitCode !== null) return;
    const closed = once(server, "exit"); server.kill("SIGTERM"); await closed;
  }));
  if (boundedFixtures) {
    const batch = db.batch();
    for (let index = 0; index < 401; index++) batch.delete(db.doc(`events/next-bound-proof-${index}`));
    await batch.commit();
  }
  if (original.exists) await ref.set(original.data()); else await ref.delete();
  await db.terminate();
  await rm(temporary, {recursive: true, force: true});
}
