/* eslint-disable max-len */
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import path from "node:path";
import test from "node:test";
import {Timestamp, type Firestore} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import {catchEndpointHash} from "../../catchMessaging/whatsappReply";
import {CATCH_RECEIPTS} from "../../catchMessaging/whatsappEndpointStops";
import type {OperationRun, OperationWorkItem} from "../models";
import type {ProjectionImportWriter} from "../projectionImporter";
import {FakeFirestore} from "../testFirestore";
import {
  schemaErrorMessages,
  validateOrganizerDocument,
  validateOrganizerIntakeReviewDecisionDocument,
  validateSalesActivityDocument,
  validateSupplyIntakeRequestsDocument,
} from "../../shared/generated/schemaValidators";
import {listingApprovalId} from "../../admin/organizerListingApproval";
import {AUTO_PUBLISH_ACTOR, autoPublishNominatedListing} from "./autoPublish";
import {INSTAGRAM_MESSAGE_RECEIPTS} from "../../catchMessaging/instagramInboundRouter";
import {SUPPLY_NOMINATORS, instagramNominatorId, whatsappNominatorId} from "./nominators";
import {acceptPageFetch, notFoundTransport} from "./testPageFetch";
import {processSupplyIntakeRequest, supplyIntakeCollections} from "./worker";

// The build post-step copies the Operations runtime into lib; the worker uses it.
execFileSync(process.execPath, [path.join(__dirname, "../../../scripts/copy-operations-runtime.cjs")]);

const NOW = "2026-10-30T08:00:00.000Z";
const SENDER = "919800012345";
const ENDPOINT = catchEndpointHash("+" + SENDER);
const EVENT_ID = `cwhe_${"a".repeat(64)}`;
const SERVER_TIME = {_seconds: 1793347200, _nanoseconds: 0};

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

const valid = (validate: ((value: unknown) => boolean) & {errors?: unknown}, value: unknown, label: string) =>
  assert.equal(validate(value), true, `${label}: ${schemaErrorMessages(validate as never).join("; ")}`);

/**
 * The real worker builds a WhatsApp nomination's listing; the test then fills
 * what page fetching would have found, so the listing is complete.
 */
async function harness({role = "associate", nominatorActive = true, claims = {salesStaff: true} as Record<string, unknown>,
  channel = "whatsapp" as "whatsapp" | "instagram"} = {}) {
  const db = new FakeFirestore();
  const requestId = "msg-afterfly-1";
  const submittedBy = {role, uid: "associate-1", partnerId: role === "partner" ? "associate-1" : null};
  db.write(`${supplyIntakeCollections.requests}/${requestId}`, {schemaVersion: 1, requestId,
    request: {schemaVersion: 1, requestId, kind: "nomination", market: "mumbai",
      seed: {name: null, urls: ["https://lu.ma/afterfly"], notes: null, categories: []},
      submittedBy, submittedAt: NOW, origin: {kind: "message_nomination", id: EVENT_ID}},
    status: "queued", attempts: 0, leaseUntil: null, result: null, failure: null, approval: null,
    createdAt: NOW, updatedAt: NOW});
  if (channel === "instagram") {
    // An Instagram receipt names the nominator rather than the sender.
    db.write(`${INSTAGRAM_MESSAGE_RECEIPTS}/${EVENT_ID}`, {messageKey: EVENT_ID, outcome: "nominationQueued", attemptId: null,
      nominatorId: instagramNominatorId("asha.runs"), receivedAt: SERVER_TIME, expiresAt: Timestamp.fromMillis(Date.parse(NOW) + 1000)});
    db.write(`${SUPPLY_NOMINATORS}/${instagramNominatorId("asha.runs")}`, {schemaVersion: 1,
      nominatorId: instagramNominatorId("asha.runs"), channel: "instagram", endpointHash: null, phoneLast4: null,
      instagramHandle: "asha.runs", role, uid: "associate-1", displayName: "Asha", defaultMarket: "mumbai",
      active: nominatorActive, createdAt: NOW, updatedAt: NOW, updatedByUid: "admin-1"});
  } else {
    db.write(`${CATCH_RECEIPTS}/${EVENT_ID}`, {schema: "catch.whatsapp-webhook-event/v1", eventId: EVENT_ID,
      wabaId: "1", phoneNumberId: "2", payloadHash: "b".repeat(64), eventKind: "inbound", messageId: "wamid.1",
      providerTimestampSeconds: String(Date.parse(NOW) / 1000), participantId: SENDER, messageType: "text",
      text: "https://lu.ma/afterfly", textTruncated: false, deliveryStatus: null, errorCodes: [],
      receivedAtMillis: Date.parse(NOW), expiresAt: Timestamp.fromMillis(Date.parse(NOW) + 1000)});
  }
  db.write(`${SUPPLY_NOMINATORS}/${whatsappNominatorId(ENDPOINT)}`, {schemaVersion: 1,
    nominatorId: whatsappNominatorId(ENDPOINT), channel: "whatsapp", endpointHash: ENDPOINT, phoneLast4: "2345", instagramHandle: null,
    role, uid: "associate-1", displayName: "Asha", defaultMarket: "mumbai", active: nominatorActive,
    createdAt: NOW, updatedAt: NOW, updatedByUid: "admin-1"});
  const writer = new MemoryWriter();
  acceptPageFetch(db);
  assert.equal(await processSupplyIntakeRequest({db: db as unknown as Firestore, now: () => new Date(NOW),
    projectionWriter: writer, transport: notFoundTransport, putSnapshot: async () => "supply-intake/snapshots/x.json"},
  requestId), "completed");
  const stored = db.read(`${supplyIntakeCollections.requests}/${requestId}`) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const workItem = structuredClone(writer.items.get(stored.result.listingWorkItemId)!);
  const listing = (workItem.normalizedPayload.intake as {listing: Record<string, any>}).listing; // eslint-disable-line @typescript-eslint/no-explicit-any
  Object.assign(listing.organizer, {name: "Afterfly",
    description: "Weekly social nights for people who would rather meet in person.",
    links: [{platform: "luma", surfaceKind: "calendar", url: "https://lu.ma/afterfly",
      normalizedKey: "lu.ma/afterfly", evidenceUrl: "https://lu.ma/afterfly"}]});
  db.write(`operationWorkItems/${workItem.workItemId}`, workItem as unknown as Record<string, unknown>);
  // As the worker records a complete listing with no likely duplicate.
  stored.result = {...stored.result, gaps: ["image_missing"], researchNeeded: false, eventCount: 2,
    duplicateCheck: {policyId: "organizer-identity/v1", authority: "advisory", verdict: "none", reasons: [],
      organizersCompared: 4, inventoryHash: "e".repeat(64), inventory: {citySlug: "mumbai", limit: 500, truncated: false},
      candidates: []}};
  db.write(`${supplyIntakeCollections.requests}/${requestId}`, stored);
  const deps = {
    firestore: () => db as unknown as FirebaseFirestore.Firestore,
    serverTimestamp: () => SERVER_TIME as unknown as FirebaseFirestore.FieldValue,
    now: () => new Date(NOW),
    reserveCanonicalRoute: async () => undefined,
    getUser: async () => ({disabled: false, customClaims: claims}),
  };
  const state = (patch: (value: Record<string, any>) => void = () => undefined) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const value = structuredClone(db.read(`${supplyIntakeCollections.requests}/${requestId}`)) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    patch(value);
    return value;
  };
  return {db, deps, requestId, listing, state,
    publish: (value = state()) => autoPublishNominatedListing(deps as never, requestId, value)};
}

test("a registered associate's complete WhatsApp nomination publishes without staff review, and says so honestly", async () => {
  const h = await harness();
  const outcome = await h.publish();
  assert.equal(outcome.outcome, "published", JSON.stringify(outcome));
  if (outcome.outcome !== "published") return;
  assert.equal(outcome.canonicalPath, "/organizers/afterfly/");
  const organizer = h.db.read(`organizers/${outcome.organizerId}`)!;
  valid(validateOrganizerDocument, organizer, "OrganizerDocument");
  assert.deepEqual([(organizer.publicPage as {indexStatus: string}).indexStatus, organizer.appVisibility,
    (organizer.claim as {state: string}).state, organizer.organizerType], ["noindex", "hidden", "unclaimed", "community"]);

  // The decision records who vouched for identity: the nominator, not staff.
  const decision = h.db.read(`organizerIntakeReviewDecisions/${outcome.organizerId}`)!;
  valid(validateOrganizerIntakeReviewDecisionDocument, decision, "OrganizerIntakeReviewDecisionDocument");
  const checklist = decision.checklist as Record<string, boolean>;
  assert.deepEqual([decision.reviewedByUid, checklist.identityReviewed, checklist.impersonationReviewed, checklist.crawlDisabledReviewed],
    [AUTO_PUBLISH_ACTOR, false, false, true]);
  assert.match(String(decision.note), /registered associate whatsapp-[a-f0-9]+ nominated it by message/u);

  const request = h.db.read(`${supplyIntakeCollections.requests}/${h.requestId}`)!;
  valid(validateSupplyIntakeRequestsDocument, request, "SupplyIntakeRequestsDocument");
  assert.deepEqual([(request.approval as {approvedByUid: string}).approvedByUid, (request.approval as {salesOwnerUid: string}).salesOwnerUid],
    [AUTO_PUBLISH_ACTOR, "associate-1"]);
  const activity = h.db.read(`salesActivities/${listingApprovalId(h.listing.listingId as string)}_approved`)!;
  valid(validateSalesActivityDocument, activity, "SalesActivityDocument");
  assert.match(String(activity.note), /^Listing auto-published from an associate nomination/u);
  assert.equal((activity.source as {origin: string}).origin, "message_nomination");
  const audits = h.db.entries().filter(([key]) => key.startsWith("adminAuditLogs/")).map(([, value]) => value);
  assert.deepEqual(audits.map((audit) => [audit.action, audit.actorUid]), [["autoPublishOrganizerListing", AUTO_PUBLISH_ACTOR]]);

  // A redelivered trigger replays the same organizer and writes nothing new.
  const before = h.db.entries().length;
  assert.deepEqual(await h.publish(h.state((value) => {
    value.approval = null;
  })), outcome);
  assert.equal(h.db.entries().length, before);
});

test("anything short of a complete listing from a current associate waits for staff", async () => {
  const cases: Array<[string, Parameters<typeof harness>[0], (value: Record<string, any>) => void, string]> = [ // eslint-disable-line @typescript-eslint/no-explicit-any
    ["a gap", {}, (value) => value.result.gaps.push("no_upcoming_events"), "gap:no_upcoming_events"],
    ["research", {}, (value) => value.result.researchNeeded = true, "research_needed"],
    ["a possible duplicate", {}, (value) => value.result.duplicateCheck.verdict = "ambiguous", "duplicate_check_not_clear"],
    ["an unchecked build", {}, (value) => value.result.duplicateCheck = null, "duplicate_check_not_clear"],
    ["a partial comparison", {}, (value) => value.result.duplicateCheck.inventory.truncated = true, "duplicate_check_not_clear"],
    ["a closed market", {}, (value) => value.request.market = "unassigned", "market_not_open"],
    ["a staff approval", {}, (value) => value.approval = {approvalId: "x"}, "not_awaiting_approval"],
    ["an admin nomination", {}, (value) => value.request.origin = {kind: "admin_nomination", id: "x"}, "not_a_message_nomination"],
    ["a partner", {role: "partner"}, () => undefined, "not_an_associate"],
    ["a switched-off nominator", {nominatorActive: false}, () => undefined, "nominator_not_current"],
    ["a former associate", {claims: {}}, () => undefined, "nominator_not_current"],
    ["a rebuilt listing", {}, (value) => value.result.listingContentHash = "f".repeat(64), "listing_changed"],
  ];
  for (const [label, options, patch, reason] of cases) {
    const h = await harness(options);
    const outcome = await h.publish(h.state(patch));
    assert.equal(outcome.outcome, "needs_review", label);
    assert.ok(outcome.outcome === "needs_review" && outcome.reasons.includes(reason), `${label}: ${JSON.stringify(outcome)}`);
    assert.equal(h.db.entries().filter(([key]) => key.startsWith("organizers/")).length, 0, label);
  }
});

test("an Instagram nomination publishes the same way, checking the nominator through its receipt", async () => {
  const h = await harness({channel: "instagram"});
  const outcome = await h.publish();
  assert.equal(outcome.outcome, "published", JSON.stringify(outcome));
  const switchedOff = await harness({channel: "instagram", nominatorActive: false});
  assert.deepEqual(await switchedOff.publish(), {outcome: "needs_review", reasons: ["nominator_not_current"]});
});

test("a slug another organizer holds leaves the listing for staff", async () => {
  const h = await harness();
  const deps = {...h.deps, reserveCanonicalRoute: async () => {
    throw new HttpsError("already-exists", "That public slug is taken.");
  }};
  const outcome = await autoPublishNominatedListing(deps as never, h.requestId, h.state());
  assert.deepEqual(outcome, {outcome: "needs_review", reasons: ["approval_refused:already-exists"]});
  assert.equal((h.db.read(`${supplyIntakeCollections.requests}/${h.requestId}`) as {approval: unknown}).approval, null);
});
