/* eslint-disable max-len */
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import type {OperationRun, OperationWorkItem} from "../operations/models";
import {importShadowProjection, type ProjectionImportWriter} from "../operations/projectionImporter";
import {FakeFirestore} from "../operations/testFirestore";
import {packagedIntake, runSupplyIntake, type SupplyIntakeRequest} from "../operations/supplyIntake/runtime";
import {packagedEventPublication, publishListingEvents, type EventPublicationPolicy} from "../operations/supplyIntake/eventPublication";
import {publishApprovedListingEvents} from "../operations/supplyIntake/eventPublicationTrigger";
import {supplyIntakeCollections} from "../operations/supplyIntake/worker";
import {contractValidator} from "../shared/contractTestValidators";
import {organizerSupplyCapabilitiesFor} from "../shared/organizerSupplyCapabilities";
import {schemaErrorMessages} from "../shared/generated/schemaValidationRuntime";
import {materializeInstantDraft} from "./materialize";
import {publishClaimedDraftEvents} from "./publishOnClaim";
import {requestInstantDraftHandler} from "./request";

// The build post-step copies the Operations runtime into lib; the publisher uses it.
execFileSync(process.execPath, [path.join(__dirname, "../../scripts/copy-operations-runtime.cjs")]);

const NOW = "2026-10-20T08:00:00.000Z";
const SERVER_TIME = {_seconds: 1792483200, _nanoseconds: 0};
const CALENDAR = "https://luma.com/bytebanyan";
const PAGES = path.resolve(__dirname, "../../../operations/src/workflows/supply-intake/fixtures/pages");
const OWNER = "owner-1";

const validateExternalEvent = contractValidator("ExternalEventDocument");
const valid = (validate: ((value: unknown) => boolean) & {errors?: unknown}, value: unknown, label: string) =>
  assert.equal(validate(value), true, `${label}: ${schemaErrorMessages(validate as never).join("; ")}`);

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

/**
 * A verified caller sends a public Luma calendar to the instant draft tool;
 * the real Supply Intake runtime reads the saved calendar page, and the poll
 * saves the private draft. Events are published under auto-publish mode, so
 * a test proves the draft rule, not a paused policy, holds them back.
 */
async function savedDraft() {
  const db = new FakeFirestore();
  const firestore = db as unknown as FirebaseFirestore.Firestore;
  const now = () => new Date(NOW);
  const runtime = await packagedEventPublication();
  const autoPublish = {...await runtime.loadEventPublicationPolicy(), mode: runtime.AUTO_PUBLISH_MODE} as EventPublicationPolicy;
  const deps = {firestore: () => firestore, now, serverTimestamp: () => SERVER_TIME as unknown as FirebaseFirestore.FieldValue,
    checkRateLimit: (async () => undefined) as never, reserveCanonicalRoute: async () => undefined,
    loadEventPublicationPolicy: async () => autoPublish};
  const {draftId} = await requestInstantDraftHandler({auth: {uid: "submitter-1", token: {phone_number: "+919000000001"}},
    data: {requestId: "web-bytebanyan-00000001", requestKind: "event_link", entry: "event_page_tool", link: CALENDAR,
      accessToken: "t".repeat(43), whatsapp: {consentVersion: "instant-draft-whatsapp-v1", followUpConsent: true},
      city: "Mumbai"}, rawRequest: {headers: {}, ip: "198.51.100.7"}} as unknown as CallableRequest<unknown>, deps);
  const requestPath = `${supplyIntakeCollections.requests}/${draftId}`;
  const stored = db.read(requestPath)!;
  const intake = await packagedIntake();
  const pageSource = new intake.StaticPageSource({pages: {[CALENDAR]: fs.readFileSync(path.join(PAGES, "luma-organizer.html"),
    "utf8")}, policy: await intake.loadSupplyAcquisitionPolicy(), clock: now});
  const result = await runSupplyIntake({request: stored.request as SupplyIntakeRequest, pageSource, now});
  const writer = new MemoryWriter();
  await importShadowProjection({input: result.projection, apply: true, writer});
  for (const item of writer.items.values()) db.write(`operationWorkItems/${item.workItemId}`, item as unknown as Record<string, unknown>);
  const queued = db.read(requestPath)!;
  db.write(requestPath, {...queued, status: "completed", attempts: 1, result: {runId: result.runId,
    listingId: result.listing.listingId, listingWorkItemId: result.listingWorkItemId, eventWorkItemIds: result.eventWorkItemIds,
    listingContentHash: result.listing.contentHash, gaps: [], researchNeeded: false, eventCount: result.eventWorkItemIds.length,
    stoppedReason: null, artifactHash: "a".repeat(64), snapshotRefs: [], captureReceipts: [],
    duplicateCheck: {policyId: "organizer-match-v1", authority: "advisory", verdict: "none", reasons: [], organizersCompared: 0,
      inventoryHash: "c".repeat(64), inventory: {citySlug: "mumbai", limit: 500, truncated: false}, candidates: []}}});
  // The approval trigger runs on the completed, approved request; for a draft it publishes nothing.
  const before = db.read(requestPath);
  const state = await materializeInstantDraft(deps as never, draftId);
  assert.equal(state.state, "draft_ready");
  const organizerId = (state as {organizerId: string}).organizerId;
  assert.ok(result.eventWorkItemIds.length > 0, "the saved calendar lists at least one event");
  return {db, deps, draftId, requestPath, organizerId, eventWorkItemIds: result.eventWorkItemIds,
    approvedResults: () => publishApprovedListingEvents(draftId, before, db.read(requestPath), deps)};
}

const externalEvents = (db: FakeFirestore) => db.entries().filter(([key]) => key.startsWith("externalEvents/"));

/** The organizer as the claim approval and the owner's publish leave it. */
function claimed(organizer: Record<string, any>, uid = OWNER): Record<string, any> { // eslint-disable-line @typescript-eslint/no-explicit-any
  return {...organizer, ownerUserId: uid, hostUserId: uid, hostUserIds: [uid],
    supplyCapabilities: organizerSupplyCapabilitiesFor({ownershipState: "claimed", claimState: "claimed"}),
    ownership: {...organizer.ownership, state: "claimed", ownerUserId: uid, primaryHostUserId: uid, hostUserIds: [uid],
      claimedByUid: uid},
    claim: {...organizer.claim, state: "claimed", lastClaimRequestId: "claim-1"}};
}
function published(organizer: Record<string, any>): Record<string, any> { // eslint-disable-line @typescript-eslint/no-explicit-any
  return {...organizer, appVisibility: "discoverable",
    publicPage: {...organizer.publicPage, publishStatus: "published", indexStatus: "indexReady", robots: "index, follow"}};
}

test("a claimed owner publishing the draft's page publishes its imported events, once", async () => {
  const h = await savedDraft();
  // Saving the draft publishes nothing, even under auto-publish: the page is a draft.
  const atApproval = await h.approvedResults();
  assert.ok(atApproval && atApproval.every((entry) => entry.outcome !== "published"));
  assert.equal(externalEvents(h.db).length, 0);

  const draft = h.db.read(`organizers/${h.organizerId}`)!;
  const owned = claimed(draft);
  h.db.write(`organizers/${h.organizerId}`, owned);
  // The claim alone publishes nothing.
  assert.equal(await publishClaimedDraftEvents(h.organizerId, draft, owned, h.deps), null);
  const live = published(owned);
  h.db.write(`organizers/${h.organizerId}`, live);
  const results = await publishClaimedDraftEvents(h.organizerId, owned, live, h.deps);
  assert.ok(results);
  assert.deepEqual(results.map((entry) => entry.outcome), h.eventWorkItemIds.map(() => "published"),
    JSON.stringify(results.map((entry) => entry.blockers)));
  const [[, event]] = externalEvents(h.db);
  valid(validateExternalEvent, event, "ExternalEventDocument");
  assert.equal(event.canonicalHostId, h.organizerId);
  assert.equal(event.publicationStatus, "public");
  assert.equal((event.review as {reviewer: string}).reviewer, OWNER, "the owner's publish is the review");
  const receipt = h.db.read(results[0].receiptPath!)!;
  assert.deepEqual([receipt.actorUid, receipt.outcome], [OWNER, "published"]);

  // A redelivered event, or the page published again later, replays rather than publishing twice.
  const count = h.db.entries().length;
  const replay = await publishClaimedDraftEvents(h.organizerId, owned, live, h.deps);
  assert.ok(replay?.every((entry) => entry.idempotent));
  assert.equal(h.db.entries().length, count);
});

test("nothing publishes before the claim, for another owner, for an expired draft or for an organizer that was never a draft", async () => {
  const h = await savedDraft();
  const draft = h.db.read(`organizers/${h.organizerId}`)!;
  // Staff publishing the unclaimed page does not take its events live.
  assert.equal(await publishClaimedDraftEvents(h.organizerId, draft, published(draft), h.deps), null);
  // An update that leaves a live page live is not a publish.
  const live = published(claimed(draft));
  assert.equal(await publishClaimedDraftEvents(h.organizerId, live, live, h.deps), null);
  // An organizer no instant draft saved.
  assert.equal(await publishClaimedDraftEvents("organizer-from-a-nomination", claimed(draft), live, h.deps), null);
  // A claim still in review is not a claim.
  const pending = {...live, claim: {...live.claim, state: "claimPending"}};
  assert.equal(await publishClaimedDraftEvents(h.organizerId, draft, pending, h.deps), null);
  // The publisher itself refuses an owner the organizer does not name.
  h.db.write(`organizers/${h.organizerId}`, live);
  const {results} = await publishListingEvents({intakeRequestId: h.draftId, eventWorkItemIds: h.eventWorkItemIds,
    actor: {kind: "owner", ownerUid: "someone-else"}, executionMode: "apply", idempotencyKey: "owner-publish:test"}, h.deps);
  assert.deepEqual([...new Set(results.flatMap((entry) => entry.blockers))], ["organizer_not_claimed_by_owner"]);
  h.db.write(`organizers/${h.organizerId}`, draft);
  assert.equal(externalEvents(h.db).length, 0);

  // An expired draft never comes back through its page.
  const stored = h.db.read(h.requestPath)!;
  h.db.write(h.requestPath, {...stored, instantDraft: {...(stored.instantDraft as Record<string, unknown>), expiresAt: null,
    outcome: {state: "expired", reasons: ["unclaimed_after_30_days"], at: NOW}}});
  assert.equal(await publishClaimedDraftEvents(h.organizerId, claimed(draft), live, h.deps), null);
  assert.equal(externalEvents(h.db).length, 0);
});

test("an event that fails an automated check waits for staff even when the owner publishes", async () => {
  const h = await savedDraft();
  const [first] = h.eventWorkItemIds;
  const item = h.db.read(`operationWorkItems/${first}`)!;
  const event = ((item.normalizedPayload as {intake: {event: Record<string, unknown>}}).intake.event);
  event.title = "Singles mixer night";
  h.db.write(`operationWorkItems/${first}`, item);
  const draft = h.db.read(`organizers/${h.organizerId}`)!;
  const owned = claimed(draft);
  const live = published(owned);
  h.db.write(`organizers/${h.organizerId}`, live);
  const results = (await publishClaimedDraftEvents(h.organizerId, owned, live, h.deps))!;
  const held = results.find((entry) => entry.eventWorkItemId === first)!;
  assert.equal(held.outcome, "awaiting_staff");
  assert.ok(held.blockers.includes("dating_framing"));
  assert.equal(held.blockers.includes("staff_review_policy"), false);
});

/**
 * The same saved listing, as a try-it import leaves it: the request carries
 * tryItImport (applied to the owner's workspace) and no approval, and the
 * organizer's provenance names the request.
 */
async function appliedTryItImport(verification: "unverified" | "verified" | "not_needed") {
  const h = await savedDraft();
  const requestId = "tryit-0123456789abcdef0123";
  const {approval: _approval, instantDraft: _instantDraft, ...rest} = h.db.read(h.requestPath)!;
  void _approval; void _instantDraft;
  h.db.write(`${supplyIntakeCollections.requests}/${requestId}`, {...rest, requestId,
    tryItImport: {organizerId: h.organizerId, appliedAt: NOW}});
  h.db.remove(h.requestPath);
  const draft = h.db.read(`organizers/${h.organizerId}`)!;
  const owned = {...claimed(draft), importProvenance: {requestId, listingId: "listing-1", contentHash: "b".repeat(64),
    sourceUrls: [CALENDAR], identities: [{platform: "luma", url: CALENDAR}], verification, importedAt: SERVER_TIME}};
  h.db.write(`organizers/${h.organizerId}`, owned);
  return {...h, requestId, owned};
}

test("an applied try-it import's events go live when the owner publishes, once its imported identity is verified", async () => {
  const h = await appliedTryItImport("verified");
  const live = published(h.owned);
  h.db.write(`organizers/${h.organizerId}`, live);
  const results = await publishClaimedDraftEvents(h.organizerId, h.owned, live, h.deps);
  assert.ok(results);
  assert.deepEqual(results.map((entry) => entry.outcome), h.eventWorkItemIds.map(() => "published"),
    JSON.stringify(results.map((entry) => entry.blockers)));
  assert.equal(externalEvents(h.db).length, h.eventWorkItemIds.length);
  const replay = await publishClaimedDraftEvents(h.organizerId, h.owned, live, h.deps);
  assert.ok(replay?.every((entry) => entry.idempotent));
});

test("a try-it import publishes nothing while unverified, unapplied or replaced by a later import", async () => {
  const h = await appliedTryItImport("unverified");
  const live = published(h.owned);
  h.db.write(`organizers/${h.organizerId}`, live);
  const blocked = await publishClaimedDraftEvents(h.organizerId, h.owned, live, h.deps);
  assert.ok(blocked?.every((entry) => entry.outcome === "blocked" && entry.blockers.includes("organizer_identity_unverified")),
    JSON.stringify(blocked));
  assert.equal(externalEvents(h.db).length, 0);

  // Verified, but the import was previewed and never applied.
  const verified = {...live, importProvenance: {...live.importProvenance, verification: "verified"}};
  h.db.write(`organizers/${h.organizerId}`, verified);
  const requestPath = `${supplyIntakeCollections.requests}/${h.requestId}`;
  const stored = h.db.read(requestPath)!;
  h.db.write(requestPath, {...stored, tryItImport: {organizerId: h.organizerId}});
  assert.equal(await publishClaimedDraftEvents(h.organizerId, h.owned, verified, h.deps), null);

  // Applied to another workspace.
  h.db.write(requestPath, {...stored, tryItImport: {organizerId: "someone-elses-workspace", appliedAt: NOW}});
  assert.equal(await publishClaimedDraftEvents(h.organizerId, h.owned, verified, h.deps), null);

  // A later import replaced this one: the provenance names another request, so the old request is not an approval.
  h.db.write(requestPath, stored);
  const replaced = {...verified, importProvenance: {...verified.importProvenance, requestId: "tryit-ffffffffffffffffffff"}};
  h.db.write(`organizers/${h.organizerId}`, replaced);
  const direct = await publishListingEvents({intakeRequestId: h.requestId, eventWorkItemIds: h.eventWorkItemIds,
    actor: {kind: "owner", ownerUid: OWNER}, executionMode: "apply", idempotencyKey: "owner-publish:replaced"}, h.deps);
  assert.ok(direct.results.every((entry) => entry.outcome !== "published"), JSON.stringify(direct.results));
  assert.equal(direct.organizerId, null);
  assert.equal(externalEvents(h.db).length, 0);
});
