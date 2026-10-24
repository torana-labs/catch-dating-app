/* eslint-disable max-len */
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import path from "node:path";
import test from "node:test";
import type {Firestore} from "firebase-admin/firestore";
import type {OperationRun, OperationWorkItem} from "../models";
import type {ProjectionImportWriter} from "../projectionImporter";
import {FakeFirestore} from "../testFirestore";
import {validateSupplyIntakeRequestsDocument} from "../../shared/generated/validators/supplyIntakeRequestsDocument";
import {processSupplyIntakeRequest, supplyIntakeCollections, SUPPLY_INTAKE_MAX_ATTEMPTS} from "./worker";

// The build post-step copies the Operations runtime into lib; tests use it.
execFileSync(process.execPath, [path.join(__dirname, "../../../scripts/copy-operations-runtime.cjs")]);

const NOW = "2026-10-24T08:00:00.000Z";

interface Stored {
  status: string;
  attempts: number;
  leaseUntil: string | null;
  result: {
    gaps: string[];
    researchNeeded: boolean;
    listingWorkItemId: string;
    captureReceipts: Array<{adapterId: string; outcome: string}>;
  };
  failure: {code: string; attempts: number};
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

function setup(stored: Record<string, unknown> = {}) {
  const db = new FakeFirestore();
  db.write(`${supplyIntakeCollections.requests}/nom-afterfly-1`, {schemaVersion: 1, requestId: "nom-afterfly-1",
    request: request(), status: "queued", attempts: 0, leaseUntil: null, result: null, failure: null,
    approval: null, createdAt: NOW, updatedAt: NOW, ...stored});
  const writer = new MemoryWriter();
  const snapshots: string[] = [];
  const deps = {db: db as unknown as Firestore, now: () => new Date(NOW), projectionWriter: writer,
    putSnapshot: async (requestId: string, snapshot: {contentHash: string}) => {
      const name = `supply-intake/snapshots/${requestId}/${snapshot.contentHash}.json`;
      snapshots.push(name);
      return name;
    }};
  return {db, writer, snapshots, deps};
}

test("a queued request becomes a reviewable listing in Firestore, once", async () => {
  const {db, writer, deps} = setup();
  assert.equal(await processSupplyIntakeRequest(deps, "nom-afterfly-1"), "completed");
  const stored = db.read(`${supplyIntakeCollections.requests}/nom-afterfly-1`) as unknown as Stored;
  assert.equal(validateSupplyIntakeRequestsDocument(stored), true,
    JSON.stringify(validateSupplyIntakeRequestsDocument.errors));
  assert.equal(stored.status, "completed");
  assert.equal(stored.leaseUntil, null);
  // Live fetching is off by policy: the listing forms from the nomination and
  // records the unread seed as a gap.
  assert.ok(stored.result.gaps.includes("seed_page_unreadable"));
  assert.equal(stored.result.researchNeeded, true);
  assert.deepEqual(stored.result.captureReceipts.map((receipt) => [receipt.adapterId, receipt.outcome]),
    [["static_page", "not_captured"]]);
  const listing = writer.items.get(stored.result.listingWorkItemId)!;
  assert.equal((listing.normalizedPayload as {intake?: {recordType?: string}}).intake?.recordType, "organizer_listing_draft");
  assert.ok(listing.taskFlags.includes("human_review_required"));
  assert.equal(writer.runs.size, 1);
  assert.equal(await processSupplyIntakeRequest(deps, "nom-afterfly-1"), "skipped", "a completed request never reruns");
});

test("a leased request is left to its worker and an expired lease is taken over", async () => {
  const busy = setup({status: "running", attempts: 1, leaseUntil: "2026-10-24T08:05:00.000Z"});
  assert.equal(await processSupplyIntakeRequest(busy.deps, "nom-afterfly-1"), "busy");
  const stale = setup({status: "running", attempts: 1, leaseUntil: "2026-10-24T07:00:00.000Z"});
  assert.equal(await processSupplyIntakeRequest(stale.deps, "nom-afterfly-1"), "completed");
  assert.equal((stale.db.read(`${supplyIntakeCollections.requests}/nom-afterfly-1`) as unknown as Stored).attempts, 2);
  assert.equal(await processSupplyIntakeRequest(setup().deps, "missing"), "skipped");
});

test("failures release the lease for a retry, and the last attempt or a contract error is terminal", async () => {
  const failing = setup();
  failing.deps.projectionWriter.createRun = async () => {
    throw new Error("transient write failure");
  };
  assert.equal(await processSupplyIntakeRequest(failing.deps, "nom-afterfly-1"), "retry");
  let stored = failing.db.read(`${supplyIntakeCollections.requests}/nom-afterfly-1`) as unknown as Stored;
  assert.deepEqual([stored.status, stored.leaseUntil, stored.failure.attempts], ["queued", null, 1]);

  const last = setup({attempts: SUPPLY_INTAKE_MAX_ATTEMPTS - 1});
  last.deps.projectionWriter.createRun = async () => {
    throw new Error("still failing");
  };
  assert.equal(await processSupplyIntakeRequest(last.deps, "nom-afterfly-1"), "failed");

  const invalid = setup({request: request({kind: "discovery"})});
  assert.equal(await processSupplyIntakeRequest(invalid.deps, "nom-afterfly-1"), "failed");
  stored = invalid.db.read(`${supplyIntakeCollections.requests}/nom-afterfly-1`) as unknown as Stored;
  assert.equal(stored.failure.code, "INVALID_INTAKE_REQUEST");
  stored = failing.db.read(`${supplyIntakeCollections.requests}/nom-afterfly-1`) as unknown as Stored;
  assert.equal(validateSupplyIntakeRequestsDocument(stored), true, "a failed attempt still satisfies the contract");
});
