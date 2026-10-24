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
import {schemaErrorMessages, validateAdminListOrganizerListingReviewsCallableResponse} from "../shared/generated/schemaValidators";
import {adminListOrganizerListingReviewsHandler, publicSlugFor} from "./organizerListingReviewQueue";

// The build post-step copies the Operations runtime into lib; the worker uses it.
execFileSync(process.execPath, [path.join(__dirname, "../../scripts/copy-operations-runtime.cjs")]);

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

/** Three listings the real worker built, completed an hour apart, oldest first. */
async function harness() {
  const db = new FakeFirestore();
  const writer = new MemoryWriter();
  const names = ["Afterfly", "The Bhag", "Sunday Sketchers"];
  for (const [index, name] of names.entries()) {
    const requestId = `nom-listing-${index}`;
    const at = `2026-10-24T${String(8 + index).padStart(2, "0")}:00:00.000Z`;
    db.write(`${supplyIntakeCollections.requests}/${requestId}`, {schemaVersion: 1, requestId,
      request: {schemaVersion: 1, requestId, kind: "nomination", market: index === 2 ? "bengaluru" : "mumbai",
        seed: {name, urls: [`https://lu.ma/listing-${index}`], notes: null, categories: ["social"]},
        submittedBy: {role: "associate", uid: "associate-1", partnerId: null}, submittedAt: at, origin: null},
      status: "queued", attempts: 0, leaseUntil: null, result: null, failure: null, approval: null,
      createdAt: at, updatedAt: at});
    const outcome = await processSupplyIntakeRequest({db: db as unknown as Firestore, now: () => new Date(at),
      projectionWriter: writer, putSnapshot: async () => "supply-intake/snapshots/x.json"}, requestId);
    const stored = db.read(`${supplyIntakeCollections.requests}/${requestId}`) as {result: {listingWorkItemId: string}, failure: unknown};
    assert.equal(outcome, "completed", JSON.stringify(stored.failure));
    db.write(`operationWorkItems/${stored.result.listingWorkItemId}`,
      writer.items.get(stored.result.listingWorkItemId) as unknown as Record<string, unknown>);
  }
  const deps = {firestore: () => db as unknown as FirebaseFirestore.Firestore};
  const call = (data: Record<string, unknown>, token: Record<string, unknown> = {admin: true}) =>
    adminListOrganizerListingReviewsHandler({auth: {uid: "admin-1", token}, data,
      rawRequest: {headers: {}}} as unknown as CallableRequest<unknown>, deps as never);
  return {db, call};
}

const valid = (response: unknown) => assert.equal(validateAdminListOrganizerListingReviewsCallableResponse(response), true,
  schemaErrorMessages(validateAdminListOrganizerListingReviewsCallableResponse as never).join("; "));

test("listings awaiting approval are listed newest first, a page at a time", async () => {
  const h = await harness();
  const first = await h.call({limit: 2, cursor: null});
  valid(first);
  assert.deepEqual(first.rows.map((row) => row.requestId), ["nom-listing-2", "nom-listing-1"]);
  assert.ok(first.nextCursor);
  const second = await h.call({limit: 2, cursor: first.nextCursor});
  valid(second);
  assert.deepEqual([second.rows.map((row) => row.requestId), second.nextCursor], [["nom-listing-0"], null]);
  const row = second.rows[0];
  assert.deepEqual([row.kind, row.submittedByRole, row.origin, row.suggestedSlug], ["nomination", "associate", "none", "afterfly"]);
  assert.deepEqual(row.market, {slug: "mumbai", marketId: "in-mh-mumbai", label: row.market.label, open: true});
  assert.match(row.listing.contentHash, /^[a-f0-9]{64}$/);
  // Fetching is off by policy here, so the seed page is a gap to research.
  assert.ok(row.listing.gaps.includes("seed_page_unreadable"));
  assert.equal(row.listing.fetchedPageCount, 0);
  // A market Catch has not opened cannot take an approval until it opens.
  assert.deepEqual([first.rows[0].market.slug, first.rows[0].market.marketId, first.rows[0].market.open],
    ["bengaluru", "in-ka-bengaluru", false]);
});

test("approved, unfinished and unreadable listings are not offered for review", async () => {
  const h = await harness();
  const path0 = `${supplyIntakeCollections.requests}/nom-listing-0`;
  h.db.write(path0, {...h.db.read(path0)!, approval: {approvalId: "listing-" + "0".repeat(40), organizerId: "org-1",
    approvedByUid: "admin-1", approvedAt: "2026-10-24T12:00:00.000Z", materialHash: "0".repeat(64), salesOwnerUid: "admin-1"}});
  const path1 = `${supplyIntakeCollections.requests}/nom-listing-1`;
  h.db.write(path1, {...h.db.read(path1)!, status: "running"});
  const path2 = `${supplyIntakeCollections.requests}/nom-listing-2`;
  const stored2 = h.db.read(path2) as {result: {listingWorkItemId: string}};
  h.db.remove(`operationWorkItems/${stored2.result.listingWorkItemId}`);
  const response = await h.call({limit: 10, cursor: null});
  valid(response);
  assert.deepEqual([response.rows, response.unavailableCount], [[], 1]);
});

test("support can read the queue but not approve; others cannot read it", async () => {
  const h = await harness();
  assert.equal((await h.call({limit: 5, cursor: null}, {support: true})).canApprove, false);
  assert.equal((await h.call({limit: 5, cursor: null}, {adminOwner: true})).canApprove, true);
  for (const token of [{salesStaff: true}, {}]) {
    await assert.rejects(h.call({limit: 5, cursor: null}, token), /permission|role|admin/i);
  }
  await assert.rejects(h.call({limit: 5, cursor: "not-a-cursor"}), /cursor is invalid/);
  await assert.rejects(h.call({limit: 51, cursor: null}));
});

test("suggested slugs are route-safe", () => {
  assert.equal(publicSlugFor("The Bhag — Sunday Runs!"), "the-bhag-sunday-runs");
  assert.equal(publicSlugFor("Ö"), "organizer-o");
  assert.match(publicSlugFor("x".repeat(90)), /^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])$/);
});
