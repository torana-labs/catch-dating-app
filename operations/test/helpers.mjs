import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  emptySupplyInputSnapshot,
  finalizeSupplyInputSnapshot,
} from "../src/workflows/supply-intake/input-snapshot.mjs";

export async function temporaryDirectory(prefix = "catch-operations-") {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function createFixtureRepository(root) {
  return root;
}

export function fixtureWorkflowOptions(repoRoot) {
  return {
    inputSnapshotLoader: async ({market}) =>
      fixtureInputSnapshot(repoRoot, market),
  };
}

export async function fixtureInputSnapshot(_repoRoot, market = "mumbai") {
  const isMumbai = market === "mumbai";
  const empty = emptySupplyInputSnapshot(market);
  return finalizeSupplyInputSnapshot({
    ...empty,
    snapshotId: `fixture-${market}`,
    observedAt: "2026-07-14T10:00:00.000Z",
    provenance: {
      source: "test_fixture",
      sourceRunIds: [],
    },
    organizerReviewPolicy: null,
    sourceResults: isMumbai ? [{
      id: "source-one",
      sourceProfileId: "luma",
      sourceLabel: "Official site",
      title: "Official Event Result",
      url: "https://events.example/one",
      observedAt: "2026-07-14T00:00:00.000Z",
      status: "needs_review",
      riskFlags: [],
    }] : [],
    eventCandidates: isMumbai ? [
      {
        id: "event-ready",
        title: "Ready Event",
        startDate: "2026-07-20",
        endDate: "2026-07-20",
        sourceUrl: "https://lu.ma/ready",
        sourceLabel: "Luma",
        sourceStatus: "source_attached",
        reviewState: "approved",
        requiresVerification: false,
        dedupe: {duplicateCandidateIds: []},
      },
      {
        id: "event-resolve",
        title: "Needs a source",
        startDate: "2026-07-21",
        endDate: "2026-07-21",
        sourceUrl: null,
        sourceStatus: "missing_source_url",
        reviewState: "new",
        requiresVerification: true,
        dedupe: {duplicateCandidateIds: []},
      },
      {
        id: "event-expired",
        title: "Expired Event",
        startDate: "2026-07-01",
        endDate: "2026-07-01",
        sourceUrl: "https://events.example/expired",
        sourceStatus: "source_attached",
        reviewState: "approved",
        requiresVerification: false,
        dedupe: {duplicateCandidateIds: []},
      },
    ] : [],
    organizerPublicationPackets: isMumbai ? [publicationPacketFixture({
      entityId: "organizer-ready",
      market: "mumbai",
      status: "published",
    })] : [],
    organizerSearchCandidates: [],
    externalEventCandidates: [],
    organizerLeads: [],
    crawlSurfaces: [],
    intakeListings: [],
  });
}

export function publicationPacketFixture({
  entityId,
  market,
  status = "ready_for_manual_publication_review",
}) {
  return {
    packetId: `packet-${entityId}`,
    entityId,
    canonicalHostId: entityId,
    displayName: `${market} Organizer`,
    status,
    priority: "p1",
    blockers: [],
    dataBlockers: [],
    evidenceBlockers: [],
    approvalChecklist: {
      crawlDisabledReviewed: true,
      identityReviewed: true,
      marketScopeReviewed: true,
      mediaRightsReviewed: true,
      ownerSafeCopyReviewed: true,
      surfaceInventoryReviewed: true,
    },
    evidenceSummary: {
      records: 2,
      manualReportsWithoutArtifacts: 0,
      unresolvedLocalRefs: 0,
      missingSurfaceEvidence: 0,
      rawProviderArtifactRefs: 0,
      firestoreForbiddenArtifactRefs: 0,
      riskFlags: [],
    },
    evidenceReview: {manualReportsWithoutArtifacts: 0, records: []},
    identity: {
      geography: {
        primaryMarketSlug: market,
        markets: [{
          marketSlug: market,
          displayName: market,
          eventFilter: {citySlug: market},
        }],
      },
    },
    publicPresence: {
      canonicalPath: `/organizers/${entityId}/`,
      claimTargetPath: `clubs/${entityId}`,
      publishStatus: status === "published" ? "published" : "draft",
      indexStatus: status === "published" ? "indexed" : "noindex",
      appVisibility: "hidden",
      projectionStatus: "ready",
    },
    adminDecision: {
      allowedDecisions: ["approve_public", "hold", "suppress"],
      defaultAppVisibility: "hidden",
      currentDecision: status === "published" ? {
        decision: "approve_public",
        publishStatus: "published",
        indexStatus: "indexed",
        decidedAt: "2026-07-14",
        appVisibility: "hidden",
      } : null,
      command: "must-not-reach-admin-projection",
    },
    nextActions: ["review_publication_packet"],
  };
}
