import {
  OperationActionReceipt,
  OperationDecision,
  OperationMetricSet,
  OperationPublicationPlan,
  OperationRuleEvaluation,
  OperationRuleProposal,
  OperationRun,
  OperationWorkItem,
} from "./models";

export const hashes = {
  input: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  candidate:
    "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  output: "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
  dataset: "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
};

export function operationRun(
  overrides: Partial<OperationRun> = {}
): OperationRun {
  return {
    schemaVersion: 1,
    runId: "run:mumbai:2026-07-14",
    workflowId: "supply-intake",
    revision: 0,
    mode: "shadow",
    status: "planned",
    scope: {market: "mumbai"},
    rulesetVersion: "rules-v1",
    policyVersion: "policy-v1",
    inputHash: hashes.input,
    budgets: {
      maxWorkItems: 100,
      maxModelCalls: 10,
      maxModelTokens: 10000,
      maxCostMicros: 1000000,
      deadlineAt: "2026-07-15T00:00:00.000Z",
    },
    counters: {
      discovered: 0,
      processed: 0,
      modelCalls: 0,
      modelTokens: 0,
      costMicros: 0,
      escalated: 0,
      published: 0,
      failed: 0,
    },
    checkpoint: {lastSequence: 0, cursor: null},
    createdAt: "2026-07-14T08:00:00.000Z",
    updatedAt: "2026-07-14T08:00:00.000Z",
    startedAt: null,
    finishedAt: null,
    failure: null,
    metadata: {},
    ...overrides,
  };
}

export function operationWorkItem(
  overrides: Partial<OperationWorkItem> = {}
): OperationWorkItem {
  return {
    schemaVersion: 1,
    workItemId: "work:event:1",
    workflowId: "supply-intake",
    runId: "run:mumbai:2026-07-14",
    entityKind: "event",
    externalKey: "source:event:1",
    revision: 0,
    candidateHash: hashes.candidate,
    primaryStage: "incoming",
    lifecycleStatus: "queued",
    outcome: null,
    taskFlags: [],
    blockerCodes: [],
    warningCodes: [],
    priority: 100,
    attemptCount: 0,
    evidenceRefs: [],
    fieldProvenance: [],
    normalizedPayload: {},
    decisionId: null,
    publicationPlanId: null,
    createdAt: "2026-07-14T08:00:00.000Z",
    updatedAt: "2026-07-14T08:00:00.000Z",
    staleAt: null,
    expiresAt: "2026-07-28T00:00:00.000Z",
    ...overrides,
  };
}

/** Synthetic publication packet with explicit required nullable fields. */
export function organizerPublicationPacketWorkItem(
  overrides: Partial<OperationWorkItem> = {}
): OperationWorkItem {
  return operationWorkItem({
    entityKind: "organizer",
    normalizedPayload: {intake: {
      recordType: "organizer_publication_packet",
      packet: {
        packetId: "packet:synthetic",
        entityId: "synthetic-organizer",
        canonicalHostId: "synthetic-host",
        displayName: "Synthetic organizer",
        status: "review_required",
        priority: "normal",
        markets: [],
        blockers: [],
        dataBlockers: [],
        evidenceBlockers: [],
        approvalChecklist: {
          crawlDisabledReviewed: false, identityReviewed: false,
          marketScopeReviewed: false, mediaRightsReviewed: false,
          ownerSafeCopyReviewed: false, surfaceInventoryReviewed: false,
        },
        evidenceSummary: {
          records: 0, manualReportsWithoutArtifacts: 0,
          unresolvedLocalRefs: 0, missingSurfaceEvidence: 0,
          rawProviderArtifactRefs: 0, firestoreForbiddenArtifactRefs: 0,
          riskFlags: [],
        },
        publicPresence: {
          canonicalPath: null, claimTargetPath: null,
          publishStatus: "draft", indexStatus: "noindex",
          appVisibility: "hidden", projectionStatus: "unavailable",
        },
        adminDecision: {
          allowedDecisions: [], defaultAppVisibility: "hidden",
          currentDecision: null,
        },
        nextActions: [],
      },
    }},
    ...overrides,
  });
}

export function operationActionReceipt(
  overrides: Partial<OperationActionReceipt> = {}
): OperationActionReceipt {
  return {
    schemaVersion: 1,
    actionId: "action:1",
    runId: "run:mumbai:2026-07-14",
    workItemId: "work:event:1",
    sequence: 1,
    operation: "extract_source",
    status: "succeeded",
    fromRevision: 0,
    toRevision: 1,
    actor: {actorType: "agent", actorId: "worker:1"},
    idempotencyKey: "idempotency:action:1",
    inputHash: hashes.input,
    outputHash: hashes.output,
    rulesetVersion: "rules-v1",
    modelVersion: null,
    reasonCodes: ["deterministic_extractor_match"],
    occurredAt: "2026-07-14T08:01:00.000Z",
    completedAt: "2026-07-14T08:01:01.000Z",
    failure: null,
    ...overrides,
  };
}

export function operationDecision(
  overrides: Partial<OperationDecision> = {}
): OperationDecision {
  return {
    schemaVersion: 1,
    decisionId: "decision:1",
    runId: "run:mumbai:2026-07-14",
    workItemId: "work:event:1",
    workItemRevision: 1,
    decision: "approve",
    status: "accepted",
    actor: {actorType: "agent", actorId: "reviewer:1"},
    reasonCodes: ["all_required_gates_passed"],
    rationale: null,
    evidenceRefs: [],
    rulesetVersion: "rules-v1",
    modelVersion: null,
    calibratedConfidence: 0.99,
    auditRequired: true,
    createdAt: "2026-07-14T08:02:00.000Z",
    effectiveAt: "2026-07-14T08:02:00.000Z",
    supersedesDecisionId: null,
    ...overrides,
  };
}

export function operationPublicationPlan(
  overrides: Partial<OperationPublicationPlan> = {}
): OperationPublicationPlan {
  return {
    schemaVersion: 1,
    publicationPlanId: "publication:1",
    runId: "run:mumbai:2026-07-14",
    revision: 0,
    environment: "development",
    mode: "dry_run",
    status: "preflight_passed",
    contentHash: hashes.output,
    rulesetVersion: "rules-v1",
    policyVersion: "policy-v1",
    workItemInputs: [{
      workItemId: "work:event:1",
      revision: 1,
      candidateHash: hashes.candidate,
    }],
    mutations: [{
      mutationId: "mutation:1",
      workItemId: "work:event:1",
      operation: "create",
      resourcePath: "externalEvents/event:1",
      documentHash: hashes.output,
      payloadArtifactId: "payload:1",
      precondition: {exists: false, lastUpdateAt: null},
    }],
    createdBy: {actorType: "agent", actorId: "planner:1"},
    createdAt: "2026-07-14T08:03:00.000Z",
    validUntil: "2026-07-14T09:03:00.000Z",
    preflightAt: "2026-07-14T08:03:30.000Z",
    appliedAt: null,
    ...overrides,
  };
}

const passingMetrics: OperationMetricSet = {
  fieldExactness: 0.99,
  eventPrecision: 1,
  duplicatePrecision: 1,
  duplicateRecall: 0.99,
  correctionRate: 0,
  escalationRate: 0.005,
};

export function operationRuleProposal(
  overrides: Partial<OperationRuleProposal> = {}
): OperationRuleProposal {
  return {
    schemaVersion: 1,
    ruleProposalId: "rule-proposal:1",
    workflowId: "supply-intake",
    revision: 0,
    sourceProfileId: "cntraveller-india",
    templateFingerprint: hashes.dataset,
    proposalKind: "source_extractor",
    status: "proposed",
    baselineRulesetVersion: "rules-v1",
    candidateRuleVersion: "cntraveller-extractor-v1",
    candidateArtifactId: "rule-artifact:1",
    candidateHash: hashes.output,
    failureCodes: ["article_list_structure_unknown"],
    evidenceWorkItemIds: ["work:event:1"],
    minimumSampleSize: 100,
    activationThresholds: {...passingMetrics},
    proposedBy: {actorType: "agent", actorId: "learner:1"},
    requiresHumanApproval: true,
    createdAt: "2026-07-14T08:10:00.000Z",
    updatedAt: "2026-07-14T08:10:00.000Z",
    ...overrides,
  };
}

export function operationRuleEvaluation(
  overrides: Partial<OperationRuleEvaluation> = {}
): OperationRuleEvaluation {
  return {
    schemaVersion: 1,
    ruleEvaluationId: "rule-evaluation:1",
    ruleProposalId: "rule-proposal:1",
    candidateRuleVersion: "cntraveller-extractor-v1",
    phase: "replay",
    datasetHash: hashes.dataset,
    sampleSize: 120,
    baselineMetrics: {
      ...passingMetrics,
      fieldExactness: 0.9,
      escalationRate: 0.1,
    },
    candidateMetrics: {...passingMetrics},
    requiredThresholds: {...passingMetrics},
    result: "passed",
    deploymentRecommendation: "advance_phase",
    disagreementWorkItemIds: [],
    evaluatedBy: {actorType: "human", actorId: "reviewer:quality:1"},
    independentEvaluator: true,
    evaluatedAt: "2026-07-14T09:00:00.000Z",
    ...overrides,
  };
}
