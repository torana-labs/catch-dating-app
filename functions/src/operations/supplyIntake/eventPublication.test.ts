/* eslint-disable max-len */
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import type {OperationRun, OperationWorkItem} from "../models";
import {importShadowProjection, type ProjectionImportWriter} from "../projectionImporter";
import {FakeFirestore} from "../testFirestore";
import {
  schemaErrorMessages,
  validateAdminListListingEventImportsCallableResponse,
  validateAdminPublishListingEventsCallableResponse,
  validateExternalEventDocument,
  validateExternalEventPublicationReceiptDocument,
} from "../../shared/generated/schemaValidators";
import {adminApproveOrganizerListingHandler} from "../../admin/organizerListingApproval";
import {
  adminListListingEventImportsHandler,
  adminPublishListingEventsHandler,
} from "../../admin/listingEventImports";
import {packagedIntake, runSupplyIntake, type SupplyIntakeRequest} from "./runtime";
import {publishApprovedListingEvents} from "./eventPublicationTrigger";
import {publishListingEvents} from "./eventPublication";
import {adminRefreshOrganizerEventsHandler} from "./organizerEventRefresh";
import {supplyIntakeCollections} from "./worker";

// The build post-step copies the Operations runtime into lib; the publisher uses it.
execFileSync(process.execPath, [path.join(__dirname, "../../../scripts/copy-operations-runtime.cjs")]);

const NOW = "2026-10-20T08:00:00.000Z";
const SERVER_TIME = {_seconds: 1792483200, _nanoseconds: 0};
const AUTO_ACTOR = "supply-intake-auto-publish";
const CALENDAR = "https://luma.com/blrdroid";
const PAGES = path.resolve(__dirname, "../../../../operations/src/workflows/supply-intake/fixtures/pages");

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

type EventEdit = (event: Record<string, unknown>) => void;

/**
 * A nomination of a public Luma calendar runs through the real Supply Intake
 * runtime over the saved calendar page, imports its listing and events, and
 * (unless told not to) staff approve the listing into Mumbai.
 */
/**
 * Runs the real Supply Intake runtime for one request over the saved Luma
 * calendar page, imports its work items, and records the request completed,
 * as the trusted worker would.
 */
async function completeIntake(db: FakeFirestore, request: SupplyIntakeRequest, editEvent?: EventEdit) {
  const now = () => new Date(NOW);
  const runtime = await packagedIntake();
  const pageSource = new runtime.StaticPageSource({pages: {[CALENDAR]: fs.readFileSync(path.join(PAGES,
    "luma-organizer.html"), "utf8")}, policy: await runtime.loadSupplyAcquisitionPolicy(), clock: now});
  const result = await runSupplyIntake({request, pageSource, now});
  const writer = new MemoryWriter();
  await importShadowProjection({input: result.projection, apply: true, writer});
  for (const item of writer.items.values()) {
    const intake = item.normalizedPayload.intake as {recordType?: string; event?: Record<string, unknown>};
    if (intake.recordType === "listing_event_candidate" && editEvent) editEvent(intake.event!);
    db.write(`operationWorkItems/${item.workItemId}`, item as unknown as Record<string, unknown>);
  }
  const requestPath = `${supplyIntakeCollections.requests}/${request.requestId}`;
  db.write(requestPath, {schemaVersion: 1, requestId: request.requestId, request, attempts: 1, leaseUntil: null,
    failure: null, approval: null, createdAt: NOW, updatedAt: NOW, ...db.read(requestPath), status: "completed",
    result: {runId: result.runId, listingId: result.listing.listingId, listingWorkItemId: result.listingWorkItemId,
      eventWorkItemIds: result.eventWorkItemIds, listingContentHash: result.listing.contentHash, gaps: [],
      researchNeeded: false, eventCount: result.eventWorkItemIds.length, stoppedReason: null, artifactHash: null,
      snapshotRefs: [], captureReceipts: []}});
  return {result, requestPath};
}

/**
 * A nomination of a public Luma calendar runs through the real Supply Intake
 * runtime over the saved calendar page, imports its listing and events, and
 * (unless told not to) staff approve the listing into Mumbai.
 */
async function harness({editEvent, approve = true}: {editEvent?: EventEdit; approve?: boolean} = {}) {
  const db = new FakeFirestore();
  const now = () => new Date(NOW);
  const request = {schemaVersion: 1, requestId: "nom-blrdroid-1", kind: "nomination",
    market: "mumbai", seed: {name: "BlrDroid", urls: [CALENDAR], notes: null, categories: ["tech"]},
    submittedBy: {role: "associate", uid: "associate-1", partnerId: null}, submittedAt: NOW,
    origin: null} as SupplyIntakeRequest & {origin: null};
  const {result, requestPath} = await completeIntake(db, request, editEvent);
  assert.ok(result.eventWorkItemIds.length > 0, "the saved calendar lists at least one event");
  const deps = {firestore: () => db as unknown as FirebaseFirestore.Firestore,
    serverTimestamp: () => SERVER_TIME as unknown as FirebaseFirestore.FieldValue, now};
  const before = db.read(requestPath);
  let organizerId: string | null = null;
  if (approve) {
    const approval = await adminApproveOrganizerListingHandler({auth: {uid: "admin-1", token: {admin: true}},
      rawRequest: {headers: {}}, data: {requestId: "approve-blrdroid-1", listingWorkItemId: result.listingWorkItemId,
        contentHash: result.listing.contentHash, name: "BlrDroid Community", publicSlug: "blrdroid",
        marketId: "in-mh-mumbai", organizerType: "community", note: "Checked the Luma calendar.",
        checklist: {identityReviewed: true, surfaceInventoryReviewed: true, ownerSafeCopyReviewed: true,
          marketScopeReviewed: true, mediaRightsReviewed: true, crawlDisabledReviewed: true,
          claimTargetReviewed: true, takedownPathReviewed: true, impersonationReviewed: true}},
    } as unknown as CallableRequest<unknown>, {...deps, reserveCanonicalRoute: async () => undefined} as never);
    organizerId = approval.organizerId;
  }
  const call = <T>(handler: (request: CallableRequest<unknown>, deps: never) => Promise<T>,
    data: Record<string, unknown>, token: Record<string, unknown> = {admin: true}) =>
      handler({auth: {uid: "staff-1", token}, data, rawRequest: {headers: {}}} as unknown as CallableRequest<unknown>,
      deps as never);
  return {db, deps, requestId: request.requestId, requestPath, before, organizerId,
    eventWorkItemIds: result.eventWorkItemIds, call,
    approved: () => publishApprovedListingEvents(request.requestId, before, db.read(requestPath), deps)};
}

const externalEvents = (db: FakeFirestore) => db.entries().filter(([key]) => key.startsWith("externalEvents/"));
const staffPayload = (eventWorkItemIds: string[], overrides: Record<string, unknown> = {}) => ({
  intakeRequestId: "nom-blrdroid-1", eventWorkItemIds, executionMode: "apply", idempotencyKey: "staff-publish-0001",
  reviewNote: "Checked each event on Luma.", blockerResolutions: [],
  checklist: {outboundLinksReviewed: true, noCatchBookingPaymentsWaitlist: true, ownerSafeCopyReviewed: true},
  ...overrides,
});

test("approving a listing publishes its clean, attributed Luma events under the policy", async () => {
  const h = await harness();
  const results = await h.approved();
  assert.ok(results && results.length === h.eventWorkItemIds.length);
  assert.deepEqual(results.map((entry) => entry.outcome), results.map(() => "published"),
    JSON.stringify(results.map((entry) => entry.blockers)));
  const [[eventPath, published]] = externalEvents(h.db);
  valid(validateExternalEventDocument, published, "ExternalEventDocument");
  assert.equal(eventPath, `externalEvents/${results[0].eventId}`);
  assert.equal(published.canonicalHostId, h.organizerId);
  assert.deepEqual([published.publicationStatus, (published.discovery as Record<string, unknown>).citySlug,
    (published.discovery as Record<string, unknown>).appVisibility], ["public", "mumbai", "hidden"],
  "web-public under the organizer's market, hidden in the app like its organizer");
  const booking = published.booking as {mode: string; catchBookingEnabled: boolean; externalLinks: Array<{url: string; primary: boolean}>};
  assert.deepEqual([booking.mode, booking.catchBookingEnabled], ["external_outbound_only", false]);
  assert.ok(booking.externalLinks.some((link) => link.primary && link.url.startsWith("https://luma.com/")));
  assert.equal((published.review as {reviewer: string}).reviewer, AUTO_ACTOR);
  const receipt = h.db.read(results[0].receiptPath!);
  valid(validateExternalEventPublicationReceiptDocument, receipt, "ExternalEventPublicationReceiptDocument");
  assert.deepEqual([receipt?.actorUid, receipt?.sourceActionId], [AUTO_ACTOR, h.eventWorkItemIds[0]]);

  // A redelivered approval event replays its receipts rather than publishing twice.
  const count = h.db.entries().length;
  const replay = await h.approved();
  assert.deepEqual(replay?.map((entry) => [entry.outcome, entry.idempotent]), results.map(() => ["published", true]));
  assert.equal(h.db.entries().length, count);
  // A redelivery after the event has ended still replays its receipt rather than reporting it blocked.
  const late = await publishApprovedListingEvents(h.requestId, h.before, h.db.read(h.requestPath),
    {...h.deps, now: () => new Date("2027-01-01T00:00:00.000Z")});
  assert.deepEqual(late?.map((entry) => [entry.outcome, entry.idempotent]), results.map(() => ["published", true]));
  // A request that finishes already approved (an organizer Catch lists) runs the policy when it completes.
  const completed = h.db.read(h.requestPath)!;
  const onCompletion = await publishApprovedListingEvents(h.requestId, {...completed, status: "running"}, completed,
    h.deps);
  assert.deepEqual(onCompletion?.map((entry) => entry.idempotent), results.map(() => true));
  // Any later update to the request (not an approval) does nothing.
  assert.equal(await publishApprovedListingEvents(h.requestId, h.db.read(h.requestPath), h.db.read(h.requestPath),
    h.deps), null);

  const list = await h.call(adminListListingEventImportsHandler, {limit: 10, cursor: null});
  valid(validateAdminListListingEventImportsCallableResponse, list, "AdminListListingEventImportsCallableResponse");
  assert.equal(list.policy.mode, "auto_publish_approved_organizers");
  assert.deepEqual(list.rows.map((row) => [row.intakeRequestId, row.organizer.organizerId, row.organizer.appVisibility]),
    [[h.requestId, h.organizerId, "hidden"]]);
  assert.deepEqual(list.rows[0].events.map((event) => [event.state, event.publishedBy]),
    results.map(() => ["published", "policy"]));
});

test("an event framed as dating waits for staff, who can publish it", async () => {
  const h = await harness({editEvent: (event) => {
    event.title = "Singles Mixer for Android Devs";
  }});
  const results = await h.approved();
  assert.deepEqual(results?.map((entry) => entry.outcome), h.eventWorkItemIds.map(() => "awaiting_staff"));
  assert.ok(results?.every((entry) => entry.blockers.includes("dating_framing")));
  assert.equal(externalEvents(h.db).length, 0, "nothing published without a person");

  const list = await h.call(adminListListingEventImportsHandler, {limit: 10, cursor: null});
  valid(validateAdminListListingEventImportsCallableResponse, list, "AdminListListingEventImportsCallableResponse");
  const [row] = list.rows[0].events;
  assert.deepEqual([row.state, row.automatedFindings.map((finding) => finding.match)], ["ready", ["Singles", "Mixer"]],
    "the staff plan is clean; the findings say why the policy left it");

  const dryRun = await h.call(adminPublishListingEventsHandler, staffPayload(h.eventWorkItemIds,
    {executionMode: "dry_run", idempotencyKey: "staff-dry-run-0001"}));
  valid(validateAdminPublishListingEventsCallableResponse, dryRun, "AdminPublishListingEventsCallableResponse");
  assert.deepEqual([dryRun.counts.wouldPublish, externalEvents(h.db).length], [h.eventWorkItemIds.length, 0]);
  const applied = await h.call(adminPublishListingEventsHandler, staffPayload(h.eventWorkItemIds));
  valid(validateAdminPublishListingEventsCallableResponse, applied, "AdminPublishListingEventsCallableResponse");
  assert.equal(applied.counts.published, h.eventWorkItemIds.length);
  const [[, published]] = externalEvents(h.db);
  valid(validateExternalEventDocument, published, "ExternalEventDocument");
  assert.equal((published.review as {reviewer: string}).reviewer, "staff-1");
  assert.equal(h.db.entries().filter(([key]) => key.startsWith("adminAuditLogs/")).length,
    2 * h.eventWorkItemIds.length + 1, "the approval, then each event's dry run and publication, are audited");
  // The same key replays; a second publish of the event reports it as already live.
  const replay = await h.call(adminPublishListingEventsHandler, staffPayload(h.eventWorkItemIds));
  assert.ok(replay.results.every((entry) => entry.idempotent && entry.outcome === "published"));
  const again = await h.call(adminPublishListingEventsHandler, staffPayload(h.eventWorkItemIds,
    {idempotencyKey: "staff-publish-0002"}));
  assert.equal(again.counts.alreadyPublished, h.eventWorkItemIds.length);
});

test("a governed blocker needs a staff resolution, and ended events stay blocked", async () => {
  const h = await harness({editEvent: (event) => {
    event.endAt = null;
  }});
  const results = await h.approved();
  assert.ok(results?.every((entry) => entry.outcome === "blocked" && entry.blockers.includes("missing_end_time")));
  const list = await h.call(adminListListingEventImportsHandler, {limit: 10, cursor: null});
  assert.deepEqual(list.rows[0].events.map((event) => [event.state, event.resolvableBlockers]),
    h.eventWorkItemIds.map(() => ["needs_resolution", ["missing_end_time"]]));
  const unresolved = await h.call(adminPublishListingEventsHandler, staffPayload(h.eventWorkItemIds));
  assert.equal(unresolved.counts.blocked, h.eventWorkItemIds.length);
  const resolved = await h.call(adminPublishListingEventsHandler, staffPayload(h.eventWorkItemIds, {
    idempotencyKey: "staff-publish-0003", blockerResolutions: h.eventWorkItemIds.map((eventWorkItemId) => ({
      eventWorkItemId, blockerCode: "missing_end_time", outcome: "resolved", policyGapDecisionId: null,
      note: "The Luma page says it runs two hours."}))}));
  assert.equal(resolved.counts.published, h.eventWorkItemIds.length);

  const ended = await harness({editEvent: (event) => {
    event.startAt = "2026-10-01T10:00:00.000Z";
    event.endAt = "2026-10-01T12:00:00.000Z";
  }});
  await ended.approved();
  const blocked = await ended.call(adminPublishListingEventsHandler, staffPayload(ended.eventWorkItemIds));
  assert.ok(blocked.results.every((entry) => entry.blockers.includes("event_already_ended")));
  assert.equal(externalEvents(ended.db).length, 0);
});

test("a reviewer supplies the map location a page left out; a resolved note alone cannot", async () => {
  const h = await harness({editEvent: (event) => {
    event.latitude = null;
    event.longitude = null;
    event.venue = null;
    event.address = null;
  }});
  await h.approved();
  const list = await h.call(adminListListingEventImportsHandler, {limit: 10, cursor: null});
  assert.ok(list.rows[0].events.every((event) => event.resolvableBlockers.includes("missing_exact_coordinates")));
  const noted = await h.call(adminPublishListingEventsHandler, staffPayload(h.eventWorkItemIds, {
    idempotencyKey: "staff-publish-0010", blockerResolutions: h.eventWorkItemIds.flatMap((eventWorkItemId) =>
      ["missing_exact_coordinates", "missing_location_detail"].map((blockerCode) => ({eventWorkItemId, blockerCode,
        outcome: "resolved", policyGapDecisionId: null, note: "Checked the venue on Luma."})))}));
  assert.ok(noted.results.every((entry) => entry.outcome === "blocked" &&
    entry.blockers.includes("missing_exact_coordinates")), "a note does not publish an event with no map location");
  const located = await h.call(adminPublishListingEventsHandler, staffPayload(h.eventWorkItemIds, {
    idempotencyKey: "staff-publish-0011", eventLocations: h.eventWorkItemIds.map((eventWorkItemId) => ({
      eventWorkItemId, name: "Carter Road Promenade", address: "Bandra West, Mumbai", placeId: null,
      latitude: 19.0596, longitude: 72.8227}))}));
  valid(validateAdminPublishListingEventsCallableResponse, located, "located publish response");
  assert.equal(located.counts.published, h.eventWorkItemIds.length);
  for (const [, doc] of externalEvents(h.db)) {
    valid(validateExternalEventDocument, doc, "located external event");
    const location = (doc as {meetingLocation: Record<string, unknown>}).meetingLocation;
    assert.deepEqual([location.name, location.address, location.latitude, location.longitude],
      ["Carter Road Promenade", "Bandra West, Mumbai", 19.0596, 72.8227]);
  }
  await assert.rejects(h.call(adminPublishListingEventsHandler, staffPayload(h.eventWorkItemIds, {
    eventLocations: [{eventWorkItemId: "another-event", name: null, address: null, placeId: null, latitude: 19,
      longitude: 72}]})), /not being published/);
  await assert.rejects(h.call(adminPublishListingEventsHandler, staffPayload(h.eventWorkItemIds, {
    eventLocations: [{eventWorkItemId: h.eventWorkItemIds[0], name: null, address: null, placeId: null,
      latitude: 91, longitude: 72}]})), /invalid|maximum|latitude/i);
});

test("a withdrawn event is never brought back, and an unapproved listing publishes nothing", async () => {
  const h = await harness();
  const [first] = (await h.approved())!;
  const eventPath = `externalEvents/${first.eventId}`;
  h.db.write(eventPath, {...h.db.read(eventPath)!, publicationStatus: "removed"});
  const rerun = await publishListingEvents({intakeRequestId: h.requestId, eventWorkItemIds: h.eventWorkItemIds,
    actor: {kind: "policy"}, executionMode: "apply", idempotencyKey: "auto-publish:rerun"}, h.deps);
  assert.equal(rerun.results[0].outcome, "withdrawn");
  assert.equal(h.db.read(eventPath)?.publicationStatus, "removed");
  const list = await h.call(adminListListingEventImportsHandler, {limit: 10, cursor: null});
  assert.equal(list.rows[0].events[0].state, "withdrawn");

  const pending = await harness({approve: false});
  assert.equal(await pending.approved(), null, "no approval, no policy run");
  const direct = await pending.call(adminPublishListingEventsHandler, staffPayload(pending.eventWorkItemIds));
  assert.ok(direct.results.every((entry) => entry.blockers.includes("organizer_listing_pending")));
  assert.equal(externalEvents(pending.db).length, 0);
});

test("staff publishing refuses an unchecked checklist, a stray resolution and other roles", async () => {
  const h = await harness({approve: true, editEvent: (event) => {
    event.title = "Singles social";
  }});
  await h.approved();
  await assert.rejects(h.call(adminPublishListingEventsHandler, staffPayload(h.eventWorkItemIds,
    {checklist: {outboundLinksReviewed: true, noCatchBookingPaymentsWaitlist: true, ownerSafeCopyReviewed: false}})),
  /Confirm the outbound links/);
  await assert.rejects(h.call(adminPublishListingEventsHandler, staffPayload(h.eventWorkItemIds,
    {blockerResolutions: [{eventWorkItemId: "another-event", blockerCode: "missing_end_time", outcome: "resolved",
      policyGapDecisionId: null, note: "x"}]})), /not being published/);
  await assert.rejects(h.call(adminPublishListingEventsHandler, staffPayload(["not-this-listing"])),
    /not an event of this listing/);
  for (const token of [{salesStaff: true}, {}]) {
    await assert.rejects(h.call(adminPublishListingEventsHandler, staffPayload(h.eventWorkItemIds), token),
      /permission|role|admin/i);
  }
  assert.equal(externalEvents(h.db).length, 0);
});

test("a refresh of a listed organizer's calendar runs on completion and publishes nothing twice", async () => {
  const h = await harness();
  const first = (await h.approved())!;
  const refresh = await h.call(adminRefreshOrganizerEventsHandler, {requestId: "refresh-001",
    organizerId: h.organizerId, urls: [CALENDAR]}, {salesStaff: true});
  const queued = h.db.read(`${supplyIntakeCollections.requests}/${refresh.requestId}`)!;
  assert.equal((queued.approval as {organizerId: string}).organizerId, h.organizerId,
    "a refresh carries the listed organizer's approval from the start");
  const {requestPath} = await completeIntake(h.db, queued.request as SupplyIntakeRequest);
  const completed = h.db.read(requestPath)!;
  const results = await publishApprovedListingEvents(refresh.requestId, {...completed, status: "running"},
    completed, h.deps);
  assert.deepEqual(results?.map((entry) => [entry.outcome, entry.eventId]),
    first.map((entry) => ["already_published", entry.eventId]));
  assert.equal(externalEvents(h.db).length, first.length);
  const list = await h.call(adminListListingEventImportsHandler, {limit: 10, cursor: null});
  assert.deepEqual(list.rows.map((row) => row.intakeRequestId).sort(), [h.requestId, refresh.requestId].sort());
});

test("imported events page through approved listings, newest approval first", async () => {
  const h = await harness();
  const stored = h.db.read(h.requestPath)!;
  const approval = stored.approval as Record<string, unknown>;
  h.db.write(`${supplyIntakeCollections.requests}/nom-older-1`, {...stored, requestId: "nom-older-1",
    approval: {...approval, approvedAt: "2026-10-01T08:00:00.000Z"}});
  const first = await h.call(adminListListingEventImportsHandler, {limit: 1, cursor: null});
  assert.deepEqual(first.rows.map((row) => row.intakeRequestId), [h.requestId]);
  assert.ok(first.nextCursor);
  const second = await h.call(adminListListingEventImportsHandler, {limit: 1, cursor: first.nextCursor});
  assert.deepEqual([second.rows.map((row) => row.intakeRequestId), second.nextCursor], [["nom-older-1"], null]);
  await assert.rejects(h.call(adminListListingEventImportsHandler, {limit: 1, cursor: "bm90LWpzb24"}),
    /cursor is invalid/);
});
