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

test("live page fetching stays off until policy, an accepted decision and ledgers allow it", async () => {
  const policy = await loadSupplyAcquisitionPolicy();
  assert.equal(policy.pageFetch.enabled, false);
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
