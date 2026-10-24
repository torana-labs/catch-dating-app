/* eslint-disable max-len */
import type {Firestore} from "firebase-admin/firestore";
import {importShadowProjection, type ProjectionImportWriter} from "../projectionImporter";
import {
  packagedIntake,
  runSupplyIntake,
  type AcquisitionPolicy,
  type IntakeCaptureReceipt,
  type IntakePageSnapshot,
  type IntakePageSource,
  type SupplyIntakeRequest,
} from "./runtime";

export const supplyIntakeCollections = {
  requests: "supplyIntakeRequests",
  usage: "supplyIntakeUsage",
  decisions: "organizerPolicyGapReviewDecisions",
} as const;

export const SUPPLY_INTAKE_LEASE_MS = 9 * 60_000;
export const SUPPLY_INTAKE_MAX_ATTEMPTS = 3;

export interface SupplyIntakeWorkerDeps {
  db: Firestore;
  now: () => Date;
  /** Writes one page snapshot to the server-only artifact store; returns its path. */
  putSnapshot: (requestId: string, snapshot: IntakePageSnapshot) => Promise<string>;
  projectionWriter: ProjectionImportWriter;
  /** Network transport for live page fetches; only tests replace it. */
  transport?: unknown;
}

export type SupplyIntakeOutcome = "completed" | "failed" | "retry" | "busy" | "skipped";

interface StoredRequest {
  status: "queued" | "running" | "completed" | "failed";
  attempts: number;
  leaseUntil: string | null;
  request: SupplyIntakeRequest;
}

/**
 * Runs one intake request. A lease keeps concurrent triggers from running it
 * twice; the month's fetch allowance is reserved in a transaction before any
 * request leaves the process and settled afterwards; the projection import is
 * idempotent. A failure releases the lease for a retry, and the third failed
 * attempt (or a contract error) is terminal and recorded.
 */
export async function processSupplyIntakeRequest(deps: SupplyIntakeWorkerDeps, requestId: string): Promise<SupplyIntakeOutcome> {
  const ref = deps.db.collection(supplyIntakeCollections.requests).doc(requestId);
  const claim = await deps.db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) return {outcome: "skipped" as const};
    const stored = snapshot.data() as StoredRequest;
    const now = deps.now();
    if (stored.status === "completed" || stored.status === "failed") return {outcome: "skipped" as const};
    if (stored.status === "running" && stored.leaseUntil && Date.parse(stored.leaseUntil) > now.getTime()) {
      return {outcome: "busy" as const};
    }
    const attempts = stored.attempts + 1;
    tx.update(ref, {status: "running", attempts, leaseUntil: new Date(now.getTime() + SUPPLY_INTAKE_LEASE_MS).toISOString(),
      updatedAt: now.toISOString()});
    return {outcome: "claimed" as const, request: stored.request, attempts};
  });
  if (claim.outcome !== "claimed") return claim.outcome;
  const {request, attempts} = claim;
  try {
    const runtime = await packagedIntake();
    const policy = await runtime.loadSupplyAcquisitionPolicy();
    const {source, settle} = await pageSourceFor(deps, policy);
    let result;
    try {
      result = await runSupplyIntake({request, pageSource: source, now: deps.now});
    } finally {
      await settle();
    }
    const snapshotRefs = [...new Set(await Promise.all(result.snapshots.map((snapshot) =>
      deps.putSnapshot(request.requestId, snapshot))))].sort();
    const imported = await importShadowProjection({input: result.projection, apply: true, writer: deps.projectionWriter});
    await deps.db.runTransaction(async (tx) => {
      tx.update(ref, {
        status: "completed",
        leaseUntil: null,
        result: {
          runId: result.runId,
          listingId: result.listing.listingId,
          listingWorkItemId: result.listingWorkItemId,
          eventWorkItemIds: result.eventWorkItemIds,
          listingContentHash: result.listing.contentHash,
          gaps: result.listing.gaps,
          researchNeeded: result.listing.researchNeeded,
          eventCount: result.listing.events.length,
          stoppedReason: result.stoppedReason,
          artifactHash: imported.artifactHash,
          snapshotRefs,
          captureReceipts: result.receipts.map(receiptRecord),
        },
        failure: null,
        updatedAt: deps.now().toISOString(),
      });
    });
    return "completed";
  } catch (error) {
    const terminal = attempts >= SUPPLY_INTAKE_MAX_ATTEMPTS || CONTRACT_ERRORS.has(errorCode(error));
    await deps.db.runTransaction(async (tx) => {
      tx.update(ref, {
        status: terminal ? "failed" : "queued",
        leaseUntil: null,
        failure: {code: errorCode(error), message: boundedMessage(error), at: deps.now().toISOString(), attempts},
        updatedAt: deps.now().toISOString(),
      });
    });
    return terminal ? "failed" : "retry";
  }
}

const CONTRACT_ERRORS = new Set(["INVALID_INTAKE_REQUEST", "INVALID_ACQUISITION_POLICY",
  "ACQUISITION_POLICY_DECISION_REQUIRED"]);

/**
 * Live fetching only when policy enables it; its cited decision must exist and
 * be accepted or the request fails closed. Otherwise a source that captures
 * nothing, so the listing still forms from the nomination and records every
 * seed as a gap for research.
 */
async function pageSourceFor(deps: SupplyIntakeWorkerDeps, policy: AcquisitionPolicy):
  Promise<{source: IntakePageSource; settle: () => Promise<void>}> {
  const runtime = await packagedIntake();
  if (!policy.pageFetch.enabled) {
    return {source: new runtime.StaticPageSource({pages: {}, policy, clock: deps.now}), settle: async () => {}};
  }
  const decision = await deps.db.collection(supplyIntakeCollections.decisions).doc(String(policy.pageFetch.decisionId)).get();
  const monthKey = deps.now().toISOString().slice(0, 7);
  const usageRef = deps.db.collection(supplyIntakeCollections.usage).doc(monthKey);
  const cap = policy.pageFetch.maxRequestsPerIntake;
  // Constructing the port validates the decision before anything is reserved.
  const draft = runtime.pageFetchBudgetLedgers({policy, monthKey});
  new runtime.GuardedPageFetchPort({policy, policyDecision: decision.data() ?? null, budgets: draft, clock: deps.now});
  const {used, reserved} = await deps.db.runTransaction(async (tx) => {
    const usage = await tx.get(usageRef);
    const used = usage.exists ? Number((usage.data() as {networkRequests?: number}).networkRequests ?? 0) : 0;
    const reserved = Math.max(0, Math.min(cap, policy.pageFetch.maxRequestsPerMonth - used));
    tx.set(usageRef, {schemaVersion: 1, monthKey, networkRequests: used + reserved, updatedAt: deps.now().toISOString()});
    return {used, reserved};
  });
  // The intake ledger starts pre-consumed so its remaining allowance is the
  // reservation; the transaction above, not this process, enforces the month.
  const budgets = runtime.pageFetchBudgetLedgers({policy, monthKey, intakeConsumed: cap - reserved, monthlyConsumed: used});
  const port = new runtime.GuardedPageFetchPort({policy, policyDecision: decision.data(), budgets, clock: deps.now,
    ...(deps.transport ? {transport: deps.transport} : {})});
  return {
    source: port,
    settle: async () => {
      const consumed = budgets.intake.snapshot().consumed.networkRequests - (cap - reserved);
      const unused = reserved - consumed;
      if (unused <= 0) return;
      await deps.db.runTransaction(async (tx) => {
        const usage = await tx.get(usageRef);
        const current = Number((usage.data() as {networkRequests?: number} | undefined)?.networkRequests ?? 0);
        tx.set(usageRef, {schemaVersion: 1, monthKey, networkRequests: Math.max(0, current - unused),
          updatedAt: deps.now().toISOString()});
      });
    },
  };
}

function receiptRecord(receipt: IntakeCaptureReceipt) {
  return {...receipt};
}

function errorCode(error: unknown): string {
  const code = (error as {code?: unknown})?.code;
  return typeof code === "string" && /^[A-Za-z0-9_.-]{1,80}$/u.test(code) ? code : "INTAKE_RUN_FAILED";
}

function boundedMessage(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).slice(0, 500);
}
