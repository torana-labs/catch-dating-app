/* eslint-disable max-len */
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import path from "node:path";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import type {Firestore} from "firebase-admin/firestore";
import type {OperationRun, OperationWorkItem} from "../operations/models";
import type {ProjectionImportWriter} from "../operations/projectionImporter";
import {FakeFirestore} from "../operations/testFirestore";
import {processSupplyIntakeRequest, supplyIntakeCollections} from "../operations/supplyIntake/worker";
import {
  schemaErrorMessages,
  validateAdminApproveOrganizerListingCallableResponse,
  validateOrganizerDocument,
  validateOrganizerIntakeCurationDecisionDocument,
  validateOrganizerIntakeReviewDecisionDocument,
  validateOrganizerSalesAccountDocument,
  validateSalesActivityDocument,
  validateSalesInboundIntentsDocument,
  validateSalesOpportunityDocument,
  validateSalesTaskDocument,
  validateSupplyIntakeRequestsDocument,
} from "../shared/generated/schemaValidators";
import {adminApproveOrganizerListingHandler, listingApprovalId} from "./organizerListingApproval";

// The build post-step copies the Operations runtime into lib; the worker uses it.
execFileSync(process.execPath, [path.join(__dirname, "../../scripts/copy-operations-runtime.cjs")]);

const NOW = "2026-10-24T08:00:00.000Z";
const SERVER_TIME = {_seconds: 1792828800, _nanoseconds: 0};

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

/** The real worker builds the listing; the test then gives it the page links fetching would find. */
interface HarnessOptions {
  submittedBy?: {role: string; uid: string | null; partnerId: string | null};
  origin?: {kind: string; id: string} | null;
  intent?: Record<string, unknown> | null;
}

async function harness({submittedBy = {role: "associate", uid: "associate-1", partnerId: null},
  origin = null, intent = null}: HarnessOptions = {}) {
  const db = new FakeFirestore();
  const requestId = "nom-afterfly-1";
  db.write(`${supplyIntakeCollections.requests}/${requestId}`, {schemaVersion: 1, requestId,
    request: {schemaVersion: 1, requestId, kind: submittedBy.role === "associate" ? "nomination" :
      submittedBy.role === "partner" ? "nomination" : "self_submission", market: "mumbai",
    seed: {name: "Afterfly", urls: ["https://lu.ma/afterfly"], notes: null, categories: ["social"]},
    submittedBy, submittedAt: NOW, origin},
    status: "queued", attempts: 0, leaseUntil: null, result: null, failure: null, approval: null,
    createdAt: NOW, updatedAt: NOW});
  if (origin && intent) db.write(`salesInboundIntents/${origin.id}`, intent);
  const writer = new MemoryWriter();
  assert.equal(await processSupplyIntakeRequest({db: db as unknown as Firestore, now: () => new Date(NOW),
    projectionWriter: writer, putSnapshot: async () => "supply-intake/snapshots/x.json"}, requestId), "completed");
  const stored = db.read(`${supplyIntakeCollections.requests}/${requestId}`) as {result: {listingWorkItemId: string}};
  const workItem = structuredClone(writer.items.get(stored.result.listingWorkItemId)!);
  const listing = (workItem.normalizedPayload.intake as {listing: Record<string, any>}).listing; // eslint-disable-line @typescript-eslint/no-explicit-any
  listing.organizer.description = "Weekly social nights for people who would rather meet in person.";
  listing.organizer.links = [{platform: "luma", surfaceKind: "calendar", url: "https://lu.ma/afterfly",
    normalizedKey: "lu.ma/afterfly", evidenceUrl: "https://lu.ma/afterfly"}];
  db.write(`operationWorkItems/${workItem.workItemId}`, workItem as unknown as Record<string, unknown>);
  const routes: unknown[] = [];
  const deps = {
    firestore: () => db as unknown as FirebaseFirestore.Firestore,
    serverTimestamp: () => SERVER_TIME as unknown as FirebaseFirestore.FieldValue,
    now: () => new Date(NOW),
    reserveCanonicalRoute: async (_tx: unknown, _db: unknown, options: {canonicalPath: string}) => {
      routes.push(options.canonicalPath);
    },
  };
  const payload = (overrides: Record<string, unknown> = {}) => ({
    requestId: "approve-afterfly-1", listingWorkItemId: workItem.workItemId,
    contentHash: listing.contentHash as string, name: "Afterfly", publicSlug: "afterfly",
    marketId: "in-mh-mumbai", organizerType: "community",
    checklist: {identityReviewed: true, surfaceInventoryReviewed: true, ownerSafeCopyReviewed: true,
      marketScopeReviewed: true, mediaRightsReviewed: true, crawlDisabledReviewed: true,
      claimTargetReviewed: true, takedownPathReviewed: true, impersonationReviewed: true},
    note: "Checked the Luma calendar and the description against it.", ...overrides,
  });
  const call = (data: Record<string, unknown>, token: Record<string, unknown> = {admin: true}, uid = "admin-1") =>
    adminApproveOrganizerListingHandler({auth: {uid, token}, data,
      rawRequest: {headers: {}}} as unknown as CallableRequest<unknown>, deps as never);
  return {db, deps, routes, listing, workItem, requestId, payload, call};
}

test("an approved listing is published unclaimed and noindex, with its Sales work, in one step", async () => {
  const h = await harness();
  const response = await h.call(h.payload());
  valid(validateAdminApproveOrganizerListingCallableResponse, response, "AdminApproveOrganizerListingCallableResponse");
  const approvalId = listingApprovalId(h.listing.listingId as string);
  assert.deepEqual([response.approvalId, response.created, response.salesOwnerUid], [approvalId, true, "associate-1"]);
  const organizer = h.db.read(`organizers/${response.organizerId}`)!;
  valid(validateOrganizerDocument, organizer, "OrganizerDocument");
  assert.deepEqual(organizer.publicPage, {slug: "afterfly", citySlug: "mumbai", canonicalPath: "/organizers/afterfly/",
    publishStatus: "published", indexStatus: "noindex", robots: "noindex, follow", seoTitle: null,
    seoDescription: null, lastRenderedAt: null});
  assert.deepEqual([organizer.appVisibility, (organizer.claim as {state: string}).state, organizer.imageUrl],
    ["hidden", "unclaimed", null]);
  assert.deepEqual((organizer.publicSources as Array<{href: string}>).map((source) => source.href), ["https://lu.ma/afterfly"]);
  assert.deepEqual(h.routes, ["/organizers/afterfly/"]);
  const decision = h.db.read(`organizerIntakeReviewDecisions/${response.organizerId}`);
  valid(validateOrganizerIntakeReviewDecisionDocument, decision, "OrganizerIntakeReviewDecisionDocument");
  assert.equal(decision?.decisionStatus, "approved_public");
  valid(validateOrganizerIntakeCurationDecisionDocument, h.db.read(`organizerIntakeCurationDecisions/${approvalId}`), "OrganizerIntakeCurationDecisionDocument");
  const request = h.db.read(`${supplyIntakeCollections.requests}/${h.requestId}`);
  valid(validateSupplyIntakeRequestsDocument, request, "SupplyIntakeRequestsDocument");
  assert.equal((request?.approval as {organizerId: string}).organizerId, response.organizerId);

  // The associate who nominated the organizer owns its Sales work.
  const account = h.db.read(`organizerSalesAccounts/${response.organizerId}`);
  valid(validateOrganizerSalesAccountDocument, account, "OrganizerSalesAccountDocument");
  assert.equal(account?.assignedOwnerUid, "associate-1");
  const opportunity = h.db.read(`salesOpportunities/${approvalId}_opportunity`);
  valid(validateSalesOpportunityDocument, opportunity, "SalesOpportunityDocument");
  assert.deepEqual([opportunity?.stage, opportunity?.ownerUid], ["new_enquiry", "associate-1"]);
  for (const [suffix, kind] of [["review", "research"], ["claim", "follow_up"]]) {
    const task = h.db.read(`salesTasks/${approvalId}_${suffix}`);
    valid(validateSalesTaskDocument, task, "SalesTaskDocument");
    assert.deepEqual([task?.kind, task?.status, task?.ownerUid], [kind, "open", "associate-1"]);
  }
  const activity = h.db.read(`salesActivities/${approvalId}_approved`);
  valid(validateSalesActivityDocument, activity, "SalesActivityDocument");
  assert.deepEqual(activity?.source, {kind: "supply_intake", requestId: h.requestId, approvalId, origin: "none"});
  assert.match(String(activity?.note), /associate nomination/);
  assert.equal(h.db.entries().filter(([key]) => key.startsWith("adminAuditLogs/")).length, 1);

  // A retry replays; a different approval of the same listing is refused.
  const before = h.db.entries().length;
  assert.deepEqual(await h.call(h.payload({requestId: "approve-afterfly-retry"})), {...response, created: false});
  assert.equal(h.db.entries().length, before);
  await assert.rejects(h.call(h.payload({name: "Afterfly Club"})), /already approved as organizer/);
});

test("a partner's or organizer's enquiry is linked to the organizer it became", async () => {
  const intentId = "9".repeat(64);
  const intent = {schemaVersion: 1, revision: 3, classification: "sales_private", intentId,
    source: "partner", submissionId: "sub-9", requestHash: "a".repeat(64), waitlistId: "wl-9",
    status: "needs_identity_review", organizerId: null, evidenceStatus: "self_reported", fullName: "Asha Rao",
    email: null, city: "Mumbai", entryRoute: "/partners/", alreadyJoined: false,
    hostApplication: null, createdAt: SERVER_TIME, updatedAt: SERVER_TIME, partnerUid: "partner-9"};
  const h = await harness({submittedBy: {role: "partner", uid: "partner-9", partnerId: "partner-9"},
    origin: {kind: "sales_inbound_intent", id: intentId}, intent});
  const response = await h.call(h.payload());
  // A partner is credited through the enquiry; a Catch employee owns the Sales work.
  assert.equal(response.salesOwnerUid, "admin-1");
  const linked = h.db.read(`salesInboundIntents/${intentId}`);
  valid(validateSalesInboundIntentsDocument, linked, "SalesInboundIntentsDocument");
  assert.deepEqual([linked?.status, linked?.organizerId, linked?.revision, linked?.linkedBy],
    ["linked", response.organizerId, 4, "admin-1"]);
  const activity = h.db.read(`salesActivities/${response.approvalId}_approved`);
  assert.deepEqual([(activity?.source as {origin: string}).origin, /partner nomination/.test(String(activity?.note))],
    ["sales_inbound_intent", true]);
});

test("approval is refused for a stale review, a closed market, an unchecked item or a non-admin", async () => {
  const h = await harness();
  await assert.rejects(h.call(h.payload({contentHash: "f".repeat(64)})), /rebuilt after you reviewed it/);
  await assert.rejects(h.call(h.payload({marketId: "us-ny-new-york"})), /open organizer launch market/);
  await assert.rejects(h.call(h.payload({checklist: {...h.payload().checklist, impersonationReviewed: false}})));
  for (const token of [{support: true}, {salesStaff: true}, {}]) {
    await assert.rejects(h.call(h.payload(), token), /permission|role|admin/i);
  }
  await assert.rejects(h.call(h.payload({listingWorkItemId: "missing-item"})), /not found/);
  assert.equal(h.db.entries().filter(([key]) => key.startsWith("organizers/")).length, 0, "nothing was published");
});

test("a request that has not finished, or was already approved, cannot be approved again", async () => {
  const h = await harness();
  const requestPath = `${supplyIntakeCollections.requests}/${h.requestId}`;
  const stored = h.db.read(requestPath)!;
  h.db.write(requestPath, {...stored, status: "running"});
  await assert.rejects(h.call(h.payload()), /not ready for approval/);
  h.db.write(requestPath, {...stored, approval: {approvalId: "listing-" + "0".repeat(40), organizerId: "other",
    approvedByUid: "admin-2", approvedAt: NOW, materialHash: "0".repeat(64), salesOwnerUid: "admin-2"}});
  await assert.rejects(h.call(h.payload()), /not ready for approval/);
});
