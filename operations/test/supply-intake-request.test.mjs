import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {BudgetLedger} from "../src/platform/budget.mjs";
import {OperationsEngine} from "../src/platform/engine.mjs";
import {buildAdminProjection, validateCanonicalProjection} from "../src/platform/read-models.mjs";
import {FileOperationsStore} from "../src/platform/storage/file-store.mjs";
import {loadSupplyAcquisitionPolicy} from "../src/workflows/supply-intake/acquisition.mjs";
import {
  assertSupplyIntakeRequest,
  buildIntakeListing,
  gatherIntakeEvidence,
  intakeInputSnapshot,
} from "../src/workflows/supply-intake/intake-request.mjs";
import {
  GuardedPageFetchPort,
  StaticPageSource,
  pageFetchBudgetLedgers,
} from "../src/workflows/supply-intake/page-capture.mjs";
import {SupplyIntakeWorkflow} from "../src/workflows/supply-intake/workflow.mjs";
import {temporaryDirectory} from "./helpers.mjs";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const PAGES = path.join(REPO_ROOT, "operations/src/workflows/supply-intake/fixtures/pages");
const NOW = "2026-10-24T08:00:00.000Z";
const clock = () => new Date(NOW);
const page = (name) => fs.readFileSync(path.join(PAGES, `${name}.html`), "utf8");

function request(overrides = {}) {
  return {
    schemaVersion: 1,
    requestId: "nom-blrdroid-1",
    kind: "nomination",
    market: "bengaluru",
    seed: {name: "BlrDroid", urls: ["https://lu.ma/1dfd73wq?utm_source=wa"], notes: null, categories: ["tech_meetup"]},
    submittedBy: {role: "associate", uid: "associate-1", partnerId: null},
    submittedAt: NOW,
    origin: null,
    ...overrides,
  };
}

async function staticSource(pages) {
  return new StaticPageSource({pages, policy: await loadSupplyAcquisitionPolicy(), clock});
}

test("intake requests follow their contract for every front door", () => {
  assert.equal(assertSupplyIntakeRequest(request()).requestId, "nom-blrdroid-1");
  assertSupplyIntakeRequest(request({kind: "self_submission",
    submittedBy: {role: "organizer", uid: "host-1", partnerId: null}}));
  assertSupplyIntakeRequest(request({kind: "discovery", seed: {name: "Some Crew", urls: [], notes: null, categories: []},
    submittedBy: {role: "system", uid: null, partnerId: null}}));
  assertSupplyIntakeRequest(request({submittedBy: {role: "partner", uid: "partner-user", partnerId: "partner-9"}}));
  for (const [label, value] of [
    ["no name and no URL", request({seed: {name: null, urls: [], notes: null, categories: []}})],
    ["a partner without a partner id", request({submittedBy: {role: "partner", uid: "u", partnerId: null}})],
    ["an associate with a partner id", request({submittedBy: {role: "associate", uid: "u", partnerId: "p"}})],
    ["a nomination by the system", request({submittedBy: {role: "system", uid: null, partnerId: null}})],
    ["discovery by a person", request({kind: "discovery"})],
    ["a non-web URL", request({seed: {name: "x", urls: ["javascript:alert(1)"], notes: null, categories: []}})],
    ["too many URLs", request({seed: {name: "x", urls: Array.from({length: 11}, (_, i) => `https://e.org/${i}`),
      notes: null, categories: []}})],
  ]) {
    assert.throws(() => assertSupplyIntakeRequest(value), {code: "INVALID_INTAKE_REQUEST"}, label);
  }
});

test("a nominated event page yields the organizer's calendar, listing fields with sources, and its events", async () => {
  const source = await staticSource({
    "https://luma.com/1dfd73wq": page("luma-event"),
    "https://luma.com/blrdroid": page("luma-organizer"),
  });
  const gathered = await gatherIntakeEvidence({request: request(), pageSource: source, now: NOW});
  assert.deepEqual(gathered.pages.map((entry) => [entry.url, entry.via, entry.pageKind]), [
    ["https://luma.com/1dfd73wq", "seed", "event_page"],
    ["https://luma.com/blrdroid", "https://luma.com/1dfd73wq", "organizer_page"],
  ]);
  assert.equal(gathered.pages[1].normalizedKey, "luma:calendar:blrdroid");

  const listing = buildIntakeListing({request: request(), gathered, now: NOW});
  assert.equal(listing.organizer.name, "BlrDroid Community");
  assert.match(listing.organizer.description, /android developers/u);
  assert.equal(listing.organizer.locality, "Bengaluru");
  assert.deepEqual(listing.organizer.links.map((link) => [link.normalizedKey, link.surfaceKind]),
    [["luma:calendar:blrdroid", "eventCalendar"]]);
  assert.deepEqual(listing.organizer.identityKeys, ["luma:calendar:blrdroid"]);
  assert.deepEqual(listing.fieldEvidence.map((entry) => [entry.field, entry.sourceUrl, entry.method]), [
    ["name", "https://luma.com/blrdroid", "adapter"],
    ["description", "https://luma.com/blrdroid", "adapter"],
    ["imageUrl", "https://luma.com/blrdroid", "adapter"],
    ["locality", "https://luma.com/blrdroid", "adapter"],
  ]);
  // The event is on both pages; it is listed once, upcoming as of NOW.
  assert.deepEqual(listing.events.map((event) => event.eventKey), ["luma:1dfd73wq"]);
  assert.deepEqual(listing.gaps, ["name_differs_from_nomination"]);
  assert.equal(listing.researchNeeded, false);
  assert.match(listing.contentHash, /^[0-9a-f]{64}$/u);
  assert.equal(JSON.stringify(listing).includes("<html"), false, "no raw HTML reaches the listing");
});

test("unreadable seeds, missing pages and template drift become gaps for research, not errors", async () => {
  const source = await staticSource({"https://urbanaut.app/spot/ballard-estate-photowalk": "<html><title>x</title></html>"});
  const nominated = request({requestId: "nom-gaps", seed: {name: "Photowalks", notes: null, categories: [],
    urls: ["https://urbanaut.app/spot/ballard-estate-photowalk", "https://district.in/events/missing"]}});
  const gathered = await gatherIntakeEvidence({request: nominated, pageSource: source, now: NOW});
  assert.deepEqual(gathered.pages.map((entry) => [entry.platform, entry.abstainReason]),
    [["urbanaut", "template_drift"], ["district", "not_captured"]]);
  const listing = buildIntakeListing({request: nominated, gathered, now: NOW});
  assert.equal(listing.organizer.name, "Photowalks", "the nominator's name is the fallback");
  assert.deepEqual(listing.fieldEvidence, [{field: "name", sourceUrl: null, method: "nominator", adapterId: null}]);
  assert.deepEqual(listing.gaps, ["description_missing", "image_missing", "no_upcoming_events",
    "organizer_page_missing", "seed_page_unreadable"]);
  assert.equal(listing.researchNeeded, true);
});

test("District sessions and an Urbanaut host page become one listing per request", async () => {
  const urbanaut = await gatherIntakeEvidence({
    request: request({requestId: "nom-urbanaut", market: "mumbai",
      seed: {name: null, urls: ["https://urbanaut.app/spot/ballard-estate-photowalk"], notes: null, categories: []}}),
    pageSource: await staticSource({"https://urbanaut.app/spot/ballard-estate-photowalk": page("urbanaut-spot")}),
    now: NOW,
  });
  assert.deepEqual(urbanaut.pages.map((entry) => entry.url),
    ["https://urbanaut.app/spot/ballard-estate-photowalk", "https://urbanaut.app/mayanksoni"]);
  const listing = buildIntakeListing({request: request({requestId: "nom-urbanaut", market: "mumbai",
    seed: {name: null, urls: ["https://urbanaut.app/spot/ballard-estate-photowalk"], notes: null, categories: []}}),
  gathered: urbanaut, now: NOW});
  assert.equal(listing.organizer.name, "Mayank Soni");
  assert.ok(listing.organizer.identityKeys.includes("urbanaut:profile:mayanksoni"));
  assert.equal(listing.events.length, 1);
  assert.ok(listing.gaps.includes("seed_page_unreadable") === false);

  const district = await gatherIntakeEvidence({
    request: request({requestId: "nom-district", market: "delhi-ncr",
      seed: {name: "Noida Comedy Bar", urls: ["https://www.district.in/events/noida-comedy-bar-jan7-2026-buy-tickets"],
        notes: null, categories: ["comedy"]}}),
    pageSource: await staticSource({
      "https://district.in/events/noida-comedy-bar-jan7-2026-buy-tickets": page("district-event")}),
    now: NOW,
  });
  const districtListing = buildIntakeListing({request: request({requestId: "nom-district", market: "delhi-ncr",
    seed: {name: "Noida Comedy Bar", urls: ["https://www.district.in/events/noida-comedy-bar-jan7-2026-buy-tickets"],
      notes: null, categories: ["comedy"]}}), gathered: district, now: "2026-10-24T16:15:00.000Z"});
  assert.equal(districtListing.events.length, 2, "the session that already ended is not upcoming");
  assert.equal(districtListing.pastEventCount, 1);
  assert.equal(districtListing.organizer.name, "TRIBAL SIERRA CAFE LLP");
  assert.ok(districtListing.gaps.includes("name_differs_from_nomination"));
});

test("listings run through the workflow as review-only work items that satisfy the contracts", async () => {
  const source = await staticSource({
    "https://luma.com/1dfd73wq": page("luma-event"),
    "https://luma.com/blrdroid": page("luma-organizer"),
  });
  const gathered = await gatherIntakeEvidence({request: request(), pageSource: source, now: NOW});
  const listing = buildIntakeListing({request: request(), gathered, now: NOW});
  const inputSnapshot = intakeInputSnapshot({listing});
  assert.equal(inputSnapshot.intakeListings.length, 1);

  const workflow = new SupplyIntakeWorkflow({inputSnapshotLoader: async () => inputSnapshot});
  const plan = await workflow.createPlan({market: "bengaluru", through: "2026-12-31", now: NOW});
  assert.equal(plan.inputSummary.intakeListings, 1);
  assert.equal(plan.inputSummary.intakeListingEvents, 1);
  assert.equal(plan.capabilities.publicWrites, false);
  const store = await new FileOperationsStore(await temporaryDirectory("catch-ops-intake-")).initialize();
  const engine = new OperationsEngine({store, workflow, clock, workerId: "intake-test"});
  const {run} = await engine.start(plan);
  assert.equal(run.status, "completed");
  const items = await store.listWorkItems({runId: run.runId});
  const listingItem = items.find((item) => item.adminProjection?.recordType === "organizer_listing_draft");
  const eventItem = items.find((item) => item.adminProjection?.recordType === "listing_event_candidate");
  assert.equal(listingItem.primaryStage, "verify");
  assert.equal(listingItem.owner, "human");
  assert.ok(listingItem.taskFlags.includes("listing_review"));
  assert.ok(listingItem.taskFlags.includes("identity_review"));
  assert.equal(eventItem.primaryStage, "verify");
  assert.equal(eventItem.adminProjection.event.listingWorkItemId, listingItem.workItemId);
  assert.ok(eventItem.taskFlags.includes("awaits_listing_approval"));
  const eligibility = await workflow.promotionEligibility(eventItem, {run});
  assert.ok(eligibility.blockers.includes("organizer_listing_pending"));

  const projection = buildAdminProjection(await store.requireRun(run.runId), items,
    await store.listActions(run.runId), await store.listCheckpoints(run.runId));
  const canonicalListing = projection.items.find((item) => item.workItemId === listingItem.workItemId);
  assert.deepEqual(canonicalListing.fieldProvenance
    .filter((entry) => entry.field.startsWith("intake.listing."))
    .map((entry) => [entry.field, entry.locator, entry.extractedBy, entry.extractorVersion]), [
    ["intake.listing.organizer.name", "https://luma.com/blrdroid", "deterministic", "luma"],
    ["intake.listing.organizer.description", "https://luma.com/blrdroid", "deterministic", "luma"],
    ["intake.listing.organizer.imageUrl", "https://luma.com/blrdroid", "deterministic", "luma"],
    ["intake.listing.organizer.locality", "https://luma.com/blrdroid", "deterministic", "luma"],
  ]);
  await validateCanonicalProjection({repoRoot: REPO_ROOT, projection, requireContracts: true});
  const tampered = structuredClone(projection);
  tampered.items.find((item) => item.workItemId === listingItem.workItemId)
    .normalizedPayload.intake.listing.organizer.links[0].url = "";
  await assert.rejects(validateCanonicalProjection({repoRoot: REPO_ROOT, projection: tampered, requireContracts: true}),
    {code: "CANONICAL_PROJECTION_INVALID"});
});

test("a listing that duplicates a listed organizer is flagged for the reviewer, never blocked", async () => {
  const source = await staticSource({
    "https://luma.com/1dfd73wq": page("luma-event"),
    "https://luma.com/blrdroid": page("luma-organizer"),
  });
  const gathered = await gatherIntakeEvidence({request: request(), pageSource: source, now: NOW});
  const unchecked = buildIntakeListing({request: request(), gathered, now: NOW});
  assert.equal("duplicateCheck" in unchecked, false, "no inventory, no check");

  const fresh = buildIntakeListing({request: request(), gathered, now: NOW,
    existingOrganizers: [{organizerId: "org-other", name: "Pune Photowalks", markets: ["pune"]}]});
  assert.equal(fresh.duplicateCheck.verdict, "none");
  assert.equal(fresh.gaps.includes("possible_duplicate_organizer"), false);

  const listing = buildIntakeListing({request: request(), gathered, now: NOW, existingOrganizers: [
    {organizerId: "org-blrdroid", name: "BLR Droid", markets: ["bengaluru"], links: ["https://lu.ma/calendar/blrdroid"]},
    {organizerId: "org-other", name: "Pune Photowalks", markets: ["pune"]},
  ]});
  assert.equal(listing.duplicateCheck.verdict, "match");
  assert.equal(listing.duplicateCheck.authority, "advisory");
  assert.deepEqual(listing.duplicateCheck.candidates.map((candidate) => candidate.organizerId), ["org-blrdroid"]);
  assert.ok(listing.duplicateCheck.candidates[0].signals.includes("shared_identity_key"));
  assert.ok(listing.gaps.includes("possible_duplicate_organizer"));
  assert.equal(listing.researchNeeded, false, "research cannot close a duplicate question");
  assert.notEqual(listing.contentHash, unchecked.contentHash);

  const workflow = new SupplyIntakeWorkflow({inputSnapshotLoader: async () => intakeInputSnapshot({listing})});
  const plan = await workflow.createPlan({market: "bengaluru", through: "2026-12-31", now: NOW});
  const store = await new FileOperationsStore(await temporaryDirectory("catch-ops-dedupe-")).initialize();
  const {run} = await new OperationsEngine({store, workflow, clock, workerId: "dedupe-test"}).start(plan);
  const items = await store.listWorkItems({runId: run.runId});
  const listingItem = items.find((item) => item.adminProjection?.recordType === "organizer_listing_draft");
  assert.equal(listingItem.primaryStage, "verify");
  assert.deepEqual(listingItem.blockers, []);
  assert.ok(listingItem.taskFlags.includes("possible_duplicate"));
  assert.ok(listingItem.adminProjection.listing.gaps.includes("possible_duplicate_organizer"));
  const projection = buildAdminProjection(await store.requireRun(run.runId), items,
    await store.listActions(run.runId), await store.listCheckpoints(run.runId));
  await validateCanonicalProjection({repoRoot: REPO_ROOT, projection, requireContracts: true});
});

test("live page fetching stays off until policy, an accepted decision and ledgers allow it", async () => {
  // The shipped policy cites the owner's accepted decision (CAT-266) within caps.
  const shipped = await loadSupplyAcquisitionPolicy();
  assert.deepEqual([shipped.pageFetch.enabled, shipped.pageFetch.adapterId, shipped.pageFetch.decisionId],
    [true, "page_fetch", "policy-on-demand-page-fetch-policy"]);
  assert.ok(shipped.pageFetch.maxRequestsPerIntake > 0 && shipped.pageFetch.maxRequestsPerIntake <= 12);
  assert.ok(shipped.pageFetch.maxRequestsPerMonth > 0 && shipped.pageFetch.maxRequestsPerMonth <= 600);
  assert.throws(() => new GuardedPageFetchPort({policy: shipped, policyDecision: null,
    budgets: pageFetchBudgetLedgers({policy: shipped, monthKey: "2026-10"})}),
  {code: "ACQUISITION_POLICY_DECISION_REQUIRED"});

  const policy = structuredClone(shipped);
  Object.assign(policy.pageFetch, {enabled: false, adapterId: null, decisionId: null,
    maxRequestsPerIntake: 0, maxRequestsPerMonth: 0});
  assert.throws(() => new GuardedPageFetchPort({policy}), {code: "ACQUISITION_PROVIDER_DISABLED"});

  const enabled = structuredClone(policy);
  Object.assign(enabled.pageFetch, {enabled: true, adapterId: "page_fetch", decisionId: "decision-pages-1",
    maxRequestsPerIntake: 3, maxRequestsPerMonth: 10});
  const decision = {schemaVersion: 1, decisionId: "decision-pages-1", gapId: "on_demand_page_fetch_policy",
    decision: "accept", decisionStatus: "accepted", requiredInputsReviewed: ["robots"],
    checklist: {requiredInputsReviewed: true, costAndSafetyReviewed: true, implementationOwnerReviewed: true,
      behaviorStillDisabledAcknowledged: true},
    operationalState: "blocked_until_policy_encoded"};
  const budgets = pageFetchBudgetLedgers({policy: enabled, monthKey: "2026-10"});
  assert.throws(() => new GuardedPageFetchPort({policy: enabled, policyDecision: {...decision, decision: "hold"},
    budgets}), {code: "ACQUISITION_POLICY_DECISION_REQUIRED"});
  assert.throws(() => new GuardedPageFetchPort({policy: enabled, policyDecision: decision,
    budgets: {...budgets, intake: new BudgetLedger({limits: {networkRequests: 99}})}}),
  {code: "ACQUISITION_BUDGET_MISMATCH"});

  const transport = async ({url}) => url.pathname === "/robots.txt" ?
    {status: 404, location: null, contentType: "text/plain", body: Buffer.alloc(0)} :
    {status: 200, location: null, contentType: "text/html", body: Buffer.from(page("luma-event"))};
  const port = new GuardedPageFetchPort({policy: enabled, policyDecision: decision, budgets, transport, clock});
  const first = await port.capture({runKey: "nom-1|page-1", url: "https://luma.com/1dfd73wq"});
  assert.equal(first.receipt.outcome, "fetched");
  assert.equal(first.receipt.networkRequestsConsumed, 2, "robots.txt counts against the budget");
  assert.equal(first.receipt.policyDecisionId, "decision-pages-1");
  assert.equal(first.receipt.firestorePersistenceAllowed, false);
  assert.equal(first.snapshot.contentHash, first.receipt.snapshotHash);
  assert.equal("html" in first.snapshot, false);
  // Robots is cached for the origin, so the next page costs one request; the
  // one after that would exceed the per-intake cap of three.
  await port.capture({runKey: "nom-1|page-2", url: "https://luma.com/blrdroid"});
  await assert.rejects(port.capture({runKey: "nom-1|page-3", url: "https://luma.com/other"}),
    {code: "BUDGET_EXCEEDED"});
  assert.equal(budgets.month.snapshot().consumed.networkRequests, 3);

  // Gathering turns the refusal into a recorded gap and keeps what it read.
  const gathered = await gatherIntakeEvidence({
    request: request({requestId: "nom-budget", seed: {name: "BlrDroid", notes: null, categories: [],
      urls: ["https://luma.com/1dfd73wq"]}}),
    pageSource: port,
    now: NOW,
  });
  assert.equal(gathered.stoppedReason, "fetch_budget_exhausted");
});

test("events without a start time are not listed, and listed events sort by instant", async () => {
  const gathered = {
    requestId: "nom-order", observedAt: NOW, invalidUrls: [], stoppedReason: null, organizers: [],
    pages: [{url: "https://luma.com/x", via: "seed", platform: "luma", outcome: "fetched",
      receipt: {outcome: "fetched", snapshotHash: null, capturedAt: NOW}, pageKind: "event_page",
      adapterId: "luma", abstainReason: null}],
    events: [
      {platform: "luma", sourceEntityId: "late", title: "Late", startAt: "2026-11-01T10:00:00.000Z",
        pageUrl: "https://luma.com/x", adapterId: "luma"},
      // 09:00 in India is 03:30 UTC, earlier than "Late" despite sorting after it as text.
      {platform: "luma", sourceEntityId: "early", title: "Early", startAt: "2026-11-01T09:00:00.000+05:30",
        pageUrl: "https://luma.com/x", adapterId: "luma"},
      {platform: "luma", sourceEntityId: "undated", title: "Undated", startAt: null,
        endAt: "2026-11-02T10:00:00.000Z", pageUrl: "https://luma.com/x", adapterId: "luma"},
    ],
  };
  const listing = buildIntakeListing({request: request({requestId: "nom-order"}), gathered, now: NOW});
  assert.deepEqual(listing.events.map((event) => event.sourceEntityId), ["early", "late"]);
});

test("an Instagram-only nomination searches the handle once and reads only calendars that name it", async () => {
  const pages = {"https://luma.com/blrdroid": page("luma-organizer")};
  const nominated = (handle) => request({requestId: `nom-ig-${handle}`, seed: {name: null, notes: null, categories: [],
    urls: [`https://www.instagram.com/${handle}/`]}});
  const searches = [];
  const linkSearch = {search: async (input) => {
    searches.push(input);
    return [{url: "https://lu.ma/blrdroid"}, {url: "https://www.instagram.com/blrdroid/"}, {url: "https://example.org/x"}];
  }};

  const gathered = await gatherIntakeEvidence({request: nominated("blrdroid"), pageSource: await staticSource(pages),
    now: NOW, linkSearch});
  assert.deepEqual(searches, [{runKey: "nom-ig-blrdroid|search-1", query: "\"blrdroid\""}]);
  assert.deepEqual(gathered.search, {query: "\"blrdroid\"", outcome: "searched", resultCount: 3,
    candidateUrls: ["https://lu.ma/blrdroid"]});
  assert.deepEqual(gathered.pages.map((entry) => [entry.via, entry.platform, entry.abstainReason]),
    [["seed", "instagram", "not_captured"], ["search", "luma", null]]);
  assert.ok(gathered.events.length > 0, "the calendar's events come with it");
  const listing = buildIntakeListing({request: nominated("blrdroid"), gathered, now: NOW});
  assert.ok(listing.gaps.includes("found_by_search") && listing.gaps.includes("seed_page_unreadable"));
  assert.equal(listing.researchNeeded, true, "a person checks what search found");

  // A namesake calendar that never names the handle is read but not used.
  const other = await gatherIntakeEvidence({request: nominated("someone.else"), pageSource: await staticSource(pages),
    now: NOW, linkSearch});
  assert.deepEqual(other.pages.map((entry) => [entry.via, entry.abstainReason]),
    [["seed", "not_captured"], ["search", "search_result_unconfirmed"]]);
  assert.deepEqual([other.organizers.length, other.events.length], [0, 0]);
  const otherListing = buildIntakeListing({request: nominated("someone.else"), gathered: other, now: NOW});
  assert.equal(otherListing.organizer.links.some((link) => link.platform === "luma"), false);
  assert.equal(otherListing.gaps.includes("found_by_search"), false);
});

test("a nominated Instagram account stays a listing link though nothing can read it", async () => {
  const nominated = request({requestId: "nom-ig-personal", seed: {name: null, notes: null, categories: [],
    urls: ["https://instagram.com/suvratgarg?igsh=abc", "https://district.in/events/missing"]}});
  const gathered = await gatherIntakeEvidence({request: nominated, pageSource: await staticSource({}), now: NOW});
  const listing = buildIntakeListing({request: nominated, gathered, now: NOW});
  assert.deepEqual(listing.organizer.links.map((link) => [link.platform, link.surfaceKind, link.url]),
    [["instagram", "socialProfile", "https://instagram.com/suvratgarg"]],
    "the claim check and the duplicate check both need the account; an unread event page is still not a link");
  assert.ok(listing.organizer.identityKeys.includes("instagram:suvratgarg"));
  assert.ok(listing.gaps.includes("seed_page_unreadable"));
});

test("handle search stays out of the way when a seed reads, when it is off, and when its budget is spent", async () => {
  let calls = 0;
  const counting = {search: async () => {
    calls += 1;
    return [];
  }};
  const luma = request({seed: {name: null, notes: null, categories: [],
    urls: ["https://lu.ma/blrdroid", "https://instagram.com/blrdroid"]}});
  const read = await gatherIntakeEvidence({request: luma, now: NOW, linkSearch: counting,
    pageSource: await staticSource({"https://luma.com/blrdroid": page("luma-organizer")})});
  assert.deepEqual([calls, read.search], [0, null]);

  const instagramOnly = request({seed: {name: null, notes: null, categories: [], urls: ["https://instagram.com/blrdroid"]}});
  const off = await gatherIntakeEvidence({request: instagramOnly, now: NOW, pageSource: await staticSource({}),
    linkSearch: {search: async () => null}});
  assert.equal(off.search, null);
  const spent = await gatherIntakeEvidence({request: instagramOnly, now: NOW, pageSource: await staticSource({}),
    linkSearch: {search: async () => {
      throw Object.assign(new Error("over"), {code: "BUDGET_EXCEEDED"});
    }}});
  assert.equal(spent.search.outcome, "budget_exhausted");
  assert.equal(spent.stoppedReason, null, "a spent search budget is not a gathering failure");
  const linktree = await gatherIntakeEvidence({request: request({seed: {name: null, notes: null, categories: [],
    urls: ["https://linktr.ee/blrdroid"]}}), now: NOW, pageSource: await staticSource({}), linkSearch: counting});
  assert.equal(linktree.search.query, "\"blrdroid\"", "Linktree and Beacons handles are searched too");
});
