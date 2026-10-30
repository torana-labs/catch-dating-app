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
      adapterId: "page_fetch" | "static_page" | "instagram_business_discovery";
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
    /**
     * The listing's advisory comparison with the organizers Catch already lists, copied from the listing its contentHash covers. Null when the request was not compared (an event_refresh names its organizer); absent on requests completed before the worker compared listings.
     */
    duplicateCheck?: null | {
      policyId: string;
      authority: "advisory";
      verdict: "match" | "ambiguous" | "none";
      /**
       * @maxItems 8
       */
      reasons: string[];
      organizersCompared: number;
      inventoryHash: string;
      inventory: {
        citySlug: string | null;
        limit: number;
        truncated: boolean;
      };
      /**
       * @maxItems 12
       */
      candidates: {
        organizerId: string;
        name: string | null;
        score: number;
        band: "match" | "probable" | "review" | "low";
        /**
         * @maxItems 12
         */
        signals: string[];
        /**
         * @maxItems 12
         */
        conflicts: string[];
        rationale: string;
      }[];
    };
  };
  failure: null | {
    code: string;
    message: string;
    at: string;
    attempts: number;
  };
  /**
   * Set once: when staff approve the listing this request built (the organizer it became, who approved it, who owns its Sales work, and a hash of what was approved so an identical retry replays), or at creation for an event_refresh, naming the listed organizer it reads events for and the staff member who asked.
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
