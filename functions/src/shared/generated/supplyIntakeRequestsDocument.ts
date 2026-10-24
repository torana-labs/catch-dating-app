/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

import type {SupplyIntakeRequest} from "./supplyIntakeRequest";

/**
 * One organizer intake request and its processing state. Front doors create it queued; the trusted Supply Intake worker leases it, gathers the seed pages, runs the workflow and records where the reviewable listing landed. Page snapshots live in the server-only artifact store; only their hashes and paths appear here.
 */
export interface SupplyIntakeRequestsDocument {
  schemaVersion: 1;
  requestId: string;
  request: SupplyIntakeRequest;
  status: "queued" | "running" | "completed" | "failed";
  attempts: number;
  leaseUntil: string | null;
  result: null | {
    runId: string;
    listingId: string;
    listingWorkItemId: string;
    /**
     * @maxItems 60
     */
    eventWorkItemIds: string[];
    listingContentHash: string;
    /**
     * @maxItems 40
     */
    gaps: string[];
    researchNeeded: boolean;
    eventCount: number;
    stoppedReason: string | null;
    artifactHash: string;
    /**
     * @maxItems 12
     */
    snapshotRefs: string[];
    /**
     * @maxItems 12
     */
    captureReceipts: {
      schemaVersion: 1;
      runKey: string;
      adapterId: "page_fetch" | "static_page";
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
      budgetWindow: null | {
        monthKey: string;
        intakeConsumed: number;
        intakeLimit: number;
        monthConsumed: number;
        monthLimit: number;
      };
      rawPayloadPersistence: "external_artifact_store_only";
      firestorePersistenceAllowed: false;
    }[];
  };
  failure: null | {
    code: string;
    message: string;
    at: string;
    attempts: number;
  };
  /**
   * Set once, when staff approve the listing this request built: the organizer it became, who approved it, who owns its Sales work, and a hash of what was approved so an identical retry replays.
   */
  approval: null | {
    approvalId: string;
    organizerId: string;
    approvedByUid: string;
    approvedAt: string;
    materialHash: string;
    salesOwnerUid: string;
  };
  createdAt: string;
  updatedAt: string;
}
