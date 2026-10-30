/* eslint-disable max-len */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {pathToFileURL} from "node:url";
import type {LinkSearchPort, WebSearchPolicy} from "./linkSearch";

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
  organizerReferenceFromDocument: (organizerId: string, document: unknown) => OrganizerReference;
  intakeInputSnapshot: (input: {listing: IntakeListing}) => Record<string, unknown>;
  pageFetchBudgetLedgers: (input: Record<string, unknown>) => PageFetchLedgers;
  assertAcceptedAcquisitionDecision: (decision: unknown, expected: {decisionId: string; gapId: string}) => void;
  GuardedPageFetchPort: new (options: Record<string, unknown>) => IntakePageSource;
  StaticPageSource: new (options: Record<string, unknown>) => IntakePageSource;
  InstagramDiscoveryPageSource: new (options: Record<string, unknown>) => IntakePageSource;
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
  webSearch: WebSearchPolicy;
}

export interface SupplyIntakeRequest {
  schemaVersion: 1;
  requestId: string;
  kind: "nomination" | "self_submission" | "discovery" | "event_refresh";
  market: string;
  /** The listed organizer an event_refresh reads events for. */
  target?: {organizerId: string};
  seed: {name: string | null; urls: string[]; notes: string | null; categories: string[]};
  submittedBy: {role: "associate" | "partner" | "organizer" | "system"; uid: string | null; partnerId: string | null};
  submittedAt: string;
}

interface GatheredEvidence {
  requestId: string;
  pages: Array<{receipt: IntakeCaptureReceipt}>;
  stoppedReason: string | null;
}

/** An organizer Catch already lists, in the shape the organizer matcher reads. */
export interface OrganizerReference {
  organizerId: string;
  name: string | null;
  slug: string | null;
  markets: string[];
  instagramHandle: string | null;
  links: string[];
}

export interface IntakeDuplicateCheck {
  policyId: string;
  authority: "advisory";
  verdict: "match" | "ambiguous" | "none";
  reasons: string[];
  organizersCompared: number;
  inventoryHash: string;
  candidates: Array<{
    organizerId: string;
    name: string | null;
    score: number;
    band: "match" | "probable" | "review" | "low";
    signals: string[];
    conflicts: string[];
    rationale: string;
  }>;
}

export interface IntakeListing {
  listingId: string;
  contentHash: string;
  gaps: string[];
  researchNeeded: boolean;
  events: unknown[];
  /** Present only when the run compared the listing with an organizer inventory. */
  duplicateCheck?: IntakeDuplicateCheck;
}

const modules = [
  ["intake-request.mjs", "workflows/supply-intake/intake-request.mjs"],
  ["organizer-matching/matcher.mjs", "workflows/supply-intake/organizer-matching/matcher.mjs"],
  ["page-capture.mjs", "workflows/supply-intake/page-capture.mjs"],
  ["instagram-discovery.mjs", "workflows/supply-intake/instagram-discovery.mjs"],
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

export interface ParsedNominationMessage {
  nominations: Array<{urls: string[]; notes: string | null}>;
  unreadable: string[];
  droppedNominations: number;
}

let messageParser: Promise<{parseNominationMessage: (text: string) => ParsedNominationMessage}> | null = null;

/** Loads only the message parser, which nomination routing needs on every inbound message. */
export function packagedMessageParser(): Promise<{parseNominationMessage: (text: string) => ParsedNominationMessage}> {
  messageParser ??= import(pathToFileURL(path.resolve(__dirname, "../..", "operations", "src",
    "workflows/supply-intake/message-nomination.mjs")).href).catch((error: unknown) => {
    messageParser = null;
    throw error;
  });
  return messageParser;
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
 * Given the organizers Catch already lists, the listing carries an advisory
 * duplicate check; null skips the check.
 */
export async function runSupplyIntake({request, pageSource, now, existingOrganizers = null, linkSearch = null}: {
  request: SupplyIntakeRequest;
  pageSource: IntakePageSource;
  now: () => Date;
  existingOrganizers?: OrganizerReference[] | null;
  /** Searches a handle when the nominated pages can't be read; null keeps search off. */
  linkSearch?: LinkSearchPort | null;
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
  const gathered = await runtime.gatherIntakeEvidence({request: intake, pageSource: recordingSource, now: startedAt,
    linkSearch});
  const listing = runtime.buildIntakeListing({request: intake, gathered, now: startedAt, existingOrganizers});
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
