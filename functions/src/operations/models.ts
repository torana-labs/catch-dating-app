export type JsonObject = Record<string, unknown>;
export type IsoDateTime = string;
export type Sha256 = string;

export const MAX_OPERATION_WORK_ITEMS_PER_RUN = 10_000;

export interface OperationActor {
  actorType: "human" | "agent" | "system";
  actorId: string;
}

export interface EvidenceRef {
  artifactId: string;
  contentHash: Sha256;
  observedAt: IsoDateTime;
  locator: string | null;
}

export interface OperationFailure {
  code: string;
  message: string;
  retryable: boolean;
}

export interface OperationRunBudgets {
  maxWorkItems: number;
  maxModelCalls: number;
  maxModelTokens: number;
  maxCostMicros: number;
  deadlineAt: IsoDateTime | null;
}

export interface OperationRunCounters {
  discovered: number;
  processed: number;
  modelCalls: number;
  modelTokens: number;
  costMicros: number;
  escalated: number;
  published: number;
  failed: number;
}

export interface OperationRun {
  schemaVersion: 1;
  runId: string;
  workflowId: string;
  revision: number;
  mode: "shadow" | "assisted" | "autonomous";
  status:
    | "planned"
    | "queued"
    | "running"
    | "paused"
    | "completed"
    | "failed"
    | "cancelled";
  scope: JsonObject;
  rulesetVersion: string;
  policyVersion: string;
  inputHash: Sha256;
  budgets: OperationRunBudgets;
  counters: OperationRunCounters;
  checkpoint: {
    lastSequence: number;
    cursor: string | null;
  };
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  startedAt: IsoDateTime | null;
  finishedAt: IsoDateTime | null;
  failure: OperationFailure | null;
  metadata: JsonObject;
}

export type WorkItemLifecycleStatus =
  | "queued"
  | "in_progress"
  | "waiting"
  | "ready"
  | "published"
  | "terminal";

export type WorkItemPrimaryStage = string;

export type WorkItemOutcome = string;

export interface FieldProvenance {
  field: string;
  artifactId: string;
  contentHash: Sha256;
  locator: string | null;
  extractedBy: "deterministic" | "model" | "human";
  extractorVersion: string;
  confidence: number | null;
}

export interface OperationWorkItem {
  schemaVersion: 1;
  workItemId: string;
  workflowId: string;
  runId: string;
  entityKind: string;
  externalKey: string | null;
  revision: number;
  candidateHash: Sha256;
  primaryStage: WorkItemPrimaryStage;
  lifecycleStatus: WorkItemLifecycleStatus;
  outcome: WorkItemOutcome | null;
  taskFlags: string[];
  blockerCodes: string[];
  warningCodes: string[];
  priority: number;
  attemptCount: number;
  evidenceRefs: EvidenceRef[];
  fieldProvenance: FieldProvenance[];
  normalizedPayload: JsonObject;
  decisionId: string | null;
  publicationPlanId: string | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  staleAt: IsoDateTime | null;
  expiresAt: IsoDateTime | null;
}

export interface OperationActionReceipt {
  schemaVersion: 1;
  actionId: string;
  runId: string;
  workItemId: string;
  sequence: number;
  operation: string;
  status: "started" | "succeeded" | "failed" | "skipped";
  fromRevision: number;
  toRevision: number;
  actor: OperationActor;
  idempotencyKey: string;
  inputHash: Sha256;
  outputHash: Sha256 | null;
  rulesetVersion: string;
  modelVersion: string | null;
  reasonCodes: string[];
  occurredAt: IsoDateTime;
  completedAt: IsoDateTime | null;
  failure: OperationFailure | null;
}

export interface OperationDecision {
  schemaVersion: 1;
  decisionId: string;
  runId: string;
  workItemId: string;
  workItemRevision: number;
  decision: "approve" | "reject" | "escalate" | "hold";
  status: "proposed" | "accepted" | "superseded" | "revoked";
  actor: OperationActor;
  reasonCodes: string[];
  rationale: string | null;
  evidenceRefs: EvidenceRef[];
  rulesetVersion: string;
  modelVersion: string | null;
  calibratedConfidence: number | null;
  auditRequired: boolean;
  createdAt: IsoDateTime;
  effectiveAt: IsoDateTime | null;
  supersedesDecisionId: string | null;
}

export interface OperationLease {
  schemaVersion: 1;
  leaseId: string;
  resourceType: "run" | "work_item";
  resourceId: string;
  ownerId: string;
  fencingToken: number;
  status: "active" | "released" | "expired";
  idempotencyKey: string;
  acquiredAt: IsoDateTime;
  heartbeatAt: IsoDateTime;
  expiresAt: IsoDateTime;
  releasedAt: IsoDateTime | null;
}

export interface PublicationWorkItemInput {
  workItemId: string;
  revision: number;
  candidateHash: Sha256;
}

export interface PublicationMutation {
  mutationId: string;
  workItemId: string;
  operation: "create" | "set" | "update" | "delete";
  resourcePath: string;
  documentHash: Sha256;
  payloadArtifactId: string | null;
  precondition: {
    exists: boolean | null;
    lastUpdateAt: IsoDateTime | null;
  };
}

export interface OperationPublicationPlan {
  schemaVersion: 1;
  publicationPlanId: string;
  runId: string;
  revision: number;
  environment: "development" | "production";
  mode: "shadow" | "dry_run" | "apply";
  status:
    | "drafted"
    | "preflight_passed"
    | "applied"
    | "rejected"
    | "expired";
  contentHash: Sha256;
  rulesetVersion: string;
  policyVersion: string;
  workItemInputs: PublicationWorkItemInput[];
  mutations: PublicationMutation[];
  createdBy: OperationActor;
  createdAt: IsoDateTime;
  validUntil: IsoDateTime;
  preflightAt: IsoDateTime | null;
  appliedAt: IsoDateTime | null;
}

export interface OperationMetricSet {
  fieldExactness: number;
  eventPrecision: number;
  duplicatePrecision: number;
  duplicateRecall: number;
  correctionRate: number;
  escalationRate: number;
}

export interface OperationRuleProposal {
  schemaVersion: 1;
  ruleProposalId: string;
  workflowId: string;
  revision: number;
  sourceProfileId: string;
  templateFingerprint: Sha256;
  proposalKind: "declarative_rule" | "source_extractor";
  status:
    | "observed"
    | "proposed"
    | "replay_ready"
    | "shadow"
    | "canary"
    | "active"
    | "rejected"
    | "retired";
  baselineRulesetVersion: string;
  candidateRuleVersion: string;
  candidateArtifactId: string;
  candidateHash: Sha256;
  failureCodes: string[];
  evidenceWorkItemIds: string[];
  minimumSampleSize: number;
  activationThresholds: OperationMetricSet;
  proposedBy: OperationActor;
  requiresHumanApproval: true;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface OperationRuleEvaluation {
  schemaVersion: 1;
  ruleEvaluationId: string;
  ruleProposalId: string;
  candidateRuleVersion: string;
  phase: "replay" | "holdout" | "shadow" | "canary" | "production_watch";
  datasetHash: Sha256;
  sampleSize: number;
  baselineMetrics: OperationMetricSet;
  candidateMetrics: OperationMetricSet;
  requiredThresholds: OperationMetricSet;
  result: "passed" | "failed" | "inconclusive";
  deploymentRecommendation:
    | "do_not_promote"
    | "advance_phase"
    | "rollback"
    | "retain";
  disagreementWorkItemIds: string[];
  evaluatedBy: OperationActor;
  independentEvaluator: true;
  evaluatedAt: IsoDateTime;
}
