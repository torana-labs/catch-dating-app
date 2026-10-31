import type {
  OrganizerAppVisibility,
  OrganizerCurationOperation,
  OrganizerCurationSurface,
  OrganizerIntakeDecision,
  OrganizerIntakeIndexStatus,
  OrganizerIntakePublishStatus,
  OrganizerSurfaceDecision,
} from "../../../../shared/types/adminTypes";
import type {OperationFieldProvenance} from
  "../../../../shared/operations/operationsTypes";

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
  legacyOrganizerCompatibility: {
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

