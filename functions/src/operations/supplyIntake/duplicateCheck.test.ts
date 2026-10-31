/* eslint-disable max-len */
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import path from "node:path";
import test from "node:test";
import type {Firestore} from "firebase-admin/firestore";
import type {OperationRun, OperationWorkItem} from "../models";
import type {ProjectionImportWriter} from "../projectionImporter";
import {FakeFirestore} from "../testFirestore";
import {acceptPageFetch, notFoundTransport} from "./testPageFetch";
import {loadOrganizerInventory, ORGANIZER_INVENTORY_FIELDS, ORGANIZER_INVENTORY_LIMIT} from "./organizerInventory";
import {packagedIntake, runSupplyIntake, type SupplyIntakeRequest} from "./runtime";
import {processSupplyIntakeRequest, supplyIntakeCollections} from "./worker";
import {contractValidator} from "../../shared/contractTestValidators";

const validateSupplyIntakeRequestsDocument =
  contractValidator("SupplyIntakeRequestsDocument");

// The build post-step copies the Operations runtime into lib; tests use it.
execFileSync(process.execPath, [path.join(__dirname, "../../../scripts/copy-operations-runtime.cjs")]);

const NOW = "2026-10-24T08:00:00.000Z";
const REQUEST_PATH = `${supplyIntakeCollections.requests}/nom-afterfly-1`;

interface StoredResult {
  gaps: string[];
  researchNeeded: boolean;
  listingContentHash: string;
  listingWorkItemId: string;
  duplicateCheck: null | {
    verdict: string;
    organizersCompared: number;
    inventory: {citySlug: string | null; limit: number; truncated: boolean};
    candidates: Array<{organizerId: string; name: string | null; band: string; score: number; rationale: string}>;
  };
}

class MemoryWriter implements ProjectionImportWriter {
  readonly runs = new Map<string, OperationRun>();
  readonly items = new Map<string, OperationWorkItem>();
  async getRun(runId: string) {
    return this.runs.get(runId) ?? null;
  }
  async getWorkItems(ids: string[]) {
    return new Map(ids.flatMap((id) => this.items.has(id) ? [[id, this.items.get(id)!] as const] : []));
  }
  async createWorkItems(items: OperationWorkItem[]) {
    for (const item of items) this.items.set(item.workItemId, item);
  }
  async createRun(run: OperationRun) {
    this.runs.set(run.runId, run);
  }
}

function request(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1, requestId: "nom-afterfly-1", kind: "nomination", market: "mumbai",
    seed: {name: "Afterfly", urls: ["https://lu.ma/afterfly"], notes: null, categories: ["social"]},
    submittedBy: {role: "associate", uid: "associate-1", partnerId: null}, submittedAt: NOW, origin: null, ...overrides,
  };
}

/** An organizer document with the identity fields and the private ones the read must not return. */
function organizer(name: string, {citySlug = "mumbai", publishStatus = "published", slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  hrefs = [] as string[], instagramHandle = null as string | null, extra = {} as Record<string, unknown>} = {}) {
  return {
    ...extra,
    name, instagramHandle, phoneNumber: "+910000000000", email: "owner@example.com", hostUserIds: ["host-1"],
    claim: {state: "unclaimed", claimHref: null, lastClaimRequestId: null},
    publicPage: {slug, citySlug, canonicalPath: `/organizers/${slug}/`, publishStatus, indexStatus: "noindex",
      robots: "noindex, follow", seoTitle: null, seoDescription: null, lastRenderedAt: null},
    publicSources: hrefs.map((href) => ({type: "website", label: "Link", detail: "Listed link", href,
      confidence: "high", lastCheckedAt: null})),
  };
}

// The nominated page is missing, so every listing forms from the nomination
// alone, as an unreadable seed page does in production.
function setup(stored: Record<string, unknown> = {}) {
  const db = new FakeFirestore();
  acceptPageFetch(db);
  db.write(REQUEST_PATH, {schemaVersion: 1, requestId: "nom-afterfly-1", request: request(), status: "queued", attempts: 0,
    leaseUntil: null, result: null, failure: null, approval: null, createdAt: NOW, updatedAt: NOW, ...stored});
  const writer = new MemoryWriter();
  const deps = {db: db as unknown as Firestore, now: () => new Date(NOW), projectionWriter: writer,
    transport: notFoundTransport, putSnapshot: async () => "supply-intake/snapshots/x.json"};
  const run = async () => {
    const outcome = await processSupplyIntakeRequest(deps, "nom-afterfly-1");
    const document = db.read(REQUEST_PATH) as {result: StoredResult; failure: unknown};
    assert.equal(outcome, "completed", JSON.stringify(document.failure));
    assert.equal(validateSupplyIntakeRequestsDocument(document), true,
      JSON.stringify(validateSupplyIntakeRequestsDocument.errors));
    const item = writer.items.get(document.result.listingWorkItemId)!;
    const listing = (item.normalizedPayload as {intake: {listing: {gaps: string[]; contentHash: string}}}).intake.listing;
    return {result: document.result, listing};
  };
  return {db, run};
}

test("a nominated organizer Catch already lists is flagged for the reviewer", async () => {
  const {db, run} = setup();
  db.write("organizers/org-afterfly", organizer("Afterfly", {hrefs: ["https://lu.ma/afterfly"]}));
  db.write("organizers/org-sketch", organizer("Sunday Sketchers"));
  const {result, listing} = await run();
  assert.ok(result.gaps.includes("possible_duplicate_organizer"));
  assert.ok(listing.gaps.includes("possible_duplicate_organizer"), "the listing the reviewer approves carries the gap");
  assert.equal(result.listingContentHash, listing.contentHash);
  const check = result.duplicateCheck!;
  assert.equal(check.verdict, "match");
  assert.equal(check.organizersCompared, 2);
  assert.deepEqual(check.inventory, {citySlug: null, limit: ORGANIZER_INVENTORY_LIMIT, truncated: false});
  assert.equal(check.candidates[0].organizerId, "org-afterfly");
  assert.equal(check.candidates[0].name, "Afterfly");
  assert.equal(check.candidates[0].band, "match");
  assert.match(check.candidates[0].rationale, /likely the same organizer/);
  assert.ok(check.candidates.every((candidate) => candidate.organizerId !== "org-sketch"));
});

test("a new organizer is compared but not flagged", async () => {
  const {db, run} = setup();
  db.write("organizers/org-sketch", organizer("Sunday Sketchers"));
  db.write("organizers/org-photo", organizer("Pune Photowalks"));
  const {result} = await run();
  assert.ok(!result.gaps.includes("possible_duplicate_organizer"));
  assert.equal(result.duplicateCheck?.verdict, "none");
  assert.equal(result.duplicateCheck?.organizersCompared, 2);
});

test("a nominated organizer still in QA, under another name for its city, is flagged", async () => {
  // Bhag Club in prod: a QA page in "delhi", a record in "in-dl-delhi-ncr" and
  // a nomination filed under "delhi-ncr" are all the same city.
  const {db, run} = setup({request: request({market: "delhi-ncr"})});
  db.write("organizers/org-afterfly-qa", organizer("Afterfly", {citySlug: "delhi", publishStatus: "qa",
    hrefs: ["https://lu.ma/afterfly"], extra: {location: "in-dl-delhi-ncr"}}));
  const {result} = await run();
  const check = result.duplicateCheck!;
  assert.equal(check.verdict, "match");
  assert.equal(check.candidates[0].organizerId, "org-afterfly-qa");
  const candidate = check.candidates[0] as unknown as {signals: string[]; conflicts: string[]};
  assert.ok(candidate.signals.includes("same_market"), candidate.signals.join(","));
  assert.ok(!candidate.conflicts.includes("different_market"), candidate.conflicts.join(","));
});

test("every organizer Catch keeps is compared, in every city, from a bounded projected read", async () => {
  const db = new FakeFirestore();
  for (let index = 0; index < 4; index += 1) db.write(`organizers/org-mumbai-${index}`, organizer(`Mumbai Club ${index}`));
  db.write("organizers/org-pune", organizer("Afterfly", {citySlug: "pune"}));
  db.write("organizers/org-draft", organizer("Afterfly", {publishStatus: "draft"}));
  db.write("organizers/org-app", {name: "Saket Run Club", instagramHandle: "Saketruns", location: "in-mp-indore",
    phoneNumber: "+910000000000", ownerUserId: "owner-1"});
  db.write("organizers/org-retired", organizer("Afterfly", {extra: {archived: true}}));
  db.write("organizers/org-retired-status", organizer("Afterfly", {extra: {status: "archived"}}));
  const calls: unknown[][] = [];
  const recording = (target: object): object => new Proxy(target, {
    get(object, property) {
      const value = Reflect.get(object, property);
      if (typeof value !== "function" || property === "get") return typeof value === "function" ? value.bind(object) : value;
      return (...args: unknown[]) => {
        calls.push([property, ...args]);
        return recording(value.apply(object, args));
      };
    },
  });
  const read: Array<Record<string, unknown>> = [];
  const runtime = await packagedIntake();
  const inventory = await loadOrganizerInventory(recording(db) as unknown as Firestore, request() as SupplyIntakeRequest,
    (organizerId, document) => {
      read.push(document as Record<string, unknown>);
      return runtime.organizerReferenceFromDocument(organizerId, document);
    });
  assert.deepEqual(calls, [
    ["collection", "organizers"],
    ["select", ...ORGANIZER_INVENTORY_FIELDS],
    ["limit", ORGANIZER_INVENTORY_LIMIT + 1],
  ]);
  assert.deepEqual(inventory?.organizers.map((entry) => entry.organizerId),
    ["org-app", "org-draft", "org-mumbai-0", "org-mumbai-1", "org-mumbai-2", "org-mumbai-3", "org-pune"]);
  assert.deepEqual([inventory?.citySlug, inventory?.truncated], [null, false]);
  const markets = Object.fromEntries((inventory?.organizers ?? []).map((entry) => [entry.organizerId, entry.markets]));
  assert.deepEqual([markets["org-app"], markets["org-mumbai-0"], markets["org-pune"]], [["indore"], ["mumbai"], ["pune"]]);
  // Contact, ownership and claim fields never leave Firestore.
  for (const document of read) {
    assert.ok(Object.keys(document).every((key) => (ORGANIZER_INVENTORY_FIELDS as readonly string[])
      .some((field) => field === key || field.startsWith(`${key}.`))), Object.keys(document).join(","));
    assert.ok(Object.keys(document.publicPage as object ?? {}).every((key) => ["citySlug", "slug"].includes(key)));
  }

  // The cap is one read; reaching it marks the inventory truncated.
  const capped = await loadOrganizerInventory(db as unknown as Firestore, request() as SupplyIntakeRequest,
    runtime.organizerReferenceFromDocument, 3);
  assert.deepEqual(capped?.organizers.map((entry) => entry.organizerId), ["org-app", "org-draft", "org-mumbai-0"]);
  assert.deepEqual([capped?.limit, capped?.truncated], [3, true]);
});

test("an empty inventory leaves the listing as it was without one", async () => {
  const {result} = await setup().run();
  assert.equal(result.duplicateCheck?.verdict, "none");
  assert.equal(result.duplicateCheck?.organizersCompared, 0);
  assert.ok(!result.gaps.includes("possible_duplicate_organizer"));
  // The same request built with no inventory at all has the same gaps.
  const runtime = await packagedIntake();
  const policy = await runtime.loadSupplyAcquisitionPolicy();
  const baseline = await runSupplyIntake({request: request() as SupplyIntakeRequest,
    pageSource: new runtime.StaticPageSource({pages: {}, policy, clock: () => new Date(NOW)}), now: () => new Date(NOW)});
  assert.equal(baseline.listing.duplicateCheck, undefined);
  assert.deepEqual(result.gaps, baseline.listing.gaps);
  assert.equal(result.researchNeeded, baseline.listing.researchNeeded);
});

test("an event refresh is not compared with the organizer it names", async () => {
  const {db, run} = setup({
    request: request({kind: "event_refresh", target: {organizerId: "org-afterfly"},
      origin: {kind: "admin_event_refresh", id: "refresh-1"}}),
    approval: {approvalId: `refresh-${"0".repeat(40)}`, organizerId: "org-afterfly", approvedByUid: "admin-1",
      approvedAt: NOW, materialHash: "0".repeat(64), salesOwnerUid: "admin-1"},
  });
  db.write("organizers/org-afterfly", organizer("Afterfly", {hrefs: ["https://lu.ma/afterfly"]}));
  const {result} = await run();
  assert.equal(result.duplicateCheck, null);
  assert.ok(!result.gaps.includes("possible_duplicate_organizer"));
});
