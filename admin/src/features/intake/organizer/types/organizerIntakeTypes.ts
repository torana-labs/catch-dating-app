import type {
  ExternalEventImportAction,
  ExternalEventImportExecutionAction,
  ExternalEventImportExecutionPlan,
  ExternalEventImportPlan,
  OrganizerAppVisibility,
  OrganizerCurationOperation,
  OrganizerCurationSurface,
  OrganizerEntityKind,
  OrganizerIntakeDecision,
  OrganizerIntakeIndexStatus,
  OrganizerIntakePublishStatus,
  OrganizerPublishStatus,
  OrganizerSourceConfidence,
  OrganizerSurfaceDecision,
  OrganizerVerificationStatus,
} from "../../../../shared/types/adminTypes";
import type {OperationFieldProvenance} from
  "../../../../shared/operations/operationsTypes";

export interface OrganizerIntakeBridge {
  schemaVersion: number;
  generatedFrom: Record<string, string>;
  summary: OrganizerIntakeSummary;
  guardrails: string[];
  workflowReadiness: OrganizerWorkflowReadiness;
  policyGaps: OrganizerPolicyGapRegister;
  policyDecisionPackets: OrganizerPolicyDecisionPackets;
  canonicalHostEntities: OrganizerCanonicalHostEntityRegistry;
  canonicalEvidenceIndex: OrganizerCanonicalEvidenceIndex;
  publicationReviewPackets: OrganizerPublicationReviewPackets;
  publicationDecisionImpactPreview: OrganizerPublicationDecisionImpactPreview;
  operatorActionQueue: OrganizerOperatorActionQueue;
  operationalHealth: OrganizerOperationalHealthReport;
  pendingInputRequest: OrganizerPendingInputRequest;
  pendingWorkCoverage: OrganizerPendingWorkCoverage;
  reviewedDecisionAnswerPackets: OrganizerReviewedDecisionAnswerPacketRegister;
  promotionExecutionPacket: OrganizerPromotionExecutionPacket;
  claimTargetSyncPreview: OrganizerClaimTargetSyncPreview;
  crawlPlan: OrganizerCrawlPlan;
  crawlRunPlan: OrganizerCrawlRunPlan;
  rawArtifactStorage: OrganizerRawArtifactStorageManifest;
  publishingContracts: OrganizerPublishingContracts;
  discoverySearchPlan: OrganizerDiscoverySearchPlan;
  sourceMentionResolution: OrganizerSourceMentionResolution;
  searchCandidates: OrganizerSearchCandidateQueue;
  externalEventImportPlan: OrganizerExternalEventImportPlan;
  externalEventImportExecutionPlan: OrganizerExternalEventImportExecutionPlan;
  curation: OrganizerCurationState;
  items: OrganizerIntakeItem[];
}

export interface OrganizerIntakeSummary {
  reviewItems: number;
  evidenceReview: number;
  promotionReview: number;
  blocked: number;
  approvedPublic: number;
  appDiscoverable: number;
  claimTargets?: number;
  claimTargetSyncPreviewWrites?: number;
  claimTargetSyncPreviewCreates?: number;
  claimTargetSyncPreviewRefreshes?: number;
  claimTargetSyncPreviewSkippedOwnerBound?: number;
  canonicalHostEntities?: number;
  canonicalHostPublicPublished?: number;
  canonicalHostIndexed?: number;
  canonicalHostClaimTargets?: number;
  canonicalHostSurfaces?: number;
  canonicalHostCrawlCapableSurfaces?: number;
  canonicalEvidenceRecords?: number;
  canonicalEvidenceResolvedRefs?: number;
  canonicalEvidenceSurfacesWithoutEvidence?: number;
  canonicalEvidenceManualReportsWithoutArtifacts?: number;
  canonicalEvidenceRawProviderArtifacts?: number;
  publicationReviewPackets?: number;
  publicationReviewReady?: number;
  publicationReviewBlockedByData?: number;
  publicationImpacts?: number;
  publicationImpactWouldPublish?: number;
  publicationImpactWouldIndex?: number;
  publicationImpactClaimTargets?: number;
  publicationImpactAppDiscoverable?: number;
  operatorActions?: number;
  operatorAdminDecisionsRequired?: number;
  operatorPolicyInputsRequired?: number;
  operatorWaitingActions?: number;
  operationalHealthStatus?: string;
  operationalHealthWorkstreams?: number;
  operationalHealthActionRequired?: number;
  operationalHealthPolicyBlocked?: number;
  operationalHealthWaiting?: number;
  pendingInputRequests?: number;
  pendingAdminPublicationInputs?: number;
  pendingPolicyDecisionInputs?: number;
  pendingRequiredPolicyQuestions?: number;
  pendingWorkCoverageStatus?: string;
  pendingWorkCovered?: number;
  pendingWorkUntriaged?: number;
  reviewedAnswerPacketStatus?: string;
  reviewedAnswerPackets?: number;
  reviewedAnswerPacketsReady?: number;
  reviewedAnswerPacketsAwaitingAnswers?: number;
  reviewedAnswerPacketsInvalid?: number;
  reviewedAnswerPacketsStale?: number;
  promotionExecutionStatus?: string;
  promotionExecutionPhases?: number;
  promotionExecutionBlockedPhases?: number;
  promotionCanRunLocalPreview?: boolean;
  promotionCanDeployNewPublicPages?: boolean;
  promotionCanWriteClaimTargets?: boolean;
  curationOperations?: number;
  attachedSurfaces?: number;
  mergedSources?: number;
  splitSurfaces?: number;
  searchResultCandidates?: number;
  matchedSearchResultCandidates?: number;
  duplicateSearchResultKeys?: number;
  sourceArtifacts?: number;
  sourceMentions?: number;
  sourceMentionEventMentions?: number;
  sourceMentionOrganizerMentions?: number;
  sourceMentionCandidates?: number;
  sourceMentionClusters?: number;
  sourceMentionAutoAttachClusters?: number;
  sourceMentionNeedsReviewClusters?: number;
  sourceMentionLlmReviewQueued?: number;
  sourceMentionReviewPackets?: number;
  sourceMentionHumanReviewRequired?: number;
  sourceMentionLlmPromptRequests?: number;
  discoverySearchPlanPlanned?: number;
  discoverySearchPlanSkippedFresh?: number;
  discoverySearchPlanLaunchCityPlanned?: number;
  discoverySearchPlanLaunchCitySkippedFresh?: number;
  discoverySearchPlanMissingLaunchCityCategories?: number;
  externalEventCandidates?: number;
  externalEventCandidatesBlocked?: number;
  externalEventCandidatesReviewed?: number;
  externalEventCandidatesApproved?: number;
  externalEventCandidatesHeld?: number;
  externalEventCandidatesRejected?: number;
  externalEventLocationTasks?: number;
  externalEventLocationMissingCoordinates?: number;
  externalEventLocationProviderDisabled?: number;
  externalEventImportProposedCreates?: number;
  externalEventImportProposedReadOnlyEvents?: number;
  externalEventImportBlocked?: number;
  externalEventImportWriteReady?: number;
  externalEventImportExecutionWouldCreate?: number;
  externalEventImportExecutionWouldPublishReadOnly?: number;
  externalEventImportExecutionBlocked?: number;
  externalEventImportExecutionSchemaInvalid?: number;
  externalEventImportExecutionProjectionInvalid?: number;
  externalEventImportExecutionPayloadInvalid?: number;
  externalEventImportExecutionProjectionInvalidCount?: number;
  crawlCapableSurfaces?: number;
  crawlApprovedSurfaces?: number;
  crawlBlockedSurfaces?: number;
  crawlRunIntents?: number;
  crawlRunWouldFetch?: number;
  crawlRunBlocked?: number;
  readinessBlocked?: number;
  readinessPolicyNeeded?: number;
  readinessReviewNeeded?: number;
  policyGaps?: number;
  policyGapsDecisionRequired?: number;
  policyGapReviewDecisions?: number;
  policyGapReviewAccepted?: number;
  policyGapReviewHeld?: number;
  policyGapReviewRejected?: number;
  policyGapReviewInvalid?: number;
  policyDecisionPackets?: number;
  policyDecisionQuestions?: number;
  policyDecisionUnanswered?: number;
  rawArtifacts?: number;
  rawProviderPayloads?: number;
  rawArtifactStorageBlocked?: number;
  rawArtifactBytes?: number;
}

export interface OrganizerWorkflowReadiness {
  status: string;
  summary: {
    blocked: number;
    claimSyncReady: boolean;
    gates: number;
    localPromotionPipelineReady: boolean;
    canonicalEvidenceRecords?: number;
    canonicalEvidenceResolvedRefs?: number;
    canonicalEvidenceSurfacesWithoutEvidence?: number;
    canonicalEvidenceManualReportsWithoutArtifacts?: number;
    publicationReviewPackets?: number;
    publicationReviewReady?: number;
    publicationReviewBlockedByData?: number;
    canonicalHostEntities?: number;
    canonicalHostPublicPublished?: number;
    canonicalHostClaimTargets?: number;
    policyNeeded: number;
    publicProjectionReady: boolean;
    ready: number;
    recurringCrawlEnabled: boolean;
    crawlRunIntents?: number;
    rawArtifacts?: number;
    rawProviderPayloads?: number;
    rawArtifactStorageBlocked?: number;
    reviewNeeded: number;
    waiting: number;
  };
  gates: OrganizerWorkflowReadinessGate[];
  commands: Record<string, string>;
}

export interface OrganizerWorkflowReadinessGate {
  id: string;
  label: string;
  status: string;
  detail: string;
  nextAction: string;
}

export interface OrganizerOperatorActionQueue {
  schemaVersion: number;
  summary: {
    actions: number;
    publicationReviewActions: number;
    policyDecisionActions: number;
    workflowGateActions: number;
    adminDecisionsRequired: number;
    policyInputsRequired: number;
    waitingActions: number;
    actionsByPriority: Record<string, number>;
    actionsByStatus: Record<string, number>;
    actionsByType: Record<string, number>;
    highestPriority: string | null;
  };
  guardrails: string[];
  actions: OrganizerOperatorAction[];
}

export interface OrganizerOperatorAction {
  actionId: string;
  actionType: string;
  blockers: string[];
  commands: string[];
  decisionOptions: string[];
  detail: string;
  impact?: {
    appVisibility: string | null;
    claimTargetPath: string | null;
    sitemapEligible: boolean;
    wouldCreateClaimTarget: boolean;
    wouldIndex: boolean;
    wouldPublish: boolean;
  } | null;
  nextAction: string;
  priority: string;
  requiredAcknowledgements?: {
    manualReportsReviewed?: boolean;
    publicationChecklist?: string[];
  };
  requiredInputs?: string[];
  safeDefaultAction?: string;
  sourceArtifacts: string[];
  status: string;
  subjectId: string;
  subjectName: string;
  taskType: string;
}

export interface OrganizerOperationalHealthReport {
  schemaVersion: number;
  summary: {
    healthStatus: string;
    workstreams: number;
    readyWorkstreams: number;
    actionRequiredWorkstreams: number;
    policyBlockedWorkstreams: number;
    blockedWorkstreams: number;
    waitingWorkstreams: number;
    idleWorkstreams: number;
    highestPriority: string | null;
    operatorActions: number;
    adminDecisionsRequired: number;
    policyInputsRequired: number;
    waitingActions: number;
    workflowReady: number;
    workflowWaiting: number;
    workflowBlocked: number;
    workflowPolicyNeeded: number;
    workstreamsByStatus: Record<string, number>;
    workstreamsByPriority: Record<string, number>;
  };
  guardrails: string[];
  workstreams: OrganizerOperationalHealthWorkstream[];
}

export interface OrganizerOperationalHealthWorkstream {
  id: string;
  label: string;
  status: string;
  priority: string;
  metrics: Record<string, string | number | boolean | null>;
  blockers: string[];
  nextActions: string[];
  commands: string[];
  sourceArtifacts: string[];
}

export interface OrganizerPendingInputRequest {
  schemaVersion: number;
  generatedFrom: Record<string, string>;
  summary: {
    requests: number;
    adminPublicationRequests: number;
    policyDecisionRequests: number;
    requiredPolicyQuestions: number;
    manualPublicationAcknowledgements: number;
    workflowFollowUps: number;
    highestPriority: string | null;
    requestsByOwner: Record<string, number>;
    requestsByPriority: Record<string, number>;
    requestsByType: Record<string, number>;
    followUpsByStatus: Record<string, number>;
  };
  guardrails: string[];
  requests: OrganizerPendingInputItem[];
  followUps: OrganizerPendingInputFollowUp[];
}

export interface OrganizerPendingInputItem {
  requestId: string;
  requestType: "admin_publication_decision" | "policy_decision" | string;
  priority: string;
  owner: string;
  subjectId: string;
  subjectName: string;
  prompt: string;
  decisionOptions: string[];
  safeDefaultAction: string;
  requiredAcknowledgements?: {
    manualReportsReviewed?: boolean;
    publicationChecklist?: string[];
  };
  requiredInputs?: OrganizerPendingInputRequiredInput[];
  currentState?: Record<string, unknown>;
  impact?: {
    appVisibility?: string | null;
    claimTargetPath?: string | null;
    sitemapEligible?: boolean;
    wouldCreateClaimTarget?: boolean;
    wouldIndex?: boolean;
    wouldPublish?: boolean;
  } | null;
  nextAction?: string;
  commands: string[];
  callableSubmission?: OrganizerPendingInputCallableSubmission;
  sourceArtifacts: string[];
}

export interface OrganizerPendingInputCallableSubmission {
  callableName: string;
  adminApiWrapper: string;
  payloadType: string;
  firestoreCollection: string;
  payloadsByDecision: Record<string, Record<string, unknown>>;
  safeDefaultPayload: Record<string, unknown> | null;
}

export interface OrganizerPendingInputRequiredInput {
  questionId?: string;
  input?: string;
  prompt: string;
  currentDefault?: string;
  recommendedSafeDefault: string;
  requiredForAcceptance: boolean;
}

export interface OrganizerPendingInputFollowUp {
  followUpId: string;
  workstreamId: string;
  label: string;
  status: string;
  priority: string;
  blockers: string[];
  nextActions: string[];
  commands: string[];
}

export interface OrganizerPendingWorkCoverage {
  schemaVersion: number;
  generatedFrom: Record<string, string>;
  summary: {
    status: string;
    unresolvedWorkstreams: number;
    coveredWorkstreams: number;
    coveredByInputRequest: number;
    coveredByFollowUp: number;
    untriagedWorkstreams: number;
    highestPriority: string | null;
    coverageByStatus: Record<string, number>;
    workstreamsByStatus: Record<string, number>;
    workstreamsByPriority: Record<string, number>;
  };
  guardrails: string[];
  entries: OrganizerPendingWorkCoverageEntry[];
}

export interface OrganizerPendingWorkCoverageEntry {
  coverageId: string;
  workstreamId: string;
  label: string;
  status: string;
  priority: string;
  coverageStatus: string;
  blockerClass: string;
  pendingRequestIds: string[];
  followUpIds: string[];
  blockers: string[];
  nextActions: string[];
  commands: string[];
}

export interface OrganizerReviewedDecisionAnswerPacketRegister {
  schemaVersion: number;
  generatedFrom: {
    answerPacketsRoot: string;
    generatedAnswerPacket: string;
  };
  summary: {
    status: string;
    packets: number;
    readyToApply: number;
    awaitingAnswers: number;
    invalid: number;
    stale: number;
    sourceFresh: number;
  };
  guardrails: string[];
  entries: OrganizerReviewedDecisionAnswerPacketEntry[];
}

export interface OrganizerReviewedDecisionAnswerPacketEntry {
  path: string;
  reviewer: string | null;
  decidedAt: string | null;
  reviewDraft: Record<string, unknown> | null;
  status: string;
  answerSlots: number;
  plannedActions: number;
  pendingAnswers: number;
  readyToApply: boolean;
  awaitingAnswers: boolean;
  invalid: boolean;
  stale: boolean;
  sourceFresh: boolean;
  sourceFreshness: string;
  errors: string[];
  warnings: string[];
}

export interface OrganizerPromotionExecutionPacket {
  schemaVersion: number;
  generatedFrom: Record<string, string>;
  summary: {
    status: string;
    localPromotionPipelineReady: boolean;
    publicProjectionReady: boolean;
    claimSyncReady: boolean;
    pendingAdminDecisions: number;
    pendingPolicyDecisions: number;
    pendingAnswerSlots: number;
    reviewedAnswerPacketStatus: string;
    reviewedAnswerPackets: number;
    reviewedAnswerPacketsReady: number;
    reviewedAnswerPacketsAwaitingAnswers: number;
    reviewedAnswerPacketsInvalid: number;
    reviewedAnswerPacketsStale: number;
    pendingWorkUntriaged: number;
    approvedPublicProjections: number;
    publicationImpacts: number;
    publicationImpactWouldPublish: number;
    claimTargetPreviewTargets: number;
    claimTargetPreviewWrites: number;
    canRunLocalPreview: boolean;
    canDeployNewPublicPages: boolean;
    canWriteClaimTargets: boolean;
    policyInputRequiredBeforeCrawlStorageOrImport: boolean;
    phases: number;
    phasesByStatus: Record<string, number>;
    blockedPhases: number;
    guardedRemoteReadPhases: number;
    guardedRemoteWritePhases: number;
  };
  guardrails: string[];
  phases: OrganizerPromotionExecutionPhase[];
}

export interface OrganizerPromotionExecutionPhase {
  phaseId: string;
  label: string;
  status: string;
  executionMode: string;
  command: string;
  blockers: string[];
  outputs: string[];
}

export interface OrganizerPolicyGapRegister {
  schemaVersion: number;
  summary: {
    gaps: number;
    decisionRequired: number;
    ready: number;
    blockedByPolicy: number;
    gapsByArea: Record<string, number>;
    gapsBySeverity: Record<string, number>;
    gapsByStatus: Record<string, number>;
    reviewDecisions: number;
    reviewAccepted: number;
    reviewHeld: number;
    reviewRejected: number;
    reviewInvalid: number;
    reviewNotReviewed: number;
    gapsByDecisionStatus: Record<string, number>;
  };
  guardrails: string[];
  errors?: string[];
  gaps: OrganizerPolicyGap[];
}

export interface OrganizerPolicyGapReviewDecision {
  policyGapDecisionBatchId: string;
  decidedAt: string;
  reviewer: string;
  decision: "accept" | "hold" | "reject";
  note: string;
  requiredInputsReviewed: string[];
  missingRequiredInputs: string[];
  unknownRequiredInputs: string[];
}

export interface OrganizerPolicyGap {
  gapId: string;
  area: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "decision_required" | "ready";
  decisionStatus: "not_reviewed" | "accepted" | "held" | "rejected" | "invalid";
  reviewDecision: OrganizerPolicyGapReviewDecision | null;
  defaultPosition: string;
  decisionOwner: string;
  currentState: string;
  requiredInputs: string[];
  unblockCriteria: string[];
  blockedArtifacts: string[];
  nextAction: string;
  evidence: Record<string, unknown>;
}

export interface OrganizerPolicyDecisionPackets {
  schemaVersion: number;
  summary: {
    packets: number;
    decisionRequired: number;
    ready: number;
    notReviewed: number;
    accepted: number;
    held: number;
    rejected: number;
    invalid: number;
    questions: number;
    unansweredQuestions: number;
    requiredQuestions: number;
    questionsByArea: Record<string, number>;
    questionsByAnswerState: Record<string, number>;
  };
  guardrails: string[];
  packets: OrganizerPolicyDecisionPacket[];
}

export interface OrganizerPolicyDecisionPacket {
  packetId: string;
  gapId: string;
  area: string;
  severity: "critical" | "high" | "medium" | "low";
  status: string;
  decisionStatus: string;
  decisionOwner: string;
  decisionPrompt: string;
  currentState: string;
  safeDefaultAction: string;
  implementationGate: string;
  blockedArtifacts: string[];
  unblockCriteria: string[];
  nextAction: string;
  reviewDecision: OrganizerPolicyGapReviewDecision | null;
  questions: OrganizerPolicyDecisionQuestion[];
}

export interface OrganizerPolicyDecisionQuestion {
  questionId: string;
  input: string;
  prompt: string;
  currentDefault: string;
  recommendedSafeDefault: string;
  requiredForAcceptance: boolean;
  answerState: "reviewed" | "needs_input";
}

export interface OrganizerCanonicalHostEntityRegistry {
  schemaVersion: number;
  naming: {
    publicEntityLabel: string;
    canonicalDataModel: string;
    operatorAccountLabel: string;
    legacyCompatibilityModel: string;
    note: string;
  };
  summary: {
    entities: number;
    publicPublished: number;
    indexed: number;
    appDiscoverable: number;
    claimTargets: number;
    unclaimed: number;
    claimed: number;
    internalOnly: number;
    cityScoped: number;
    multiCityScoped: number;
    nationalScoped: number;
    globalScoped: number;
    remoteScoped: number;
    surfaces: number;
    activeSurfaces: number;
    ambiguousSurfaces: number;
    rejectedSurfaces: number;
    crawlCapableSurfaces: number;
    eventSourceSurfaces: number;
    socialProfileSurfaces: number;
    legacyClubProjected: number;
    pendingManualReview: number;
    byEntityKind: Record<string, number>;
    byScopeKind: Record<string, number>;
  };
  guardrails: string[];
  entries: OrganizerCanonicalHostEntity[];
}

export interface OrganizerCanonicalHostEntity {
  canonicalHostId: string;
  entityId: string;
  displayName: string;
  canonicalSlug: string;
  aliases: string[];
  entityKind: string;
  entitySubtypes: string[];
  priority: string;
  activity: {
    primaryActivityKind: string | null;
    supportedActivityKinds: string[];
    confidence: string;
    derivedFromSurfaceIds: string[];
  };
  geography: {
    scopeKind: string | null;
    primaryMarketSlug: string | null;
    markets: OrganizerIntakeMarket[];
    countryCodes: string[];
  };
  publicPresence: {
    reviewStatus: string;
    projectionStatus: string;
    publishStatus: string;
    indexStatus: string;
    appVisibility: string;
    canonicalPath: string | null;
    legacyPaths: string[];
    pageMode: string;
    publicListingId: string | null;
    publicListingStatus: string | null;
    blockedBy: string[];
  };
  claim: {
    relationshipToCatch: string;
    claimState: string;
    claimTargetPath: string | null;
    appVisibility: string;
    ownerAccountRequired: boolean;
    writeMode: string | null;
  };
  legacyClubCompatibility: {
    collection: string;
    documentId: string;
    status: string;
    writeMode: string | null;
    sourceHash: string | null;
    note: string;
  };
  surfaceInventory: {
    surfaces: number;
    active: number;
    ambiguous: number;
    rejected: number;
    historical: number;
    primarySurfaceIds: string[];
    eventSourceSurfaceIds: string[];
    socialProfileSurfaceIds: string[];
    platforms: Record<string, number>;
    normalizedKeys: string[];
  };
  dedupe: {
    keys: number;
    strongKeys: number;
    mediumKeys: number;
    weakKeys: number;
    conflicts: number;
    keyTypes: Record<string, number>;
  };
  nextActions: string[];
}

export interface OrganizerCanonicalEvidenceIndex {
  schemaVersion: number;
  summary: {
    records: number;
    hosts: number;
    surfaces: number;
    surfacesWithoutEvidence: number;
    resolvedArtifactRefs: number;
    unresolvedLocalRefs: number;
    manualReportsWithoutArtifacts: number;
    externalUrlRefs: number;
    rawProviderArtifacts: number;
    rawProviderArtifactsReferenced: number;
    rawPayloadBytes: number;
    firestoreForbiddenArtifactRefs: number;
    remoteUploadBlockedArtifactRefs: number;
    evidenceByStatus: Record<string, number>;
    evidenceByType: Record<string, number>;
    surfaceStatuses: Record<string, number>;
    publishStatuses: Record<string, number>;
    artifactKinds: Record<string, number>;
  };
  guardrails: string[];
  records: OrganizerCanonicalEvidenceRecord[];
  artifactCoverage: OrganizerCanonicalEvidenceArtifact[];
}

export interface OrganizerCanonicalEvidenceRecord {
  evidenceId: string;
  canonicalHostId: string;
  entityId: string;
  displayName: string;
  surface: {
    surfaceId: string;
    platform: string;
    surfaceKind: string;
    url: string | null;
    normalizedKey: string | null;
    role: string;
    status: string;
    supportsEventExtraction: boolean;
  };
  evidence: {
    type: string;
    ref: string | null;
    description: string | null;
    status: string;
  };
  artifact: OrganizerCanonicalEvidenceArtifact | null;
  reviewState: {
    entityReviewStatus: string | null;
    publishStatus: string | null;
    indexStatus: string | null;
    claimState: string | null;
    appVisibility: string | null;
    reviewTaskType: string | null;
    reviewBlockers: string[];
    curation: Record<string, unknown> | null;
  };
  correlatedCandidates: {
    searchCandidateIds: string[];
    externalEventCandidateIds: string[];
  };
  riskFlags: string[];
  nextAction: string;
}

export interface OrganizerCanonicalEvidenceArtifact {
  artifactId: string;
  path: string;
  artifactKind: string;
  storageClass: string;
  sizeBytes: number;
  sha256: string;
  source?: string;
  containsRawProviderPayload: boolean;
  firestoreMode: string;
  retentionStatus: string | null;
  storageAction: string | null;
  remoteObjectKey: string | null;
  referencedByEvidenceIds?: string[];
}

export interface OrganizerPublicationReviewPackets {
  schemaVersion: number;
  summary: {
    packets: number;
    readyForManualPublicationReview: number;
    blockedByData: number;
    published: number;
    suppressed: number;
    held: number;
    evidenceRecords: number;
    manualReportsWithoutArtifacts: number;
    unresolvedEvidenceRefs: number;
    missingSurfaceEvidence: number;
    packetsByStatus: Record<string, number>;
    packetsByTaskType: Record<string, number>;
  };
  guardrails: string[];
  packets: OrganizerPublicationReviewPacket[];
}

export interface OrganizerPublicationReviewPacket {
  packetId: string;
  canonicalHostId: string;
  entityId: string;
  displayName: string;
  priority: string;
  taskType: string;
  status: string;
  recommendedAction: string;
  identity: {
    entityKind: string;
    aliases: string[];
    activity: OrganizerCanonicalHostEntity["activity"];
    geography: OrganizerCanonicalHostEntity["geography"];
  };
  publicPresence: {
    canonicalPath: string | null;
    legacyPaths: string[];
    projectionStatus: string;
    publishStatus: string;
    indexStatus: string;
    appVisibility: string;
    claimTargetPath: string | null;
  };
  publicDraft: {
    headline: string | null;
    summary: string | null;
    sourceSummary: string | null;
    formats: string[];
    missingEvidence: string[];
  };
  surfaceSummary: OrganizerCanonicalHostEntity["surfaceInventory"];
  evidenceSummary: {
    records: number;
    resolvedArtifactRefs: number;
    manualReportsWithoutArtifacts: number;
    unresolvedLocalRefs: number;
    missingSurfaceEvidence: number;
    rawProviderArtifactRefs: number;
    firestoreForbiddenArtifactRefs: number;
    riskFlags: string[];
    byStatus: Record<string, number>;
    byType: Record<string, number>;
  };
  evidenceReview: {
    totalRecords: number;
    shownRecords: number;
    truncated: boolean;
    artifactBackedRecords: number;
    manualReportsWithoutArtifacts: number;
    unresolvedLocalRefs: number;
    missingSurfaceEvidence: number;
    externalUrlRefs: number;
    rawProviderArtifactRefs: number;
    records: OrganizerPublicationEvidenceReviewRecord[];
  };
  evidenceRecordIds: string[];
  gates: OrganizerIntakeGate[];
  blockers: string[];
  dataBlockers: string[];
  evidenceBlockers: string[];
  approvalChecklist: Record<string, boolean>;
  adminDecision: {
    currentDecision: OrganizerReviewDecision | null;
    allowedDecisions: OrganizerIntakeDecision[];
    defaultAppVisibility: string;
    command: string;
  };
  nextActions: string[];
}

export interface OrganizerPublicationPacketProjection {
  packetId: string;
  entityId: string;
  canonicalHostId: string;
  displayName: string;
  status: string;
  priority: string;
  markets: Array<{
    slug: string;
    displayName: string;
  }>;
  blockers: string[];
  dataBlockers: string[];
  evidenceBlockers: string[];
  approvalChecklist: {
    crawlDisabledReviewed: boolean;
    identityReviewed: boolean;
    marketScopeReviewed: boolean;
    mediaRightsReviewed: boolean;
    ownerSafeCopyReviewed: boolean;
    surfaceInventoryReviewed: boolean;
  };
  evidenceSummary: {
    records: number;
    manualReportsWithoutArtifacts: number;
    unresolvedLocalRefs: number;
    missingSurfaceEvidence: number;
    rawProviderArtifactRefs: number;
    firestoreForbiddenArtifactRefs: number;
    riskFlags: string[];
  };
  publicPresence: {
    canonicalPath: string | null;
    claimTargetPath: string | null;
    publishStatus: OrganizerIntakePublishStatus;
    indexStatus: OrganizerIntakeIndexStatus;
    appVisibility: OrganizerAppVisibility;
    projectionStatus: string;
  };
  adminDecision: {
    allowedDecisions: OrganizerIntakeDecision[];
    defaultAppVisibility: OrganizerAppVisibility;
    currentDecision: {
      decision: OrganizerIntakeDecision;
      publishStatus: OrganizerIntakePublishStatus;
      indexStatus: OrganizerIntakeIndexStatus;
      decidedAt: string;
      appVisibility: OrganizerAppVisibility;
    } | null;
  };
  nextActions: string[];
}

export interface OrganizerPublicationEvidenceReviewRecord {
  evidenceId: string;
  surface: {
    surfaceId: string | null;
    platform: string;
    surfaceKind: string;
    role: string;
    status: string;
    url: string | null;
    normalizedKey: string | null;
    supportsEventExtraction: boolean;
  };
  evidence: {
    type: string;
    status: string;
    ref: string | null;
    description: string | null;
  };
  artifact: {
    artifactId: string;
    path: string;
    artifactKind: string;
    storageClass: string;
    sizeBytes: number;
    sha256: string;
    containsRawProviderPayload: boolean;
    firestoreMode: string;
    retentionStatus: string | null;
    storageAction: string | null;
  } | null;
  correlatedCandidates: {
    searchCandidateIds: string[];
    externalEventCandidateIds: string[];
  };
  riskFlags: string[];
  nextAction: string;
  reviewerUse: {
    artifactAvailable: boolean;
    manualReportWithoutArtifact: boolean;
    missingSurfaceEvidence: boolean;
    unresolvedLocalReference: boolean;
    sourceUrlAvailable: boolean;
  };
}

export interface OrganizerPublicationDecisionImpactPreview {
  schemaVersion: number;
  summary: {
    impacts: number;
    wouldPublish: number;
    wouldIndex: number;
    wouldCreateClaimTargets: number;
    wouldBeAppDiscoverable: number;
    blocked: number;
    reviewerAcknowledgementsRequired: number;
    byStatus: Record<string, number>;
  };
  guardrails: string[];
  entries: OrganizerPublicationDecisionImpact[];
}

export interface OrganizerPublicationDecisionImpact {
  impactId: string;
  packetId: string;
  entityId: string;
  displayName: string;
  status: string;
  decisionRequired: {
    decision: OrganizerIntakeDecision;
    appVisibility: string;
    checklist: Record<string, boolean>;
    command: string;
  };
  preconditions: {
    packetStatus: string;
    dataBlockers: string[];
    evidenceBlockers: string[];
    manualReportsWithoutArtifacts: number;
    reviewerAcknowledgementRequired: boolean;
    blockers?: string[];
  };
  publicProjection: {
    wouldPublish: boolean;
    wouldIndex: boolean;
    projectionStatus: string;
    publishStatus: string;
    indexStatus: string;
    canonicalPath: string | null;
    legacyPaths: string[];
    pageMode: string | null;
    listingId: string | null;
    listingName: string | null;
    listingVariant: string | null;
    dataOrigin: string | null;
    indexing: string;
    sourceCount: number;
    missingEvidence: string[];
  };
  claimTarget: {
    wouldCreateOrRefresh: boolean;
    path: string | null;
    writeMode: string | null;
    appVisibility: string;
    claimState: string;
    sourceHash: string | null;
  };
  app: {
    appVisibility: string;
    wouldBeDiscoverable: boolean;
  };
  remoteEffects: {
    writesDuringPreview: number;
    writesDuringDecisionExport: number;
    claimSyncRequired: boolean;
    claimSyncTargetPath: string | null;
    websiteGenerationRequired: boolean;
    sitemapEligible: boolean;
  };
  commands: string[];
}

export interface OrganizerClaimTargetSyncPreview {
  schemaVersion: number;
  generatedFrom: {
    claimTargetPlan: string;
    existingDocsSource: string;
  };
  summary: {
    targets: number;
    creates: number;
    refreshes: number;
    skippedOwnerBound: number;
    writesNeeded: number;
  };
  mode: {
    previewOnly: boolean;
    existingDocsSource: string;
    remoteReads: number;
    remoteWrites: number;
    assumesMissingWhenNotInFixture: boolean;
  };
  guardrails: string[];
  commands: Record<string, string>;
  actions: OrganizerClaimTargetSyncPreviewAction[];
}

export interface OrganizerClaimTargetSyncPreviewAction {
  entityId: string;
  path: string;
  status: "create" | "refresh" | "skip_owner_bound";
  merge: boolean;
  reason: string;
  writeFields: string[];
  writeFieldCount: number;
  writesRemoteData: boolean;
  requiresFirestoreDryRun: boolean;
}

export interface OrganizerCrawlPlan {
  summary: OrganizerCrawlPlanSummary;
  policy: OrganizerCrawlPlanPolicy;
  guardrails: string[];
}

export interface OrganizerCrawlPlanSummary {
  entities: number;
  crawlCapableSurfaces: number;
  approvedSurfaces: number;
  blockedSurfaces: number;
  platforms: Record<string, number>;
  blockers: Record<string, number>;
}

export interface OrganizerCrawlPlanPolicy {
  status: string;
  schedulerEnabled: boolean;
  defaultSurfacePolicy: string;
  reason: string;
}

export interface OrganizerCrawlRunPlan {
  summary: {
    candidateSurfaces: number;
    wouldFetch: number;
    blocked: number;
    networkRequests: number;
    firestoreWrites: number;
    platforms: Record<string, number>;
    blockers: Record<string, number>;
  };
  policy: {
    status: string;
    schedulerEnabled: boolean;
    networkEnabled: boolean;
    firestoreWritesEnabled: boolean;
    platformAllowlist: string[];
    maxRequestsPerRun: number;
    reason: string;
  };
  guardrails: string[];
  runIntents: OrganizerCrawlRunIntent[];
}

export interface OrganizerCrawlRunIntent {
  crawlRunId: string;
  entityId: string;
  displayName: string;
  surfaceId: string;
  platform: string;
  surfaceKind: string;
  url: string | null;
  normalizedKey: string | null;
  action: "blocked" | "would_fetch";
  blockedBy: string[];
  expectedOutput: string;
  nextGate: string;
}

export interface OrganizerRawArtifactStorageManifest {
  summary: {
    artifacts: number;
    rawProviderPayloads: number;
    reviewedSourceBatches: number;
    decisionBatches: number;
    fixtureSupportFiles: number;
    seedIntakeBatches: number;
    totalBytes: number;
    remoteUploadReady: number;
    remoteUploadBlocked: number;
    firestoreRawStorageAllowed: boolean;
    retentionDecisionRequired: number;
    blockers: Record<string, number>;
    storageClasses: Record<string, number>;
  };
  policy: {
    status: string;
    remoteObjectStorageEnabled: boolean;
    firestoreRawPayloadStorageEnabled: boolean;
    provider: string;
    bucket: string | null;
    rawPayloadRetentionDays: number | null;
    retentionPolicyApproved: boolean;
    reason: string;
  };
  guardrails: string[];
  artifacts: OrganizerRawArtifactRecord[];
}

export interface OrganizerRawArtifactRecord {
  artifactId: string;
  path: string;
  artifactKind: string;
  storageClass: string;
  sizeBytes: number;
  sha256: string;
  containsRawProviderPayload: boolean;
  firestoreMode: string;
  retention: {
    status: string;
    retentionDays: number | null;
    deletionMode: string;
  };
  storagePlan: {
    action: "blocked" | "not_required" | "would_upload";
    remoteObjectKey: string;
    blockedBy: string[];
    reason: string;
  };
}

export interface OrganizerIntakeItem {
  entityId: string;
  displayName: string;
  priority: string;
  taskType: string;
  reviewStatus: string;
  relationshipToCatch: string;
  canonicalPath: string | null;
  legacyPaths: string[];
  markets: OrganizerIntakeMarket[];
  blockers: string[];
  gates: OrganizerIntakeGate[];
  surfaceSummary: OrganizerSurfaceSummary;
  surfaces: OrganizerItemSurface[];
  promotionPolicy: OrganizerPromotionPolicy;
  reviewDecision: OrganizerReviewDecision | null;
  projectionStatus: string;
  publishStatus: string;
  indexStatus: string;
  appVisibility: string;
  claimTargetPath?: string | null;
  curation: OrganizerItemCuration | null;
  decisionCommands: OrganizerDecisionCommands;
}

export interface OrganizerCurationState {
  summary: OrganizerCurationSummary;
  commands: OrganizerCurationCommands;
  attachedSurfaces: OrganizerCurationStateOperation[];
  mergedEntities: OrganizerCurationStateOperation[];
  suppressedEntities: OrganizerCurationStateOperation[];
  surfaceDecisions: OrganizerCurationStateOperation[];
  splitSurfaces: OrganizerCurationStateOperation[];
}

export interface OrganizerCurationSummary {
  entities: number;
  operations: number;
  attachedSurfaces: number;
  merges: number;
  suppressions: number;
  surfaceDecisions: number;
  splitSurfaces: number;
  mergeTargets: number;
  mergedSources: number;
}

export interface OrganizerCurationCommands {
  attachSurface: string;
  mergeEntity: string;
  splitSurface: string;
  suppressEntity: string;
  surfaceDecision: string;
}

export interface OrganizerCurationStateOperation {
  operationId: string;
  reason: string;
  [key: string]: unknown;
}

export interface OrganizerItemCuration {
  attachedSurfaces: Array<{
    surfaceId: string;
    sourceCandidateId: string;
    reason: string;
  }>;
  mergedFrom: string[];
  mergedInto: string | null;
  suppressed: string | null;
  surfaceDecisions: Array<{
    surfaceId: string;
    decision: string;
    reason: string;
  }>;
  splitSurfaces: Array<{
    surfaceId: string;
    newEntityId: string;
    reason: string;
  }>;
}

export interface OrganizerSearchCandidateQueue {
  summary: OrganizerSearchCandidateSummary;
  generatedFrom: {
    batches: string[];
    dedupeIndexGeneratedAt: string | null;
  };
  candidates: OrganizerSearchCandidate[];
  duplicateKeys: Array<{
    normalizedKey: string;
    candidateIds: string[];
  }>;
  warnings: string[];
  errors: string[];
  commands: OrganizerSearchCandidateCommands;
}

export interface OrganizerPublishingContracts {
  organizer: OrganizerPublishingContract;
  event: OrganizerPublishingContract;
}

export interface OrganizerPublishingContract {
  intakeTarget: "organizer" | "event" | string;
  callablePayloadSchema: string;
  firestoreSchema: string;
  generatedCallablePayload: string;
  writeCallable: string;
  projectionNotes: string[];
}

export interface OrganizerDiscoverySearchPlan {
  schemaVersion: number;
  generatedFrom: {
    searchPlan: string;
    searchMatrix: string | null;
    targetCategories: string | null;
    queryTemplates: string | null;
    batches: string[];
    runs: string[];
  };
  asOf: string | null;
  freshForDays: number | null;
  summary: {
    planned: number;
    skippedFresh: number;
    launchCityPlanned: number;
    launchCitySkippedFresh: number;
    plannedByCity: Record<string, number>;
    plannedByCategory: Record<string, number>;
    plannedByKind: Record<string, number>;
    launchCities: string[];
    missingLaunchCityCategories: Array<{
      citySlug: string;
      city: string;
      categoryId: string;
    }>;
  };
  contracts: OrganizerPublishingContracts;
  launchCities: OrganizerDiscoveryLaunchCity[];
  planned: OrganizerDiscoverySearchPlanEntry[];
  skippedFresh: OrganizerDiscoverySearchPlanEntry[];
  warnings: string[];
  commands: {
    configure: string;
    regenerate: string;
    capture: string;
    ingest: string;
  };
}

export interface OrganizerDiscoveryLaunchCity {
  citySlug: string;
  city: string;
  planned: number;
  skippedFresh: number;
  categoryIds: string[];
  missingCategoryIds: string[];
}

export interface OrganizerDiscoverySearchPlanEntry {
  runKey: string;
  planKind: string;
  source: string;
  citySlug: string;
  city: string;
  categoryId: string;
  queryTemplateId: string;
  queryTemplate: string;
  renderedQuery: string;
  candidateId: string | null;
  candidateName: string | null;
  resultFingerprint: string | null;
  existingRunId: string | null;
  existingRunFile: string | null;
  searchedAt: string | null;
}

export interface OrganizerSourceMentionResolution {
  policy: OrganizerSourceMentionResolutionPolicy;
  sourceArtifacts: OrganizerSourceMentionSourceArtifacts;
  extractedMentions: OrganizerSourceMentionExtractedMentions;
  resolutionCandidates: OrganizerSourceMentionResolutionCandidates;
  resolutionClusters: OrganizerSourceMentionResolutionClusters;
  reviewPackets: OrganizerSourceMentionResolutionReviewPackets;
  llmPromptQueue: OrganizerSourceMentionLlmPromptQueue;
}

export interface OrganizerSourceMentionResolutionPolicy {
  schemaVersion: number;
  policyId: string;
  status: string;
  summary: string;
  canonicalBoundary: Record<string, string>;
  hardKeyPolicy?: {
    stableProviderEventPlatforms: string[];
    note: string;
  };
  blockingKeys: Array<{
    id: string;
    entityType: string;
    strength: string;
  }>;
  signalWeights: Record<string, number>;
  thresholds: Record<string, number>;
  llm: {
    status: string;
    extractionModelEnv: string;
    adjudicationModelEnv: string;
    apiKeyEnv: string;
    cacheRoot: string;
    promptVersions: Record<string, string>;
    costControls: string[];
  };
}

export interface OrganizerSourceMentionSourceArtifacts {
  schemaVersion: number;
  generatedFrom: Record<string, string>;
  summary: {
    artifacts: number;
    searchResultBatches: number;
    eventSourceBatches: number;
    attributionUrls: number;
  };
  artifacts: OrganizerSourceMentionSourceArtifact[];
}

export interface OrganizerSourceMentionSourceArtifact {
  artifactId: string;
  artifactKind: string;
  sourceType: string;
  batchId: string;
  sourceUrl: string | null;
  publisher: string | null;
  query: string | null;
  citySlug: string | null;
  categoryId: string | null;
  candidateIds: string[];
  mentionIds: string[];
  attributionUrls: string[];
}

export interface OrganizerSourceMentionExtractedMentions {
  schemaVersion: number;
  generatedFrom: Record<string, string>;
  extractionPolicy: {
    llmExtractionEnabled: boolean;
    deterministicExtractors: string[];
    note: string;
  };
  summary: {
    mentions: number;
    eventMentions: number;
    organizerMentions: number;
    editorialMentions: number;
    llmExtractedMentions: number;
  };
  mentions: OrganizerSourceMention[];
}

export interface OrganizerSourceMention {
  mentionId: string;
  entityType: "event" | "organizer" | string;
  source: {
    sourceArtifactId: string;
    sourceCandidateId: string;
    sourceType: string;
    title: string;
    sourceUrl: string | null;
    canonicalUrl: string | null;
    observedAt: string | null;
    query: string | null;
  };
  extraction: {
    method: string;
    extractorVersion: string;
    promptVersion: string | null;
    model: string | null;
    inputHash: string;
  };
  fields: {
    title: string | null;
    organizerName: string | null;
    citySlug: string | null;
    categoryId: string | null;
    officialUrl: string | null;
    platform: string | null;
    surfaceKind: string | null;
    normalizedKey: string | null;
    description: string | null;
    startAt: string | null;
    endAt?: string | null;
    venueName: string | null;
    venueAddress?: string | null;
    placeId?: string | null;
    priceText?: string | null;
    imageUrl?: string | null;
  };
  citations: OrganizerSourceMentionCitation[];
  diagnostics: string[];
}

export interface OrganizerSourceMentionCitation {
  field: string;
  sourceUrl: string | null;
  spanId: string | null;
}

export interface OrganizerSourceMentionResolutionCandidates {
  schemaVersion: number;
  generatedFrom: Record<string, string>;
  summary: {
    candidates: number;
    eventCandidates: number;
    organizerCandidates: number;
    hardKeyedCandidates: number;
    blockingKeys: number;
  };
  blockingKeyStats: OrganizerSourceMentionBlockingKeyStat[];
  candidates: OrganizerSourceMentionResolutionCandidate[];
}

export interface OrganizerSourceMentionBlockingKeyStat {
  key: string;
  candidates: number;
  possiblePairs: number;
}

export interface OrganizerSourceMentionResolutionCandidate {
  candidateId: string;
  mentionId: string;
  entityType: string;
  extractionMethod: string;
  displayName: string | null;
  citySlug: string | null;
  date: string | null;
  categoryId: string | null;
  normalized: Record<string, string | null>;
  hardKeys: OrganizerSourceMentionBlockingKey[];
  blockingKeys: OrganizerSourceMentionBlockingKey[];
  source: OrganizerSourceMention["source"];
  citations: OrganizerSourceMentionCitation[];
  publishBoundary: string | null;
}

export interface OrganizerSourceMentionBlockingKey {
  type: string;
  value: string;
  key: string;
  strength: string;
}

export interface OrganizerSourceMentionResolutionClusters {
  schemaVersion: number;
  generatedFrom: Record<string, string>;
  summary: {
    clusters: number;
    singletonClusters: number;
    autoAttachClusters: number;
    probableDuplicateClusters: number;
    needsHumanReviewClusters: number;
    llmReviewQueued: number;
    candidatePairs: number;
    warnings: number;
  };
  candidatePairs: OrganizerSourceMentionCandidatePair[];
  clusters: OrganizerSourceMentionCluster[];
  llmReviewQueue: OrganizerSourceMentionLlmReviewRequest[];
  warnings: string[];
  commands: Record<string, string>;
}

export interface OrganizerSourceMentionCandidatePair {
  pairId: string;
  leftCandidateId: string;
  rightCandidateId: string;
  entityType: string;
  score: number;
  scoreBand: string;
  blockingKeys: string[];
  hardSignals: string[];
  matchingSignals: string[];
  conflictingSignals: string[];
  reason: string;
}

export interface OrganizerSourceMentionCluster {
  clusterId: string;
  entityType: string;
  resolutionState: string;
  score: number;
  scoreBand: string;
  candidateIds: string[];
  mentionIds: string[];
  displayNames: string[];
  cities: string[];
  dates: string[];
  blockingKeys: string[];
  hardSignals: string[];
  matchingSignals: string[];
  conflictingSignals: string[];
  pairIds: string[];
  llmReview: {
    status: string;
    reason: string;
  };
  publishBoundary: string | null;
}

export interface OrganizerSourceMentionLlmReviewRequest {
  clusterId: string;
  entityType: string;
  mentions: number;
  deterministicScore: number;
  status: string;
  promptVersion: string;
  inputHash: string;
  reason: string;
}

export interface OrganizerSourceMentionResolutionReviewPackets {
  schemaVersion: number;
  generatedFrom: Record<string, string>;
  policy: {
    autoAttachThreshold: number;
    humanReviewThreshold: number;
    llmStatus: string;
  };
  summary: {
    packets: number;
    humanReviewRequired: number;
    llmReviewRecommended: number;
    autoAttach: number;
    singleton: number;
  };
  packets: OrganizerSourceMentionResolutionReviewPacket[];
}

export interface OrganizerSourceMentionLlmPromptQueue {
  schemaVersion: number;
  generatedFrom: Record<string, string>;
  policy: {
    status: string;
    cacheRoot: string;
    note: string;
  };
  summary: {
    requests: number;
    promptReady: number;
  };
  requests: Array<{
    requestId: string;
    clusterId: string;
    status: string;
    promptVersion: string;
    modelEnv: string;
    apiKeyEnv: string;
    inputHash: string;
    system: string;
    payload: unknown;
    expectedJsonShape: unknown;
  }>;
}

export interface OrganizerSourceMentionResolutionReviewPacket {
  packetId: string;
  clusterId: string;
  entityType: string;
  resolutionState: string;
  score: number;
  recommendedAction: string;
  humanReviewRequired: boolean;
  llmReview: {
    status: string;
    reason: string;
  };
  checklist: Record<string, boolean>;
  candidateIds: string[];
  mentionIds: string[];
  topSignals: string[];
  conflicts: string[];
  publishBoundary: string | null;
}

export interface OrganizerSearchCandidateSummary {
  batches: number;
  results: number;
  candidates: number;
  matchedExistingEntities: number;
  duplicateNormalizedKeys: number;
  platforms: Record<string, number>;
}

export interface OrganizerSearchCandidateCommands {
  capture: string;
  curateSurface: string;
  ingest: string;
  normalize: string;
}

export interface OrganizerSearchCandidate {
  workItemId: string;
  workItemRevision: number;
  candidateHash: string;
  candidateId: string;
  batchId: string;
  resultId: string;
  rank: number;
  query: string;
  queryIntent: {
    activityKind: string | null;
    entityHint: string | null;
    marketSlug: string | null;
  };
  observedAt: string;
  title: string;
  snippet: string | null;
  url: string;
  canonicalUrl: string;
  platform: string;
  surfaceKind: string;
  normalizedKey: string | null;
  suggestedSurface: OrganizerSuggestedSurface;
  existingEntityMatches: OrganizerExistingEntityMatch[];
  reviewAction: string;
  diagnostics: string[];
  fieldProvenance?: OperationFieldProvenance[];
  reviewContext?: OrganizerSearchCandidateReviewContext;
  draftLink?: OrganizerCandidateDraftLink;
}

export interface OrganizerCandidateDraftLink {
  workItemId: string;
  candidateId: string;
  organizerId: string;
  curationPath: string;
}

export interface OrganizerDraftFormState {
  publicSlug: string;
  name: string;
  organizerType:
    | "club"
    | "community"
    | "individual"
    | "eventProducer"
    | "venue"
    | "brand";
  reviewNote: string;
}

export interface OrganizerVisibilityFormState {
  publishStatus: OrganizerIntakePublishStatus;
  indexStatus: OrganizerIntakeIndexStatus;
  appVisibility: OrganizerAppVisibility;
}

export interface OrganizerSurfaceChecklistState {
  claimTargetReviewed: boolean;
  takedownPathReviewed: boolean;
  impersonationReviewed: boolean;
  operatingStatusReviewed: boolean;
  eventAccuracyReviewed: boolean;
  unclaimedAffordancesReviewed: boolean;
}

export interface OrganizerSearchCandidateReviewContext {
  recordStatus: string;
  existingInventory: boolean;
  formats: string[];
  sources: string[];
  eventSignal: string | null;
  reviewNotes: string | null;
  verifiedAt: string | null;
}

export type OrganizerSuggestedSurface = OrganizerCurationSurface;

export interface OrganizerExistingEntityMatch {
  entityId: string;
  strength: string;
  reason: string;
}

export type OrganizerExternalEventImportPlan = ExternalEventImportPlan;
export type OrganizerExternalEventImportAction = ExternalEventImportAction;
export type OrganizerExternalEventImportExecutionPlan =
  ExternalEventImportExecutionPlan;
export type OrganizerExternalEventImportExecutionAction =
  ExternalEventImportExecutionAction;

export interface OrganizerIntakeMarket {
  marketSlug: string;
  displayName: string;
  countryCode: string;
  eventFilter: {
    mode: string;
    citySlug: string;
  };
}

export interface OrganizerIntakeGate {
  id: string;
  passed: boolean;
  description: string;
}

export interface OrganizerSurfaceSummary {
  total: number;
  active: number;
  ambiguous: number;
  candidate: number;
  rejected: number;
  platforms: Record<string, number>;
}

export interface OrganizerItemSurface {
  surfaceId: string;
  platform: string;
  surfaceKind: string;
  url: string | null;
  normalizedKey: string | null;
  role: string;
  status: string;
  crawl: {
    eventDiscoveryStatus: string;
    policy: string;
    supportsEventExtraction: boolean;
  };
  notes: string;
}

export interface OrganizerCurationFormState {
  operationType: OrganizerCurationOperation;
  targetEntityId: string;
  surfaceId: string;
  newEntityId: string;
  decision: OrganizerSurfaceDecision;
  reason: string;
}

export interface OrganizerPromotionPolicy {
  adminApprovalIndexesWebsite: boolean;
  adminApprovalPublishesWebsite: boolean;
  appVisibilityAfterPublicApproval: string;
}

export interface OrganizerReviewDecision {
  decision: string;
  publishStatus?: OrganizerIntakePublishStatus;
  indexStatus?: OrganizerIntakeIndexStatus;
  appVisibility: string;
  decidedAt: string;
  reviewer: string;
  decisionBatchId: string;
  sourceFile: string;
}

export interface OrganizerDecisionCommands {
  approvePublic: string;
  hold: string;
  suppress: string;
}

