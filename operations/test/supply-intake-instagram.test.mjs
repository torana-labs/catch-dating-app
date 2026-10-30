import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {loadSupplyAcquisitionPolicy} from "../src/workflows/supply-intake/acquisition.mjs";
import {
  INSTAGRAM_DISCOVERY_ADAPTER_ID,
  InstagramDiscoveryPageSource,
  instagramUsername,
} from "../src/workflows/supply-intake/instagram-discovery.mjs";
import {buildIntakeListing, gatherIntakeEvidence} from "../src/workflows/supply-intake/intake-request.mjs";
import {StaticPageSource} from "../src/workflows/supply-intake/page-capture.mjs";
import {extractWithAdapters} from "../src/workflows/supply-intake/sources/index.mjs";
import {linksIn} from "../src/workflows/supply-intake/sources/instagram/extractor.mjs";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const PAGES = path.join(REPO_ROOT, "operations/src/workflows/supply-intake/fixtures/pages");
const NOW = "2026-10-24T08:00:00.000Z";
const clock = () => new Date(NOW);
const ACCOUNT_ID = "17841476918450741";

// The shape Meta documents for business_discovery with field expansion.
const discovered = {
  business_discovery: {
    username: "blrdroid",
    name: "BlrDroid",
    biography: "Bengaluru's Android community. Meetups every month: linktr.ee/blrdroid",
    website: "https://linktr.ee/blrdroid",
    media: {data: [
      {caption: "Next meetup is up! RSVP at lu.ma/1dfd73wq. See you there.", permalink: "https://www.instagram.com/p/A1/",
        timestamp: "2026-10-20T10:00:00+0000", id: "1"},
      {caption: "Thanks @someone for hosting! Photos: https://www.instagram.com/p/A0/", permalink: "https://www.instagram.com/p/A0/",
        timestamp: "2026-10-01T10:00:00+0000", id: "2"},
    ]},
    id: "17841400000000099",
  },
  id: ACCOUNT_ID,
};

function transportReturning(status, body, calls = []) {
  return async (url, init) => {
    calls.push({url: String(url), init});
    return {status, text: async () => JSON.stringify(body)};
  };
}

async function discoverySource({inner = null, transport, maxRequests} = {}) {
  const policy = await loadSupplyAcquisitionPolicy();
  return new InstagramDiscoveryPageSource({
    inner: inner ?? new StaticPageSource({pages: {}, policy, clock}),
    policy, accountId: ACCOUNT_ID, accessToken: "test-token", graphVersion: "v26.0",
    transport, clock, ...(maxRequests ? {maxRequests} : {}),
  });
}

test("only Instagram profile URLs name a username", () => {
  assert.equal(instagramUsername("https://www.instagram.com/BlrDroid/?igsh=1"), "blrdroid");
  assert.equal(instagramUsername("https://instagram.com/p/A1/"), null);
  assert.equal(instagramUsername("https://lu.ma/blrdroid"), null);
});

test("a profile is read through Business Discovery as Catch's account, with the token in a header", async () => {
  const calls = [];
  const source = await discoverySource({transport: transportReturning(200, discovered, calls)});
  const {snapshot, receipt} = await source.capture({runKey: "r|page-1", url: "https://www.instagram.com/blrdroid/"});
  assert.equal(calls.length, 1);
  const url = new URL(calls[0].url);
  assert.equal(`${url.origin}${url.pathname}`, `https://graph.facebook.com/v26.0/${ACCOUNT_ID}`);
  assert.match(url.searchParams.get("fields"), /^business_discovery\.username\(blrdroid\)\{username,name,biography,website,media\.limit\(12\)/u);
  assert.equal(url.searchParams.has("access_token"), false);
  assert.equal(calls[0].init.headers.Authorization, "Bearer test-token");
  assert.equal(receipt.adapterId, INSTAGRAM_DISCOVERY_ADAPTER_ID);
  assert.deepEqual([receipt.outcome, receipt.status, receipt.networkRequestsConsumed, receipt.requestedUrl],
    ["fetched", 200, 1, "https://www.instagram.com/blrdroid"]);
  assert.equal(receipt.snapshotHash, snapshot.contentHash);
  // Only the fields Catch asked for are kept.
  assert.equal(JSON.stringify(snapshot).includes("17841400000000099"), false);

  const extraction = extractWithAdapters({snapshot, observedAt: NOW});
  assert.equal(extraction.adapterId, "instagram");
  assert.equal(extraction.pageKind, "organizer_page");
  const [organizer] = extraction.organizers;
  assert.deepEqual([organizer.name, organizer.url, organizer.imageUrl], ["BlrDroid", "https://www.instagram.com/blrdroid", null]);
  assert.deepEqual(organizer.sameAs, ["https://linktr.ee/blrdroid"]);
  assert.deepEqual(extraction.relatedUrls, ["https://lu.ma/1dfd73wq"]);
});

test("accounts Business Discovery cannot read, a bad token and a spent allowance capture nothing", async () => {
  const notBusiness = await discoverySource({transport: transportReturning(400, {error: {code: 100, message: "x"}})});
  assert.equal((await notBusiness.capture({runKey: "a", url: "https://instagram.com/someone"})).receipt.outcome, "not_discoverable");
  const expired = await discoverySource({transport: transportReturning(400, {error: {code: 190, message: "x"}})});
  assert.equal((await expired.capture({runKey: "b", url: "https://instagram.com/someone"})).receipt.outcome, "provider_auth_error");
  const failing = await discoverySource({transport: async () => {
    throw new Error("network");
  }});
  assert.equal((await failing.capture({runKey: "c", url: "https://instagram.com/someone"})).receipt.outcome, "provider_error");
  // Another account's username in the response is not this profile.
  const mismatched = await discoverySource({transport: transportReturning(200, discovered)});
  const other = await mismatched.capture({runKey: "d", url: "https://instagram.com/someone"});
  assert.deepEqual([other.snapshot, other.receipt.outcome], [null, "provider_error"]);
  const calls = [];
  const limited = await discoverySource({transport: transportReturning(200, discovered, calls), maxRequests: 1});
  await limited.capture({runKey: "e", url: "https://instagram.com/blrdroid"});
  const spent = await limited.capture({runKey: "f", url: "https://instagram.com/blrdroid"});
  assert.deepEqual([spent.receipt.outcome, spent.receipt.networkRequestsConsumed, calls.length],
    ["discovery_limit_reached", 0, 1]);
});

test("other URLs go to the wrapped page source untouched", async () => {
  const policy = await loadSupplyAcquisitionPolicy();
  const html = fs.readFileSync(path.join(PAGES, "luma-event.html"), "utf8");
  const inner = new StaticPageSource({pages: {"https://luma.com/1dfd73wq": html}, policy, clock});
  const source = await discoverySource({inner, transport: async () => {
    throw new Error("must not be called");
  }});
  const {receipt} = await source.capture({runKey: "r", url: "https://luma.com/1dfd73wq"});
  assert.deepEqual([receipt.adapterId, receipt.outcome], ["static_page", "fetched"]);
});

test("a nominated Instagram profile yields its listing, and its caption's Luma link yields events", async () => {
  const policy = await loadSupplyAcquisitionPolicy();
  const inner = new StaticPageSource({pages: {
    "https://luma.com/1dfd73wq": fs.readFileSync(path.join(PAGES, "luma-event.html"), "utf8"),
    "https://luma.com/blrdroid": fs.readFileSync(path.join(PAGES, "luma-organizer.html"), "utf8"),
  }, policy, clock});
  const source = await discoverySource({inner, transport: transportReturning(200, discovered)});
  const request = {schemaVersion: 1, requestId: "msg-blrdroid-1", kind: "nomination", market: "bengaluru",
    seed: {name: null, urls: ["https://www.instagram.com/blrdroid"], notes: null, categories: []},
    submittedBy: {role: "associate", uid: "associate-1", partnerId: null}, submittedAt: NOW,
    origin: {kind: "message_nomination", id: "a".repeat(64)}};
  const gathered = await gatherIntakeEvidence({request, pageSource: source, now: NOW});
  assert.deepEqual(gathered.pages.map((page) => [page.url, page.via, page.adapterId]), [
    ["https://instagram.com/blrdroid", "seed", "instagram"],
    ["https://luma.com/1dfd73wq", "https://instagram.com/blrdroid", "luma"],
  ]);
  const listing = buildIntakeListing({request, gathered, now: NOW});
  assert.equal(listing.organizer.name, "BlrDroid");
  assert.ok(gathered.events.length > 0);
  assert.ok(listing.organizer.links.some((link) => link.url === "https://instagram.com/blrdroid"),
    JSON.stringify(listing.organizer.links));
});

test("links are read from bios and captions in order, schemes optional, Instagram's own pages left out", () => {
  assert.deepEqual(linksIn([
    "Tickets: lu.ma/afterfly, more at https://afterfly.in/events.",
    "see www.district.in/events/x and https://instagram.com/p/x and lu.ma/afterfly",
    null,
  ]), ["https://lu.ma/afterfly", "https://afterfly.in/events", "https://www.district.in/events/x"]);
});
