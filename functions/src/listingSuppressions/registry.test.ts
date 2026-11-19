/* eslint-disable max-len */
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import path from "node:path";
import test from "node:test";
import type {Firestore} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import type {OperationRun, OperationWorkItem} from "../operations/models";
import type {ProjectionImportWriter} from "../operations/projectionImporter";
import {FakeFirestore} from "../operations/testFirestore";
import {acceptPageFetch, notFoundTransport} from "../operations/supplyIntake/testPageFetch";
import {processSupplyIntakeRequest, supplyIntakeCollections} from "../operations/supplyIntake/worker";
import {adminNominateOrganizerHandler} from "../operations/supplyIntake/nominations";
import {queueMessageNominations} from "../operations/supplyIntake/messageNominations";
import {createSupplyIntakeRequest, requestFromSalesInboundIntent} from "../operations/supplyIntake/requests";
import {adminApproveOrganizerListingHandler} from "../admin/organizerListingApproval";
import {createOrganizerHandler} from "../organizers/createOrganizer";
import {contractValidator} from "../shared/contractTestValidators";
import {LISTING_SUPPRESSIONS, suppressionModule} from "./registry";
import * as nominationsModule from "../operations/supplyIntake/nominations";
import * as refreshModule from "../operations/supplyIntake/organizerEventRefresh";
import * as triggersModule from "../operations/supplyIntake/triggers";
import * as instantDraftRequestModule from "../instantDrafts/request";
import * as instantDraftStatusModule from "../instantDrafts/status";
import * as whatsappReceiptModule from "../catchMessaging/whatsappReceiptConsumer";
import * as listingReadyModule from "../catchMessaging/listingReadyReply";
import * as instagramWebhookModule from "../organizers/instagramClaimWebhook";
import * as approvalModule from "../admin/organizerListingApproval";
import * as createOrganizerModule from "../organizers/createOrganizer";

// Fictional organisers on reserved .example domains only. The suppressed one
// is "Lantern Trail Runners"; every other name here is unrelated to it.

execFileSync(process.execPath, [path.join(__dirname, "../../scripts/copy-operations-runtime.cjs")]);

const SECRET = "test-only-listing-suppression-key-0123456789abcdef";
const NOW = new Date("2026-11-18T08:00:00.000Z");
const ENV = "LISTING_SUPPRESSION_HMAC_KEY";
const validateListingSuppression = contractValidator("ListingSuppressionDocument");

function withKey(value: string | null) {
  if (value === null) delete process.env[ENV];
  else process.env[ENV] = value;
}

async function seedCase(db: FakeFirestore, {caseId = "TD-0042", active = true} = {}) {
  const module = await suppressionModule();
  const keys = module.suppressionKeysForIdentity({
    names: ["The Lantern Trail Runners"], handles: ["@lanterntrailrunners"],
    urls: ["https://www.instagram.com/lanterntrailrunners/"], domains: ["lantern-trail.example"],
    organizerIds: ["org-lantern-1"], slugs: ["lantern-trail-runners"],
  });
  const record = {schemaVersion: 1, caseId, reason: "removeAndDoNotList", active,
    hashScheme: "hmac-sha256/listing-suppression-v1", identityHashes: module.suppressionHashes(SECRET, keys),
    identityKeyCounts: {labels: 3, links: 2, organizers: 1, slugs: 1}, createdAtMillis: NOW.getTime() - 1000,
    updatedAtMillis: NOW.getTime() - 1000, reviewAtMillis: NOW.getTime() + 1000, createdBy: "workflow:organizer-takedown",
    blockedIntakeCount: 0, lastBlockedAtMillis: null, reviewFlags: []};
  assert.equal(validateListingSuppression(record), true, JSON.stringify(validateListingSuppression.errors));
  db.write(`${LISTING_SUPPRESSIONS}/${caseId}`, record);
}

const caseDoc = (db: FakeFirestore, caseId = "TD-0042") => db.read(`${LISTING_SUPPRESSIONS}/${caseId}`) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const requests = (db: FakeFirestore) => db.entries().filter(([entry]) => entry.startsWith(`${supplyIntakeCollections.requests}/`));

function nominate(db: FakeFirestore, data: Record<string, unknown>) {
  return adminNominateOrganizerHandler({auth: {uid: "associate-1", token: {salesStaff: true}}, data: {
    requestId: `nomination-${Math.random().toString(36).slice(2, 10)}`, name: null, market: "Mumbai", urls: [],
    notes: null, categories: [], formats: ["runClubs"], ...data},
  rawRequest: {headers: {}}} as unknown as CallableRequest<unknown>, {
    firestore: () => db as unknown as Firestore, now: () => NOW,
    serverTimestamp: () => "SERVER_TIMESTAMP" as unknown as FirebaseFirestore.FieldValue,
  });
}

test("with no active case, intake needs no key and queues as before", async () => {
  withKey(null);
  const db = new FakeFirestore();
  await seedCase(db, {active: false});
  const response = await nominate(db, {name: "Lantern Trail Runners"});
  assert.equal(response.created, true, "an inactive case blocks nothing");
  assert.equal(requests(db).length, 1);
});

test("an active case refuses a matching nomination by name, handle, link or domain, naming only the case", async () => {
  withKey(SECRET);
  for (const data of [{name: "Lantern Trail Runners"}, {name: "LANTERN-TRAIL runners"},
    {urls: ["https://instagram.com/LanternTrailRunners?igsh=x"]}, {urls: ["https://lantern-trail.example/join"]},
    {name: "New club", notes: "They post as @lantern.trail.runners"}]) {
    const db = new FakeFirestore();
    await seedCase(db);
    await assert.rejects(nominate(db, data), (error: {code?: string; message?: string; details?: unknown}) => {
      assert.equal(error.code, "failed-precondition");
      assert.match(String(error.message), /do-not-list registry \(case TD-0042\)/u);
      assert.doesNotMatch(String(error.message), /lantern|instagram|example/iu, "no identity beyond the case id");
      assert.deepEqual(error.details, {reason: "listing_suppressed", caseId: "TD-0042"});
      return true;
    }, JSON.stringify(data));
    assert.equal(requests(db).length, 0, "nothing queued");
    assert.equal(db.entries().filter(([entry]) => entry.startsWith("adminAuditLogs/")).length, 0);
    assert.equal(caseDoc(db).blockedIntakeCount, 1);
    assert.equal(caseDoc(db).lastBlockedAtMillis, NOW.getTime());
    assert.equal(validateListingSuppression(caseDoc(db)), true);
  }
});

test("an unrelated nomination still queues while a case is active", async () => {
  withKey(SECRET);
  const db = new FakeFirestore();
  await seedCase(db);
  const response = await nominate(db, {name: "Harbour Swim Collective", urls: ["https://harbour-swim.example"]});
  assert.equal(response.created, true);
  assert.equal(caseDoc(db).blockedIntakeCount, 0);
});

test("intake fails closed while a case is active and the key is unavailable", async () => {
  for (const key of [null, "", "too-short"]) {
    withKey(key);
    const db = new FakeFirestore();
    await seedCase(db);
    await assert.rejects(nominate(db, {name: "Harbour Swim Collective"}),
      (error: {code?: string; message?: string}) => error.code === "unavailable" &&
        /LISTING_SUPPRESSION_HMAC_KEY/u.test(String(error.message)));
    assert.equal(requests(db).length, 0);
  }
});

test("website applications are dropped and message nominations queue only the unsuppressed lines", async () => {
  withKey(SECRET);
  const db = new FakeFirestore();
  await seedCase(db);
  const store = db as unknown as Firestore;
  const intake = requestFromSalesInboundIntent("intent-1", {hostApplication: {organizationName: "Lantern Trail Runners",
    communityLink: "https://lantern-trail.example"}}, NOW)!;
  const result = await store.runTransaction((tx) => createSupplyIntakeRequest(tx, store, intake, NOW));
  assert.deepEqual(result, {requestId: intake.requestId, created: false,
    suppressed: {caseId: "TD-0042", reason: "removeAndDoNotList"}});
  const queued = await queueMessageNominations({db: store, now: () => NOW, getUser: async () => ({}) as never,
    parse: async () => ({nominations: [], unreadable: [], droppedNominations: 0}),
    checkRateLimit: async () => undefined} as never, {messageKey: "msg-1", receivedAtMillis: NOW.getTime(),
    nominator: {nominatorId: "nominator-1", role: "associate", uid: "associate-1", partnerId: null, defaultMarket: "mumbai"},
    parsed: {nominations: [{urls: ["https://www.instagram.com/lanterntrailrunners/"], notes: null},
      {urls: ["https://www.instagram.com/driftwood.swim/"], notes: null}], unreadable: [], droppedNominations: 0}});
  assert.deepEqual([queued.outcome, queued.requests.length, queued.suppressed], ["queued", 1, 1]);
  assert.equal(requests(db).length, 1);
  assert.equal(caseDoc(db).blockedIntakeCount, 2);
});

test("createOrganizer creates a matching host workspace and flags it on the case", async () => {
  withKey(SECRET);
  const db = new FakeFirestore();
  await seedCase(db);
  db.write("users/owner-1", {name: "Owner"});
  const create = (organizerId: string, name: string) => createOrganizerHandler({
    auth: {uid: "owner-1", token: {}} as CallableRequest["auth"],
    data: {organizerId, name, description: "Owner supplied description.", location: "in-mh-mumbai", area: "Bandra"},
    rawRequest: {headers: {}} as CallableRequest["rawRequest"],
  } as CallableRequest<unknown>, {
    firestore: () => db as unknown as Firestore,
    serverTimestamp: () => "SERVER_TIMESTAMP" as unknown as FirebaseFirestore.FieldValue,
    reserveCanonicalRoute: async () => undefined,
  });
  assert.deepEqual(await create("AbCdEfGhIjKlMnOpQr12", "Lantern Trail Runners"), {organizerId: "AbCdEfGhIjKlMnOpQr12"});
  assert.equal(db.read("organizers/AbCdEfGhIjKlMnOpQr12")?.appVisibility, "hidden");
  assert.deepEqual(caseDoc(db).reviewFlags, [{organizerId: "AbCdEfGhIjKlMnOpQr12", source: "createOrganizer",
    flaggedAtMillis: caseDoc(db).reviewFlags[0].flaggedAtMillis}]);
  assert.equal(validateListingSuppression(caseDoc(db)), true);
  // A missing key never blocks a host's own workspace.
  withKey(null);
  assert.deepEqual(await create("ZyXwVuTsRqPoNmLkJi98", "Harbour Swim Collective"), {organizerId: "ZyXwVuTsRqPoNmLkJi98"});
  assert.equal(caseDoc(db).reviewFlags.length, 1);
});

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

/** A listing built before the case existed: the approval backstop must refuse it. */
async function builtListing(db: FakeFirestore) {
  const requestId = "nom-lantern-1";
  const at = NOW.toISOString();
  db.write(`${supplyIntakeCollections.requests}/${requestId}`, {schemaVersion: 1, requestId,
    request: {schemaVersion: 1, requestId, kind: "nomination", market: "mumbai",
      seed: {name: "Night Lantern Social", urls: ["https://night-lantern.example"], notes: null, categories: ["social"]},
      submittedBy: {role: "associate", uid: "associate-1", partnerId: null}, submittedAt: at, origin: null},
    status: "queued", attempts: 0, leaseUntil: null, result: null, failure: null, approval: null, createdAt: at, updatedAt: at});
  const writer = new MemoryWriter();
  acceptPageFetch(db);
  assert.equal(await processSupplyIntakeRequest({db: db as unknown as Firestore, now: () => NOW, projectionWriter: writer,
    transport: notFoundTransport, putSnapshot: async () => "supply-intake/snapshots/x.json"}, requestId), "completed");
  const stored = db.read(`${supplyIntakeCollections.requests}/${requestId}`) as {result: {listingWorkItemId: string}};
  const workItem = structuredClone(writer.items.get(stored.result.listingWorkItemId)!);
  const listing = (workItem.normalizedPayload.intake as {listing: Record<string, any>}).listing; // eslint-disable-line @typescript-eslint/no-explicit-any
  listing.organizer.description = "Evening social runs for people who would rather meet in person.";
  // The worker found the organiser's own Instagram, which the nomination never named.
  listing.organizer.links = [{platform: "instagram", surfaceKind: "profile", url: "https://www.instagram.com/lanterntrailrunners/",
    normalizedKey: "instagram:lanterntrailrunners", evidenceUrl: "https://www.instagram.com/lanterntrailrunners/"}];
  db.write(`operationWorkItems/${workItem.workItemId}`, workItem as unknown as Record<string, unknown>);
  return {workItemId: workItem.workItemId, contentHash: String(listing.contentHash)};
}

function approve(db: FakeFirestore, listing: {workItemId: string; contentHash: string}) {
  return adminApproveOrganizerListingHandler({auth: {uid: "admin-1", token: {admin: true}}, data: {
    requestId: "approve-lantern-1", listingWorkItemId: listing.workItemId, contentHash: listing.contentHash,
    name: "Night Lantern Social", publicSlug: "night-lantern-social", marketId: "in-mh-mumbai", organizerType: "community",
    checklist: {identityReviewed: true, surfaceInventoryReviewed: true, ownerSafeCopyReviewed: true,
      marketScopeReviewed: true, mediaRightsReviewed: true, crawlDisabledReviewed: true,
      claimTargetReviewed: true, takedownPathReviewed: true, impersonationReviewed: true,
      cityEvidenceReviewed: true, formatsReviewed: true, datingFramingReviewed: true, personalDataReviewed: true},
    formats: ["runClubs"], note: "Checked the listing."}, rawRequest: {headers: {}}} as unknown as CallableRequest<unknown>, {
    firestore: () => db as unknown as Firestore,
    serverTimestamp: () => ({_seconds: 1795000000, _nanoseconds: 0}) as unknown as FirebaseFirestore.FieldValue,
    now: () => NOW, reserveCanonicalRoute: async () => undefined,
  });
}

test("listing approval refuses a listing whose built links match a case, and fails closed without the key", async () => {
  withKey(SECRET);
  const db = new FakeFirestore();
  const listing = await builtListing(db);
  await seedCase(db);
  await assert.rejects(approve(db, listing), (error: {code?: string; message?: string; details?: unknown}) =>
    error.code === "failed-precondition" && /do-not-list case TD-0042/u.test(String(error.message)) &&
    !/lantern/iu.test(String(error.message).replace("night-lantern", "")));
  assert.equal(db.entries().filter(([entry]) => entry.startsWith("organizers/")).length, 0, "nothing published");
  withKey(null);
  await assert.rejects(approve(db, listing), (error: {code?: string}) => error.code === "unavailable");
  assert.equal(db.entries().filter(([entry]) => entry.startsWith("organizers/")).length, 0);
});

test("every Function that reaches a suppression check binds the registry key", () => {
  const modules = [nominationsModule, refreshModule, triggersModule, instantDraftRequestModule,
    instantDraftStatusModule, whatsappReceiptModule, listingReadyModule, instagramWebhookModule, approvalModule,
    createOrganizerModule];
  const exports = Object.assign({}, ...modules) as Record<string, {__endpoint?: {secretEnvironmentVariables?: Array<{key: string}>}}>;
  for (const name of ["adminNominateOrganizer", "onSalesInboundIntentForIntake", "adminRefreshOrganizerEvents",
    "onSupplyIntakeRequestCreated", "recoverSupplyIntakeRequests", "requestInstantDraft", "getInstantDraft",
    "onCatchWhatsappWebhookEventCreated", "onMessageNominationListingReady", "instagramClaimWebhook",
    "adminApproveOrganizerListing", "createOrganizer"]) {
    const secrets = exports[name]?.__endpoint?.secretEnvironmentVariables?.map((secret) => secret.key) ?? [];
    assert.ok(secrets.includes(ENV), `${name} binds ${ENV}`);
  }
});
