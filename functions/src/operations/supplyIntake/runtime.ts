/* eslint-disable max-len */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {pathToFileURL} from "node:url";

// The packaged Operations runtime that the build copies into lib (see
// functions/scripts/copy-operations-runtime.cjs). Functions never
// reimplements gathering, listing assembly, review rules or projection: it
// runs the reviewed workflow and imports the projection it produces.

export interface IntakeCaptureReceipt {
  schemaVersion: 1;
  runKey: string;
  adapterId: string;
  policyVersion: string;
  policyDecisionId: string | null;
  requestedUrl: string;
  finalUrl: string | null;
  outcome: string;
  status: number | null;
  contentType: string | null;
  capturedAt: string | null;
  snapshotHash: string | null;
  snapshotBytes: number;
  networkRequestsConsumed: number;
  rawPayloadPersistence: "external_artifact_store_only";
  firestorePersistenceAllowed: false;
}

export interface IntakePageSnapshot {
  contentHash: string;
  [key: string]: unknown;
}

export interface IntakePageSource {
  capture(input: {runKey: string; url: string}): Promise<{
    snapshot: IntakePageSnapshot | null; receipt: IntakeCaptureReceipt}>;
}

interface PackagedIntake {
  loadSupplyAcquisitionPolicy: () => Promise<AcquisitionPolicy>;
  assertSupplyIntakeRequest: (value: unknown) => SupplyIntakeRequest;
  gatherIntakeEvidence: (input: Record<string, unknown>) => Promise<GatheredEvidence>;
  buildIntakeListing: (input: Record<string, unknown>) => IntakeListing;
  intakeInputSnapshot: (input: {listing: IntakeListing}) => Record<string, unknown>;
  pageFetchBudgetLedgers: (input: Record<string, unknown>) => PageFetchLedgers;
  GuardedPageFetchPort: new (options: Record<string, unknown>) => IntakePageSource;
  StaticPageSource: new (options: Record<string, unknown>) => IntakePageSource;
  SupplyIntakeWorkflow: new (options: Record<string, unknown>) => {
    createPlan: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
  };
  OperationsEngine: new (options: Record<string, unknown>) => {
    start: (plan: Record<string, unknown>) => Promise<{run: {runId: string; status: string}}>;
  };
  FileOperationsStore: new (root: string) => {initialize: () => Promise<OperationsStore>};
  buildAdminProjection: (run: unknown, items: unknown[], actions: unknown[], checkpoints: unknown[]) => Record<string, unknown>;
}

interface OperationsStore {
  requireRun: (runId: string) => Promise<unknown>;
  listWorkItems: (filter: {runId: string}) => Promise<Array<{workItemId: string; adminProjection?: {recordType?: string}}>>;
  listActions: (runId: string) => Promise<unknown[]>;
  listCheckpoints: (runId: string) => Promise<unknown[]>;
}

export interface PageFetchLedgers {
  monthKey: string;
  intake: {snapshot: () => {consumed: {networkRequests: number}}};
  month: {snapshot: () => {consumed: {networkRequests: number}}};
}

export interface AcquisitionPolicy {
  policyVersion: string;
  pageFetch: {
    enabled: boolean;
    decisionId: string | null;
    maxRequestsPerIntake: number;
    maxRequestsPerMonth: number;
  };
}

export interface SupplyIntakeRequest {
  schemaVersion: 1;
  requestId: string;
  kind: "nomination" | "self_submission" | "discovery";
  market: string;
  seed: {name: string | null; urls: string[]; notes: string | null; categories: string[]};
  submittedBy: {role: "associate" | "partner" | "organizer" | "system"; uid: string | null; partnerId: string | null};
  submittedAt: string;
}

interface GatheredEvidence {
  requestId: string;
  pages: Array<{receipt: IntakeCaptureReceipt}>;
  stoppedReason: string | null;
}

export interface IntakeListing {
  listingId: string;
  contentHash: string;
  gaps: string[];
  researchNeeded: boolean;
  events: unknown[];
}

const modules = [
  ["intake-request.mjs", "workflows/supply-intake/intake-request.mjs"],
  ["page-capture.mjs", "workflows/supply-intake/page-capture.mjs"],
  ["acquisition.mjs", "workflows/supply-intake/acquisition.mjs"],
  ["workflow.mjs", "workflows/supply-intake/workflow.mjs"],
  ["engine.mjs", "platform/engine.mjs"],
  ["file-store.mjs", "platform/storage/file-store.mjs"],
  ["read-models.mjs", "platform/read-models.mjs"],
] as const;

let packaged: Promise<PackagedIntake> | null = null;

/** Loads the copied Operations modules once per instance. */
export function packagedIntake(): Promise<PackagedIntake> {
  packaged ??= (async () => {
    const root = path.resolve(__dirname, "../..", "operations", "src");
    const loaded = await Promise.all(modules.map(([, relative]) =>
      import(pathToFileURL(path.join(root, relative)).href)));
    return Object.assign({}, ...loaded) as PackagedIntake;
  })().catch((error: unknown) => {
    // A failed load is retried by the next request rather than kept for the
    // life of the instance.
    packaged = null;
    throw error;
  });
  return packaged;
}

export interface IntakeRunResult {
  listing: IntakeListing;
  receipts: IntakeCaptureReceipt[];
  snapshots: IntakePageSnapshot[];
  stoppedReason: string | null;
  runId: string;
  listingWorkItemId: string;
  eventWorkItemIds: string[];
  projection: Record<string, unknown>;
}

/**
 * Gathers one request's pages, builds its listing and runs Supply Intake in a
 * scratch store. The returned projection is the only thing that becomes
 * durable Firestore state; snapshots go to the server-only artifact store.
 */
export async function runSupplyIntake({request, pageSource, now}: {
  request: SupplyIntakeRequest;
  pageSource: IntakePageSource;
  now: () => Date;
}): Promise<IntakeRunResult> {
  const runtime = await packagedIntake();
  const intake = runtime.assertSupplyIntakeRequest(request);
  const snapshots: IntakePageSnapshot[] = [];
  const recordingSource: IntakePageSource = {
    capture: async (input) => {
      const captured = await pageSource.capture(input);
      if (captured.snapshot) snapshots.push(captured.snapshot);
      return captured;
    },
  };
  const startedAt = now().toISOString();
  const gathered = await runtime.gatherIntakeEvidence({request: intake, pageSource: recordingSource, now: startedAt});
  const listing = runtime.buildIntakeListing({request: intake, gathered, now: startedAt});
  const inputSnapshot = runtime.intakeInputSnapshot({listing});
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "catch-supply-intake-"));
  try {
    const store = await new runtime.FileOperationsStore(scratch).initialize();
    // An intake request reads the pages it was given and plans no market
    // discovery, so it runs for any city, including one discovery has not
    // mapped (a nomination's unknown city arrives as "unassigned").
    const workflow = new runtime.SupplyIntakeWorkflow({inputSnapshotLoader: async () => inputSnapshot,
      discoveryPlanner: async ({market}: {market: string}) => ({schemaVersion: 1,
        plannerId: "operations-supply-discovery-v1", market, planned: []})});
    const plan = await workflow.createPlan({market: intake.market,
      through: throughDate(now()), now: startedAt});
    const engine = new runtime.OperationsEngine({store, workflow, clock: now,
      workerId: `supply-intake-${intake.requestId}`});
    const {run} = await engine.start(plan);
    if (run.status !== "completed") {
      throw new Error(`Supply Intake run ${run.runId} ended ${run.status}.`);
    }
    const items = await store.listWorkItems({runId: run.runId});
    const listingItem = items.find((item) =>
      item.adminProjection?.recordType === "organizer_listing_draft");
    if (!listingItem) throw new Error("Supply Intake produced no listing work item.");
    const projection = runtime.buildAdminProjection(await store.requireRun(run.runId), items,
      await store.listActions(run.runId), await store.listCheckpoints(run.runId));
    return {
      listing,
      receipts: gathered.pages.map((page) => page.receipt),
      snapshots,
      stoppedReason: gathered.stoppedReason,
      runId: run.runId,
      listingWorkItemId: listingItem.workItemId,
      eventWorkItemIds: items.filter((item) =>
        item.adminProjection?.recordType === "listing_event_candidate").map((item) => item.workItemId).sort(),
      projection,
    };
  } finally {
    await fs.rm(scratch, {recursive: true, force: true});
  }
}

// Events are collected through the end of the next full year so a listing
// shows everything the organizer has announced; the workflow drops nothing
// that starts before this date.
function throughDate(now: Date): string {
  return `${now.getUTCFullYear() + 1}-12-31`;
}
