/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

import type {OutreachDraftingInput} from "./outreachDraftingInput";
import type {OutreachDraftingSelection} from "./outreachDraftingSelection";
import type {SupplyIntakeRequest} from "./supplyIntakeRequest";
import type {OutreachDraft} from "./outreachDraft";
import type {AdminBuildSalesOutreachInputPayload} from "./adminSalesIntelligenceDraftCallablePayload";
import type {AdminRefreshSalesFitQueueResponse} from "./adminRefreshSalesFitQueueResponse";
import type {LegacyPaymentRefundIntent} from "./legacyPaymentRefundIntent";
import type {ResolvedEventPreferences} from "./resolvedEventPreferences";
import type {EventPaymentTerms} from "./eventPaymentTerms";
import type {OrganizerEventSetupPreferences} from "./organizerEventSetupPreferences";
import type {EventOrigin} from "./eventOrigin";
import type {EventRuntimeAccess} from "./eventRuntimeAccess";
import type {ExternalEventBlockerResolution} from "./externalEventBlockerResolution";
import type {HostAnalyticsCallableResponse} from "./hostAnalyticsCallableResponse";
import type {EventOfferPaymentSnapshot} from "./eventOfferPaymentSnapshot";
import type {EventOfferManualPayment} from "./eventOfferManualPayment";
import type {EventSetupDefaults} from "./eventSetupDefaults";
import type {QueryOrganizerFormResponsesCallablePayload} from "./queryOrganizerFormResponsesCallablePayload";
import type {OrganizerSavedAudienceCallableResponse} from "./organizerSavedAudienceCallableResponse";
import type {ImportEventAttendeesCallablePayload} from "./importEventAttendeesCallablePayload";
import type {GetOrganizerCrmSummaryCallableResponse} from "./getOrganizerCrmSummaryCallableResponse";

/**
 * Schema-derived Admin SDK Firestore document types.
 *
 * The sibling generated document files model serialized JSON fixture
 * timestamps as {_seconds, _nanoseconds}. These types keep the same
 * schema-owned fields, but project Firestore timestamp values as live
 * FirebaseFirestore.Timestamp instances for Cloud Functions code that reads
 * and writes through the Admin SDK.
 */

// FirebaseFirestore.Timestamp is available globally through firebase-admin's
// @google-cloud/firestore dependency.

export type Gender = "man" | "woman" | "nonBinary" | "other";

/**
 * refundFailed marks rejected admission with an unresolved refund. New records use cancellationRefund.state for pending versus reviewRequired; historical records without that intent need manual reconciliation. Only an observed full refund becomes refunded.
 */
export type PaymentStatus =
  | "pending"
  | "completed"
  | "failed"
  | "refunded"
  | "refundFailed";

/**
 * One structured written profile prompt answer stored on users and publicProfiles.
 */
export interface ProfilePromptAnswer {
  promptId: string;
  prompt: string;
  answer: string;
}

/**
 * One optional display prompt selected for a profile photo slot. The caption field is legacy-only and should no longer be written by clients.
 */
export interface PhotoPromptAnswer {
  photoIndex: number;
  promptId: string;
  prompt: string;
  /**
   * @deprecated
   * Legacy user-entered caption retained for compatibility with older documents.
   */
  caption?: string;
}

/**
 * Future canonical profile-photo object that groups display URLs, Firebase Storage object paths, prompt metadata, moderation state, order, and lifecycle timestamps.
 */
export interface ProfilePhoto {
  id: string;
  url: string;
  thumbnailUrl: string;
  storagePath: string;
  thumbnailStoragePath: string;
  prompt?: PhotoPromptAnswer | null;
  moderation?: {
    status: "pending" | "approved" | "rejected";
    reason?: string | null;
    reviewedAt?: FirebaseFirestore.Timestamp | null;
  } | null;
  position: number;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Canonical uploaded image object for ordered media galleries, logos, and event photos.
 */
export interface UploadedPhoto {
  id: string;
  url: string;
  storagePath: string;
  thumbnailUrl: string | null;
  thumbnailStoragePath: string | null;
  position: number;
  moderation?: {
    status: "pending" | "approved" | "rejected";
    reason?: string | null;
    reviewedAt?: FirebaseFirestore.Timestamp | null;
  } | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Per-activity user preferences. Running is the first migrated activity-specific preference object; other activity kinds can be added without new root profile fields.
 */
export interface ActivityPreferences {
  running: {
    paceMinSecsPerKm: number;
    paceMaxSecsPerKm: number;
    /**
     * @maxItems 12
     */
    preferredDistances: ("fiveK" | "tenK" | "halfMarathon" | "marathon")[];
    /**
     * @maxItems 12
     */
    runningReasons: (
      | "fitness"
      | "community"
      | "mindfulness"
      | "challenge"
      | "weightLoss"
      | "raceTraining"
      | "social"
    )[];
    /**
     * @maxItems 8
     */
    preferredRunTimes: (
      | "earlyMorning"
      | "morning"
      | "afternoon"
      | "evening"
      | "night"
    )[];
    version: number;
  };
}

/**
 * Canonical organizer-level ceiling for member affordances. Event policy may narrow these capabilities but may never widen them.
 */
export type OrganizerSupplyCapabilities = {
  mode: "unclaimed_read_only" | "claimed_managed";
  bookable: boolean;
  paymentsEnabled: boolean;
  waitlistEnabled: boolean;
  hostContactEnabled: boolean;
  claimable: boolean;
  reviewPolicy: "after_event_end" | "attended_event_only";
} & (
  | {
      mode: "unclaimed_read_only";
      bookable: false;
      paymentsEnabled: false;
      waitlistEnabled: false;
      hostContactEnabled: false;
      reviewPolicy: "after_event_end";
      [k: string]: unknown;
    }
  | {
      mode: "claimed_managed";
      bookable: true;
      paymentsEnabled: true;
      waitlistEnabled: true;
      hostContactEnabled: true;
      claimable: false;
      reviewPolicy: "attended_event_only";
      [k: string]: unknown;
    }
);

/**
 * Canonical meeting location selected from Google Places or a manually pinned map coordinate.
 */
export interface EventMeetingLocation {
  name: string;
  address?: string | null;
  placeId?: string | null;
  latitude: number;
  longitude: number;
  notes?: string | null;
}

export interface EventFormatSnapshot {
  version: number;
  activityKind:
    | "socialRun"
    | "running"
    | "walking"
    | "pickleball"
    | "padel"
    | "tennis"
    | "badminton"
    | "cycling"
    | "spinClass"
    | "yoga"
    | "strengthTraining"
    | "pubQuiz"
    | "barCrawl"
    | "dinner"
    | "singlesMixer"
    | "openActivity";
  interactionModel:
    | "pacePods"
    | "pairedRotations"
    | "teamRotations"
    | "seatedTable"
    | "freeFormMixer"
    | "hostLedProgram"
    | "openFormat";
  customActivityLabel?: string;
  defaultPlaybookId?: string;
  /**
   * @maxItems 30
   */
  defaultModuleIds?: string[];
  eventSuccessPrimitives?: EventSuccessFormatPrimitives;
  activityDetails?: {
    /**
     * Composable operations for an event that moves through a route. Activity kind remains the broader format authority.
     */
    routePlan?: {
      version: 1 | 2;
      movementMode: "run" | "walk" | "ride" | "mixed";
      routeShape: "loop" | "outAndBack" | "pointToPoint";
      groupStrategy: "together" | "paceGroups" | "selfDirected";
      stopCadence: "continuous" | "flexibleStops" | "hostedStops";
      /**
       * @minItems 1
       * @maxItems 7
       */
      stopKinds: (
        | "water"
        | "regroup"
        | "venue"
        | "photoSpot"
        | "viewpoint"
        | "hazard"
        | "turnaround"
      )[];
      /**
       * @minItems 1
       * @maxItems 6
       */
      roleKinds: (
        | "routeLead"
        | "sweep"
        | "pacer"
        | "stopHost"
        | "marshal"
        | "photographer"
      )[];
      /**
       * @minItems 2
       * @maxItems 500
       */
      path?: {
        latitude: number;
        longitude: number;
      }[];
      /**
       * @maxItems 12
       */
      paceGroups?: {
        id: string;
        label: string;
        targetPaceSecondsPerKm?: number | null;
        sortOrder: number;
      }[];
      liveTrackingPolicy?: {
        mode: "disabled" | "hostOnly" | "authorizedOperators";
        staleAfterSeconds: number;
        retentionMinutes: number;
      };
    };
    /**
     * Optional host-authored notes for public event pages. Blank notes are omitted.
     */
    publicDetails?: {
      requirements?: string;
      accessibility?: string;
      included?: string;
      [k: string]: unknown;
    };
    [k: string]: unknown;
  };
}

/**
 * Optional event-success behavior primitives for custom or unsupported activity formats. These fields translate a saved event format into the small set of primitives event success can reason about.
 */
export interface EventSuccessFormatPrimitives {
  phoneAvailability?:
    | "continuous"
    | "plannedPauses"
    | "arrivalAndPostEventOnly"
    | "hostOnlyLive"
    | "noneDuringActivity";
  rotationSuitability?: "none" | "plannedBreaks" | "continuousRounds";
  assignmentAlgorithm?:
    | "none"
    | "pacePods"
    | "socialPods"
    | "pairRotations"
    | "teamBalancer"
    | "tableSeating";
  compatibilityPolicy?:
    | "none"
    | "socialCohortBalance"
    | "mutualInterestOnly"
    | "questionnaireClueOnly";
  matchingObjective?:
    | "coverage"
    | "romantic"
    | "affinity"
    | "novelty"
    | "balance"
    | "spread";
  unitOutcome?: "none" | "completion" | "score" | "rank";
  accountability?: "none" | "rollCall" | "sweep";
  durationShape?: "continuous" | "rounds" | "courses" | "segments";
}

export type EventSuccessStructureConfig = {
  [k: string]: unknown;
} & {
  unitKind: "wholeGroup" | "pods" | "pairs" | "teams" | "tables";
  unitSize: number;
  unitCount?: number | null;
  rotationIntervalMinutes?: number | null;
  topology?: "set" | "sequence" | "adjacency";
  resourceCapacity?: {
    concurrentUnits: number | null;
    resourceLabelId: "court" | "table" | "lane" | "board";
    seatsPerUnit: number | null;
  } | null;
  revealCountdownSeconds: number;
  rotationRepeatStrategy?: "avoid" | "allowWhenExhausted";
  maxPairMeetings?: number;
  /**
   * @maxItems 8
   */
  balanceActivityAttributes?: ("paceBand" | "skillBand" | "roleBand")[];
  /**
   * @maxItems 8
   */
  clusterActivityAttributes?: ("paceBand" | "skillBand" | "roleBand")[];
};

export interface EventSuccessQuestionnaireConfig {
  templateId: string;
  customTitle?: string | null;
  /**
   * @maxItems 8
   */
  customQuestions?: {
    id: string;
    prompt: string;
    /**
     * @minItems 2
     * @maxItems 5
     */
    options: {
      id: string;
      label: string;
    }[];
  }[];
}

export interface EventSuccessDefaults {
  enabled?: boolean;
  layoutId?: string | null;
  playbookId?: string;
  /**
   * @maxItems 24
   */
  selectedModuleIds?: string[];
  moduleSelectionConfigured?: boolean;
  structureConfig?: EventSuccessStructureConfig;
  hostGoal?: string;
  wingmanRequestsEnabled?: boolean;
  contextualOpenersEnabled?: boolean;
  compatibilityAffectsRanking?: boolean;
  questionnaireConfig?: EventSuccessQuestionnaireConfig;
  attendeePrompt?: string | null;
}

export interface EventPolicyDefaults {
  admissionPreset?:
    | "openCapacity"
    | "inviteOnly"
    | "balancedSingles"
    | "fixedCohortCaps";
  minAge?: number;
  maxAge?: number;
  maxMen?: number | null;
  maxWomen?: number | null;
  dynamicPricingEnabled?: boolean;
  crossPathsPairCapacity?: number;
  dynamicPricingStepInPaise?: number | null;
  dynamicPricingMaxInPaise?: number | null;
  cancellationPolicyId?: "flexible" | "standard" | "strict";
}

export interface ClubHostDefaults {
  primaryActivityKind?:
    | "socialRun"
    | "running"
    | "walking"
    | "pickleball"
    | "padel"
    | "tennis"
    | "badminton"
    | "cycling"
    | "spinClass"
    | "yoga"
    | "strengthTraining"
    | "pubQuiz"
    | "barCrawl"
    | "dinner"
    | "singlesMixer"
    | "openActivity";
  /**
   * @maxItems 16
   */
  supportedActivityKinds?: (
    | "socialRun"
    | "running"
    | "walking"
    | "pickleball"
    | "padel"
    | "tennis"
    | "badminton"
    | "cycling"
    | "spinClass"
    | "yoga"
    | "strengthTraining"
    | "pubQuiz"
    | "barCrawl"
    | "dinner"
    | "singlesMixer"
    | "openActivity"
  )[];
  eventPolicy?: EventPolicyDefaults;
  eventSuccess?: EventSuccessDefaults;
  eventSuccessByActivityKind?: Record<string, EventSuccessDefaults>;
}

export interface ClubHostProfile {
  uid: string;
  displayName: string;
  avatarUrl: string | null;
  role: "owner" | "host";
}

export interface EventConstraints {
  minAge: number;
  maxAge: number;
  maxMen?: number | null;
  maxWomen?: number | null;
}

export interface EventPolicyBundleDocument {
  version: number;
  admission: EventPolicyAdmissionDocument;
  pricing: EventPolicyPricingDocument;
  cancellation: {
    policyId: "notApplicable" | "flexible" | "standard" | "strict";
  };
  settlement: {
    hostPayoutTiming: "afterEventCompletion";
  };
}

export interface EventPolicyAdmissionDocument {
  format:
    | "open"
    | "inviteOnly"
    | "manualApproval"
    | "fixedCohortCaps"
    | "balancedRatio"
    | "membersOnly";
  capacityLimit: number;
  waitlistPolicy?: EventPolicyWaitlistDocument;
  inviteRequired?: boolean;
  membershipRequired?: boolean;
  manualApprovalRequired?: boolean;
  /**
   * When true, current approved organizer community members may skip event review. Does not waive invitation, capacity, cohort or payment rules. Missing means false.
   */
  approvedMembersSkipReview?: boolean;
  privateAccessPolicy?: EventPolicyPrivateAccessDocument;
  cohortCapacityLimits?: {
    [k: string]: number;
  };
  balancedRatioPolicy?: EventPolicyBalancedRatioDocument | null;
  crossPathsPairInventory?: {
    enabled: boolean;
    reservedPairCapacity: number;
    holdDurationMinutes: number;
  };
}

export interface EventPolicyPrivateAccessDocument {
  mode: "none" | "inviteCode";
  inviteCodeHint: string | null;
  privateLinkEnabled: boolean;
}

export interface EventPolicyWaitlistDocument {
  mode:
    | "disabled"
    | "rankedOffer"
    | "broadcastFirstComeFirstServed"
    | "manualReview";
  offerWindowMinutes: number;
}

export type EventPolicyBalancedRatioDocument = {
  leftCohortId: string;
  rightCohortId: string;
  maxSkew: number;
  openingBufferPerCohort: number;
  outOfRatioCohortPolicy:
    | "admitWithinGeneralCapacity"
    | "waitlist"
    | "manualReview"
    | "reject";
} & ({
  leftCohortId: string;
  rightCohortId: string;
  maxSkew: number;
  openingBufferPerCohort: number;
  outOfRatioCohortPolicy:
    | "admitWithinGeneralCapacity"
    | "waitlist"
    | "manualReview"
    | "reject";
} | null);

export interface EventPolicyPricingDocument {
  basePriceInPaise: number;
  cohortAdjustmentsInPaise?: {
    [k: string]: number;
  };
  demandPricingRules?: EventPolicyDemandPricingRuleDocument[];
}

export interface EventPolicyDemandPricingRuleDocument {
  pricedCohortId: string;
  balancingCohortId: string;
  stepAdjustmentInPaise: number;
  maxAdjustmentInPaise: number;
  freeSkew: number;
  demandStep: number;
}

/**
 * Server-maintained response inbox metadata. No answer snapshots or asset URLs. Withdrawal atomically redacts a verified view or deletes an invalid view.
 */
export interface HostResponseSummaryDocument {
  organizerId: string;
  summaryId: string;
  kind: "response" | "application";
  formId: string;
  submittedAtMillis: number;
  row: {
    entryId: string;
    submittedAtMillis: number;
    response: {
      responseId: string;
      formId: string;
      formTitle: string;
      versionId: string;
      version: number;
      status: "submitted" | "withdrawn";
      identityKind:
        | "anonymous"
        | "emailVerified"
        | "phoneVerified"
        | "catchAccount";
      identity: {
        displayName: string | null;
        email: string | null;
        phoneE164: string | null;
        searchName: string | null;
        origin: "anonymous" | "respondentGranted" | "organizerAcquired";
      };
      sourceLinkId: string | null;
      sourceLabel: string | null;
      submittedAtMillis: number;
      withdrawnAtMillis: number | null;
      /**
       * @maxItems 12
       */
      highlights: {
        questionId: string;
        label: string;
        answer: string | number | boolean | null | string[];
      }[];
      /**
       * @maxItems 4
       */
      conversionKinds: (
        | "crmContact"
        | "application"
        | "eventAttendeeProposal"
        | "followUp"
      )[];
    } | null;
    application: {
      applicationId: string;
      formId: string;
      formVersionId: string;
      targetKind: "organizer" | "event" | "campaign";
      targetId: string | null;
      applicantDisplayName: string;
      reviewStatus:
        | "submitted"
        | "inReview"
        | "approved"
        | "waitlisted"
        | "declined"
        | "withdrawn";
      dataAccessState:
        | "organizerImported"
        | "activeParticipantGrant"
        | "revokedParticipantGrant"
        | "submittedFormResponse";
      sourceKind: "native" | "tabularImport" | "connector";
      providerId: string | null;
      submittedAtMillis: number;
      revision: number;
      contactId?: string | null;
      sourceResponseId?: string | null;
    } | null;
  };
  version: 1;
}

/**
 * Server-maintained organizer-scoped Host read view. Never identity, permission or mutation authority.
 */
export interface HostGroupDetailDocument {
  organizerId: string;
  audienceId: string;
  row: OrganizerSavedAudienceCallableResponse;
  version: 1;
}

/**
 * Server-maintained organizer-scoped Host read view. Never identity, permission or mutation authority.
 */
export interface HostGroupSummaryDocument {
  organizerId: string;
  audienceId: string;
  status: "active" | "archived";
  updatedAtMillis: number;
  row: {
    organizerId: string;
    audienceId: string;
    name: string;
    status: "active" | "archived";
    isStatic: boolean;
    revision: number;
    lastPreviewMatchCount: number | null;
    lastPreviewAtMillis: number | null;
    updatedAtMillis: number;
  };
  version: 1;
  searchName: string;
  isStatic: boolean;
  lastPreviewAtMillis: number;
}

/**
 * Server-maintained organizer-scoped Host read view. Never identity, permission or mutation authority.
 */
export interface HostEventSummaryDocument {
  organizerId: string;
  eventId: string;
  startTimeMillis: number;
  status: "active" | "cancelled";
  row: {
    eventId: string;
    name: string;
    city: {
      cityId: string;
      marketId: string;
    };
    localDate: string;
    localStartTime: string;
    timezone: string;
    startTimeMillis: number;
    setupRevision: number;
    status: "active" | "cancelled";
    detailsConfigured: boolean;
  };
  version: 1;
}

/**
 * Server-maintained organizer-scoped Host read view. Never identity, permission or mutation authority.
 */
export interface HostFormSummaryDocument {
  organizerId: string;
  formId: string;
  updatedAtMillis: number;
  status: "draft" | "published" | "paused" | "archived";
  purpose:
    | "application"
    | "registration"
    | "intake"
    | "waiver"
    | "feedback"
    | "survey";
  row: {
    organizerId: string;
    formId: string;
    title: string;
    description: string | null;
    purpose:
      | "application"
      | "registration"
      | "intake"
      | "waiver"
      | "feedback"
      | "survey";
    status: "draft" | "published" | "paused" | "archived";
    templateId: string | null;
    publicFormId: string;
    defaultTargetKind: "organizer" | "event" | "campaign";
    defaultTargetId: string | null;
    activeVersionId: string | null;
    draftRevision: number;
    publishedVersion: number;
    submittedResponseCount: number;
    consequences: {
      coverage: "exact" | "identityOnly" | "unavailable";
      identityPolicy:
        | (
            | "anonymous"
            | "emailVerified"
            | "phoneVerified"
            | "emailOrPhoneVerified"
            | "catchAccount"
          )
        | null;
      /**
       * @maxItems 7
       */
      enabledAutomationActionKinds: (
        | "notifyTeam"
        | "addOrganizerTag"
        | "createCrmContact"
        | "addApplicationQueue"
        | "proposeEventAttendee"
        | "signedWebhook"
        | "campaignHandoff"
      )[];
    };
    updatedAtMillis: number;
    publishedAtMillis: number | null;
    lastResponseAtMillis: number | null;
  };
  version: 1;
}

/**
 * Server-maintained organizer-scoped Host read view. Never identity, permission or mutation authority.
 */
export interface HostContactSummaryDocument {
  organizerId: string;
  contactId: string;
  searchName: string;
  lastSeenAtMillis: number;
  /**
   * @maxItems 5
   */
  manualTagIds: string[];
  linkedAccount: boolean;
  importedContact: boolean;
  row: {
    contactId: string;
    displayName: string;
    phoneE164: string | null;
    email: string | null;
    identityState: "unlinked" | "verified" | "ambiguous";
    identityConfidence: "eventOnly" | "proposed" | "verified";
    ambiguousCandidateCount: number;
    attendedEventCount: number;
    expectedEventCount: number;
    lastAttendedAtMillis: number | null;
    /**
     * @maxItems 16
     */
    segmentIds: (
      | "new_to_organizer"
      | "past_attendee"
      | "first_time_attendee"
      | "repeat_attendee"
      | "regular"
      | "lapsed_regular"
      | "reliable_attendee"
      | "needs_confirmation"
      | "advocate"
      | "high_impact_advocate"
      | "whatsapp_reachable"
      | "sms_reachable"
    )[];
    /**
     * @maxItems 5
     */
    manualTags?: {
      tagId: string;
      label: string;
    }[];
    whatsappStatus: "unknown" | "optedIn" | "optedOut";
    whatsappAdminSuppressed: boolean;
    smsStatus: "unknown" | "optedIn" | "optedOut";
    sourceCoverage: "exact" | "partial" | "insufficientData";
    revision: number;
  };
  version: 1;
}

/**
 * Server-maintained organizer-scoped Host read view. Never identity, permission or mutation authority.
 */
export interface HostDirectorySummaryDocument {
  organizerId: string;
  contactSummaryVersion: number;
  segmentCounts: {
    [k: string]: number;
  };
  summary: GetOrganizerCrmSummaryCallableResponse;
  /**
   * @maxItems 20
   */
  manualTagVocabulary: {
    tagId: string;
    label: string;
  }[];
  sourceCoverage: "exact" | "partial";
  projectionVersion: number;
  formSummaryVersion?: number;
  eventSummaryVersion?: number;
  groupSummaryVersion?: number;
  responseSummaryVersion?: number;
}

/**
 * Private internal writing preparation intent and validated result. One immutable identity per job/stage survives lease renewal and crashes. No rendered draft, activation or send authority. Privacy deletion requires the permanent processing fence.
 */
export interface SalesProviderAttemptDocument {
  schemaVersion: 1;
  classification: "sales_private";
  attemptId: string;
  jobId: string;
  actorUid: string;
  organizerId: string;
  stage: "writing";
  bindingHash: string;
  binding: {
    materialHash: string;
    sourceHash: string;
    publicMaterialHash: string;
    policyHash: string;
    stageHash: string;
    providerId: "deepseek" | "openai" | "anthropic";
    modelId: string;
    promptVersion: string;
    ownerUid: string;
    authorizationId: string;
    publicReviewId: string;
    participantScope: {
      partnerUid: string;
      assignmentRevision: number;
    } | null;
    runLimitsHash: string;
    monthlyLimitsHash: string;
    inputTokenCeiling: number;
  };
  status: "intent" | "completed";
  submissionNonce: string;
  leaseOwner: string;
  month: string;
  runBucketId: string;
  monthlyBucketId: string;
  reservation: {
    modelCalls: number;
    networkRequests: number;
    modelInputTokens: number;
    modelOutputTokens: number;
    modelCostMicros: number;
  };
  createdAt: string;
  updatedAt: string;
  cache: {
    schemaVersion: 1;
    output: {
      observationAlias: string | null;
      capabilityAlias: string | null;
      referenceAlias: string | null;
      ctaAlias: string | null;
      reasonToBlock: string | null;
      /**
       * @maxItems 100
       */
      omittedAliases: string[];
    };
    provenance: {
      task: string;
      promptVersion: string;
      modelId: string;
      providerId: "deepseek" | "openai" | "anthropic";
      cacheKey: string;
      cacheHit: false;
      usage: {
        inputTokens: number;
        outputTokens: number;
        costMicros: number;
      };
      metadata: {
        providerId: "deepseek" | "openai" | "anthropic";
        modelId: string;
        requestId: string | null;
        attemptCount: 1;
        durationMs: number;
        finishReason: "stop";
        costBasis: "reserved_ceiling";
        estimatedCostMicros: null;
        tokens: {
          inputTotal: number;
          ordinaryInput: number | null;
          cacheRead: number | null;
          cacheWrite: number | null;
          outputTotal: number;
          reasoningOutput: number | null;
        };
      };
      request: {
        maxInputBytes: 32768;
        estimatedInputTokens: number;
        maxOutputTokens: number;
        maxCostMicros: number;
        maxNetworkRequests: 1;
      };
      monthlyWindow: string;
    };
  } | null;
  result: {
    selection: OutreachDraftingSelection;
    selectionHash: string;
    policyHash: string;
    stageHash: string;
    authorizationId: string;
    stage: "writing";
    sendAuthority: false;
  } | null;
}

/**
 * Private aggregate provider run/month accounting. Limits are immutable for each bucket; unknown attempts retain ceilings. Reserved cost is not actual billed cost. Retained hashes/counters contain no prompt, output, actor/contact/organizer identifiers.
 */
export interface SalesProviderBudgetDocument {
  schemaVersion: 1;
  classification: "sales_private";
  bucketId: string;
  kind: "run" | "month";
  scopeHash: string;
  month: string | null;
  limitsHash: string;
  limits: {
    modelCalls: number;
    networkRequests: number;
    modelInputTokens: number;
    modelOutputTokens: number;
    modelCostMicros: number;
  };
  consumed: {
    modelCalls: number;
    networkRequests: number;
    modelInputTokens: number;
    modelOutputTokens: number;
    modelCostMicros: number;
  };
  updatedAt: string;
}

/**
 * Permanent project-bound one-time operator setup slot. Never delete, reset or add TTL. Exact private reviewed plan/scope and replay digests bind source SHA, current account incarnations, Google identity, expected absence, fixed capabilities and server-owned readiness references. Phases journal non-atomic Auth/Firestore effects; unknown outcomes are reconciled without blind retry. Internal source only, no client writes or activation by this schema.
 */
export interface CatchWhatsappOperatorSetupOperationDocument {
  schemaVersion: 1;
  operationId: string;
  projectId: string;
  planId: string;
  planSha256: string;
  replaySha256: string;
  scopeSha256: string;
  actorUid: string;
  recipientUid: string;
  phase:
    | "reserved"
    | "auth-intent"
    | "auth-confirmed"
    | "seeded"
    | "root-active"
    | "prepare-intent"
    | "prepared"
    | "finalize-intent"
    | "complete"
    | "publish-intent"
    | "published"
    | "readiness-intent"
    | "ready"
    | "revoke-intent"
    | "revoked";
  revision: number;
  updatedAtMillis: number;
}

/**
 * Create-only, no-TTL private operator setup phase audit. Authority seeds, root activation, receive prepare/finalize and readiness effects commit with their phase/audit in one Firestore transaction. Auth claim replacement remains separately journaled; hashes provide binding, not independent authentication. No token, raw claims, archive or plaintext contact content. Auth-dispatch-intent receipt precedes the external Auth call and permanently consumes its dispatch permit; it is not proof that Auth committed.
 */
export interface CatchWhatsappOperatorSetupAuditDocument {
  schemaVersion: 1;
  auditId: string;
  operationId: string;
  projectId: string;
  actorUid: string;
  planSha256: string;
  scopeSha256: string;
  fromPhase:
    | (
        | "reserved"
        | "auth-intent"
        | "auth-confirmed"
        | "seeded"
        | "root-active"
        | "prepare-intent"
        | "prepared"
        | "finalize-intent"
        | "complete"
        | "publish-intent"
        | "published"
        | "readiness-intent"
        | "ready"
        | "revoke-intent"
        | "revoked"
      )
    | null;
  toPhase:
    | "reserved"
    | "auth-intent"
    | "auth-confirmed"
    | "seeded"
    | "root-active"
    | "prepare-intent"
    | "prepared"
    | "finalize-intent"
    | "complete"
    | "publish-intent"
    | "published"
    | "readiness-intent"
    | "ready"
    | "revoke-intent"
    | "revoked";
  revision: number;
  atMillis: number;
  beforeSha256: string | null;
  afterSha256: string;
  effectSha256: string | null;
  receiptKind: "phase" | "auth-dispatch-intent";
}

/**
 * Private resumable Host review state for one existing event roster upload.
 */
export interface HostRosterIntakeSessionDocument {
  draft: {
    sessionId: string;
    hostUid: string;
    organizerId: string;
    eventId: string;
    fileFingerprint: string;
    fileName: string;
    format: "csv" | "xlsx";
    /**
     * @minItems 1
     * @maxItems 40
     */
    headers: string[];
    mapping: {
      displayName?: number;
      phone?: number;
      email?: number;
      city?: number;
      externalReference?: number;
      arrivalGroup?: number;
      ticketType?: number;
      revenueAmount?: number;
      revenueCurrency?: number;
      status?: number;
    };
    /**
     * @minItems 1
     * @maxItems 250
     */
    sourceManifest: {
      rowId: string;
      sourceRowNumber: number;
      rawEvidenceHash: string;
      originalValue: {
        rowId: string;
        displayName: string;
        phone?: string | null;
        email?: string | null;
        cityMarketId?: string | null;
        externalReference?: string | null;
        arrivalGroup?: string | null;
        ticketType?: string | null;
        revenueAmountMinor?: number | null;
        revenueCurrency?: string | null;
        revenueSource?: "hostImport" | "hostEstimate" | null;
        status: "invited" | "registered" | "waitlisted";
      };
      originalFields: {
        displayName?: {
          column: number;
          header: string;
          origin: "upload" | "hostCorrection" | "modelProposal";
          confidence: number | null;
        };
        phone?: {
          column: number;
          header: string;
          origin: "upload" | "hostCorrection" | "modelProposal";
          confidence: number | null;
        };
        email?: {
          column: number;
          header: string;
          origin: "upload" | "hostCorrection" | "modelProposal";
          confidence: number | null;
        };
        cityMarketId?: {
          column: number;
          header: string;
          origin: "upload" | "hostCorrection" | "modelProposal";
          confidence: number | null;
        };
        externalReference?: {
          column: number;
          header: string;
          origin: "upload" | "hostCorrection" | "modelProposal";
          confidence: number | null;
        };
        arrivalGroup?: {
          column: number;
          header: string;
          origin: "upload" | "hostCorrection" | "modelProposal";
          confidence: number | null;
        };
        ticketType?: {
          column: number;
          header: string;
          origin: "upload" | "hostCorrection" | "modelProposal";
          confidence: number | null;
        };
        revenueAmountMinor?: {
          column: number;
          header: string;
          origin: "upload" | "hostCorrection" | "modelProposal";
          confidence: number | null;
        };
        revenueCurrency?: {
          column: number;
          header: string;
          origin: "upload" | "hostCorrection" | "modelProposal";
          confidence: number | null;
        };
        revenueSource?: {
          column: number;
          header: string;
          origin: "upload" | "hostCorrection" | "modelProposal";
          confidence: number | null;
        };
        status?: {
          column: number;
          header: string;
          origin: "upload" | "hostCorrection" | "modelProposal";
          confidence: number | null;
        };
      };
    }[];
    revision: number;
    state: "review" | "applied";
    /**
     * @minItems 1
     * @maxItems 250
     */
    rows: {
      value: {
        rowId: string;
        displayName: string;
        phone?: string | null;
        email?: string | null;
        cityMarketId?: string | null;
        externalReference?: string | null;
        arrivalGroup?: string | null;
        ticketType?: string | null;
        revenueAmountMinor?: number | null;
        revenueCurrency?: string | null;
        revenueSource?: "hostImport" | "hostEstimate" | null;
        status: "invited" | "registered" | "waitlisted";
      };
      sourceRowNumber: number;
      fields: {
        displayName?: {
          column: number;
          header: string;
          origin: "upload" | "hostCorrection" | "modelProposal";
          confidence: number | null;
        };
        phone?: {
          column: number;
          header: string;
          origin: "upload" | "hostCorrection" | "modelProposal";
          confidence: number | null;
        };
        email?: {
          column: number;
          header: string;
          origin: "upload" | "hostCorrection" | "modelProposal";
          confidence: number | null;
        };
        cityMarketId?: {
          column: number;
          header: string;
          origin: "upload" | "hostCorrection" | "modelProposal";
          confidence: number | null;
        };
        externalReference?: {
          column: number;
          header: string;
          origin: "upload" | "hostCorrection" | "modelProposal";
          confidence: number | null;
        };
        arrivalGroup?: {
          column: number;
          header: string;
          origin: "upload" | "hostCorrection" | "modelProposal";
          confidence: number | null;
        };
        ticketType?: {
          column: number;
          header: string;
          origin: "upload" | "hostCorrection" | "modelProposal";
          confidence: number | null;
        };
        revenueAmountMinor?: {
          column: number;
          header: string;
          origin: "upload" | "hostCorrection" | "modelProposal";
          confidence: number | null;
        };
        revenueCurrency?: {
          column: number;
          header: string;
          origin: "upload" | "hostCorrection" | "modelProposal";
          confidence: number | null;
        };
        revenueSource?: {
          column: number;
          header: string;
          origin: "upload" | "hostCorrection" | "modelProposal";
          confidence: number | null;
        };
        status?: {
          column: number;
          header: string;
          origin: "upload" | "hostCorrection" | "modelProposal";
          confidence: number | null;
        };
      };
      /**
       * @maxItems 40
       */
      rawCells?: string[];
      /**
       * @maxItems 10
       */
      issues?: string[];
    }[];
    /**
     * @maxItems 250
     */
    excludedRowIds: string[];
    appliedImportId: string | null;
  };
  createdAtMillis: number;
  updatedAtMillis: number;
}

/**
 * Private exact reviewed payload and outcome used for lost-response replay.
 */
export interface HostRosterIntakeReceiptDocument {
  importId: string;
  appliedAtMillis: number;
  preview: {
    sessionId: string;
    revision: number;
    reviewHash: string;
    /**
     * @minItems 1
     * @maxItems 250
     */
    rows: {
      rowId: string;
      sourceRowNumber: number;
      displayName: string;
      externalReference: string | null;
      attendeeId: string | null;
      kind:
        | "add"
        | "update"
        | "unchanged"
        | "excluded"
        | "needsReview"
        | "identityConflict";
      /**
       * @maxItems 11
       */
      changedFields: (
        | "displayName"
        | "phone"
        | "email"
        | "cityMarketId"
        | "externalReference"
        | "arrivalGroup"
        | "ticketType"
        | "revenueAmountMinor"
        | "revenueCurrency"
        | "revenueSource"
        | "status"
      )[];
      /**
       * @maxItems 11
       */
      fieldChanges: {
        field:
          | "displayName"
          | "phone"
          | "email"
          | "cityMarketId"
          | "externalReference"
          | "arrivalGroup"
          | "ticketType"
          | "revenueAmountMinor"
          | "revenueCurrency"
          | "revenueSource"
          | "status";
        currentValue: string | null;
        proposedValue: string | null;
        origin:
          | "upload"
          | "hostCorrection"
          | "modelProposal"
          | "default"
          | null;
      }[];
      issueCode: string | null;
    }[];
    counts: {
      add: number;
      update: number;
      unchanged: number;
      excluded: number;
      needsReview: number;
      identityConflict: number;
    };
    eligibleForApply: boolean;
  };
  payload: ImportEventAttendeesCallablePayload;
}

/**
 * Bounded own completed-demo proof for private claim review delay. Contains references and hashes, never grant tokens or synthetic guest data. Every resume rechecks current identity, scope and real manager authority before Forms materialization.
 */
export interface SalesDemoContinuationDocument {
  schemaVersion: 1;
  classification: "sales_private";
  continuationId: string;
  actorUid: string;
  organizerId: string;
  invitationId: string;
  invitationRevision: number;
  invitationExpiresAt: string;
  blueprintId: string;
  blueprintRevision: number;
  sessionId: string;
  sessionRevision: number;
  setupHash: string;
  completedAt: string;
  createdAt: string;
  expiresAt: string;
}

/**
 * Private event lodging setup referencing canonical program guest/group/hotel/room-block IDs. Contains explicit demand and sharing choices, exact or provisional inventory, and verified layered 2D facts; no copied contact records or public hotel catalog.
 */
export interface ProgramLodgingConfigDocument {
  programId: string;
  organizerId: string;
  revision: number;
  /**
   * @maxItems 500
   */
  demand: {
    guestId: string;
    startsAtMillis: number;
    endsAtMillis: number;
    beds: number;
    /**
     * @maxItems 30
     */
    requiredFeatures: string[];
  }[];
  /**
   * @maxItems 500
   */
  parties: {
    id: string;
    /**
     * @minItems 1
     * @maxItems 100
     */
    guestIds: string[];
    confirmed: boolean;
    priority: number;
    requiredRoomType: string | null;
    pin: {
      inventoryId?: string;
      hotelId?: string;
      zoneId?: string;
    } | null;
  }[];
  /**
   * @maxItems 500
   */
  groupParents: {
    id: string;
    /**
     * @maxItems 20
     */
    parentIds: string[];
  }[];
  /**
   * @maxItems 500
   */
  rooms: {
    id: string;
    hotelId: string;
    zoneId: string;
    building: string | null;
    floor: string | null;
    wing: string | null;
    roomType: string;
    beds: number;
    maxOccupants: number;
    /**
     * @maxItems 30
     */
    verifiedFeatures: string[];
    /**
     * @minItems 1
     * @maxItems 100
     */
    resourceIds: string[];
    position: {
      x: number;
      y: number;
    } | null;
  }[];
  /**
   * @maxItems 500
   */
  inventory: {
    id: string;
    contractId: string;
    physicalRoomId: string | null;
    provisional: {
      hotelId: string;
      zoneId: string;
      building: string | null;
      floor: string | null;
      wing: string | null;
      roomType: string;
      beds: number;
      maxOccupants: number;
      /**
       * @maxItems 30
       */
      verifiedFeatures: string[];
    } | null;
    /**
     * @minItems 1
     * @maxItems 30
     */
    availability: {
      arrival: string;
      departure: string;
    }[];
  }[];
  /**
   * @maxItems 500
   */
  labels: {
    inventoryId: string;
    roomLabel: string | null;
  }[];
}

/**
 * Private transactional revision counters backed by complete canonical source fingerprints. Contains no copied guest or property records. Changes invalidate proposals; publication advances its own domain atomically with canonical stays.
 */
export interface ProgramLodgingSourceVersionDocument {
  programId: string;
  organizerId: string;
  versions: {
    source: {
      revision: number;
      fingerprint: string;
    };
    inventory: {
      revision: number;
      fingerprint: string;
    };
    layout: {
      revision: number;
      fingerprint: string;
    };
    published: {
      revision: number;
      fingerprint: string;
    };
  };
}

/**
 * Private immutable placement proposal tied to source, inventory, layout and published revisions. Server validates content identity and current canonical Programs scope; no hotel affinity or medical projection is public.
 */
export interface ProgramLodgingProposalDocument {
  programId: string;
  organizerId: string;
  proposal: {
    scope: {
      programId: string;
      organizerId: string;
    };
    id: string;
    revisions: {
      source: number;
      inventory: number;
      layout: number;
      published: number;
    };
    /**
     * @maxItems 500
     */
    placements: {
      partyId: string;
      inventoryId: string;
    }[];
    /**
     * @maxItems 500
     */
    unplacedPartyIds: string[];
    /**
     * @maxItems 502
     */
    explanations: string[];
    /**
     * @minItems 5
     * @maxItems 5
     */
    score: number[];
    search: {
      complete: boolean;
      explored: number;
    };
  };
  createdByUid: string;
  createdAtMillis: number;
}

/**
 * Private program workflow. Host approval, individual hotel confirmation and guest publication are distinct states. Publication changes canonical stays and this workflow atomically.
 */
export interface ProgramLodgingWorkflowDocument {
  programId: string;
  organizerId: string;
  workflow: {
    revision: number;
    approvedProposalId: string | null;
    /**
     * @maxItems 500
     */
    confirmedHotelIds: string[];
    guestPublishedProposalId: string | null;
  };
}

/**
 * Immutable private operation receipt bound to program, actor and exact request. Replay rechecks current authority and returns current workflow; it never restores a prior approval.
 */
export interface ProgramLodgingReceiptDocument {
  programId: string;
  organizerId: string;
  receipt: {
    operationId: string;
    requestHash: string;
    actorUid: string;
    resultingRevision: number;
  };
}

/**
 * Immutable source-labelled suggestion or manual membership evidence. Exact program/guest/group scope and program retention index are checked by the server. Import suggestions cannot overwrite selected manual inclusion or exclusion.
 */
export interface WorkspaceMembershipAssertionDocument {
  schemaVersion: 1;
  organizerId: string;
  programId: string;
  workspaceRef: {
    kind: "program";
    id: string;
  };
  relationshipRef: {
    kind: "programGuest";
    id: string;
  };
  groupId: string;
  included: boolean;
  sourceKind: "manualEntry" | "manifestRow" | "contributorList";
  sourceId: string;
  sourceVersion: number;
  sourceLabel: string;
  actorUid: string;
  observedAtMillis: number;
}

/**
 * Immutable explicit membership selection, preserving previous evidence identity and reviewed guest revision. Canonical programGuests.groupIds remains membership truth, updated with this decision in one authorized transaction.
 */
export interface WorkspaceMembershipDecisionDocument {
  schemaVersion: 1;
  organizerId: string;
  programId: string;
  workspaceRef: {
    kind: "program";
    id: string;
  };
  relationshipRef: {
    kind: "programGuest";
    id: string;
  };
  groupId: string;
  selectedAssertionId: string;
  previousAssertionId: string | null;
  relationshipRevision: number;
  actorUid: string;
  observedAtMillis: number;
}

export interface SalesPartnerMembershipDocument {
  schemaVersion: 1;
  classification: "sales_private";
  revision: number;
  createdAt: string;
  updatedAt: string;
  uid: string;
  status: "active" | "revoked";
  termsVersion: "referral-preview-v1";
  acceptedAt: string;
  expiresAt: string;
  displayName: string;
  /**
   * @maxItems 30
   */
  marketingGrants: {
    campaignId: string;
    channel: "email" | "whatsapp" | "other";
    /**
     * @minItems 1
     * @maxItems 12
     */
    assetIds: string[];
    expiresAt: string;
    schemaVersion: 1;
    grantId: string;
    revision: number;
    status: "active" | "revoked";
    organizerId: string;
    assignmentRevision: number;
    sourceHash: string;
    reviewedAt: string;
    reviewedBy: string;
    reason: string;
    purpose: "manual_partner_outreach";
    approvalReceiptId: string;
    approvedMembershipRevision: number;
  }[];
}

export interface SalesPartnerAssignmentDocument {
  schemaVersion: 1;
  classification: "sales_private";
  revision: number;
  updatedAt: string;
  organizerId: string;
  partnerUid: string;
  status: "offered" | "accepted" | "declined" | "revoked";
  originatorUid: string | null;
  introducingSenderUid: string | null;
  catchOwnerUid: string;
  activationOwnerUid: string | null;
  relationshipContext: string | null;
  relationshipConfirmedAt: string | null;
  channel: ("email" | "whatsapp" | "other") | null;
  nextAction: string;
  reviewAt: string;
  expiresAt: string;
  assignedAt: string;
  reason: string;
}

/**
 * Server-only independently authorized review. Provisioning consumes it atomically with readiness and immutable audit; this source provides no approval writer. No TTL, token, endpoint or message body.
 */
export interface CatchWhatsappReadinessApprovalDocument {
  schemaVersion: 1;
  approvalId: string;
  state: "approved" | "consumed";
  approval: {
    approvalId: string;
    action: "create" | "revoke";
    scope: {
      projectId: string;
      wabaId: string;
      phoneNumberId: string;
      recipientUid: string;
      endpointHash: string;
      evidenceSha256: string;
    };
    reviewerUid: string;
    reviewedAtMillis: number;
    expiresAtMillis: number;
    atomicIngressStartedAtMillis: number;
    expectedRecordSha256: string | null;
  };
  ingressEvidenceSha256: string;
  consumedAtMillis: number | null;
  recordSha256: string | null;
}

/**
 * Server-only audited atomic-ingress cutover evidence; not an enablement flag. Approval pins evidence digest; transaction checks identity and state. No writer or live ingress attestation is provided.
 */
export interface CatchWhatsappReadinessIngressDocument {
  schemaVersion: 1;
  ingressId: string;
  projectId: string;
  wabaId: string;
  phoneNumberId: string;
  state: "active" | "revoked";
  atomicIngressStartedAtMillis: number;
  evidenceSha256: string;
  verifiedAtMillis: number;
}

/**
 * Immutable server-only provisioning audit created with approval consumption and readiness mutation. Hashes bind archive, exact readiness and independently audited external authority fence. No TTL or private message/contact content.
 */
export interface CatchWhatsappReadinessAuditDocument {
  schemaVersion: 1;
  auditId: string;
  approvalId: string;
  action: "create" | "revoke";
  projectId: string;
  actorUid: string;
  atMillis: number;
  provenanceSha256: string | null;
  recordSha256: string;
  readinessId: string;
  authorityFenceSha256: string;
}

/**
 * Private one-reply-per-inbound support claim and saved provider delivery projection. Explicit human review of the exact inbound support request is service evidence, never marketing permission. No body, credential or pricing data. No automatic retry or TTL; uncertain and completed claims remain consumed beyond receipt retention. Source-only and disabled pending atomic STOP ingress and scoped activation.
 */
export interface CatchWhatsappReplyOperationDocument {
  schemaVersion: 1;
  operationId: string;
  purpose: "serviceSupport";
  source: "reviewedInboundSupportRequest";
  wabaId: string;
  phoneNumberId: string;
  recipientUid: string;
  endpointHash: string;
  actorUid: string;
  inboundEventId: string;
  inboundMessageId: string;
  inboundTextHash: string;
  bodyHash: string;
  materialHash: string;
  reviewedAtMillis: number;
  deadlineMillis: number;
  state: "claimed" | "unknown" | "completed";
  providerMessageId: string | null;
  deliveryStatus:
    | "pending"
    | "accepted"
    | "sent"
    | "delivered"
    | "read"
    | "failed";
  deliveryEventId: string | null;
  deliveryAtMillis: number | null;
  createdAtMillis: number;
  updatedAtMillis: number;
  readinessEvidenceHash: string;
  appAuthorityBindings?: {
    actor: {
      projectId: string;
      uid: string;
      revision: number;
      incarnation: string;
      capability: "review" | "reply" | "receive";
      endpointHash: string | null;
    };
    reviewer: {
      projectId: string;
      uid: string;
      revision: number;
      incarnation: string;
      capability: "review" | "reply" | "receive";
      endpointHash: string | null;
    };
    recipient: {
      projectId: string;
      uid: string;
      revision: number;
      incarnation: string;
      capability: "review" | "reply" | "receive";
      endpointHash: string | null;
    };
  };
}

/**
 * Private permanent Catch sender/endpoint STOP fence, committed atomically with the immutable authenticated inbound STOP receipt. Independent of UID and organizer contact resolution. No raw endpoint, message body, credentials, TTL, reset or automatic re-enrollment. Ingress wiring and historical reconciliation remain required before outbound activation.
 */
export interface CatchWhatsappEndpointStopDocument {
  schemaVersion: 1;
  stopId: string;
  wabaId: string;
  phoneNumberId: string;
  endpointHash: string;
  sourceEventId: string;
  sourceMessageId: string;
  payloadHash: string;
  observedAtMillis: number;
}

/**
 * Server-only durable project/UID/incarnation-bound capability authority. Missing records deny; no TTL, bootstrap, raw endpoint or credential. Mutations require an audited full-span Auth fence.
 */
export interface CatchWhatsappAppAuthorityDocument {
  schemaVersion: 1;
  projectId: string;
  uid: string;
  revision: number;
  incarnation: string | null;
  state: "denied" | "granting" | "active";
  authNotBeforeSeconds: number;
  updatedAtMillis: number;
  /**
   * @maxItems 3
   */
  capabilities: ("review" | "reply" | "receive")[];
  endpointHash: string | null;
  pending: {
    nonce: string;
    issuer: {
      projectId: string;
      uid: string;
      revision: number;
      incarnation: string;
      capability: "review" | "reply" | "receive";
      endpointHash: string | null;
    };
    /**
     * @minItems 1
     * @maxItems 3
     */
    capabilities: ("review" | "reply" | "receive")[];
    endpointHash: string | null;
    expiresAtMillis: number;
  } | null;
  grantedBy: {
    projectId: string;
    uid: string;
    revision: number;
    incarnation: string;
    capability: "review" | "reply" | "receive";
    endpointHash: string | null;
  } | null;
}

/**
 * Body-free durable semantic collision fence captured only after authenticated exact-sender ingress. Hashes never establish source completeness, consent or STOP absence. Blocked events cannot be reactivated; no TTL.
 */
export interface CatchWhatsappIngressEvidenceDocument {
  schemaVersion: 1;
  eventId: string;
  wabaId: string;
  phoneNumberId: string;
  endpointHash: string | null;
  materialSha256: string;
  eventKind: "inbound" | "status";
  classification: "text" | "stop" | "status" | "ambiguous";
  ambiguity:
    | (
        | "unresolved-endpoint"
        | "truncated-text"
        | "unsupported-message"
        | "missing-text"
        | "invalid-status-errors"
      )
    | null;
  state: "accepted" | "blocked";
  receivedAtMillis: number;
}

/**
 * Private externally reviewed historical STOP clearance for one Catch sender/recipient endpoint. Complete evidence from sender inception (coverage starts at epoch) through verified atomic STOP ingress is required; empty or expired receipt queries are never proof. This feature only reads the record; it cannot attest, provision, refresh or activate it. No TTL or raw endpoint.
 */
export interface CatchWhatsappReplyReadinessDocument {
  schemaVersion: 1;
  readinessId: string;
  wabaId: string;
  phoneNumberId: string;
  recipientUid: string;
  endpointHash: string;
  purpose: "serviceSupport";
  state: "ready" | "revoked";
  completeHistory: true;
  historyFromMillis: 0;
  coveredThroughMillis: number;
  atomicIngressStartedAtMillis: number;
  evidenceSha256: string;
  reviewedByUid: string;
  reviewedAtMillis: number;
  expiresAtMillis: number;
  appAuthorityBindings?: {
    reviewer: {
      projectId: string;
      uid: string;
      revision: number;
      incarnation: string;
      capability: "review" | "reply" | "receive";
      endpointHash: string | null;
    };
    recipient: {
      projectId: string;
      uid: string;
      revision: number;
      incarnation: string;
      capability: "review" | "reply" | "receive";
      endpointHash: string | null;
    };
  };
}

export interface OrganizerTrackingSettingsDocument {
  organizerId: string;
  revision: number;
  metaPixelId: string | null;
  googleMeasurementId: string | null;
  enabled: false;
  updatedByUid: string;
  updatedAtMillis: number;
}

/**
 * Current manager-controlled organizer community entitlement. Following, contact linkage, booking and attendance are separate.
 */
export interface OrganizerCommunityMembershipDocument {
  schemaVersion: 1;
  organizerId: string;
  uid: string;
  state: "active" | "revoked";
  revision: number;
  source: {
    applicationId: string;
    responseId: string;
    formVersionId: string;
    applicationRevision: number;
  };
  lastDecisionId: string;
  activatedAtMillis: number;
  updatedAtMillis: number;
}

/**
 * Immutable exact-request membership decision; replay never restores an older current entitlement.
 */
export interface OrganizerCommunityMembershipDecisionDocument {
  schemaVersion: 1;
  organizerId: string;
  uid: string;
  membershipId: string;
  requestId: string;
  requestHash: string;
  actorUid: string;
  action: "grant" | "revoke";
  reason: string;
  previousState: "none" | "active" | "revoked";
  expectedRevision: number;
  resultingRevision: number;
  source: {
    applicationId: string;
    responseId: string;
    formVersionId: string;
    applicationRevision: number;
  };
  decidedAtMillis: number;
}

/**
 * Immutable per-field acquisition evidence, explicitly scoped to an existing program or community relationship. A contact pointer or UID does not disclose fields or verify endpoint ownership.
 */
export interface WorkspaceFieldAssertionDocument {
  schemaVersion: 1;
  workspaceRef:
    | {
        kind: "program";
        id: string;
      }
    | {
        kind: "community";
        id: string;
      };
  organizerId: string;
  relationshipRef: {
    kind: "programGuest" | "programHousehold" | "communityContact";
    id: string;
  };
  fieldKey: "displayName" | "phoneE164" | "email";
  value: string | null;
  sourceKind: "manualEntry" | "manifestRow";
  sourceId: string;
  sourceVersion: number;
  actorUid: string;
  observedAtMillis: number;
  disclosureBasis: "workspaceHostAcquisition";
  identityEvidenceRef: null;
  /**
   * Exact program retention index; null for community assertions. Must agree with workspaceRef.id in the domain writer.
   */
  programId: string | null;
}

/**
 * Immutable explicit field-selection decision. Records the authorized reviewer and exact before/after assertion pointers without copying field values or granting identity proof.
 */
export interface WorkspaceFieldDecisionDocument {
  schemaVersion: 1;
  workspaceRef:
    | {
        kind: "program";
        id: string;
      }
    | {
        kind: "community";
        id: string;
      };
  organizerId: string;
  /**
   * Exact program retention index; null for community assertions. Must agree with workspaceRef.id in the domain writer.
   */
  programId: string | null;
  relationshipRef: {
    kind: "programGuest" | "programHousehold" | "communityContact";
    id: string;
  };
  fieldKey: "displayName" | "phoneE164" | "email";
  actorUid: string;
  observedAtMillis: number;
  selectedAssertionId: string;
  previousAssertionId: string | null;
  relationshipRevision: number;
}

/**
 * Private immutable Catch-owned incoming message and status receipts. Exact configured WABA and sender binding, no organizer authority, no outgoing action. Bounded text expires after 30 days. Status facts remain individual events rather than an arrival-ordered delivery projection.
 */
export interface CatchWhatsappWebhookEventDocument {
  schema: "catch.whatsapp-webhook-event/v1";
  eventId: string;
  wabaId: string;
  phoneNumberId: string;
  payloadHash: string;
  eventKind: "inbound" | "status";
  messageId: string;
  providerTimestampSeconds: string;
  participantId: string;
  messageType: string | null;
  text: string | null;
  textTruncated: boolean;
  deliveryStatus: null | "sent" | "delivered" | "read" | "failed";
  /**
   * @maxItems 10
   */
  errorCodes: number[];
  receivedAtMillis: number;
  expiresAt: FirebaseFirestore.Timestamp;
}

export interface SalesImportHistoryRowDocument {
  schemaVersion: 1;
  classification: "sales_private";
  sourceId: string;
  sourceRowId: string;
  sourceContentHash: string;
  importId: string;
  organizerId: string;
  promotionVersion: string;
  rowId: string;
  disposition: "promoted" | "skipped" | "review_needed";
  reason: string;
  /**
   * @minItems 0
   * @maxItems 5
   */
  recordIds: string[];
  reviewHash: string;
  reviewedAt: string;
  reviewedBy: string;
}

export interface SalesImportHistoryRecordDocument {
  schemaVersion: 1;
  classification: "sales_private";
  sourceId: string;
  sourceRowId: string;
  sourceContentHash: string;
  importId: string;
  organizerId: string;
  promotionVersion: string;
  recordId: string;
  kind: "activity" | "observation" | "benchmark";
  sourceColumn: string;
  sourceValue: string;
  occurredAt: string | null;
  dateSourceColumn: string | null;
  dateSourceValue: string | null;
  contentHash: string;
  recordedAt: string;
  recordedBy: string;
  providerConfirmed: false;
  currentFitAuthority: false;
  contactAuthority: false;
  sendAuthority: false;
  relativeChronology: "first_touch" | "last_touch" | "unspecified";
  dateCertainty: "source_exact" | "unknown";
}

/**
 * Permanent organizer-scoped private Sales reintroduction fence. Existence blocks reads, writes and receipt replay.
 */
export interface SalesPrivacyRestriction {
  schemaVersion: 1;
  classification: "sales_private";
  organizerId: string;
  status: "restricted" | "processing" | "internal_processed_with_unresolved";
  revision: number;
  reason: string;
  requestId: string;
  materialHash: string;
  restrictedByUid: string;
  restrictedAt: string;
  activePlanId: string | null;
}

/**
 * Admin Owner reviewed retention decision; finance and audit remain retained pending their own reviews. No period is invented.
 */
export interface SalesPrivacyPolicy {
  schemaVersion: 1;
  classification: "sales_private";
  policyId: "current";
  revision: number;
  status: "reviewed";
  sourceReference: string;
  sourceHash: string;
  financeDisposition: "retain_pending_finance_review";
  financeReason: string;
  auditDisposition: "retain_pending_audit_review";
  auditReason: string;
  externalCopies: "unverified";
  policyHash: string;
  requestId: string;
  reviewedByUid: string;
  reviewedAt: string;
}

/**
 * Server-inventoried, exact-source cleanup plan. Paths are private and never returned in owner previews.
 */
export interface SalesPrivacyPlan {
  schemaVersion: 1;
  classification: "sales_private";
  planId: string;
  requestId: string;
  organizerId: string;
  restrictionRevision: number;
  policyHash: string;
  inventoryHash: string;
  /**
   * @maxItems 240
   */
  items: {
    path: string;
    contentHash: string;
    disposition: "delete" | "retain_finance" | "retain_audit";
  }[];
  /**
   * @maxItems 240
   */
  blockers: {
    code: string;
    fingerprint: string;
  }[];
  cursor: number;
  status: "reviewed" | "processing" | "internal_processed_with_unresolved";
  reviewedByUid: string;
  reviewedAt: string;
  updatedAt: string;
}

export interface SalesPrivacyBatchReceipt {
  schemaVersion: 1;
  classification: "sales_private";
  receiptId: string;
  organizerId: string;
  planId: string;
  expectedCursor: number;
  requestId: string;
  result: {
    organizerId: string;
    planId: string;
    previousCursor: number;
    nextCursor: number;
    itemCount: number;
    deletedCount: number;
    retainedCount: number;
    unresolvedCount: number;
    status: "processing" | "internal_processed_with_unresolved";
    completeDeletion: false;
    receiptId: string;
  };
  createdAt: string;
  actorUid: string;
}

/**
 * Immutable private join from exact reviewed Supply Intake candidate and canonical identity decision to the Sales companion account.
 */
export interface SalesIntakeLinkDocument {
  schemaVersion: 1;
  classification: "sales_private";
  linkId: string;
  workItemId: string;
  candidateId: string;
  sourceRunId: string;
  sourceWorkItemRevision: number;
  sourceCandidateHash: string;
  organizerId: string;
  curationPath: string;
  curationOperationType: "create_entity_draft" | "attach_surface";
  curationReviewedByUid: string;
  curationReviewedAt: string;
  linkedByUid: string;
  linkedAt: string;
}

/**
 * Immutable uniqueness receipt for one external host settlement reference within one recipient ledger scope, independent of evidence and quote IDs.
 */
export interface SalesHostSettlementIdentitiesDocument {
  schemaVersion: 1;
  classification: "sales_private";
  settlementIdentityHash: string;
  attestationId: string;
  organizerId: string;
  opportunityId: string;
  createdAt: string;
}

/**
 * Owner-attested first-party host subscription collection; provider unconfirmed and separate from guest payments.
 */
export interface SalesHostSettlementAttestationsDocument {
  schemaVersion: 1;
  classification: "sales_private";
  revision: 1;
  attestationId: string;
  organizerId: string;
  opportunityId: string;
  quoteId: string;
  termVersion: number;
  termsHash: string;
  amountMinor: number;
  currency: string;
  purpose: "host_subscription";
  receivedAt: string;
  settlementMethod: "bank_transfer" | "cash" | "other_external";
  settlementReference: string;
  recipientAccountScope: string;
  settlementIdentityHash: string;
  servicePeriod: {
    startsAt: string;
    endsAt: string;
  } | null;
  evidence: {
    evidenceId: string;
    sourceRef: string;
    contentHash: string;
    observedAt: string;
  };
  status: "manual_attested_collected";
  providerConfirmed: false;
  actorUid: string;
  attestedAt: string;
}

/**
 * Immutable uniqueness receipt preventing one settlement source from double counting.
 */
export interface SalesHostSettlementEvidenceUsesDocument {
  schemaVersion: 1;
  classification: "sales_private";
  evidenceId: string;
  attestationId: string;
  organizerId: string;
  opportunityId: string;
  createdAt: string;
}

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

/**
 * Durable monthly page-fetch usage for Supply Intake. The worker reserves an intake's allowance here in a transaction before any request leaves the process and releases what it did not use; the monthly cap in acquisition_policy.json is enforced against this count, never against process memory.
 */
export interface SupplyIntakeUsageDocument {
  schemaVersion: 1;
  monthKey: string;
  networkRequests: number;
  updatedAt: string;
}

/**
 * Private frozen zero-model draft request, attempt lease and completion pointer. Firestore is authoritative; local Operations files are temporary scratch only.
 */
export interface SalesOutreachJobsDocument {
  schemaVersion: 1;
  classification: "sales_private";
  jobId: string;
  actorUid: string;
  requestId: string;
  materialHash: string;
  sourceHash: string;
  sourceRequest: AdminBuildSalesOutreachInputPayload;
  frozenBundle: OutreachDraftingInput;
  status: "running" | "completed" | "failed";
  attemptCount: number;
  leaseOwner: string | null;
  leaseUntil: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  result: {
    draftId: string;
    contentHash: string;
  } | null;
  failure: string | null;
  participantScope?: {
    partnerUid: string;
    assignmentRevision: number;
  };
}

/**
 * Append-only exact-version approval or reviewed terms acceptance; not a receipt.
 */
export interface SalesCommercialDecisionsDocument {
  schemaVersion: 1;
  classification: "sales_private";
  decisionId: string;
  organizerId: string;
  opportunityId: string;
  quoteId: string | null;
  termVersion: number | null;
  termsHash: string;
  kind: "quote_approved" | "terms_acceptance_reviewed";
  evidence: {
    evidenceId: string;
    sourceRef: string;
    contentHash: string;
    observedAt: string;
  };
  approvedDecisionId: string | null;
  actorUid: string;
  decidedAt: string;
  paymentStatus: "unknown";
}

/**
 * Append-only private stage movement with explicit loss/reopen reason.
 */
export interface SalesOpportunityStageHistoryDocument {
  schemaVersion: 1;
  classification: "sales_private";
  historyId: string;
  organizerId: string;
  opportunityId: string;
  fromStage: string | null;
  toStage: string;
  reason: string | null;
  actorUid: string;
  changedAt: string;
}

/**
 * Private revisioned pilot scope; no revenue or product activation authority.
 */
export interface SalesPilotPlansDocument {
  schemaVersion: 1;
  classification: "sales_private";
  organizerId: string;
  opportunityId: string;
  revision: number;
  status: "draft" | "reviewed" | "active" | "completed" | "cancelled";
  workflowId: string;
  objective: string;
  /**
   * @minItems 1
   * @maxItems 8
   */
  successMeasures: string[];
  startsAt: string | null;
  endsAt: string | null;
  reviewEvidence: {
    evidenceId: string;
    sourceRef: string;
    contentHash: string;
    observedAt: string;
  } | null;
  outcomeEvidence: {
    evidenceId: string;
    sourceRef: string;
    contentHash: string;
    observedAt: string;
  } | null;
  updatedAt: string;
  updatedBy: string;
}

/**
 * Immutable exact commercial terms with reviewed source fact references.
 */
export interface SalesQuoteVersionsDocument {
  schemaVersion: 1;
  classification: "sales_private";
  organizerId: string;
  opportunityId: string;
  quoteId: string;
  termVersion: number;
  terms: {
    currency: string;
    amountMinor: number;
    billingCadence: "one_time" | "monthly" | "annual" | "usage_based";
    scope: string;
    validUntil: string;
    /**
     * @minItems 1
     * @maxItems 20
     */
    sourceFactRefs: string[];
  };
  termsHash: string;
  createdAt: string;
  createdBy: string;
}

/**
 * Current quote head; accepted terms do not prove collection.
 */
export interface SalesQuotesDocument {
  schemaVersion: 1;
  classification: "sales_private";
  organizerId: string;
  opportunityId: string;
  quoteId: string;
  revision: number;
  termVersion: number;
  status: "draft" | "approved" | "accepted_reviewed";
  approvedDecisionId: string | null;
  acceptedDecisionId: string | null;
  updatedAt: string;
  updatedBy: string;
}

/**
 * Private binding of a non-admin Firebase Auth client account.
 */
export interface AssistantClientsDocument {
  schemaVersion: 1;
  classification: "sales_private";
  clientId: string;
  authUid: string;
  active: boolean;
  revision: number;
  createdAt: string;
  updatedAt: string;
  updatedByUid: string;
}

/**
 * Private expiring action and entity grant from an employee to one registered assistant client.
 */
export interface AssistantDelegationsDocument {
  schemaVersion: 1;
  classification: "sales_private";
  delegationId: string;
  actorUid: string;
  clientId: string;
  /**
   * @minItems 1
   * @maxItems 20
   */
  allowedActions: (
    | "hosts.search"
    | "hosts.get"
    | "tasks.list"
    | "opportunities.list"
    | "fields.list"
    | "receipts.get"
    | "activities.log"
    | "tasks.upsert"
    | "opportunities.upsert"
    | "fields.create"
    | "fields.setValue"
    | "evidence.propose"
  )[];
  /**
   * @minItems 1
   * @maxItems 30
   */
  organizerIds: string[];
  /**
   * @maxItems 50
   */
  fieldIds: string[];
  expiresAt: string;
  maxRequestsPerMinute: number;
  maxRequestsPerDay: number;
  revoked: boolean;
  revision: number;
  issuedByUid: string;
  issuedAt: string;
  revokedByUid?: string;
  revokedAt?: string;
}

/**
 * Transactional request counter for one delegated client or owner window.
 */
export interface AssistantGatewayBudgetsDocument {
  schemaVersion: 1;
  classification: "sales_private";
  budgetId: string;
  windowKind: "minute" | "day";
  count: number;
  expiresAt: FirebaseFirestore.Timestamp;
}

/**
 * Immutable server-side result of one owner management request; keyed by issuer and request id hash.
 */
export interface AssistantManagementReceiptsDocument {
  schemaVersion: 1;
  classification: "sales_private";
  receiptId: string;
  issuerUid: string;
  requestId: string;
  action:
    | "assistant.clients.set"
    | "assistant.delegations.issue"
    | "assistant.delegations.revoke";
  targetId: string;
  materialHash: string;
  result: {
    clientId?: string;
    authUid?: string;
    active?: boolean;
    delegationId?: string;
    actorUid?: string;
    allowedActions?: string[];
    organizerIds?: string[];
    fieldIds?: string[];
    expiresAt?: string;
    revoked?: boolean;
    revokedByUid?: string;
    revokedAt?: string;
    revision?: number;
    updatedAt?: string;
    issuedAt?: string;
  };
  createdAt: string;
}

/**
 * Private organizer-linked Sales companion; no canonical ownership, payment, or publication authority.
 */
export interface OrganizerSalesAccountDocument {
  schemaVersion: 1;
  classification: "sales_private";
  organizerId: string;
  revision: number;
  researchStatus:
    | "new"
    | "needs_research"
    | "ready_for_review"
    | "qualified"
    | "benchmark_only"
    | "no_fit"
    | "archived";
  assignedOwnerUid: string | null;
  summary: string | null;
  nextAction: string | null;
  suppressionStatus: "clear" | "held" | "suppressed";
  suppressionReason: string | null;
  suppressionAt: string | null;
  suppressionBy: string | null;
  duplicateReviewRequired: boolean;
  qualificationPolicy: {
    policyId: string;
    version: string;
    policyHash: string;
  } | null;
  name: string;
  city: string | null;
  market: string | null;
  marketLabel: string | null;
  /**
   * @minItems 0
   * @maxItems 30
   */
  eventTypes: string[];
  /**
   * @minItems 0
   * @maxItems 30
   */
  cohortIds: string[];
  /**
   * @minItems 0
   * @maxItems 40
   */
  searchTokens: string[];
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  cohortMutationId?: string | "initial" | null;
}

/**
 * Shared person identity only; organizer-specific endpoints and contactability live on relationships.
 */
export interface SalesContactDocument {
  schemaVersion: 1;
  classification: "sales_private";
  contactId: string;
  displayName: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/**
 * Organizer-scoped role, endpoints, and human draft review. Draft review never grants send authority.
 */
export interface SalesContactRelationshipDocument {
  schemaVersion: 1;
  classification: "sales_private";
  relationshipId: string;
  contactId: string;
  organizerId: string;
  revision: number;
  role: string;
  decisionInfluence: "unknown" | "decision_maker" | "influencer" | "operator";
  primary: boolean;
  contactabilityStatus: "unknown" | "draft_reviewed" | "held" | "suppressed";
  contactabilityReason: string | null;
  contactabilityAt: string | null;
  contactabilityBy: string | null;
  draftReviewEvidenceId: string | null;
  sendAuthority: false;
  /**
   * @minItems 0
   * @maxItems 3
   */
  endpoints: {
    kind: "email" | "phone";
    value: string;
    verificationStatus: "unverified" | "verified";
    evidenceId?: string | null;
  }[];
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

/**
 * Reviewed source lineage for Sales claims; not provider consent or ownership verification.
 */
export interface SalesEvidenceDocument {
  schemaVersion: 1;
  classification: "sales_private";
  evidenceId: string;
  organizerId: string;
  contactId: string | null;
  claimKey: "identity" | "recurrence" | "operation" | "stack" | "other";
  signalId: string | null;
  sourceType: "first_party" | "public_web" | "human_note" | "import_artifact";
  sourceRef: string;
  observedAt: string;
  validThrough: string | null;
  confidence: "high" | "medium" | "low";
  normalizedValue: string | null;
  excerpt: string | null;
  reviewedAt: string;
  reviewerUid: string;
  createdAt: string;
  createdBy: string;
}

/**
 * Human-owned follow-up; a task does not authorize contacting or sending.
 */
export interface SalesTaskDocument {
  schemaVersion: 1;
  classification: "sales_private";
  taskId: string;
  organizerId: string;
  contactId: string | null;
  revision: number;
  kind:
    | "research"
    | "reply"
    | "follow_up"
    | "demo"
    | "pilot"
    | "duplicate_review"
    | "opt_out"
    | "service_commitment";
  title: string;
  dueAt: string | null;
  ownerUid: string;
  status: "open" | "completed" | "cancelled";
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

/**
 * Private sales pipeline stage, independent of public organizer status.
 */
export interface SalesOpportunityDocument {
  schemaVersion: 1;
  classification: "sales_private";
  opportunityId: string;
  organizerId: string;
  revision: number;
  motion: string;
  stage:
    | "new_enquiry"
    | "ready_to_contact"
    | "contacted"
    | "in_conversation"
    | "demo_arranged"
    | "demo_completed"
    | "pilot_agreed"
    | "pilot_running"
    | "commercial_discussion"
    | "closed_won"
    | "closed_lost";
  ownerUid: string;
  nextStep: string | null;
  nextStepAt: string | null;
  stageEnteredAt: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

/**
 * Private timeline with actor-attested manual outreach and server-confirmed canonical claim and synthetic-demo transitions, and the approval of a listing Supply Intake built.
 */
export interface SalesActivityDocument {
  schemaVersion: 1;
  classification: "sales_private";
  activityId: string;
  organizerId: string;
  opportunityId: string | null;
  type:
    | "note"
    | "reply"
    | "call"
    | "demo"
    | "pilot"
    | "correction"
    | "outreach_sent_manual"
    | "claim_requested"
    | "claim_approved"
    | "claim_rejected"
    | "demo_started"
    | "demo_completed"
    | "listing_approved";
  channel: ("email" | "whatsapp" | "other") | null;
  outcome: "actor_attested_sent" | null;
  providerConfirmed: false;
  occurredAt: string;
  recordedAt: string;
  note: string;
  actorUid: string;
  source?:
    | {
        kind: "organizer_claim";
        claimRequestId: string;
        transitionId: string;
      }
    | {
        kind: "sales_demo";
        sessionId: string;
        blueprintId: string;
        blueprintRevision: number;
        invitationId: string;
      }
    | {
        kind: "supply_intake";
        requestId: string;
        approvalId: string;
        origin:
          | "admin_nomination"
          | "sales_inbound_intent"
          | "discovery_run"
          | "none";
      };
}

/**
 * Typed, namespaced private account field definition; never extends public organizer records.
 */
export interface SalesCustomFieldDocument {
  schemaVersion: 1;
  classification: "sales_private";
  fieldId: string;
  label: string;
  normalizedLabel: string;
  type: "string" | "number" | "boolean" | "date" | "enum";
  recordType: "account";
  helpText: string | null;
  /**
   * @minItems 0
   * @maxItems 20
   */
  enumOptions: string[];
  revision: 1;
  createdAt: string;
  createdBy: string;
}

/**
 * Typed value validated against its private field definition in the transaction.
 */
export interface SalesCustomFieldValueDocument {
  schemaVersion: 1;
  classification: "sales_private";
  organizerId: string;
  fieldId: string;
  value: string | number | boolean | null;
  revision: number;
  updatedAt: string;
  updatedBy: string;
}

/**
 * Actor- and scope-bound immutable idempotency receipt; result is bounded and never public.
 */
export interface SalesActionReceiptDocument {
  schemaVersion: 1;
  classification: "sales_private";
  requestId: string;
  requestHash: string;
  action:
    | "hosts.create"
    | "hosts.update"
    | "tasks.upsert"
    | "opportunities.upsert"
    | "activities.log"
    | "fields.create"
    | "fields.setValue"
    | "intents.link"
    | "imports.apply"
    | "contacts.upsert"
    | "evidence.add"
    | "accounts.setSuppression"
    | "contacts.setContactability"
    | "evidence.propose"
    | "evidence.reviewProposal"
    | "commercial.pilots.upsert"
    | "commercial.quotes.revise"
    | "commercial.quotes.approve"
    | "commercial.quotes.accept"
    | "commercial.finance.attest"
    | "imports.compensation.apply"
    | "imports.history.apply"
    | "partner.register"
    | "partner.nominate"
    | "partner.assign"
    | "partner.assignment.decide"
    | "partner.revoke"
    | "partner.assignment.update"
    | "partner.demo.wording.propose"
    | "partner.marketing.review"
    | "partner.marketing.revoke";
  actorUid: string;
  clientId: string | null;
  clientAuthUid: string | null;
  delegationId: string | null;
  organizerId: string | null;
  createdAt: string;
  result: {
    [k: string]:
      | (
          | (
              | (string | number | boolean | null)
              | (string | number | boolean | null)[]
              | {
                  [k: string]: string | number | boolean | null;
                }
            )
          | (
              | (string | number | boolean | null)
              | (string | number | boolean | null)[]
              | {
                  [k: string]: string | number | boolean | null;
                }
            )[]
          | {
              [k: string]:
                | (string | number | boolean | null)
                | (string | number | boolean | null)[]
                | {
                    [k: string]: string | number | boolean | null;
                  };
            }
        )
      | (
          | (
              | (string | number | boolean | null)
              | (string | number | boolean | null)[]
              | {
                  [k: string]: string | number | boolean | null;
                }
            )
          | (
              | (string | number | boolean | null)
              | (string | number | boolean | null)[]
              | {
                  [k: string]: string | number | boolean | null;
                }
            )[]
          | {
              [k: string]:
                | (string | number | boolean | null)
                | (string | number | boolean | null)[]
                | {
                    [k: string]: string | number | boolean | null;
                  };
            }
        )[]
      | {
          [k: string]:
            | (
                | (string | number | boolean | null)
                | (string | number | boolean | null)[]
                | {
                    [k: string]: string | number | boolean | null;
                  }
              )
            | (
                | (string | number | boolean | null)
                | (string | number | boolean | null)[]
                | {
                    [k: string]: string | number | boolean | null;
                  }
              )[]
            | {
                [k: string]:
                  | (string | number | boolean | null)
                  | (string | number | boolean | null)[]
                  | {
                      [k: string]: string | number | boolean | null;
                    };
              };
        };
  };
}

/**
 * Reviewed 25-row maximum import receipt; row details live in a private subcollection.
 */
export interface SalesImportJobDocument {
  schemaVersion: 1;
  classification: "sales_private";
  importId: string;
  sourceId: string;
  contentHash: string;
  mappingVersion: string;
  previewHash: string;
  rowCount: number;
  counts: {
    created: number;
    matched: number;
    duplicate: number;
    unresolved: number;
    rejected: number;
  };
  status: "applied";
  createdAt: string;
  createdBy: string;
  /**
   * @maxItems 25
   */
  accountEffects?: {
    organizerId: string;
    /**
     * @minItems 1
     * @maxItems 25
     */
    sourceRowIds: string[];
    created: boolean;
    revisionBefore: number | null;
    revisionAfter: number;
    /**
     * @maxItems 30
     */
    cohortIdsBefore: string[];
    /**
     * @maxItems 30
     */
    cohortIdsAfter: string[];
    /**
     * @maxItems 30
     */
    cohortIdsAdded: string[];
    cohortMutationIdBefore: string | "initial" | null;
    cohortMutationIdAfter: string | "initial";
    createdAccountHash: string | null;
  }[];
}

/**
 * Unique source-row lineage for successfully matched or created reviewed rows; rowKey is a source ID and row ID hash.
 */
export interface SalesImportRowDocument {
  schemaVersion: 1;
  classification: "sales_private";
  importId: string;
  sourceId: string;
  sourceRowId: string;
  sourceContentHash: string;
  mappingVersion: string;
  organizerId: string | null;
  disposition: "created" | "matched" | "duplicate" | "unresolved" | "rejected";
  reason: string;
  originalScore: {
    [k: string]: string | number | boolean | null;
  } | null;
  originalCells?:
    | {
        column: string;
        value: string;
      }[]
    | null;
  originalResearchStatus:
    | "new"
    | "needs_research"
    | "ready_for_review"
    | "qualified"
    | "benchmark_only"
    | "no_fit"
    | "archived";
  originalSummary: string | null;
  importedAt: string;
  importedBy: string;
  /**
   * @maxItems 30
   */
  cohortIds?: string[];
}

/**
 * Immutable per-row review result for every row in a bounded import job.
 */
export interface SalesImportJobRowDocument {
  schemaVersion: 1;
  classification: "sales_private";
  importId: string;
  sourceId: string;
  sourceRowId: string;
  sourceContentHash: string;
  mappingVersion: string;
  organizerId: string | null;
  disposition: "created" | "matched" | "duplicate" | "unresolved" | "rejected";
  reason: string;
  originalScore: {
    [k: string]: string | number | boolean | null;
  } | null;
  originalCells?:
    | {
        column: string;
        value: string;
      }[]
    | null;
  originalResearchStatus:
    | "new"
    | "needs_research"
    | "ready_for_review"
    | "qualified"
    | "benchmark_only"
    | "no_fit"
    | "archived";
  originalSummary: string | null;
  importedAt: string;
  importedBy: string;
  /**
   * @maxItems 30
   */
  cohortIds?: string[];
}

/**
 * Private runtime configuration; qualification rule values are not embedded in public source.
 */
export interface SalesSettingDocument {
  schemaVersion: 1;
  classification: "sales_private";
  status?: "active";
  policyId?: string;
  version?: string;
  policyHash?: string;
  /**
   * @minItems 1
   * @maxItems 8
   */
  rules?: {
    ruleId: string;
    claimKey: "identity" | "recurrence" | "operation" | "stack" | "other";
    /**
     * @minItems 1
     * @maxItems 4
     */
    sourceTypes: (
      | "first_party"
      | "public_web"
      | "human_note"
      | "import_artifact"
    )[];
    /**
     * @minItems 1
     * @maxItems 3
     */
    confidence: ("high" | "medium" | "low")[];
    minimumCount: number;
    distinctSignalIds: boolean;
    distinctSourceRoots: boolean;
    maxAgeDays: number | null;
  }[];
  /**
   * @maxItems 50
   */
  normalizedLabels?: string[];
  updatedAt?: string;
}

/**
 * Append-only human decision. Contact draft review never means send permission.
 */
export interface SalesSuppressionDecisionDocument {
  schemaVersion: 1;
  classification: "sales_private";
  decisionId: string;
  targetType: "account" | "contact_relationship";
  organizerId: string;
  contactId: string | null;
  previousStatus:
    | "clear"
    | "unknown"
    | "draft_reviewed"
    | "held"
    | "suppressed";
  status: "clear" | "unknown" | "draft_reviewed" | "held" | "suppressed";
  reason: string;
  actorUid: string;
  recordedAt: string;
  accountRevision?: number;
  relationshipRevision?: number;
  evidenceId?: string | null;
  sendAuthority?: false;
}

/**
 * Private reviewed plan; only its preview object can reach an anonymous invitation view.
 */
export interface SalesDemoBlueprintsDocument {
  schemaVersion: 1;
  classification: "sales_private";
  blueprintId: string;
  revision: number;
  state: "draft" | "reviewed" | "withdrawn";
  organizerId: string | null;
  candidateId: string | null;
  opportunityId: string | null;
  capability: "synthetic_forms_v1";
  capabilityRevision: string;
  evidenceRevision: string;
  seedVersion: 1;
  formCapabilityReview: {
    questionTypes: "exact" | "manual" | "retained" | "unsupported";
    branching: "exact" | "manual" | "retained" | "unsupported";
    requiredFields: "exact" | "manual" | "retained" | "unsupported";
    scoringApproval: "exact" | "manual" | "retained" | "unsupported";
    uploads: "exact" | "manual" | "retained" | "unsupported";
  };
  /**
   * @maxItems 30
   */
  fieldMappings: {
    sourceField: string;
    catchField: string | null;
    disposition: "exact" | "manual" | "retained" | "unsupported";
  }[];
  preview: {
    brandName: string;
    headline: string;
    scenario: string;
    /**
     * @minItems 3
     * @maxItems 3
     */
    steps: string[];
    /**
     * @maxItems 8
     */
    retainedTools: string[];
    /**
     * @minItems 1
     * @maxItems 8
     */
    limitations: string[];
    cta: string;
  };
  reviewedByUid: string | null;
  reviewedAt: string | null;
  updatedAt: string;
  updatedByUid: string;
  setupPlan?:
    | {
        mode: "manual";
        /**
         * @minItems 1
         * @maxItems 12
         */
        requirements: string[];
      }
    | {
        mode: "template";
        /**
         * @maxItems 12
         */
        requirements: string[];
        templateId: string;
        title: string;
        templateVersion: number;
        templateHash: string;
        materializerVersion: 1;
      };
  partnerReviewGrant?: {
    revision: number;
    state: "active" | "withdrawn";
    partnerUid: string;
    assignmentRevision: number;
    blueprintRevision: number;
    previewHash: string;
    expiresAt: string;
    ownerReviewedByUid: string;
    ownerReviewedAt: string;
  };
  partnerPreviewProposal?: {
    revision: number;
    state: "pending_owner_review";
    partnerUid: string;
    assignmentRevision: number;
    blueprintRevision: number;
    sourcePreviewHash: string;
    wording: {
      headline: string;
      scenario: string;
      cta: string;
    };
    proposedAt: string;
  };
}

/**
 * Trusted server-owned current eligibility for the synthetic Forms adapter; absence denies demos.
 */
export interface SalesDemoCapabilitiesDocument {
  schemaVersion: 1;
  classification: "sales_private";
  capability: "synthetic_forms_v1";
  revision: string;
  evidenceRevision: string;
  enabled: boolean;
  reviewedByUid: string;
  reviewedAt: string;
}

/**
 * Private digest-only invitation. Contact endpoint is retained only as a keyed digest.
 */
export interface SalesDemoInvitationsDocument {
  schemaVersion: 1;
  classification: "sales_private";
  invitationId: string;
  blueprintId: string;
  blueprintRevision: number;
  tokenDigest: string;
  contactBinding: null | {
    kind: "email" | "phone";
    digest: string;
  };
  expiresAt: string;
  revoked: boolean;
  revision: number;
  sessionCap: number;
  sessionCount: number;
  startReceiptCount: number;
  startWindowMinute: number;
  startWindowCount: number;
  currentSessionId: null | string;
  issuedByUid: string;
  issuedAt: string;
  revokedByUid?: string;
  revokedAt?: string;
}

/**
 * Immutable issuer-bound command result and material hash; trial receipts expire with their session.
 */
export interface SalesDemoReceiptsDocument {
  schemaVersion: 1;
  classification: "sales_private";
  receiptId: string;
  actorUid: string;
  requestId: string;
  action:
    | "salesDemo.blueprint.save"
    | "salesDemo.blueprint.review"
    | "salesDemo.blueprint.withdraw"
    | "salesDemo.invitation.issue"
    | "salesDemo.invitation.revoke"
    | "salesDemo.session.start"
    | "salesDemo.session.reviewApplication"
    | "salesDemo.session.prepareReply"
    | "salesDemo.session.admitGuest"
    | "salesDemo.session.requestAssistance"
    | "salesDemo.blueprint.partnerReview.share";
  targetId: string;
  materialHash: string;
  result: {
    schemaVersion?: 1;
    synthetic?: true;
    blueprintId?: string;
    blueprintRevision?: number;
    invitationId?: string;
    sessionId?: string;
    revision?: number;
    state?: "draft" | "reviewed" | "withdrawn";
    reviewedAt?: string;
    previewOnly?: boolean;
    expiresAt?: string;
    revoked?: boolean;
    revokedAt?: string;
    revokedByUid?: string;
    createdAt?: string;
    status?: "active" | "completed";
    /**
     * @maxItems 4
     */
    allowedActions?: (
      | "reviewApplication"
      | "prepareReply"
      | "admitGuest"
      | "requestAssistance"
    )[];
    actionCount?: number;
    step?: "application" | "reply" | "admission" | "complete";
    application?: {
      applicantName: "Sample Applicant";
      request: "Sample event application";
      review: "pending" | "approved" | "needs_info";
    };
    reply?: {
      status: "none" | "prepared";
      template: "none" | "welcome" | "clarify";
    };
    guest?: {
      status: "not_admitted" | "admitted";
      displayName: "Sample Applicant";
    };
    assistanceRequested?: boolean;
    sharingRevision?: number;
    sharingState?: "active" | "withdrawn";
    previewHash?: string;
    sendAuthority?: false;
    capabilityApprovalAuthority?: false;
    organizerControlAuthority?: false;
  };
  createdAt: string;
  expiresAt?: string;
}

/**
 * Private current-fit projection. Only the source-bound, unexpired row may appear in a queue; this is never send authority.
 */
export interface SalesFitQueueEntryDocument {
  schemaVersion: 1;
  classification: "sales_private";
  organizerId: string;
  policyId: string;
  policyRevision: number;
  policyVersion: string;
  sourceHash: string;
  accountRevision: number;
  qualificationPolicyHash: string | null;
  status: "complete" | "needs_research" | "review_required";
  score: number | null;
  priority: "high" | "medium" | "low" | "unranked";
  eligibleForOutreachReview: boolean;
  suppressionStatus: "clear" | "held" | "suppressed";
  duplicateReviewRequired: boolean;
  researchStatus:
    | "new"
    | "needs_research"
    | "ready_for_review"
    | "qualified"
    | "benchmark_only"
    | "no_fit"
    | "archived";
  name: string;
  city: string | null;
  assignedOwnerUid: string | null;
  expiresAt: string | null;
  evaluatedAt: string;
  qualificationExpiresAt: string | null;
}

/**
 * Private generation fence incremented atomically by every fit refresh and source invalidation.
 */
export interface SalesFitQueueMetaDocument {
  schemaVersion: 1;
  classification: "sales_private";
  metaId: "current";
  generation: number;
  updatedAt: string;
}

/**
 * Private exact-retry receipt for one host fit projection refresh, not a durable claim of current rank.
 */
export interface SalesFitQueueReceiptDocument {
  schemaVersion: 1;
  classification: "sales_private";
  receiptId: string;
  actorUid: string;
  requestId: string;
  materialHash: string;
  result: AdminRefreshSalesFitQueueResponse;
  createdAt: string;
  qualificationPolicyHash: string | null;
}

/**
 * Immutable private per-import per-organizer compensating effect; original job and lineage remain intact.
 */
export interface SalesImportCompensationDocument {
  schemaVersion: 1;
  classification: "sales_private";
  effectId: string;
  importId: string;
  organizerId: string;
  mode: "archive_companion" | "remove_cohorts";
  /**
   * @minItems 1
   * @maxItems 25
   */
  sourceRowIds: string[];
  /**
   * @maxItems 30
   */
  cohortIdsRemoved: string[];
  beforeRevision: number;
  afterRevision: number;
  beforeCohortMutationId: string | "initial";
  afterCohortMutationId: string;
  reason: string;
  createdAt: string;
  createdBy: string;
  requestId: string;
}

export interface SalesDemoSetupDocument {
  schemaVersion: 1;
  classification: "sales_private";
  setupId: string;
  organizerId: string;
  blueprintId: string;
  blueprintRevision: number;
  setupHash: string;
  formId: string;
  createdByUid: string;
  createdAt: string;
}

/**
 * Isolated synthetic Forms practice state; no production guest, message, payment or membership references.
 */
export interface SalesDemoSessionsDocument {
  schemaVersion: 1;
  classification: "sales_private";
  sessionId: string;
  invitationId: string;
  blueprintId: string;
  blueprintRevision: number;
  actorUid: string;
  createdAt: string;
  expiresAt: string;
  status: "active" | "completed";
  /**
   * @minItems 1
   * @maxItems 4
   */
  allowedActions: (
    | "reviewApplication"
    | "prepareReply"
    | "admitGuest"
    | "requestAssistance"
  )[];
  revision: number;
  actionCount: number;
  step: "application" | "reply" | "admission" | "complete";
  application: {
    applicantName: "Sample Applicant";
    request: "Sample event application";
    review: "pending" | "approved" | "needs_info";
  };
  reply: {
    status: "none" | "prepared";
    template: "none" | "welcome" | "clarify";
  };
  guest: {
    status: "not_admitted" | "admitted";
    displayName: "Sample Applicant";
  };
  assistanceRequested: boolean;
}

/**
 * Private suggestions, isolated from employee-reviewed evidence and qualification.
 */
export interface SalesEvidenceProposalsDocument {
  schemaVersion: 1;
  classification: "sales_private";
  proposalId: string;
  organizerId: string;
  revision: number;
  status: "pending" | "accepted" | "rejected";
  evidence: {
    organizerId: string;
    contactId?: string | null;
    claimKey: "identity" | "recurrence" | "operation" | "stack" | "other";
    signalId?: string;
    sourceType: "first_party" | "public_web" | "human_note" | "import_artifact";
    sourceRef: string;
    observedAt: string;
    validThrough?: string | null;
    confidence: "high" | "medium" | "low";
    normalizedValue?: string | null;
    excerpt?: string | null;
  };
  createdAt: string;
  createdBy: string;
  clientId: string | null;
  clientAuthUid: string | null;
  delegationId: string | null;
  reviewedAt: string | null;
  reviewerUid: string | null;
  reviewReason: string | null;
  promotedEvidenceId: string | null;
}

/**
 * Private anonymous device permission, keyed by a domain-separated capability hash. Revocation tombstones cannot be reactivated; fresh permission requires a new capability.
 */
export interface HostAcquisitionConsentDocument {
  schemaVersion: 1;
  classification: "sales_private";
  consentId: string;
  status: "active" | "revoked";
  authority: {
    version: 1;
    purpose: "host_acquisition_measurement";
    analytics: true;
    advertising: boolean;
    chosenAt: number;
    acceptedAt: number;
    expiresAt: number;
    revokedAt: number | null;
  } | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;
  /**
   * Withdrawal tombstones only. True until the expiry worker drains every optional attribution snapshot bound to this consent; a revoked capability can never create another.
   */
  attributionCleanupPending?: boolean;
}

/**
 * Private Host pilot review and operational activation evidence. No attendee identity or advertising permission.
 */
export interface HostPilotEventReviewDocument {
  schemaVersion: 1;
  classification: "sales_private";
  eventId: string;
  organizerId: string;
  realEvent: boolean;
  revision: number;
  reviewedAt: number;
  reviewedBy: string;
}

/**
 * Private Host pilot review and operational activation evidence. No attendee identity or advertising permission.
 */
export interface HostOrganizerActivationDocument {
  schemaVersion: 1;
  classification: "sales_private";
  organizerId: string;
  eventId: string;
  receiptId: string;
  activatedAt: number;
  recordedAt: number;
  reviewRevision: number;
}

/**
 * Private operator notice receipt keyed by the original accepted Host lead. No applicant details or contact data.
 */
export interface HostOperatorAlertDocument {
  schemaVersion: 1;
  classification: "sales_private";
  eventId: string;
  intentId: string;
  acceptedAt: number;
  status: "pending" | "sending" | "accepted" | "failed" | "unknown" | "stopped";
  attempts: number;
  attemptId: string | null;
  providerMessageId: string | null;
  nextAttemptAt?: number;
}

/**
 * Private, bounded Meta Lead delivery. Current consent and the original Sales intent are rechecked before dispatch. Contact data and form answers are excluded.
 */
export interface HostAcquisitionDeliveryDocument {
  schemaVersion: 1;
  classification: "sales_private";
  eventId: string;
  intentId: string;
  consentId: string;
  acceptedAt: number;
  status: "pending" | "sending" | "accepted" | "unknown" | "stopped";
  attempts: number;
  nextAttemptAt: number;
  attemptId: string | null;
  lastAttemptAt: number | null;
  expiresAt: FirebaseFirestore.Timestamp;
  context: {
    clientId: string;
    userAgent: string;
    fbclid?: string;
    clickCapturedAt?: number;
  } | null;
}

/**
 * Private self-reported host submission, immutable at capture and linked only after identity review.
 */
export interface SalesInboundIntentsDocument {
  schemaVersion: 1;
  revision: number;
  classification: "sales_private";
  intentId: string;
  source: "website" | "partner";
  submissionId: string;
  requestHash: string;
  waitlistId: string;
  status: "needs_identity_review" | "linked" | "dismissed";
  organizerId: string | null;
  evidenceStatus: "self_reported";
  fullName: string;
  email: string | null;
  city: string;
  entryRoute: string | null;
  alreadyJoined: boolean;
  hostApplication: {
    organizationName?: string | null;
    organizationType?: string | null;
    operatingCity?: string | null;
    communityLink?: string | null;
    /**
     * @maxItems 10
     */
    formats?: string[];
    eventCadence?: string | null;
    nextEventName?: string | null;
    nextEventDate?: string | null;
    eventLocation?: string | null;
    expectedCapacity?: string | null;
    bookingPlatform?: string | null;
    guestListFormat?: string | null;
    priceRange?: string | null;
    admissionModel?: string | null;
    waitlistPlan?: string | null;
    paymentReadiness?: string | null;
    /**
     * @maxItems 16
     */
    eventSuccessModules?: string[];
    hostGoals?: string | null;
    operatingNotes?: string | null;
    eventPricing?: ("paid" | "free" | "mixed" | "undecided") | null;
  } | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  linkedAt?: FirebaseFirestore.Timestamp;
  linkedBy?: string;
  linkRequestId?: string;
  partnerUid?: string;
  hostLead?: {
    eventId: string;
    isNew: boolean;
  };
  /**
   * Optional first-party campaign snapshot captured with the new Host receipt under current analytics permission. Erased on withdrawal or original-choice expiry; never used without a current consent/privacy check.
   */
  acquisitionAttribution?: {
    version: 1;
    consentId: string;
    acceptedAt: number;
    expiresAt: number;
    firstTouch: {
      capturedAt: number;
      landingPath:
        | "/host/"
        | "/host/overview/"
        | "/host/platform/"
        | "/host/planners/"
        | "/host/clubs/"
        | "/host/directory/"
        | "/claim/"
        | "/host/claim/"
        | "/host/apply/"
        | "/host/stack/"
        | "/host/workflows/";
      values: {
        utm_source?: "google" | "meta" | "newsletter" | "catch" | "partner";
        utm_medium?: "cpc" | "paid_social" | "email" | "organic" | "referral";
        utm_campaign?:
          | "launch"
          | "launch_2026"
          | "planner_launch"
          | "host_acquisition_2026"
          | "synthetic_launch";
        utm_content?:
          | "host_hero"
          | "host_footer"
          | "claim_cta"
          | "application_cta";
      };
    } | null;
    lastTouch: {
      capturedAt: number;
      landingPath:
        | "/host/"
        | "/host/overview/"
        | "/host/platform/"
        | "/host/planners/"
        | "/host/clubs/"
        | "/host/directory/"
        | "/claim/"
        | "/host/claim/"
        | "/host/apply/"
        | "/host/stack/"
        | "/host/workflows/";
      values: {
        utm_source?: "google" | "meta" | "newsletter" | "catch" | "partner";
        utm_medium?: "cpc" | "paid_social" | "email" | "organic" | "referral";
        utm_campaign?:
          | "launch"
          | "launch_2026"
          | "planner_launch"
          | "host_acquisition_2026"
          | "synthetic_launch";
        utm_content?:
          | "host_hero"
          | "host_footer"
          | "claim_cta"
          | "application_cta";
      };
    } | null;
  };
}

/**
 * Employee-reviewed factor rating linked to existing reviewed Sales evidence; unknown and disputed ratings cannot score.
 */
export interface SalesIntelligenceAssessmentDocument {
  schemaVersion: 1;
  classification: "sales_private";
  assessmentId: string;
  organizerId: string;
  factorId: string;
  revision: number;
  state: "known" | "unknown" | "disputed";
  value: number | null;
  /**
   * @maxItems 8
   */
  evidenceIds: string[];
  reason: string | null;
  reviewedAt: string;
  reviewerUid: string;
}

/**
 * Private exact prose approved for one organizer. Revoked or expired source and reference permission block future use.
 */
export interface SalesIntelligenceClauseDocument {
  schemaVersion: 1;
  classification: "sales_private";
  clauseId: string;
  organizerId: string;
  revision: number;
  kind: "observation" | "capability" | "reference" | "cta";
  text: string;
  state: "draft" | "approved" | "withdrawn";
  /**
   * @maxItems 8
   */
  evidenceIds: string[];
  validUntil: string;
  permission: "not_required" | "private_mention" | "withdrawn";
  reviewedAt: string | null;
  reviewedBy: string | null;
  updatedAt: string;
  updatedBy: string;
  /**
   * @maxItems 8
   */
  partnerCitations?: {
    evidenceId: string;
    sourceHash: string;
  }[];
}

/**
 * Private, owner-reviewed, versioned fit and priority policy. No production weights are checked into source.
 */
export interface SalesIntelligencePolicyDocument {
  schemaVersion: 1;
  classification: "sales_private";
  policyRecordId: "current";
  policyId: string;
  revision: number;
  version: string;
  status: "active" | "paused";
  /**
   * @minItems 7
   * @maxItems 7
   */
  factors: {
    id: string;
    weight: number;
    /**
     * @minItems 1
     * @maxItems 5
     */
    claimKeys: ("identity" | "recurrence" | "operation" | "stack" | "other")[];
    maxAgeDays: number;
  }[];
  priorityBands: {
    high: number;
    medium: number;
  };
  promptVersion: string;
  playbookVersion: string;
  updatedAt: string;
  updatedBy: string;
}

/**
 * Immutable actor-scoped exact-retry receipt for private employee intelligence and assignment-bound partner composition actions. Never proof of sending.
 */
export interface SalesIntelligenceReceiptDocument {
  schemaVersion: 1;
  classification: "sales_private";
  receiptId: string;
  actorUid: string;
  action:
    | "policy.save"
    | "assessment.save"
    | "clause.save"
    | "clause.review"
    | "score.snapshot"
    | "draft.record"
    | "draft.review"
    | "draft.copy"
    | "partner.draft.record"
    | "partner.draft.review"
    | "partner.draft.copy"
    | "partner.draft.manual_send";
  requestId: string;
  materialHash: string;
  result: {
    [k: string]: unknown;
  };
  createdAt: string;
}

/**
 * Immutable reviewed-source fit snapshot. Unknown or disputed factors yield a null score and unranked priority.
 */
export interface SalesIntelligenceScoreSnapshotDocument {
  schemaVersion: 1;
  classification: "sales_private";
  snapshotId: string;
  organizerId: string;
  accountRevision: number;
  policyId: string;
  policyRevision: number;
  policyVersion: string;
  sourceHash: string;
  status: "complete" | "needs_research" | "review_required";
  score: number | null;
  priority: "high" | "medium" | "low" | "unranked";
  /**
   * @minItems 7
   * @maxItems 7
   */
  factors: {
    factorId: string;
    state: "known" | "unknown" | "disputed";
    value: number | null;
    /**
     * @maxItems 8
     */
    evidenceIds: string[];
    reason: string | null;
  }[];
  evaluatedAt: string;
}

/**
 * Private Operations-rendered manual-copy-only draft with frozen source request and exact source hash.
 */
export interface SalesOutreachDraftsDocument {
  schemaVersion: 1;
  classification: "sales_private";
  draftId: string;
  organizerId: string;
  contactId: string;
  opportunityId: string;
  sourceRequest: {
    organizerId: string;
    contactId: string;
    opportunityId: string;
    /**
     * @maxItems 12
     */
    observationIds: string[];
    /**
     * @maxItems 12
     */
    capabilityIds: string[];
    /**
     * @maxItems 12
     */
    referenceIds: string[];
    /**
     * @maxItems 12
     */
    ctaIds: string[];
    channel: "email" | "message";
    purpose: "first_message" | "follow_up";
    priorActivityId?: string;
  };
  sourceMaterialHash: string;
  sourceHash: string;
  inputHash: string;
  draft: OutreachDraft;
  status: "pending_review" | "approved";
  createdAt: string;
  createdBy: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  participantScope?: {
    partnerUid: string;
    assignmentRevision: number;
    renderedDraftId: string;
  };
}

/**
 * Server-owned public OTP checkout. Holds and financial recovery share the event payment engine; no application approval or form-offer identity is implied.
 */
export interface PublicEventPaymentDocument {
  organizerId: string;
  eventId: string;
  recipientUid: string;
  requestId: string;
  canonicalSeatKey: string;
  identityRevision: number;
  migrationRevision: number;
  routing: {
    version: 1;
    amountMinor: number;
    transferAmountMinor: number | null;
    settlementHold: boolean | null;
    purpose: "formFee" | "eventAdmission";
    organizerId: string;
    selection: {
      route:
        | "razorpayRoute"
        | "razorpayOAuth"
        | "stripeConnectDirect"
        | "stripeConnectDestination";
      mode: "test" | "live";
      currency: string;
      merchantCountry: string;
    };
    policySource: "app" | "organizer" | "legacy";
    appRevision: number;
    organizerRevision: number;
    bindingId: string;
    merchantAccountId: string;
    destinationAccountId: string | null;
    configurationVersion: string;
    checkoutKey: string | null;
  };
  amountPaise: number;
  currency: "INR";
  receipt: string;
  status:
    | "creatingOrder"
    | "orderUnknown"
    | "checkoutReady"
    | "verifying"
    | "captured"
    | "admitted"
    | "expired"
    | "refundPending"
    | "refunded"
    | "reviewRequired"
    | "failed"
    | "cancelled";
  providerOrderId: string | null;
  providerPaymentId: string | null;
  providerRefundId: string | null;
  refundedAmountPaise: number;
  admissionReceiptId: string | null;
  reservationReleased: boolean;
  leaseUntil: FirebaseFirestore.Timestamp | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  checkoutExpiresAt: FirebaseFirestore.Timestamp;
  capturedAt: FirebaseFirestore.Timestamp | null;
  admittedAt: FirebaseFirestore.Timestamp | null;
  lastErrorCode: string | null;
  /**
   * Durable Route hold-release intent and provider observation. Release is separate from settled funds. Optional only for pre-admission and older attempts.
   */
  settlement?: {
    state:
      | "waiting"
      | "releasePending"
      | "released"
      | "settled"
      | "blocked"
      | "reviewRequired"
      | "reversed";
    transferId: string | null;
    nextAttemptAtMillis: number;
    leaseUntilMillis: number;
    leaseId: string | null;
    authorizedAtMillis: number | null;
    completedAtMillis: number | null;
    releasedAtMillis: number | null;
    settledAtMillis: number | null;
  };
  cancellation?: {
    reason: "eventCancelled" | "guestCancelled";
    requestedAtMillis: number;
    attendeeId: string;
    refundAmountPaise: number;
    seatRetained: boolean;
  };
  cancellationPolicy: {
    refundDeadlineMillis: number;
    eventStartsAtMillis: number;
  };
  registrationRevision: number;
  attendeeId: string;
  phoneE164: string;
  displayName: string;
  eventName: string;
  requestHash: string;
  inviteLinkId: string | null;
}

export interface PublicEventAdmissionReceiptDocument {
  organizerId: string;
  eventId: string;
  recipientUid: string;
  attendeeId: string;
  canonicalSeatKey: string;
  identityRevision: number;
  migrationRevision: number;
  registrationRevision: number;
  amountPaise: number;
  currency: "INR";
  routing: {
    version: 1;
    amountMinor: number;
    transferAmountMinor: number | null;
    settlementHold: boolean | null;
    purpose: "formFee" | "eventAdmission";
    organizerId: string;
    selection: {
      route:
        | "razorpayRoute"
        | "razorpayOAuth"
        | "stripeConnectDirect"
        | "stripeConnectDestination";
      mode: "test" | "live";
      currency: string;
      merchantCountry: string;
    };
    policySource: "app" | "organizer" | "legacy";
    appRevision: number;
    organizerRevision: number;
    bindingId: string;
    merchantAccountId: string;
    destinationAccountId: string | null;
    configurationVersion: string;
    checkoutKey: string | null;
  };
  paymentId: string;
  providerOrderId: string;
  providerPaymentId: string;
  admittedAtMillis: number;
  resultingLedgerRevision: number;
}

export interface EventRegistrationReceiptDocument {
  organizerId: string;
  eventId: string;
  actorUid: string;
  requestHash: string;
  registrationRevision: number;
  mode: "closed" | "free" | "paid";
  createdAt: FirebaseFirestore.Timestamp;
}

/**
 * Server-owned payment attempt created atomically with its 15-minute canonical-seat hold. Routing and issued terms remain frozen through capture, admission, expiry and refund recovery.
 */
export interface OrganizerEventOfferPaymentDocument {
  organizerId: string;
  eventId: string;
  offerId: string;
  responseId: string;
  contactId: string;
  originId: string;
  recipientUid: string;
  grantId: string;
  requestId: string;
  canonicalSeatKey: string;
  offerGeneration: number;
  offerRevision: number;
  identityRevision: number;
  migrationRevision: number;
  routing: {
    version: 1;
    amountMinor: number;
    transferAmountMinor: number | null;
    settlementHold: boolean | null;
    purpose: "formFee" | "eventAdmission";
    organizerId: string;
    selection: {
      route:
        | "razorpayRoute"
        | "razorpayOAuth"
        | "stripeConnectDirect"
        | "stripeConnectDestination";
      mode: "test" | "live";
      currency: string;
      merchantCountry: string;
    };
    policySource: "app" | "organizer" | "legacy";
    appRevision: number;
    organizerRevision: number;
    bindingId: string;
    merchantAccountId: string;
    destinationAccountId: string | null;
    configurationVersion: string;
    checkoutKey: string | null;
  };
  paymentSnapshot: EventOfferPaymentSnapshot;
  amountPaise: number;
  currency: "INR";
  receipt: string;
  status:
    | "creatingOrder"
    | "orderUnknown"
    | "checkoutReady"
    | "verifying"
    | "captured"
    | "admitted"
    | "expired"
    | "refundPending"
    | "refunded"
    | "reviewRequired"
    | "failed"
    | "cancelled";
  providerOrderId: string | null;
  providerPaymentId: string | null;
  providerRefundId: string | null;
  refundedAmountPaise: number;
  admissionReceiptId: string | null;
  reservationReleased: boolean;
  leaseUntil: FirebaseFirestore.Timestamp | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  checkoutExpiresAt: FirebaseFirestore.Timestamp;
  capturedAt: FirebaseFirestore.Timestamp | null;
  admittedAt: FirebaseFirestore.Timestamp | null;
  lastErrorCode: string | null;
  /**
   * Durable Route hold-release intent and provider observation. Release is separate from settled funds. Optional only for pre-admission and older attempts.
   */
  settlement?: {
    state:
      | "waiting"
      | "releasePending"
      | "released"
      | "settled"
      | "blocked"
      | "reviewRequired"
      | "reversed";
    transferId: string | null;
    nextAttemptAtMillis: number;
    leaseUntilMillis: number;
    leaseId: string | null;
    authorizedAtMillis: number | null;
    completedAtMillis: number | null;
    releasedAtMillis: number | null;
    settledAtMillis: number | null;
  };
  cancellation?: {
    reason: "eventCancelled" | "guestCancelled";
    requestedAtMillis: number;
    attendeeId: string;
    refundAmountPaise: number;
    seatRetained: boolean;
  };
  cancellationPolicy?: {
    refundDeadlineMillis: number;
    eventStartsAtMillis: number;
  };
}

/**
 * Private OTP recipient invitation and single-UID claim. Document ID hashes a random token; raw tokens and phone numbers are never persisted. Immutable offer/source/phone bindings are rechecked in every payment transaction.
 */
export interface OrganizerEventOfferRecipientDocument {
  organizerId: string;
  eventId: string;
  offerId: string;
  responseId: string;
  originId: string;
  contactId: string;
  issuedByUid: string;
  offerGeneration: number;
  offerRevision: number;
  issuedAtMillis: number;
  expiresAtMillis: number;
  phoneHash: string;
  recipientUid: string | null;
  claimedAtMillis: number | null;
  revokedAtMillis: number | null;
}

/**
 * Server-owned immutable organizer/event/response admission ownership. Created atomically with the seat and request receipt; new request IDs cannot admit this source again.
 */
export interface OrganizerFormAdmissionDocument {
  organizerId: string;
  eventId: string;
  responseId: string;
  receiptId: string;
  attendeeId: string;
  canonicalSeatKey: string;
  offerId: string;
  offerRevision: number;
  offerGeneration: number;
}

export interface OrganizerFormAdmissionReceiptDocument {
  organizerId: string;
  eventId: string;
  responseId: string;
  contactId: string;
  offerId: string;
  expectedOfferRevision: number;
  expectedOfferGeneration: number;
  expectedLedgerRevision: number;
  requestId: string;
  receiptId: string;
  attendeeId: string;
  canonicalSeatKey: string;
  requestHash: string;
  resultingLedgerRevision: number;
  admittedAtMillis: number;
  seatAlreadyOccupied: boolean;
  actorUid: string;
  paymentSnapshot: EventOfferPaymentSnapshot;
  manualPayment: EventOfferManualPayment;
  /**
   * Current native form application approval checked atomically at admission. Absent on legacy receipts.
   */
  applicationApproval?: null | {
    applicationId: string;
    contactId: string;
    revision: number;
    reviewedAtMillis: number;
  };
  /**
   * Frozen server-verified payment authority for automatic admission; absent on manual/free admissions.
   */
  providerPayment?: {
    paymentId: string;
    providerOrderId: string;
    providerPaymentId: string;
    recipientUid: string;
    grantId: string;
    capturedAtMillis: number;
    routing: {
      version: 1;
      amountMinor: number;
      transferAmountMinor: number | null;
      settlementHold: boolean | null;
      purpose: "formFee" | "eventAdmission";
      organizerId: string;
      selection: {
        route:
          | "razorpayRoute"
          | "razorpayOAuth"
          | "stripeConnectDirect"
          | "stripeConnectDestination";
        mode: "test" | "live";
        currency: string;
        merchantCountry: string;
      };
      policySource: "app" | "organizer" | "legacy";
      appRevision: number;
      organizerRevision: number;
      bindingId: string;
      merchantAccountId: string;
      destinationAccountId: string | null;
      configurationVersion: string;
      checkoutKey: string | null;
    };
  };
}

export interface EventOfferConfigurationReceiptDocument {
  actorUid: string;
  organizerId: string;
  requestId: string;
  requestHash: string;
  createdAt: FirebaseFirestore.Timestamp;
  appliedPreferencesRevision: number;
  eventId: string;
}

export interface EventSetupPreferencesDocument {
  organizerId: string;
  eventId: string;
  revision: number;
  preferences: ResolvedEventPreferences;
  paymentTerms: EventPaymentTerms;
  updatedByUid: string;
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface EventSetupReceiptDocument {
  operation:
    | "create"
    | "update"
    | "preferences"
    | "details"
    | "publish"
    | "unpublish"
    | "media";
  actorUid: string;
  organizerId: string;
  requestHash: string;
  eventId: string;
  appliedRevision?: number;
  createdAt: FirebaseFirestore.Timestamp;
  outcome?: "discarded";
  requestId?: string;
  mediaPayloadHash?: string;
  expectedSetupRevision?: number;
}

export interface OrganizerEventSetupDefaultsDocument {
  organizerId: string;
  revision: number;
  eventSetup: OrganizerEventSetupPreferences;
  updatedAt: FirebaseFirestore.Timestamp;
  updatedByUid: string;
}

export interface OrganizerEventSetupDefaultReceiptDocument {
  actorUid: string;
  organizerId: string;
  requestId: string;
  requestHash: string;
  appliedRevision: number;
  createdAt: FirebaseFirestore.Timestamp;
}

/**
 * Durable organizer rehearsal completion, stamped only by a successful completion transaction; not deleted with expiring sessions.
 */
export interface EventRehearsalMilestoneDocument {
  organizerId: string;
  completedAt: FirebaseFirestore.Timestamp;
}

export interface EventRcsCallbackReceiptDocument {
  schemaVersion: 1;
  callbackId: string;
  callbackHash: string;
  processedAt: number;
  outcome:
    | {
        kind: "delivery";
        messageId: string;
        attemptId: string;
        disposition: "applied" | "duplicateOrOlder" | "conflictingEvidence";
      }
    | {
        kind: "reply";
        messageId: string;
        attemptId: string;
        result: "accepted" | "replayed";
      }
    | {
        kind: "ignored";
        reason:
          | "subscription"
          | "unstructured"
          | "guestPage"
          | "unknownSuggestion"
          | "unconfirmedRevocation"
          | "unrelatedMessage";
      }
    | {
        kind: "rejected";
        reason:
          | "unavailable"
          | "scopeMismatch"
          | "staleIntent"
          | "invalidChoice"
          | "expired"
          | "alreadyResponded"
          | "noLongerNeeded"
          | "factsStale"
          | "guestStateChanged";
      };
}

export interface EventRcsBudgetDocument {
  schemaVersion: 1;
  budgetId: string;
  revision: number;
  senderId: string;
  scope:
    | {
        kind: "event";
        context: {
          mode: "live";
          organizerId: string;
          eventId: string;
        };
      }
    | {
        kind: "senderDay";
        day: string;
      };
  status: "active" | "paused";
  approvalId: string;
  currency: string;
  limitMicros: number;
  chargedMicros: number;
  startsAt: number;
  endsAt: number;
  updatedAt: number;
  agentId: string;
}

export interface EventRcsDispatchDocument {
  schemaVersion: 1;
  attemptId: string;
  messageId: string;
  context: {
    mode: "live";
    organizerId: string;
    eventId: string;
  };
  senderId: string;
  agentId: string;
  region: "asia" | "europe" | "us";
  bindingRevision: number;
  configHash: string;
  permissionId: string;
  permissionRevision: number;
  permissionHash: string;
  recipientEndpointId: string;
  endpointHash: string;
  capability: {
    requestId: string;
    senderId: string;
    agentId: string;
    recipientEndpointId: string;
    configHash: string;
    permissionHash: string;
    checkedAt: number;
    validUntil: number;
    supportsOpenUrl: boolean;
  };
  grantId: string;
  guestGrantHash: string;
  payloadHash: string;
  authorityHash: string;
  providerMessageId: string;
  expiresAt: number;
  createdAt: number;
  quoteRevision: number;
  currency: string;
  maxCostMicros: number;
  /**
   * @minItems 2
   * @maxItems 2
   */
  budgetDebits: {
    budgetId: string;
    approvalId: string;
    revisionBefore: number;
    revisionAfter: number;
    chargedBeforeMicros: number;
    chargedAfterMicros: number;
  }[];
  attendeeId: string;
  intentHash: string;
  attemptScopeHash: string;
  replyBinding: null | {
    guestId: string;
    episodeId: string;
    guestRevision: number;
    attendeeGeneration: string;
    sourceGeneration: string;
    subjectUid: string;
    expiresAt: number;
    /**
     * @minItems 1
     * @maxItems 10
     */
    choices: {
      index: number;
      choiceId: string;
    }[];
    recipientBinding?:
      | {
          kind: "rosterPhone";
          subjectUid: string;
          sourceGeneration: string;
        }
      | {
          kind: "privateVerifiedPhone";
          subjectUid: string;
          sourceGeneration: string;
        };
  };
}

export interface EventRcsWithdrawalGrantDocument {
  schemaVersion: 1;
  linkId: string;
  permissionId: string;
  context: {
    mode: "live";
    organizerId: string;
    eventId: string;
  };
  attendeeId: string;
  attendeeGeneration: string;
  subjectUid: string;
  senderId: string;
  recipientEndpointId: string;
  guestGrantHash: string;
  permissionRevisionAtIssue: number;
  issuedAt: number;
  expiresAt: number;
  sourceGeneration: string;
  agentId: string;
}

export interface EventRcsSenderDocument {
  schemaVersion: 1;
  senderId: string;
  revision: number;
  provider: "googleRbm";
  senderIdentity: "catchPlatform";
  agentId: string;
  region: "asia" | "europe" | "us";
  status: "inactive" | "ready" | "paused";
  credentialVersion: string;
  /**
   * @minItems 1
   * @maxItems 20
   */
  recipientPrefixes: string[];
  activation: {
    approvalId: string;
    approvedAt: number;
    validUntil: number;
  };
  quote: {
    revision: number;
    currency: string;
    maxMicrosPerMessage: number;
    validUntil: number;
  };
  maxQueueSeconds: number;
  /**
   * @minItems 1
   * @maxItems 9
   */
  allowedPurposes: (
    | "joiningUpdate"
    | "joiningInstructions"
    | "planChanged"
    | "guestRequirement"
    | "assignmentChanged"
    | "participationCheck"
    | "eventCancelled"
    | "eventFinished"
    | "followUp"
  )[];
  displayName: string;
}

export interface EventRcsPermissionDocument {
  [k: string]: unknown;
}

export interface EventRcsConsentReceiptDocument {
  [k: string]: unknown;
}

/**
 * Authenticated RCS subscription observations scoped to a provider agent and recipient endpoint, across events. Stop observations restrict event-service messages; subscribe requests never grant event consent. No automatic retention deletion.
 */
export interface EventRcsSubscriptionDocument {
  schemaVersion: 1;
  subscriptionId: string;
  routeId: "catchEventRcs";
  agentId: string;
  endpointHash: string;
  revision: number;
  lastStop: null | {
    callbackId: string;
    observedAt: number;
  };
  lastSubscribeRequest: null | {
    callbackId: string;
    observedAt: number;
  };
  updatedAt: number;
}

export interface EventAssistanceRcsCallbackDocument {
  schemaVersion: 1;
  callbackId: string;
  evidence: {
    agentId: string;
    endpointHash: string;
    providerEventId: string;
    eventFamily: "message" | "userEvent" | "serverEvent";
    providerOccurredAt: string | null;
    receivedAt: number;
    receiptKey: string;
    payloadHash: string;
    observation:
      | {
          kind: "delivery";
          providerMessageId: string;
          status: "delivered" | "read";
        }
      | {
          kind: "expiration";
          providerMessageId: string;
          revocation: "confirmed" | "unconfirmed";
        }
      | {
          kind: "suggestion";
          source: "message" | "event";
          suggestionType: "reply" | "action" | "unspecified";
          correlation:
            | {
                kind: "choice";
                attemptId: string;
                choiceIndex: number;
              }
            | {
                kind: "guestPage";
                attemptId: string;
              }
            | {
                kind: "unrecognized";
              };
        }
      | {
          kind: "subscription";
          requested: "subscribe" | "unsubscribe";
          source: "event" | "keyword";
        }
      | {
          kind: "unstructuredMessage";
          content: "text" | "location" | "file";
        };
  };
  storedAt: number;
}

export interface EventAssistanceRcsCallbackIdentityDocument {
  schemaVersion: 1;
  receiptKey: string;
  primaryCallbackId: string;
  firstStoredAt: number;
  conflictedAt: number | null;
}

export interface EventAssistanceDeliveryRepairDocument {
  receiptId: string;
  context: {
    mode: "live";
    eventId: string;
    organizerId: string;
  };
  messageId: string;
  intentHash: string;
  requestHash: string;
  actorUid: string;
  operationId: string;
  messageRevision: number;
  createdAt: number;
}

export interface EventAssistanceCaseReceiptDocument {
  receiptId: string;
  context: {
    mode: "live";
    eventId: string;
    organizerId: string;
  };
  caseId: string;
  caseBindingHash: string;
  requestHash: string;
  revision: number;
  actorUid: string;
  outcome: "resolved" | "declined" | "transferred";
  createdAt: number;
}

export interface EventAssistanceCheckpointDocument {
  schemaVersion: 1;
  reportId: string;
  context: {
    mode: "live";
    eventId: string;
    organizerId: string;
  };
  groupId: string;
  checkpointId: string;
  progressRevision: number;
  rosterId: string;
  rosterHash: string;
  revision: number;
  /**
   * @maxItems 1000
   */
  accountedFor: string[];
  reportedBy: string;
  reportedAt: number;
  correctionReason: string | null;
  createdAt: number;
}

export interface EventAssistanceCheckpointReceiptDocument {
  [k: string]: unknown;
}

export interface EventAssistanceAccountabilityReceiptDocument {
  receiptId: string;
  guestId: string;
  requestHash: string;
  sourceGeneration: string;
  attendeeGeneration: string;
  checkInHash: string;
  episodeId: string | null;
  revision: number;
  disposition: "returned" | "departed" | "unresolved";
  createdAt: number;
  checkpoint?: {
    checkpointId: string;
    progressRevision: number;
    rosterId: string;
    rosterHash: string;
  };
}

export interface EventAssistanceRuntimeConfigDocument {
  [k: string]: unknown;
}

export interface EventAssistanceRuntimeConfigReceiptDocument {
  receiptId: string;
  runtimeId: string;
  requestHash: string;
  sourceGeneration: string;
  revision: number;
  createdAt: number;
}

export interface EventAssistanceMembershipDocument {
  schemaVersion: 1;
  membershipId: string;
  context: {
    mode: "live";
    eventId: string;
    organizerId: string;
  };
  attendeeId: string;
  sourceGeneration: string;
  attendeeGeneration: string;
  episodeId: string;
  revision: number;
  accepted: {
    groupId: string;
    groupSourceHash: string;
    responsibleOperatorId: string;
    acceptedAt: number;
  } | null;
  transfer:
    | (
        | {
            transferId: string;
            from: string | null;
            to: string;
            targetSourceHash: string;
            receivingOperatorId: string;
            requestedBy: string;
            requestedAt: number;
            expiresAt: number;
            status: "pending";
            resolvedAt: null;
            resolvedBy: null;
          }
        | {
            transferId: string;
            from: string | null;
            to: string;
            targetSourceHash: string;
            receivingOperatorId: string;
            requestedBy: string;
            requestedAt: number;
            expiresAt: number;
            status: "accepted" | "rejected" | "cancelled";
            resolvedAt: number;
            resolvedBy: string;
          }
      )
    | null;
  createdAt: number;
  updatedAt: number;
}

export interface EventAssistanceMembershipReceiptDocument {
  receiptId: string;
  membershipId: string;
  sourceGeneration: string;
  episodeId: string;
  actorUid: string;
  requestHash: string;
  command: {
    kind: "transferGroup";
    context:
      | {
          mode: "live";
          eventId: string;
          organizerId: string;
        }
      | {
          mode: "rehearsal";
          rehearsalId: string;
          virtualEventId: string;
          clockId: string;
        };
    eventId: string;
    operationId: string;
    payload: {
      attendeeId: string;
      episodeId: string;
      expectedParticipationRevision: number;
      expectedMembershipRevision: number;
      decision:
        | {
            kind: "place";
            groupId: string;
          }
        | {
            kind: "propose";
            from: string | null;
            to: string;
            receivingOperatorId: string;
            expiresAtMillis: number;
          }
        | {
            kind: "accept";
            transferId: string;
          }
        | {
            kind: "reject";
            transferId: string;
          }
        | {
            kind: "cancel";
            transferId: string;
          }
        | {
            kind: "leave";
          };
    };
  };
  revision: number;
  createdAt: number;
}

export interface EventAssistanceStaffReceiptDocument {
  receiptId: string;
  staffGrantId: string;
  sourceHash: string;
  requestHash: string;
  revision: number;
  createdAt: number;
}

export interface EventAttendanceDispositionDocument {
  dispositionId: string;
  context: {
    mode: "live";
    eventId: string;
    organizerId: string;
  };
  attendeeId: string;
  revision: number;
  binding: {
    sourceGeneration: string;
    attendeeGeneration: string;
    identityHash: string;
    attendanceHash: string;
    closureHash: string;
  };
  decision:
    | {
        kind: "record";
        evidence:
          | {
              kind: "hostConfirmed";
            }
          | {
              kind: "guestDeclined";
              guestRevision: number;
              episodeId: string;
            };
      }
    | {
        kind: "clear";
        reason:
          | "recordingMistake"
          | "attendanceCorrected"
          | "noLongerApplicable";
      };
  actorUid: string;
  recordedAt: number;
}

export interface EventAttendanceDispositionReceiptDocument {
  receiptId: string;
  dispositionId: string;
  context: {
    mode: "live";
    eventId: string;
    organizerId: string;
  };
  attendeeId: string;
  operationId: string;
  actorUid: string;
  requestHash: string;
  sourceIdentityHash: string;
  revision: number;
  decision:
    | {
        kind: "record";
        evidence:
          | {
              kind: "hostConfirmed";
            }
          | {
              kind: "guestDeclined";
              guestRevision: number;
              episodeId: string;
            };
      }
    | {
        kind: "clear";
        reason:
          | "recordingMistake"
          | "attendanceCorrected"
          | "noLongerApplicable";
      };
  createdAt: number;
}

export interface EventAssistanceParticipationReceiptDocument {
  receiptId: string;
  guestId: string;
  requestHash: string;
  sourceGeneration: string;
  revision: number;
  episodeId: string;
  createdAt: number;
}

export interface EventAssistanceSettingDocument {
  schemaVersion: 1;
  settingId: string;
  context: {
    mode: "live";
    eventId: string;
    organizerId: string;
  };
  groupId: string;
  workflowKind:
    | "venueReadiness"
    | "routeReadiness"
    | "formatReadiness"
    | "rosterReadiness"
    | "requiredGuestData"
    | "resourceReadiness"
    | "staffingReadiness"
    | "messagingReadiness"
    | "admissionReview"
    | "financialReadiness"
    | "joiningInstructions"
    | "identityResolution"
    | "guestAdmission"
    | "guestCheckIn"
    | "lateJoin"
    | "participationChange"
    | "guestPrerequisite"
    | "allocationRepair"
    | "placementConfirmation"
    | "resourceRecovery"
    | "fairParticipation"
    | "roundPublication"
    | "unitProgress"
    | "outcomeRecording"
    | "programmeRecovery"
    | "departure"
    | "checkpoint"
    | "groupTransfer"
    | "routeRecovery"
    | "locationFreshness"
    | "accountability"
    | "planChangeCommunication"
    | "deliveryRecovery"
    | "replyOwnership"
    | "guestAssistance"
    | "comfortSafety"
    | "attendanceSync"
    | "concurrencyRecovery"
    | "operationRecovery"
    | "contextBoundary"
    | "overrideReview"
    | "eventClosure"
    | "attendanceReconciliation"
    | "financialReconciliation"
    | "postEventFollowUp"
    | "eventLearning";
  revision: number;
  preference:
    | {
        kind: "inherit";
      }
    | {
        kind: "disabled";
      }
    | {
        kind: "configured";
        template:
          | {
              kind: "venueReadiness";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                requirement: "meetingPlace";
                dueBeforeStartMinutes: number;
                disposition:
                  | "blockSelectedOperation"
                  | "hostMayAcceptException";
              };
            }
          | {
              kind: "routeReadiness";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                requirement: "route";
                dueBeforeStartMinutes: number;
                disposition:
                  | "blockSelectedOperation"
                  | "hostMayAcceptException";
              };
            }
          | {
              kind: "formatReadiness";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                requirement: "format";
                dueBeforeStartMinutes: number;
                disposition:
                  | "blockSelectedOperation"
                  | "hostMayAcceptException";
              };
            }
          | {
              kind: "rosterReadiness";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                requirement: "roster";
                dueBeforeStartMinutes: number;
                disposition:
                  | "blockSelectedOperation"
                  | "hostMayAcceptException";
              };
            }
          | {
              kind: "requiredGuestData";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                requirement: "guestData";
                dueBeforeStartMinutes: number;
                disposition:
                  | "blockSelectedOperation"
                  | "hostMayAcceptException";
              };
            }
          | {
              kind: "resourceReadiness";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                requirement: "resources";
                dueBeforeStartMinutes: number;
                disposition:
                  | "blockSelectedOperation"
                  | "hostMayAcceptException";
              };
            }
          | {
              kind: "staffingReadiness";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                requirement: "responsibilities";
                dueBeforeStartMinutes: number;
                disposition:
                  | "blockSelectedOperation"
                  | "hostMayAcceptException";
              };
            }
          | {
              kind: "messagingReadiness";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                requirement: "messaging";
                dueBeforeStartMinutes: number;
                disposition:
                  | "blockSelectedOperation"
                  | "hostMayAcceptException";
              };
            }
          | {
              kind: "admissionReview";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                offerExpiryMinutes: number;
                admission: "existingEntitlementPolicy";
                releaseCapacity: "confirmedOnly";
              };
            }
          | {
              kind: "financialReadiness";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                requirement: "paymentProvider";
                dueBeforeStartMinutes: number;
                disposition:
                  | "blockSelectedOperation"
                  | "hostMayAcceptException";
              };
            }
          | {
              kind: "joiningInstructions";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                templateIntent: "joining";
                audience: "affectedGuests";
                maximumPerGuest: number;
                expiryMinutes: number;
              };
            }
          | {
              kind: "identityResolution";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                ambiguousIdentity: "humanResolution";
                fallback: "hostAssistedOperationalOnly";
              };
            }
          | {
              kind: "guestAdmission";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                admission: "existingEntitlementPolicy";
                overCapacity: "deny";
                exception: "authorizedHost";
              };
            }
          | {
              kind: "guestCheckIn";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                operation: "absolute";
                conflict: "revisionFence";
                attendanceProof: "configuredEventPolicy";
              };
            }
          | {
              kind: "lateJoin";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                destination:
                  | {
                      kind: "confirmedGroupProgress";
                    }
                  | (
                      | {
                          kind: "fixedPlace";
                          placeId: string;
                          lateEntry: "allowed" | "hostDecision" | "closed";
                        }
                      | {
                          kind: "itineraryStop";
                          itineraryId: string;
                          /**
                           * @minItems 1
                           * @maxItems 1000
                           */
                          permittedStopIds: string[];
                        }
                      | {
                          kind: "groupCheckpoint";
                          routeId: string;
                          groupId: string;
                          /**
                           * @minItems 1
                           * @maxItems 1000
                           */
                          permittedCheckpointIds: string[];
                        }
                    );
                cutoff:
                  | {
                      kind: "eventEnd";
                    }
                  | {
                      kind: "time";
                      /**
                       * UTC milliseconds.
                       */
                      at: number;
                    };
                maxMessagesPerEpisode: number;
                minimumMinutesBetweenMessages: number;
                updateOn: "materialGuidanceChange";
                unanswered: "keepUnknownUntilCutoff" | "hostReviewAtDeadline";
              };
            }
          | {
              kind: "participationChange";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                eligibility: "explicitParticipation";
                reentry: "newEpisode";
                guestOptOut: "honor";
              };
            }
          | {
              kind: "guestPrerequisite";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                requirementsFrom: "selectedCapabilities";
                fallback: "explicitlySupportedOnly";
              };
            }
          | {
              kind: "allocationRepair";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                scope: "futureOnly";
                publication: "hostConfirmed";
                preserveCompleted: true;
                hardConstraints: "neverRelax";
              };
            }
          | {
              kind: "placementConfirmation";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                observation: "explicitHost";
                assignmentIsNotObservation: true;
              };
            }
          | {
              kind: "resourceRecovery";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                scope: "futureOnly";
                publication: "hostConfirmed";
                preserveCompleted: true;
                hardConstraints: "neverRelax";
                resourceChange: "hostConfirmed";
              };
            }
          | {
              kind: "fairParticipation";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                objective: "minimizeRepeatedExclusion";
                hardConstraints: "neverRelax";
                publication: "hostConfirmed";
              };
            }
          | {
              kind: "roundPublication";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                futureDrafts: "private";
                publication: "hostConfirmed";
                publishedHistory: "immutableWithCorrections";
              };
            }
          | {
              kind: "unitProgress";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                clock: "perUnit";
                progress: "hostConfirmed";
                completedResults: "preserve";
              };
            }
          | {
              kind: "outcomeRecording";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                kind: "completion" | "score" | "rank";
                correction: "revisionedFullRound";
                publication: "existingRevealGate";
              };
            }
          | {
              kind: "programmeRecovery";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                scope: "remainingProgramme";
                publication: "hostConfirmed";
                alreadyPublished: "correctExplicitly";
              };
            }
          | {
              kind: "departure";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                confirmation: "responsibleOperator";
                scope: "perMovingGroup";
                plannedTimeIsNotProof: true;
              };
            }
          | {
              kind: "checkpoint";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                reportBy: "responsibleOperator";
                scope: "departureRoster";
                reportDeadlineMinutes: number;
              };
            }
          | {
              kind: "groupTransfer";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                handover: "receivingOperatorAcknowledges";
                membership: "singleActiveGroup";
              };
            }
          | {
              kind: "routeRecovery";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                scope: "remainingProgramme";
                publication: "hostConfirmed";
                alreadyPublished: "correctExplicitly";
                alternative: "hostApproved";
              };
            }
          | {
              kind: "locationFreshness";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                staleAfterSeconds: number;
                fallback: "confirmedJoiningPoint";
                tracking: "authorizedOperatorOnly";
              };
            }
          | {
              kind: "accountability";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                mode: "rollCall" | "sweep";
                evidence: "explicitDisposition";
                unknownIsNotIncident: true;
              };
            }
          | {
              kind: "planChangeCommunication";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                templateIntent: "planChange";
                audience: "affectedGuests";
                maximumPerGuest: number;
                expiryMinutes: number;
                delivery: {
                  /**
                   * @minItems 1
                   * @maxItems 3
                   */
                  routes: (
                    | {
                        routeId: "catchEventSms";
                        senderId: string;
                      }
                    | {
                        routeId: "organizerEventWhatsapp";
                        senderId: string;
                      }
                    | {
                        routeId: "catchEventRcs";
                        senderId: string;
                      }
                  )[];
                  policy: {
                    maxAttempts: number;
                    maxAttemptsPerRoute: number;
                    minimumRetrySeconds: number;
                  };
                };
              };
            }
          | {
              kind: "deliveryRecovery";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                maximumAttempts: number;
                onUnknown: "reconcileBeforeRetry";
                expiresAfterMinutes: number;
              };
            }
          | {
              kind: "replyOwnership";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                owner:
                  | "eventLead"
                  | "groupLead"
                  | "sweep"
                  | "checkIn"
                  | "specialist";
                visibility: "operational" | "restricted";
                dueMinutes: number;
              };
            }
          | {
              kind: "guestAssistance";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                owner:
                  | "eventLead"
                  | "groupLead"
                  | "sweep"
                  | "checkIn"
                  | "specialist";
                visibility: "operational" | "restricted";
                dueMinutes: number;
              };
            }
          | {
              kind: "comfortSafety";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                owner:
                  | "eventLead"
                  | "groupLead"
                  | "sweep"
                  | "checkIn"
                  | "specialist";
                visibility: "restricted";
                dueMinutes: number;
              };
            }
          | {
              kind: "attendanceSync";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                maximumAttempts: number;
                onUnknown: "reconcileBeforeRetry";
                expiresAfterMinutes: number;
              };
            }
          | {
              kind: "concurrencyRecovery";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                staleWrite: "reject";
                retry: "revalidateIntent";
              };
            }
          | {
              kind: "operationRecovery";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                maximumAttempts: number;
                onUnknown: "reconcileBeforeRetry";
                expiresAfterMinutes: number;
              };
            }
          | {
              kind: "contextBoundary";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                context: "eventAndModeBound";
                crossContext: "deny";
              };
            }
          | {
              kind: "overrideReview";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                hardLimits: "neverOverride";
                permittedOverride: "scopedReasonedExpiring";
              };
            }
          | {
              kind: "eventClosure";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                pendingLiveWork: "cancel";
                survivingObligations: "handoff";
                unresolvedAccountability: "explicitPolicy";
              };
            }
          | {
              kind: "attendanceReconciliation";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                silence: "notEvidence";
                corrections: "revisioned";
                pendingSync: "retain";
              };
            }
          | {
              kind: "financialReconciliation";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                owner: "paymentProviderWorkflow";
                moneyMovement: "separatelyAuthorized";
              };
            }
          | {
              kind: "postEventFollowUp";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                templateIntent: "followUp";
                audience: "affectedGuests";
                maximumPerGuest: number;
                expiryMinutes: number;
                delivery: {
                  /**
                   * @minItems 1
                   * @maxItems 3
                   */
                  routes: (
                    | {
                        routeId: "catchEventSms";
                        senderId: string;
                      }
                    | {
                        routeId: "organizerEventWhatsapp";
                        senderId: string;
                      }
                    | {
                        routeId: "catchEventRcs";
                        senderId: string;
                      }
                  )[];
                  policy: {
                    maxAttempts: number;
                    maxAttemptsPerRoute: number;
                    minimumRetrySeconds: number;
                  };
                };
              };
            }
          | {
              kind: "eventLearning";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                metrics: "observedOutcomes";
                missingCoverage: "explicit";
                sensitiveDetails: "excluded";
              };
            };
      };
  sourceHash: string;
  updatedBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface EventAssistanceSettingReceiptDocument {
  receiptId: string;
  settingId: string;
  requestHash: string;
  revision: number;
  createdAt: number;
}

export interface EventAssistanceDepartureRosterDocument {
  schemaVersion: 1;
  rosterId: string;
  context: {
    mode: "live";
    eventId: string;
    organizerId: string;
  };
  groupId: string;
  progressId: string;
  progressRevision: number;
  sourceHash: string;
  confirmedBy: string;
  confirmedAt: number;
  /**
   * @maxItems 1000
   */
  members: {
    attendeeId: string;
    sourceGeneration: string;
    attendeeGeneration: string;
    checkInHash: string;
    episodeId: string | null;
    membershipHash: string | null;
  }[];
  destination?:
    | {
        kind: "fixedPlace";
        placeId: string;
        lateEntry: "allowed" | "hostDecision" | "closed";
      }
    | {
        kind: "itineraryStop";
        itineraryId: string;
        stopId: string;
      }
    | {
        kind: "groupCheckpoint";
        routeId: string;
        groupId: string;
        checkpointId: string;
      };
  checkpointRequest?: {
    responsibleOperatorId: string;
    dueAt: number;
  };
}

export interface EventAssistanceProgressReceiptDocument {
  receiptId: string;
  progressId: string;
  requestHash: string;
  revision: number;
  createdAt: number;
  commandKind?: "confirmDeparture" | "changeRoute";
  decisionId?: string;
}

export interface EventAssistanceGroupProgressDocument {
  schemaVersion: 1;
  progressId: string;
  context: {
    mode: "live";
    eventId: string;
    organizerId: string;
  };
  groupId: string;
  revision: number;
  destination:
    | {
        kind: "fixedPlace";
        placeId: string;
        lateEntry: "allowed" | "hostDecision" | "closed";
      }
    | {
        kind: "itineraryStop";
        itineraryId: string;
        stopId: string;
      }
    | {
        kind: "groupCheckpoint";
        routeId: string;
        groupId: string;
        checkpointId: string;
      };
  sourceHash: string;
  confirmedBy: string;
  confirmedAt: number;
  operationId: string;
  requestHash: string;
  createdAt: number;
  updatedAt: number;
  departureRosterId?: string;
  routeDecisionId?: string;
}

export interface EventWhatsappWithdrawalGrantDocument {
  schemaVersion: 1;
  linkId: string;
  permissionId: string;
  context: {
    mode: "live";
    organizerId: string;
    eventId: string;
  };
  attendeeId: string;
  attendeeGeneration: string;
  subjectUid: string;
  senderId: string;
  recipientEndpointId: string;
  guestGrantHash: string;
  permissionRevisionAtIssue: number;
  issuedAt: number;
  expiresAt: number;
  providerAccountId: string;
  providerPhoneNumberId: string;
}

/**
 * Reviewed event and UTC sender-day spending ceilings. Conservative debits are reserved costs, not provider billing receipts.
 */
export interface EventWhatsappBudgetDocument {
  schemaVersion: 1;
  budgetId: string;
  revision: number;
  senderId: string;
  scope:
    | {
        kind: "event";
        context: {
          mode: "live";
          organizerId: string;
          eventId: string;
        };
      }
    | {
        kind: "senderDay";
        day: string;
      };
  status: "active" | "paused";
  approvalId: string;
  currency: string;
  limitMicros: number;
  chargedMicros: number;
  startsAt: number;
  endsAt: number;
  updatedAt: number;
}

/**
 * Immutable debit and material identity committed with one outbox dispatch claim. No credentials, body, guest secret or recipient phone.
 */
export interface EventWhatsappDispatchDocument {
  schemaVersion: 1;
  attemptId: string;
  messageId: string;
  context: {
    mode: "live";
    organizerId: string;
    eventId: string;
  };
  senderId: string;
  bindingRevision: number;
  providerAccountId: string;
  providerPhoneNumberId: string;
  senderHash: string;
  policyHash: string;
  policyRevision: number;
  permissionId: string;
  permissionRevision: number;
  permissionHash: string;
  recipientEndpointId: string;
  endpointHash: string;
  templateDocumentId: string;
  templateHash: string;
  payloadHash: string;
  quoteRevision: number;
  grantId: string;
  currency: string;
  maxCostMicros: number;
  /**
   * @minItems 2
   * @maxItems 2
   */
  budgetIds: string[];
  replyBindingId: null | string;
  stopRecordHash: null | string;
  createdAt: number;
}

/**
 * Latest authenticated text STOP for an organizer and WhatsApp endpoint, independent of CRM contact resolution. No TTL until suppression and consent retention are reconciled.
 */
export interface OrganizerWhatsappEndpointStopDocument {
  schemaVersion: 1;
  stopId: string;
  organizerId: string;
  endpointHash: string;
  connectionId: string;
  providerAccountId: string;
  providerPhoneNumberId: string;
  providerEventId: string;
  payloadHash: string;
  stoppedAt: number;
  observedAt: number;
  revision: number;
}

export interface EventWhatsappPermissionDocument {
  [k: string]: unknown;
}

export interface EventWhatsappConsentReceiptDocument {
  [k: string]: unknown;
}

/**
 * Reviewed event-service template and spend policy for one existing organizer-owned WhatsApp sender. This policy alone grants no guest consent or send authority.
 */
export interface EventWhatsappPolicyDocument {
  schemaVersion: 1;
  senderId: string;
  organizerId: string;
  revision: number;
  maxTemplateAgeSeconds: number;
  status: "inactive" | "ready" | "paused";
  providerAccountId: string;
  providerPhoneNumberId: string;
  activation: {
    approvalId: string;
    approvedAt: number;
    validUntil: number;
  };
  quote: {
    revision: number;
    currency: string;
    /**
     * @minItems 1
     * @maxItems 250
     */
    recipientPrefixes: string[];
    maxMicrosPerMessage: number;
    validUntil: number;
  };
  /**
   * @minItems 1
   * @maxItems 32
   */
  templates: {
    templateDocumentId: string;
    purpose:
      | "joiningUpdate"
      | "joiningInstructions"
      | "planChanged"
      | "guestRequirement"
      | "assignmentChanged"
      | "participationCheck"
      | "eventCancelled"
      | "eventFinished"
      | "followUp";
    templateHash: string;
    /**
     * @minItems 1
     * @maxItems 20
     */
    variables: {
      providerName: string;
      source:
        | "eventTitle"
        | "instruction"
        | "responseUrl"
        | "responseUrlSuffix";
      maxCharacters: number;
    }[];
    /**
     * @maxItems 10
     */
    quickReplies: {
      buttonIndex: number;
      choiceId: string;
      label: string;
      action:
        | "onMyWay"
        | "notComing"
        | "joinLater"
        | "helpLogistics"
        | "helpAccessibility"
        | "helpSafety"
        | "helpOther"
        | "acknowledge";
    }[];
  }[];
}

/**
 * Private immutable choice mapping committed with one live outbox dispatch claim. Native IDs provide correlation, never bearer authentication. A signed queued reply must match the original sender, recipient and confirmed provider message before the shared guest-action transaction can apply its stored choice.
 */
export interface EventWhatsappReplyBindingDocument {
  schemaVersion: 1;
  attemptId: string;
  messageId: string;
  context: {
    mode: "live";
    eventId: string;
    organizerId: string;
  };
  guestId: string;
  attendeeId: string;
  episodeId: string;
  attendeeGeneration: string;
  guestRevision: number;
  attemptScopeHash: string;
  senderId: string;
  bindingRevision: number;
  providerAccountId: string;
  providerPhoneNumberId: string;
  recipientEndpointId: string;
  endpointHash: string;
  replyKind: "templateQuickReply" | "replyButton" | "listReply";
  /**
   * @minItems 1
   * @maxItems 20
   */
  choices: {
    nativeId: string;
    choiceId: string;
  }[];
  createdAt: number;
  expiresAt: number;
  intentHash: string;
  recipientBinding?:
    | {
        kind: "rosterPhone";
        subjectUid: string;
        sourceGeneration: string;
      }
    | {
        kind: "privateVerifiedPhone";
        subjectUid: string;
        sourceGeneration: string;
      };
}

export interface EventAssistanceSmsWithdrawalGrantDocument {
  schemaVersion: 1;
  linkId: string;
  permissionId: string;
  context: {
    mode: "live";
    organizerId: string;
    eventId: string;
  };
  attendeeId: string;
  attendeeGeneration: string;
  subjectUid: string;
  senderId: string;
  recipientEndpointId: string;
  guestGrantHash: string;
  permissionRevisionAtIssue: number;
  issuedAt: number;
  expiresAt: number;
}

export interface EventAssistanceSmsConsentReceiptDocument {
  [k: string]: unknown;
}

export interface EventAssistanceSmsSenderDocument {
  schemaVersion: 1;
  senderId: string;
  revision: number;
  provider: "gupshup";
  senderIdentity: "catchPlatform";
  country: "IN";
  status: "inactive" | "ready" | "paused";
  mask: string;
  principalEntityId: string;
  credentialVersion: string;
  activation: {
    useCaseApprovalId: string;
    senderApprovalId: string;
    approvedAt: number;
    validUntil: number;
  };
  maxSegments: number;
  quote: {
    revision: number;
    currency: "INR";
    maxMicrosPerSegment: number;
    validUntil: number;
  };
  /**
   * @minItems 1
   * @maxItems 32
   */
  templates: {
    templateId: string;
    revision: number;
    purpose:
      | "joiningUpdate"
      | "joiningInstructions"
      | "planChanged"
      | "guestRequirement"
      | "assignmentChanged"
      | "participationCheck"
      | "eventCancelled"
      | "eventFinished"
      | "followUp";
    dltTemplateId: string;
    status: "pending" | "approved" | "paused";
    /**
     * @minItems 1
     * @maxItems 16
     */
    parts: (
      | {
          kind: "literal";
          text: string;
        }
      | {
          kind: "variable";
          name: "eventTitle" | "instruction" | "responseUrl";
          maxCharacters: number;
        }
    )[];
  }[];
}

export interface EventAssistanceSmsPermissionDocument {
  [k: string]: unknown;
}

export interface EventAssistanceSmsBudgetDocument {
  schemaVersion: 1;
  budgetId: string;
  revision: number;
  senderId: string;
  scope:
    | {
        kind: "event";
        context: {
          mode: "live";
          organizerId: string;
          eventId: string;
        };
      }
    | {
        kind: "senderDay";
        day: string;
      };
  status: "active" | "paused";
  approvalId: string;
  currency: "INR";
  limitMicros: number;
  chargedMicros: number;
  startsAt: number;
  endsAt: number;
  updatedAt: number;
}

export interface EventAssistanceSmsDispatchDocument {
  schemaVersion: 1;
  attemptId: string;
  messageId: string;
  senderId: string;
  bindingRevision: number;
  configHash: string;
  permissionId: string;
  permissionRevision: number;
  recipientEndpointId: string;
  payloadHash: string;
  templateId: string;
  templateRevision: number;
  quoteRevision: number;
  grantId: string;
  encoding: "gsm7" | "unicode";
  segments: number;
  maxCostMicros: number;
  /**
   * @minItems 2
   * @maxItems 2
   */
  budgetIds: string[];
  createdAt: number;
  reportTokenHash: string;
  senderMask: string;
}

/**
 * Latest finance review decision for one event, route, sender, and purpose. This record grants no spending authority and is not a dispatch budget.
 */
export interface EventMessagingBudgetDecisionDocument {
  schemaVersion: 1;
  decisionId: string;
  revision: number;
  requestId: string;
  requestHash: string;
  context: {
    mode: "live";
    eventId: string;
    organizerId: string;
  };
  routeId: "catchEventSms" | "catchEventRcs" | "organizerEventWhatsapp";
  senderId: string;
  purpose:
    | "joiningUpdate"
    | "joiningInstructions"
    | "planChanged"
    | "eventCancelled"
    | "eventFinished"
    | "guestRequirement"
    | "assignmentChanged"
    | "participationCheck"
    | "followUp";
  decision:
    | {
        kind: "approve";
        currency: string;
        eventLimitMicros: number;
        senderDayLimitMicros: number;
        validUntil: number;
      }
    | {
        kind: "hold";
      }
    | {
        kind: "reject";
      };
  decisionStatus: "approved" | "held" | "rejected";
  reviewEvidence: {
    observedAt: number;
    completedAt: number;
    eventEnd: number;
    runtimeSourceHash: string;
    senderReviewHash: string;
    budgetSourceHash: string;
    setupReviewHash: string;
    eventBudget: {
      budgetId: string;
      revision: number | null;
      reviewHash: string | null;
      chargedMicros: number;
    };
    senderDayBudget: {
      budgetId: string;
      revision: number | null;
      reviewHash: string | null;
      chargedMicros: number;
    };
  };
  reviewedByUid: string;
  note: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  effect: "decision_only_no_spending_authority";
  grantsSpendingAuthority: false;
}

/**
 * Immutable request receipt for an event-messaging budget decision. It preserves exact replay without granting spending authority.
 */
export interface EventMessagingBudgetDecisionReceiptDocument {
  schemaVersion: 1;
  receiptId: string;
  decisionId: string;
  requestId: string;
  requestHash: string;
  revision: number;
  decisionStatus: "approved" | "held" | "rejected";
  decisionPath: string;
  effect: "decision_only_no_spending_authority";
  grantsSpendingAuthority: false;
  createdAt: FirebaseFirestore.Timestamp;
}

/**
 * Immutable evidence that one still-current approved decision staged both channel spending ceilings in paused state. The receipt and budgets grant no spending or dispatch authority until a separate live activation boundary succeeds.
 */
export interface EventMessagingBudgetApplicationReceiptDocument {
  schemaVersion: 1;
  receiptId: string;
  requestId: string;
  requestHash: string;
  decisionId: string;
  decisionRevision: number;
  decisionReviewHash: string;
  context: {
    mode: "live";
    eventId: string;
    organizerId: string;
  };
  routeId: "catchEventSms" | "catchEventRcs" | "organizerEventWhatsapp";
  senderId: string;
  purpose:
    | "joiningUpdate"
    | "joiningInstructions"
    | "planChanged"
    | "eventCancelled"
    | "eventFinished"
    | "guestRequirement"
    | "assignmentChanged"
    | "participationCheck"
    | "followUp";
  budgetSourceHash: string;
  eventBudget: {
    budgetId: string;
    path: string;
    revision: number;
    currency: string;
    limitMicros: number;
    chargedMicros: number;
    startsAt: number;
    endsAt: number;
    reviewHash: string;
    status: "paused";
  };
  senderDayBudget: {
    budgetId: string;
    path: string;
    revision: number;
    currency: string;
    limitMicros: number;
    chargedMicros: number;
    startsAt: number;
    endsAt: number;
    reviewHash: string;
    status: "paused";
  };
  appliedByUid: string;
  note: string;
  effect: "budgets_staged_paused_no_spending_or_dispatch_authority";
  stagesSpendingCeilings: true;
  grantsSpendingAuthority: false;
  grantsDispatchAuthority: false;
  providerContacted: false;
  workerActivated: false;
  createdAt: FirebaseFirestore.Timestamp;
}

export interface EventAssistanceGuestDocument {
  schemaVersion: 1;
  guestId: string;
  context: {
    mode: "live";
    eventId: string;
    organizerId: string;
  };
  attendeeId: string;
  attendeeGeneration: string;
  episodeId: string;
  revision: number;
  lifecycle: "active" | "closed";
  intention:
    | {
        kind: "unknown";
      }
    | {
        kind: "onMyWay";
        claimedEta: number | null;
      }
    | {
        kind: "joinLater";
        target:
          | {
              kind: "fixedPlace";
              placeId: string;
              lateEntry: "allowed" | "hostDecision" | "closed";
            }
          | {
              kind: "itineraryStop";
              itineraryId: string;
              stopId: string;
            }
          | {
              kind: "groupCheckpoint";
              routeId: string;
              groupId: string;
              checkpointId: string;
            };
      }
    | {
        kind: "notComing";
      };
  createdAt: number;
  updatedAt: number;
  sourceGeneration: string;
  participation:
    | {
        state: "active";
        resumeAtUnit: null;
      }
    | {
        state: "temporaryBreak";
        resumeAtUnit: string | null;
      }
    | {
        state: "departed";
        resumeAtUnit: null;
      };
}

export interface EventAssistanceThreadDocument {
  schemaVersion: 1;
  threadId: string;
  guestId: string;
  context: {
    mode: "live";
    eventId: string;
    organizerId: string;
  };
  attendeeId: string;
  episodeId: string;
  workflow: {
    kind:
      | "venueReadiness"
      | "routeReadiness"
      | "formatReadiness"
      | "rosterReadiness"
      | "requiredGuestData"
      | "resourceReadiness"
      | "staffingReadiness"
      | "messagingReadiness"
      | "admissionReview"
      | "financialReadiness"
      | "joiningInstructions"
      | "identityResolution"
      | "guestAdmission"
      | "guestCheckIn"
      | "lateJoin"
      | "participationChange"
      | "guestPrerequisite"
      | "allocationRepair"
      | "placementConfirmation"
      | "resourceRecovery"
      | "fairParticipation"
      | "roundPublication"
      | "unitProgress"
      | "outcomeRecording"
      | "programmeRecovery"
      | "departure"
      | "checkpoint"
      | "groupTransfer"
      | "routeRecovery"
      | "locationFreshness"
      | "accountability"
      | "planChangeCommunication"
      | "deliveryRecovery"
      | "replyOwnership"
      | "guestAssistance"
      | "comfortSafety"
      | "attendanceSync"
      | "concurrencyRecovery"
      | "operationRecovery"
      | "contextBoundary"
      | "overrideReview"
      | "eventClosure"
      | "attendanceReconciliation"
      | "financialReconciliation"
      | "postEventFollowUp"
      | "eventLearning";
    occurrenceId: string;
  };
  messageId: string;
  revision: number;
  createdAt: number;
  updatedAt: number;
}

export interface EventAssistanceGuestGrantDocument {
  schemaVersion: 1;
  linkId: string;
  threadId: string;
  guestId: string;
  context: {
    mode: "live";
    eventId: string;
    organizerId: string;
  };
  attendeeId: string;
  episodeId: string;
  tokenHash: string;
  signingKeyId: string;
  issuedAt: number;
  expiresAt: number;
  revokedAt: number | null;
}

export interface EventAssistanceCaseDocument {
  [k: string]: unknown;
}

/**
 * Private durable event-service outbox. The immutable intent and bounded attempt history survive workflow completion and delayed callbacks. Recipient endpoints are references; transport credentials and guest bearer grants belong to their own private stores.
 */
export interface EventAssistanceMessageDocument {
  schemaVersion: 1;
  messageId: string;
  revision: number;
  intent:
    | {
        schemaVersion: 1;
        intentId: string;
        revision: number;
        context:
          | {
              mode: "live";
              eventId: string;
              organizerId: string;
            }
          | {
              mode: "rehearsal";
              rehearsalId: string;
              virtualEventId: string;
              clockId: string;
            };
        eventId: string;
        attendeeId: string;
        episodeId: string;
        workflow: {
          kind:
            | "venueReadiness"
            | "routeReadiness"
            | "formatReadiness"
            | "rosterReadiness"
            | "requiredGuestData"
            | "resourceReadiness"
            | "staffingReadiness"
            | "messagingReadiness"
            | "admissionReview"
            | "financialReadiness"
            | "joiningInstructions"
            | "identityResolution"
            | "guestAdmission"
            | "guestCheckIn"
            | "lateJoin"
            | "participationChange"
            | "guestPrerequisite"
            | "allocationRepair"
            | "placementConfirmation"
            | "resourceRecovery"
            | "fairParticipation"
            | "roundPublication"
            | "unitProgress"
            | "outcomeRecording"
            | "programmeRecovery"
            | "departure"
            | "checkpoint"
            | "groupTransfer"
            | "routeRecovery"
            | "locationFreshness"
            | "accountability"
            | "planChangeCommunication"
            | "deliveryRecovery"
            | "replyOwnership"
            | "guestAssistance"
            | "comfortSafety"
            | "attendanceSync"
            | "concurrencyRecovery"
            | "operationRecovery"
            | "contextBoundary"
            | "overrideReview"
            | "eventClosure"
            | "attendanceReconciliation"
            | "financialReconciliation"
            | "postEventFollowUp"
            | "eventLearning";
          occurrenceId: string;
        };
        createdAt: number;
        expiresAt: number;
        /**
         * @minItems 1
         * @maxItems 3
         */
        permittedRoutes: (
          | "catchEventSms"
          | "catchEventRcs"
          | "organizerEventWhatsapp"
        )[];
        deliveryPolicy: {
          maxAttempts: number;
          maxAttemptsPerRoute: number;
          minimumRetrySeconds: number;
        };
        kind: "joiningUpdate";
        guidance: {
          /**
           * Nonnegative safe integer revision.
           */
          revision: number;
          destination:
            | {
                kind: "fixedPlace";
                placeId: string;
                lateEntry: "allowed" | "hostDecision" | "closed";
              }
            | {
                kind: "itineraryStop";
                itineraryId: string;
                stopId: string;
              }
            | {
                kind: "groupCheckpoint";
                routeId: string;
                groupId: string;
                checkpointId: string;
              };
          materialKey: string;
          text: string;
          /**
           * UTC milliseconds.
           */
          validUntil: number;
        };
        /**
         * @minItems 1
         * @maxItems 20
         */
        choices: {
          choiceId: string;
          label: string;
          value:
            | {
                kind: "joinIntent";
                intention:
                  | {
                      kind: "onMyWay";
                      claimedEta: number | null;
                    }
                  | {
                      kind: "joinLater";
                      target:
                        | {
                            kind: "fixedPlace";
                            placeId: string;
                            lateEntry: "allowed" | "hostDecision" | "closed";
                          }
                        | {
                            kind: "itineraryStop";
                            itineraryId: string;
                            stopId: string;
                          }
                        | {
                            kind: "groupCheckpoint";
                            routeId: string;
                            groupId: string;
                            checkpointId: string;
                          };
                    }
                  | {
                      kind: "notComing";
                    };
              }
            | {
                kind: "requestHelp";
                category:
                  | "eventLogistics"
                  | "accessibility"
                  | "comfortSafety"
                  | "other";
              };
        }[];
        /**
         * Trusted live publisher binding. Queued delivery rechecks the saved policy, current group and episode outreach budget. Absence denotes the pre-existing trusted explicit publisher path, never automatic execution authority.
         */
        automation?: {
          kind: "lateJoin";
          policyVersion: string;
          groupId: string;
          settingId: string;
          settingRevision: number;
          /**
           * @minItems 1
           * @maxItems 3
           */
          routes: (
            | {
                routeId: "catchEventSms";
                senderId: string;
              }
            | {
                routeId: "organizerEventWhatsapp";
                senderId: string;
              }
            | {
                routeId: "catchEventRcs";
                senderId: string;
              }
          )[];
          responseDeadline: number | null;
          runtimeBinding?: {
            runtimeId: string;
            revision: number;
          };
        };
      }
    | {
        schemaVersion: 1;
        intentId: string;
        revision: number;
        context:
          | {
              mode: "live";
              eventId: string;
              organizerId: string;
            }
          | {
              mode: "rehearsal";
              rehearsalId: string;
              virtualEventId: string;
              clockId: string;
            };
        eventId: string;
        attendeeId: string;
        episodeId: string;
        workflow: {
          kind:
            | "venueReadiness"
            | "routeReadiness"
            | "formatReadiness"
            | "rosterReadiness"
            | "requiredGuestData"
            | "resourceReadiness"
            | "staffingReadiness"
            | "messagingReadiness"
            | "admissionReview"
            | "financialReadiness"
            | "joiningInstructions"
            | "identityResolution"
            | "guestAdmission"
            | "guestCheckIn"
            | "lateJoin"
            | "participationChange"
            | "guestPrerequisite"
            | "allocationRepair"
            | "placementConfirmation"
            | "resourceRecovery"
            | "fairParticipation"
            | "roundPublication"
            | "unitProgress"
            | "outcomeRecording"
            | "programmeRecovery"
            | "departure"
            | "checkpoint"
            | "groupTransfer"
            | "routeRecovery"
            | "locationFreshness"
            | "accountability"
            | "planChangeCommunication"
            | "deliveryRecovery"
            | "replyOwnership"
            | "guestAssistance"
            | "comfortSafety"
            | "attendanceSync"
            | "concurrencyRecovery"
            | "operationRecovery"
            | "contextBoundary"
            | "overrideReview"
            | "eventClosure"
            | "attendanceReconciliation"
            | "financialReconciliation"
            | "postEventFollowUp"
            | "eventLearning";
          occurrenceId: string;
        };
        createdAt: number;
        expiresAt: number;
        /**
         * @minItems 1
         * @maxItems 3
         */
        permittedRoutes: (
          | "catchEventSms"
          | "catchEventRcs"
          | "organizerEventWhatsapp"
        )[];
        deliveryPolicy: {
          maxAttempts: number;
          maxAttemptsPerRoute: number;
          minimumRetrySeconds: number;
        };
        kind: "operationalNotice";
        noticeKind:
          | "joiningInstructions"
          | "planChanged"
          | "eventCancelled"
          | "eventFinished"
          | "guestRequirement"
          | "assignmentChanged"
          | "participationCheck"
          | "followUp";
        title: string;
        body: string;
        instructionRevision: number;
        /**
         * @minItems 0
         * @maxItems 20
         */
        choices: {
          choiceId: string;
          label: string;
          value:
            | {
                kind: "acknowledge";
                instructionRevision: number;
              }
            | {
                kind: "requestHelp";
                category:
                  | "eventLogistics"
                  | "accessibility"
                  | "comfortSafety"
                  | "other";
              };
        }[];
        /**
         * Trusted live publisher binding for plan-change and follow-up notices. The delivery worker rechecks the saved assistance setting and every channel permission before sending. Absence denotes an explicit publisher path without automatic delivery authority.
         */
        automation?: {
          kind: "operationalNotice";
          noticeKind: "planChanged" | "followUp";
          policyVersion: string;
          groupId: string;
          settingId: string;
          settingRevision: number;
          sourceId: string;
          sourceRevision: number;
          contentHash: string;
          /**
           * @minItems 1
           * @maxItems 3
           */
          routes: (
            | {
                routeId: "catchEventSms";
                senderId: string;
              }
            | {
                routeId: "organizerEventWhatsapp";
                senderId: string;
              }
            | {
                routeId: "catchEventRcs";
                senderId: string;
              }
          )[];
        };
      };
  lifecycle: "active" | "cancelled" | "superseded" | "responded";
  /**
   * @maxItems 6
   */
  attempts: (
    | {
        schemaVersion: 1;
        attemptId: string;
        intentId: string;
        intentRevision: number;
        ordinal: number;
        createdAt: number;
        state:
          | {
              kind: "reserved";
              at: number;
              reconcileAfter: number;
            }
          | {
              kind: "unknown";
              at: number;
              providerMessageId: string | null;
              reason: "timeout" | "connectionLost" | "workerInterrupted";
              reconcileAfter: number;
            }
          | {
              kind: "accepted";
              at: number;
              providerMessageId: string;
            }
          | {
              kind: "delivered";
              at: number;
              providerMessageId: string;
            }
          | {
              kind: "read";
              at: number;
              providerMessageId: string;
            }
          | {
              kind: "failed";
              at: number;
              providerMessageId: string | null;
              classification:
                | "technical"
                | "invalidRecipient"
                | "policy"
                | "suppressed";
              evidenceId: string;
            }
          | {
              kind: "revoked";
              at: number;
              providerMessageId: string;
              evidenceId: string;
            }
          | {
              kind: "notDispatched";
              at: number;
              reason:
                | "superseded"
                | "eventClosed"
                | "responded"
                | "expired"
                | "permissionRevoked"
                | "hostStopped"
                | "reservationExpired"
                | "permitExpired";
            };
        mode: "live";
        context: {
          mode: "live";
          eventId: string;
          organizerId: string;
        };
        binding:
          | {
              routeId: "catchEventSms";
              transport: "sms";
              senderIdentity: "catchPlatform";
              provider: "sinch" | "gupshup";
              senderId: string;
              bindingRevision: number;
              recipientEndpointId: string;
              fallbackOwner: "catch" | "provider";
            }
          | {
              routeId: "catchEventRcs";
              transport: "rcs";
              senderIdentity: "catchPlatform";
              provider: "sinch" | "gupshup" | "googleRbm";
              senderId: string;
              bindingRevision: number;
              recipientEndpointId: string;
              fallbackOwner: "catch" | "provider";
            }
          | {
              routeId: "organizerEventWhatsapp";
              transport: "whatsapp";
              senderIdentity: "organizerManaged";
              provider: "meta";
              senderId: string;
              bindingRevision: number;
              recipientEndpointId: string;
              fallbackOwner: "catch" | "provider";
            };
        authorization: {
          permissionRevision: string;
          checkedAt: number;
          validUntil: number;
          instructionRevision: number;
        };
      }
    | {
        schemaVersion: 1;
        attemptId: string;
        intentId: string;
        intentRevision: number;
        ordinal: number;
        createdAt: number;
        state:
          | {
              kind: "reserved";
              at: number;
              reconcileAfter: number;
            }
          | {
              kind: "unknown";
              at: number;
              providerMessageId: string | null;
              reason: "timeout" | "connectionLost" | "workerInterrupted";
              reconcileAfter: number;
            }
          | {
              kind: "accepted";
              at: number;
              providerMessageId: string;
            }
          | {
              kind: "delivered";
              at: number;
              providerMessageId: string;
            }
          | {
              kind: "read";
              at: number;
              providerMessageId: string;
            }
          | {
              kind: "failed";
              at: number;
              providerMessageId: string | null;
              classification:
                | "technical"
                | "invalidRecipient"
                | "policy"
                | "suppressed";
              evidenceId: string;
            }
          | {
              kind: "revoked";
              at: number;
              providerMessageId: string;
              evidenceId: string;
            }
          | {
              kind: "notDispatched";
              at: number;
              reason:
                | "superseded"
                | "eventClosed"
                | "responded"
                | "expired"
                | "permissionRevoked"
                | "hostStopped"
                | "reservationExpired"
                | "permitExpired";
            };
        mode: "rehearsal";
        context: {
          mode: "rehearsal";
          rehearsalId: string;
          virtualEventId: string;
          clockId: string;
        };
        routeId: "catchEventSms" | "catchEventRcs" | "organizerEventWhatsapp";
        authorization: {
          permissionRevision: string;
          checkedAt: number;
          validUntil: number;
          instructionRevision: number;
        };
      }
  )[];
  deliveryConflict: boolean;
  createdAt: number;
  updatedAt: number;
  response:
    | (
        | {
            schemaVersion: 1;
            responseId: string;
            intentId: string;
            intentRevision: number;
            eventId: string;
            attendeeId: string;
            episodeId: string;
            choiceId: string;
            receivedAt: number;
            value:
              | {
                  kind: "joinIntent";
                  intention:
                    | {
                        kind: "onMyWay";
                        claimedEta: number | null;
                      }
                    | {
                        kind: "joinLater";
                        target:
                          | {
                              kind: "fixedPlace";
                              placeId: string;
                              lateEntry: "allowed" | "hostDecision" | "closed";
                            }
                          | {
                              kind: "itineraryStop";
                              itineraryId: string;
                              stopId: string;
                            }
                          | {
                              kind: "groupCheckpoint";
                              routeId: string;
                              groupId: string;
                              checkpointId: string;
                            };
                      }
                    | {
                        kind: "notComing";
                      };
                }
              | {
                  kind: "acknowledge";
                  instructionRevision: number;
                }
              | {
                  kind: "requestHelp";
                  category:
                    | "eventLogistics"
                    | "accessibility"
                    | "comfortSafety"
                    | "other";
                };
            context: {
              mode: "live";
              eventId: string;
              organizerId: string;
            };
            source: {
              kind: "guestWeb";
              linkId: string;
            };
          }
        | {
            schemaVersion: 1;
            responseId: string;
            intentId: string;
            intentRevision: number;
            eventId: string;
            attendeeId: string;
            episodeId: string;
            choiceId: string;
            receivedAt: number;
            value:
              | {
                  kind: "joinIntent";
                  intention:
                    | {
                        kind: "onMyWay";
                        claimedEta: number | null;
                      }
                    | {
                        kind: "joinLater";
                        target:
                          | {
                              kind: "fixedPlace";
                              placeId: string;
                              lateEntry: "allowed" | "hostDecision" | "closed";
                            }
                          | {
                              kind: "itineraryStop";
                              itineraryId: string;
                              stopId: string;
                            }
                          | {
                              kind: "groupCheckpoint";
                              routeId: string;
                              groupId: string;
                              checkpointId: string;
                            };
                      }
                    | {
                        kind: "notComing";
                      };
                }
              | {
                  kind: "acknowledge";
                  instructionRevision: number;
                }
              | {
                  kind: "requestHelp";
                  category:
                    | "eventLogistics"
                    | "accessibility"
                    | "comfortSafety"
                    | "other";
                };
            context: {
              mode: "live";
              eventId: string;
              organizerId: string;
            };
            source: {
              kind: "provider";
              attemptId: string;
              providerEventId: string;
            };
          }
        | {
            schemaVersion: 1;
            responseId: string;
            intentId: string;
            intentRevision: number;
            eventId: string;
            attendeeId: string;
            episodeId: string;
            choiceId: string;
            receivedAt: number;
            value:
              | {
                  kind: "joinIntent";
                  intention:
                    | {
                        kind: "onMyWay";
                        claimedEta: number | null;
                      }
                    | {
                        kind: "joinLater";
                        target:
                          | {
                              kind: "fixedPlace";
                              placeId: string;
                              lateEntry: "allowed" | "hostDecision" | "closed";
                            }
                          | {
                              kind: "itineraryStop";
                              itineraryId: string;
                              stopId: string;
                            }
                          | {
                              kind: "groupCheckpoint";
                              routeId: string;
                              groupId: string;
                              checkpointId: string;
                            };
                      }
                    | {
                        kind: "notComing";
                      };
                }
              | {
                  kind: "acknowledge";
                  instructionRevision: number;
                }
              | {
                  kind: "requestHelp";
                  category:
                    | "eventLogistics"
                    | "accessibility"
                    | "comfortSafety"
                    | "other";
                };
            context: {
              mode: "rehearsal";
              rehearsalId: string;
              virtualEventId: string;
              clockId: string;
            };
            source: {
              kind: "simulation";
              actionId: string;
            };
          }
      )
    | null;
  handoff?: {
    actorUid: string;
    at: number;
    operationId: string;
  };
}

export interface EventAssistanceOperationalNoticeQuotaDocument {
  schemaVersion: 1;
  quotaId: string;
  context:
    | {
        mode: "live";
        eventId: string;
        organizerId: string;
      }
    | {
        mode: "rehearsal";
        rehearsalId: string;
        virtualEventId: string;
        clockId: string;
      };
  eventId: string;
  attendeeId: string;
  attendeeGeneration: string;
  sourceGeneration: string;
  workflowKind: "planChangeCommunication" | "postEventFollowUp";
  count: number;
  revision: number;
  createdAt: number;
  updatedAt: number;
}

export interface EventAssistanceOperationalNoticePublicationDocument {
  schemaVersion: 1;
  publicationId: string;
  quotaId: string;
  context:
    | {
        mode: "live";
        eventId: string;
        organizerId: string;
      }
    | {
        mode: "rehearsal";
        rehearsalId: string;
        virtualEventId: string;
        clockId: string;
      };
  eventId: string;
  attendeeId: string;
  episodeId: string;
  sourceKind: "planChange" | "followUp";
  workflowKind: "planChangeCommunication" | "postEventFollowUp";
  sourceId: string;
  sourceRevision: number;
  messageId: string;
  threadId: string;
  ordinal: number;
  contentHash: string;
  intentHash: string;
  sourceOccurredAt: number;
  createdAt: number;
}

/**
 * Immutable idempotency and audit receipt for a dry-run or applied external-event publication/takedown action.
 */
export interface ExternalEventPublicationReceiptDocument {
  schemaVersion: 1;
  receiptId: string;
  idempotencyKey: string;
  inputHash: string;
  action: "publish" | "takedown";
  executionMode: "dry_run" | "apply";
  outcome: "would_publish" | "published" | "would_remove" | "removed";
  eventId: string;
  targetPath: string;
  sourceActionId: string | null;
  externalLinkCount: number;
  reviewNote: string;
  actorUid: string;
  createdAt: FirebaseFirestore.Timestamp;
}

/**
 * Public launch-market configuration stored at config/cities. The app picks from launched markets; canonical market ids disambiguate same-name cities globally.
 */
export interface ConfigCitiesDocument {
  version: number;
  /**
   * Compatibility whitelist used by Firestore rules. Values are launched canonical market ids, not display city names.
   *
   * @minItems 1
   */
  cityNames: string[];
  /**
   * @minItems 1
   */
  marketIds: string[];
  /**
   * @minItems 1
   */
  launchMarketIds: string[];
  cities: {
    /**
     * App-facing selection id. Kept as name for existing CityData JSON, but stores the canonical market id.
     */
    name: string;
    cityId: string;
    marketId: string;
    slug: string;
    label: string;
    latitude: number;
    longitude: number;
    countryIsoCode: string;
    currencyCode: string;
    dialCode: string;
    timeZone: string;
    launchStatus: "launched" | "planned" | "paused" | "retired";
    profileSelectable: boolean;
    hostCreatable: boolean;
    eventCreatable: boolean;
    exploreVisible: boolean;
  }[];
  /**
   * @minItems 1
   */
  markets: {
    marketId: string;
    cityId: string;
    slug: string;
    label: string;
    cityLabel: string;
    regionCode: string;
    regionName: string;
    countryIsoCode: string;
    countryName: string;
    currencyCode: string;
    dialCode: string;
    timeZone: string;
    latitude: number;
    longitude: number;
    /**
     * @maxItems 40
     */
    aliases: string[];
    launchStatus: "launched" | "planned" | "paused" | "retired";
    profileSelectable: boolean;
    hostCreatable: boolean;
    eventCreatable: boolean;
    exploreVisible: boolean;
  }[];
}

/**
 * Owner-private, intentionally extensible onboarding draft stored at onboarding_drafts/{uid}.
 */
export interface OnboardingDraftDocument {
  step: number;
  draftVersion?: number;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: FirebaseFirestore.Timestamp | null;
  phoneNumber?: string;
  countryCode?: string;
  gender?: ("man" | "woman" | "nonBinary" | "other") | null;
  interestedInGenders?: ("man" | "woman" | "nonBinary" | "other")[];
  instagramHandle?: string | null;
  /**
   * @maxItems 3
   */
  profilePrompts?: ProfilePromptAnswer[];
  [k: string]: unknown;
}

/**
 * Owner-submitted launch access application stored at accessApplications/{uid}; review and cohort fields are admin-owned.
 */
export interface AccessApplicationDocument {
  applicationVersion: number;
  status:
    | "pending"
    | "waitlisted"
    | "invited"
    | "approvedForProfile"
    | "activeMember"
    | "paused"
    | "notSelectedYet";
  city: string;
  role: "member" | "host" | "both";
  /**
   * @minItems 1
   * @maxItems 7
   */
  eventTypes: (
    | "runClub"
    | "walkingSocial"
    | "coffee"
    | "boardGames"
    | "fitnessClass"
    | "food"
    | "culture"
  )[];
  /**
   * @minItems 1
   * @maxItems 6
   */
  availabilityWindows: (
    | "weekdayMornings"
    | "weekdayEvenings"
    | "saturdayMornings"
    | "saturdayEvenings"
    | "sundayMornings"
    | "sundayEvenings"
  )[];
  wantsToHost: boolean;
  inviteCode?: string | null;
  instagramHandle?: string | null;
  referralSource?: string | null;
  whyCatch?: string | null;
  cohortId?: string | null;
  hostUserId?: string | null;
  reviewerUid?: string | null;
  reviewNote?: string | null;
  submissionCount: number;
  createdAt: FirebaseFirestore.Timestamp;
  submittedAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  reviewedAt?: FirebaseFirestore.Timestamp | null;
}

/**
 * Canonical private profile document stored at users/{uid}. The uid is the document id and is not stored in document data.
 */
export interface UserProfileDocument {
  name: string;
  firstName: string;
  lastName: string;
  displayName: string;
  dateOfBirth?: FirebaseFirestore.Timestamp;
  gender?: "man" | "woman" | "nonBinary" | "other";
  phoneNumber: string;
  countryCode?: string;
  profileRevision?: number;
  profileClaimedAt?: FirebaseFirestore.Timestamp;
  profileComplete: boolean;
  email: "" | string;
  instagramHandle?: string | null;
  /**
   * @maxItems 3
   */
  profilePrompts: ProfilePromptAnswer[];
  /**
   * @maxItems 6
   */
  profilePhotos: ProfilePhoto[];
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  /**
   * @minItems 0
   * @maxItems 8
   */
  interestedInGenders: ("man" | "woman" | "nonBinary" | "other")[];
  minAgePreference: number;
  maxAgePreference: number;
  height?: number | null;
  occupation?: string | null;
  company?: string | null;
  education?:
    | "highSchool"
    | "someCollege"
    | "bachelors"
    | "masters"
    | "phd"
    | "tradeSchool"
    | "other"
    | null;
  religion?:
    | "hindu"
    | "muslim"
    | "christian"
    | "sikh"
    | "jain"
    | "buddhist"
    | "other"
    | "nonReligious"
    | null;
  /**
   * @maxItems 20
   */
  languages: (
    | "english"
    | "hindi"
    | "marathi"
    | "tamil"
    | "telugu"
    | "kannada"
    | "bengali"
    | "gujarati"
    | "punjabi"
    | "malayalam"
    | "odia"
    | "other"
  )[];
  relationshipGoal?:
    | "relationship"
    | "casual"
    | "marriage"
    | "friendship"
    | "unsure"
    | null;
  drinking?: "never" | "socially" | "often" | null;
  smoking?: "never" | "occasionally" | "often" | null;
  workout?: "never" | "sometimes" | "often" | "everyday" | null;
  diet?: "omnivore" | "vegetarian" | "vegan" | "jain" | "other" | null;
  children?:
    | "dontHave"
    | "haveWantMore"
    | "haveNoMore"
    | "wantSomeday"
    | "dontWant"
    | null;
  activityPreferences: ActivityPreferences;
  prefsNewCatches: boolean;
  prefsMessages: boolean;
  prefsEventReminders: boolean;
  prefsRunStatusUpdates: boolean;
  prefsClubUpdates: boolean;
  prefsWeeklyDigest: boolean;
  prefsShowOnMap: boolean;
  /**
   * Private global consent gate for Cross Paths. Missing values resolve to false and this field must never be copied to publicProfiles.
   */
  prefsShowInCrossPaths?: boolean;
  /**
   * Opt-in push preference for Cross Paths invitations. Missing values resolve to false; durable Activity items are still written.
   */
  prefsCrossPathsInvitations?: boolean;
  fcmToken?: string;
  deleted?: boolean;
  deletedAt?: FirebaseFirestore.Timestamp | null;
}

/**
 * Backend-owned public profile projection stored at publicProfiles/{uid}. The uid is the document id and is not stored in document data.
 */
export interface PublicProfileDocument {
  name: string;
  age: number;
  gender: "man" | "woman" | "nonBinary" | "other";
  /**
   * @maxItems 3
   */
  profilePrompts: ProfilePromptAnswer[];
  /**
   * @maxItems 6
   */
  profilePhotos: ProfilePhoto[];
  city?: string | null;
  height?: number | null;
  occupation?: string | null;
  company?: string | null;
  education?:
    | "highSchool"
    | "someCollege"
    | "bachelors"
    | "masters"
    | "phd"
    | "tradeSchool"
    | "other"
    | null;
  religion?:
    | "hindu"
    | "muslim"
    | "christian"
    | "sikh"
    | "jain"
    | "buddhist"
    | "other"
    | "nonReligious"
    | null;
  /**
   * @maxItems 20
   */
  languages?: (
    | "english"
    | "hindi"
    | "marathi"
    | "tamil"
    | "telugu"
    | "kannada"
    | "bengali"
    | "gujarati"
    | "punjabi"
    | "malayalam"
    | "odia"
    | "other"
  )[];
  relationshipGoal?:
    | "relationship"
    | "casual"
    | "marriage"
    | "friendship"
    | "unsure"
    | null;
  drinking?: "never" | "socially" | "often" | null;
  smoking?: "never" | "occasionally" | "often" | null;
  workout?: "never" | "sometimes" | "often" | "everyday" | null;
  diet?: "omnivore" | "vegetarian" | "vegan" | "jain" | "other" | null;
  children?:
    | "dontHave"
    | "haveWantMore"
    | "haveNoMore"
    | "wantSomeday"
    | "dontWant"
    | null;
  activityPreferences: ActivityPreferences;
}

/**
 * Professional host identity stored at hostProfiles/{uid}. This document is separate from users/{uid} dating profile data and publicProfiles/{uid}.
 */
export interface HostProfileDocument {
  /**
   * Professional display name for host, club, event, and support-chat surfaces.
   */
  displayName: string;
  /**
   * Professional host avatar or organization logo URL.
   */
  avatarUrl?: string | null;
  /**
   * Professional title such as Founder, Coach, Organizer, or Community Lead.
   */
  roleTitle?: string | null;
  /**
   * Professional host bio. Must not mirror dating-profile prompts.
   */
  bio?: string | null;
  status: "active" | "pending" | "suspended";
  verified?: boolean;
  /**
   * @maxItems 20
   */
  linkedClubIds?: string[];
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Legacy storage contract for an organizer document stored at clubs/{clubId} during the clubs-to-organizers migration. The organizer id is the document id and is not stored in document data.
 */
export interface ClubDocument {
  name: string;
  /**
   * Member-facing organizer description. May be empty on hidden intake drafts until an operator supplies source-backed copy.
   */
  description: string;
  /**
   * Canonical launch market id. Public URL slugs live under publicPage.citySlug.
   */
  location: string;
  locationCityId: string;
  locationMarketId: string;
  /**
   * Verified locality within the canonical market. May be empty when intake evidence establishes only the city.
   */
  area: string;
  /**
   * Legacy primary host user id. Null for programmatically generated, unclaimed organizer profiles.
   */
  hostUserId: string | null;
  /**
   * Legacy host display projection. Null when the organizer has not been claimed by a Catch user.
   */
  hostName: string | null;
  hostAvatarUrl: string | null;
  /**
   * Canonical owner user id after claim or user-created setup. Null for unclaimed programmatic profiles.
   */
  ownerUserId: string | null;
  /**
   * @maxItems 20
   */
  hostUserIds: string[];
  hostProfiles: ClubHostProfile[];
  createdAt: FirebaseFirestore.Timestamp;
  imageUrl: string | null;
  profileImageUrl: string | null;
  clubPhotos?: UploadedPhoto[];
  logoPhoto?: UploadedPhoto | null;
  /**
   * @maxItems 20
   */
  tags: string[];
  memberCount: number;
  rating: number;
  reviewCount: number;
  /**
   * Published reviews that are verified (attended a Catch event). Only these back the headline rating; unverified public reviews cannot move the score.
   */
  verifiedReviewCount?: number;
  nextEventAt: FirebaseFirestore.Timestamp | null;
  nextEventLabel: string | null;
  instagramHandle: string | null;
  phoneNumber: string | null;
  email: string | null;
  status: "active" | "archived";
  archived: boolean;
  archivedAt: FirebaseFirestore.Timestamp | null;
  archiveReason: string | null;
  hostDefaults?: ClubHostDefaults;
  /**
   * Canonical organizer subtype. Legacy documents without this field normalize to club until backfill is complete.
   */
  organizerType?:
    | "club"
    | "community"
    | "individual"
    | "eventProducer"
    | "venue"
    | "brand";
  /**
   * Server-owned timestamp of the latest organizer type decision.
   */
  organizerTypeUpdatedAt?: FirebaseFirestore.Timestamp | null;
  /**
   * Server-owned user id that made the latest organizer type decision.
   */
  organizerTypeUpdatedByUid?: string | null;
  /**
   * Optional admin-curated public category copy. It never replaces organizerType as the classification authority.
   */
  publicCategoryLabel?: string | null;
  /**
   * Deprecated organizer classification retained only while legacy data and clients are migrated to organizerType.
   */
  entityKind?:
    | "club"
    | "venue"
    | "eventOrganizer"
    | "creatorCommunity"
    | "brand";
  /**
   * Deprecated free-form organizer classification retained only for migration reads.
   *
   * @maxItems 20
   */
  entitySubtypes?: string[];
  /**
   * Deprecated reader-facing category label retained until publicCategoryLabel migration is complete.
   */
  displayCategory?: string | null;
  cityName?: string | null;
  regionName?: string | null;
  countryCode?: string | null;
  countryName?: string | null;
  /**
   * Whether the native app should show this organizer in browse surfaces. Scraped unclaimed profiles start hidden.
   */
  appVisibility?: "discoverable" | "hidden";
  supplyCapabilities?: OrganizerSupplyCapabilities;
  /**
   * Claim-aware organizer ownership state. This is the forward-looking owner model; legacy host fields are maintained for app compatibility.
   */
  ownership?: {
    state: "programmatic" | "userCreated" | "claimed" | "transferred";
    ownerUserId: string | null;
    primaryHostUserId: string | null;
    /**
     * @maxItems 20
     */
    hostUserIds: string[];
    claimedAt: FirebaseFirestore.Timestamp | null;
    claimedByUid: string | null;
  };
  claim?: {
    state: "unclaimed" | "claimPending" | "claimed" | "verified" | "suppressed";
    claimHref: string | null;
    lastClaimRequestId: string | null;
  };
  publicPage?: {
    slug: string;
    citySlug: string;
    canonicalPath: string;
    publishStatus: "draft" | "qa" | "published" | "suppressed" | "removed";
    indexStatus: "noindex" | "indexReady" | "indexed";
    robots: "noindex, follow" | "index, follow";
    seoTitle: string | null;
    seoDescription: string | null;
    lastRenderedAt: FirebaseFirestore.Timestamp | null;
    indexReview?: {
      reviewedAt: FirebaseFirestore.Timestamp;
      reviewedByUid: string;
      indexStatus: "noindex" | "indexReady" | "indexed";
      checklist: {
        sourceEvidenceVerified: boolean;
        mediaRightsVerified: boolean;
        cadenceVerified: boolean;
        ownerContactVerified: boolean;
      };
      reviewNote: string | null;
    } | null;
  };
  provenance?: {
    origin: "userCreated" | "scraper" | "adminSeed" | "import";
    sourceConfidence: "seedOnly" | "low" | "medium" | "high" | "ownerVerified";
    verificationStatus: "unverified" | "sourceBacked" | "ownerVerified";
    lastVerifiedAt: FirebaseFirestore.Timestamp | null;
  };
  /**
   * Server-owned deterministic search projection used by admin organizer publishing. Rebuildable from canonical club fields; not consumed by the app.
   */
  adminSearch?: {
    /**
     * @maxItems 120
     */
    tokens: string[];
    sortKey: string;
    updatedAt: FirebaseFirestore.Timestamp;
    updatedBySource:
      | "adminUpdateClubDetails"
      | "adminSetClubIndexStatus"
      | "adminOrganizerSearchBackfill"
      | "adminCreateOrganizerDraftFromCandidate";
  };
  /**
   * Public, owner-safe organizer listing content derived from sources or owner edits. Raw scrape snapshots belong in private evidence collections.
   */
  publicProfile?: {
    headline?: string | null;
    summary?: string | null;
    sourceSummary?: string | null;
    /**
     * @maxItems 12
     */
    formats?: string[];
    /**
     * @maxItems 20
     */
    facts?: {
      label: string;
      value: string;
    }[];
    /**
     * @maxItems 12
     */
    eventEvidence?: {
      title: string;
      date: string;
      location: string;
      summary: string;
      /**
       * @maxItems 12
       */
      facts: string[];
      sourceLabel: string;
      sourceHref: string;
    }[];
  };
  /**
   * @maxItems 20
   */
  publicSources?: {
    type: string;
    label: string;
    detail: string;
    href: string | null;
    confidence: "low" | "medium" | "high";
    lastCheckedAt: FirebaseFirestore.Timestamp | null;
  }[];
}

/**
 * Canonical organizer document stored at organizers/{organizerId}. Club is one organizerType, not the parent entity name.
 */
export interface OrganizerDocument {
  name: string;
  /**
   * Member-facing organizer description. May be empty on hidden intake drafts until an operator supplies source-backed copy.
   */
  description: string;
  /**
   * Canonical launch market id. Public URL slugs live under publicPage.citySlug.
   */
  location: string;
  locationCityId: string;
  locationMarketId: string;
  /**
   * Verified locality within the canonical market. May be empty when intake evidence establishes only the city.
   */
  area: string;
  /**
   * Legacy primary host user id. Null for programmatically generated, unclaimed organizer profiles.
   */
  hostUserId: string | null;
  /**
   * Legacy host display projection. Null when the organizer has not been claimed by a Catch user.
   */
  hostName: string | null;
  hostAvatarUrl: string | null;
  /**
   * Canonical owner user id after claim or user-created setup. Null for unclaimed programmatic profiles.
   */
  ownerUserId: string | null;
  /**
   * @maxItems 20
   */
  hostUserIds: string[];
  /**
   * @maxItems 20
   */
  hostProfiles: {
    uid: string;
    displayName: string;
    avatarUrl: string | null;
    role: "owner" | "host";
  }[];
  createdAt: FirebaseFirestore.Timestamp;
  imageUrl: string | null;
  profileImageUrl: string | null;
  clubPhotos?: UploadedPhoto[];
  /**
   * Canonical organizer gallery. clubPhotos is tolerated only while released clients migrate.
   */
  organizerPhotos: UploadedPhoto[];
  logoPhoto?: UploadedPhoto | null;
  /**
   * @maxItems 20
   */
  tags: string[];
  memberCount?: number;
  /**
   * Canonical active organizer follower count.
   */
  followerCount: number;
  rating: number;
  reviewCount: number;
  /**
   * Published reviews that are verified (attended a Catch event). Only these back the headline rating; unverified public reviews cannot move the score.
   */
  verifiedReviewCount?: number;
  nextEventAt: FirebaseFirestore.Timestamp | null;
  nextEventLabel: string | null;
  instagramHandle: string | null;
  phoneNumber: string | null;
  email: string | null;
  status: "active" | "archived";
  archived: boolean;
  archivedAt: FirebaseFirestore.Timestamp | null;
  archiveReason: string | null;
  hostDefaults?: {
    primaryActivityKind?:
      | "socialRun"
      | "running"
      | "walking"
      | "pickleball"
      | "padel"
      | "tennis"
      | "badminton"
      | "cycling"
      | "spinClass"
      | "yoga"
      | "strengthTraining"
      | "pubQuiz"
      | "barCrawl"
      | "dinner"
      | "singlesMixer"
      | "openActivity";
    /**
     * @maxItems 16
     */
    supportedActivityKinds?: (
      | "socialRun"
      | "running"
      | "walking"
      | "pickleball"
      | "padel"
      | "tennis"
      | "badminton"
      | "cycling"
      | "spinClass"
      | "yoga"
      | "strengthTraining"
      | "pubQuiz"
      | "barCrawl"
      | "dinner"
      | "singlesMixer"
      | "openActivity"
    )[];
    eventPolicy?: {
      admissionPreset?:
        | "openCapacity"
        | "inviteOnly"
        | "balancedSingles"
        | "fixedCohortCaps";
      minAge?: number;
      maxAge?: number;
      maxMen?: number | null;
      maxWomen?: number | null;
      dynamicPricingEnabled?: boolean;
      crossPathsPairCapacity?: number;
      dynamicPricingStepInPaise?: number | null;
      dynamicPricingMaxInPaise?: number | null;
      cancellationPolicyId?: "flexible" | "standard" | "strict";
    };
    eventSuccess?: {
      enabled?: boolean;
      layoutId?: string | null;
      playbookId?: string;
      /**
       * @maxItems 24
       */
      selectedModuleIds?: string[];
      moduleSelectionConfigured?: boolean;
      structureConfig?: {
        [k: string]: unknown;
      };
      hostGoal?: string;
      wingmanRequestsEnabled?: boolean;
      contextualOpenersEnabled?: boolean;
      compatibilityAffectsRanking?: boolean;
      questionnaireConfig?: {
        templateId: string;
        customTitle?: string | null;
        /**
         * @maxItems 8
         */
        customQuestions?: {
          id: string;
          prompt: string;
          /**
           * @minItems 2
           * @maxItems 5
           */
          options: {
            id: string;
            label: string;
          }[];
        }[];
      };
      attendeePrompt?: string | null;
    };
    eventSuccessByActivityKind?: {
      [k: string]: {
        enabled?: boolean;
        layoutId?: string | null;
        playbookId?: string;
        /**
         * @maxItems 24
         */
        selectedModuleIds?: string[];
        moduleSelectionConfigured?: boolean;
        structureConfig?: {
          [k: string]: unknown;
        };
        hostGoal?: string;
        wingmanRequestsEnabled?: boolean;
        contextualOpenersEnabled?: boolean;
        compatibilityAffectsRanking?: boolean;
        questionnaireConfig?: {
          templateId: string;
          customTitle?: string | null;
          /**
           * @maxItems 8
           */
          customQuestions?: {
            id: string;
            prompt: string;
            /**
             * @minItems 2
             * @maxItems 5
             */
            options: {
              id: string;
              label: string;
            }[];
          }[];
        };
        attendeePrompt?: string | null;
      };
    };
  };
  /**
   * Canonical organizer subtype. Legacy documents without this field normalize to club until backfill is complete.
   */
  organizerType:
    | "club"
    | "community"
    | "individual"
    | "eventProducer"
    | "venue"
    | "brand";
  /**
   * Server-owned timestamp of the latest organizer type decision.
   */
  organizerTypeUpdatedAt?: FirebaseFirestore.Timestamp | null;
  /**
   * Server-owned user id that made the latest organizer type decision.
   */
  organizerTypeUpdatedByUid?: string | null;
  /**
   * Optional admin-curated public category copy. It never replaces organizerType as the classification authority.
   */
  publicCategoryLabel?: string | null;
  /**
   * Deprecated organizer classification retained only while legacy data and clients are migrated to organizerType.
   */
  entityKind?:
    | "club"
    | "venue"
    | "eventOrganizer"
    | "creatorCommunity"
    | "brand";
  /**
   * Deprecated free-form organizer classification retained only for migration reads.
   *
   * @maxItems 20
   */
  entitySubtypes?: string[];
  /**
   * Deprecated reader-facing category label retained until publicCategoryLabel migration is complete.
   */
  displayCategory?: string | null;
  cityName?: string | null;
  regionName?: string | null;
  countryCode?: string | null;
  countryName?: string | null;
  /**
   * Whether the native app should show this organizer in browse surfaces. Scraped unclaimed profiles start hidden.
   */
  appVisibility?: "discoverable" | "hidden";
  supplyCapabilities?: OrganizerSupplyCapabilities;
  /**
   * Claim-aware organizer ownership state. This is the forward-looking owner model; legacy host fields are maintained for app compatibility.
   */
  ownership?: {
    state: "programmatic" | "userCreated" | "claimed" | "transferred";
    ownerUserId: string | null;
    primaryHostUserId: string | null;
    /**
     * @maxItems 20
     */
    hostUserIds: string[];
    claimedAt: FirebaseFirestore.Timestamp | null;
    claimedByUid: string | null;
  };
  claim?: {
    state: "unclaimed" | "claimPending" | "claimed" | "verified" | "suppressed";
    claimHref: string | null;
    lastClaimRequestId: string | null;
  };
  publicPage?: {
    slug: string;
    citySlug: string;
    canonicalPath: string;
    /**
     * @maxItems 12
     */
    legacyPaths?: string[];
    publishStatus: "draft" | "qa" | "published" | "suppressed" | "removed";
    indexStatus: "noindex" | "indexReady" | "indexed";
    robots: "noindex, follow" | "index, follow";
    seoTitle: string | null;
    seoDescription: string | null;
    lastRenderedAt: FirebaseFirestore.Timestamp | null;
    indexReview?: {
      reviewedAt: FirebaseFirestore.Timestamp;
      reviewedByUid: string;
      indexStatus: "noindex" | "indexReady" | "indexed";
      checklist: {
        sourceEvidenceVerified: boolean;
        mediaRightsVerified: boolean;
        cadenceVerified: boolean;
        ownerContactVerified: boolean;
      };
      reviewNote: string | null;
    } | null;
  };
  provenance?: {
    origin: "userCreated" | "scraper" | "adminSeed" | "import";
    sourceConfidence: "seedOnly" | "low" | "medium" | "high" | "ownerVerified";
    verificationStatus: "unverified" | "sourceBacked" | "ownerVerified";
    lastVerifiedAt: FirebaseFirestore.Timestamp | null;
  };
  /**
   * Bounded server-only lineage for fields seeded by Supply Intake. Raw provider payloads are never stored here. This snapshot lets audited admin edits produce immutable field-correction fixtures.
   */
  intakeLearningSource?: {
    sourceProfileId: string;
    sourceWorkItemId: string;
    sourceCandidateId: string;
    /**
     * @maxItems 40
     */
    seededFields: {
      field:
        | "name"
        | "location"
        | "tags"
        | "publicProfile.sourceSummary"
        | "publicProfile.formats"
        | "publicSources[0].href";
      extractedValue: string | null | string[];
      artifactId: string;
      contentHash: string;
      locator: string | null;
      extractedBy: "deterministic" | "model" | "human";
      extractorVersion: string;
      confidence: number | null;
    }[];
    capturedAt: FirebaseFirestore.Timestamp;
  };
  /**
   * Server-owned deterministic search projection used by admin organizer publishing. Rebuildable from canonical organizer fields; not consumed by the app.
   */
  adminSearch?: {
    /**
     * @maxItems 120
     */
    tokens: string[];
    sortKey: string;
    updatedAt: FirebaseFirestore.Timestamp;
    updatedBySource:
      | "adminCreateOrganizerDraftFromCandidate"
      | "adminApproveOrganizerListing"
      | "adminUpdateClubDetails"
      | "adminSetClubIndexStatus"
      | "adminOrganizerSearchBackfill";
  };
  /**
   * Visitor-facing organizer listing content derived from sources or owner edits. Operator evidence (fit rationale, evidence checklists, intake requests, claim and index state) and raw scrape snapshots belong in private intake and evidence collections; operator writes are checked by functions/src/organizers/organizerPublicContent.ts.
   */
  publicProfile?: {
    headline?: string | null;
    summary?: string | null;
    sourceSummary?: string | null;
    /**
     * @maxItems 12
     */
    formats?: string[];
    /**
     * @maxItems 20
     */
    facts?: {
      label: string;
      value: string;
    }[];
    /**
     * @maxItems 12
     */
    eventEvidence?: {
      title: string;
      date: string;
      location: string;
      summary: string;
      /**
       * @maxItems 12
       */
      facts: string[];
      sourceLabel: string;
      sourceHref: string;
    }[];
  };
  /**
   * @maxItems 20
   */
  publicSources?: {
    type: string;
    label: string;
    detail: string;
    href: string | null;
    confidence: "low" | "medium" | "high";
    lastCheckedAt: FirebaseFirestore.Timestamp | null;
  }[];
}

/**
 * Canonical organizer post stored at organizers/{organizerId}/posts/{postId}.
 */
export interface OrganizerPostDocument {
  authorUid: string;
  text: string;
  photoPath?: string | null;
  eventId?: string | null;
  audience: "followers";
  createdAt: FirebaseFirestore.Timestamp;
  status: "active" | "removed";
}

/**
 * Server-owned retry state and aggregate delivery receipt for one organizer follower update.
 */
export interface OrganizerPostDeliveryOperationDocument {
  organizerId: string;
  postId: string;
  authorUid: string;
  requestId: string;
  payloadHash: string;
  status: "pending" | "processing" | "completed" | "partial";
  remainingWeeklyQuota: number;
  cursorFollowId: string | null;
  recipientCount: number;
  excludedCount: number;
  activityAvailableCount: number;
  pushAttemptedCount: number;
  pushAcceptedCount: number;
  pushFailedCount: number;
  pushUnknownCount: number;
  /**
   * @maxItems 20
   */
  errorCodes: string[];
  attemptCount: number;
  leaseOwner: string | null;
  leaseExpiresAt: FirebaseFirestore.Timestamp | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  completedAt: FirebaseFirestore.Timestamp | null;
}

/**
 * Server-only post-scoped, de-identified per-recipient retry evidence for an organizer follower update.
 */
export interface OrganizerPostDeliveryRecipientDocument {
  organizerId: string;
  postId: string;
  activityStatus: "created" | "existing" | "failed";
  pushStatus: "ineligible" | "accepted" | "failed" | "unknown";
  activityNotificationId: string;
  excluded: boolean;
  errorCode: string | null;
  expiresAt: FirebaseFirestore.Timestamp;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Canonical owner or manager edge stored at organizerTeamMemberships/{organizerId_uid}.
 */
export interface OrganizerTeamMembershipDocument {
  organizerId: string;
  uid: string;
  role: "owner" | "manager";
  status: "active" | "removed";
  createdAt: FirebaseFirestore.Timestamp;
  removedAt: FirebaseFirestore.Timestamp | null;
}

/**
 * Canonical consumer follow edge stored at organizerFollows/{organizerId_uid}.
 */
export interface OrganizerFollowDocument {
  organizerId: string;
  uid: string;
  status: "active" | "inactive";
  pushNotificationsEnabled: boolean;
  followedAt: FirebaseFirestore.Timestamp;
  unfollowedAt: FirebaseFirestore.Timestamp | null;
}

/**
 * Participant-owned selection of applicant-submitted organizer-card fields. No CRM content or event sharing permission.
 */
export interface ParticipantOrganizerCardDocument {
  uid: string;
  organizerId: string;
  responseId: string;
  /**
   * @maxItems 100
   */
  questionIds: string[];
  revision: number;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Idempotency proof for a participant-reviewed form profile claim. Contains no submitted answers.
 */
export interface ParticipantProfileClaimReceiptDocument {
  uid: string;
  responseId: string;
  payloadHash: string;
  profileRevision: number;
  organizerCardId: string | null;
  createdAt: FirebaseFirestore.Timestamp;
}

export interface EventApprovalPreferenceDocument {
  eventId: string;
  organizerId: string;
  uid: string;
  revision: number;
  choices: {
    phoneUpdates: boolean;
    emailUpdates: boolean;
  };
  phoneE164: string | null;
  email: string | null;
  termsVersion: "event-approval-v1";
  receiptId: string;
  updatedAtMillis: number;
}

export interface EventApprovalNotificationReceiptDocument {
  eventId: string;
  organizerId: string;
  uid: string;
  revision: number;
  choices: {
    phoneUpdates: boolean;
    emailUpdates: boolean;
  };
  phoneE164: string | null;
  email: string | null;
  termsVersion: "event-approval-v1";
  receiptId: string;
  updatedAtMillis: number;
}

export interface EventApprovalNotificationSettingsDocument {
  enabled: boolean;
  revision: number;
  whatsapp: {
    connectionId: string;
    templateId: string;
    maxCostMicros: number;
  } | null;
  sms: {
    accountId: string;
    credentialVersion: string;
    senderId: string;
    mask: string;
    principalEntityId: string;
    dltTemplateId: string;
    approvedText: "Your event application is approved. View your next steps: {eventUrl}";
    maxCostMicros: number;
  } | null;
  email: {
    provider: "resend";
    accountId: string;
    credentialVersion: string;
    from: string;
  } | null;
  dailyPhoneLimit: number;
  monthlyPhoneLimit: number;
  dailyCostLimitMicros: number;
  monthlyCostLimitMicros: number;
}

export interface EventApprovalNotificationBudgetDocument {
  accountId: string;
  period: string;
  count: number;
  costMicros: number;
  updatedAtMillis: number;
}

export interface EventApprovalNotificationMessageDocument {
  schemaVersion: 1;
  messageId: string;
  revision: number;
  intent: {
    schemaVersion: 1;
    intentId: string;
    revision: 1;
    context: {
      mode: "live";
      applicationId: string;
      organizerId: string;
      eventId: string;
      uid: string;
      sourceResponseId: string;
      approvedAtMillis: number;
      approvalRevision: number;
    };
    createdAt: number;
    expiresAt: number;
    lane: "phone" | "email";
    /**
     * @minItems 1
     * @maxItems 2
     */
    permittedRoutes: ("approvalWhatsapp" | "approvalSms" | "approvalEmail")[];
    deliveryPolicy: {
      maxAttempts: 3;
      maxAttemptsPerRoute: 1;
      minimumRetrySeconds: 60;
    };
  };
  lifecycle: "active" | "cancelled" | "superseded" | "responded";
  /**
   * @maxItems 6
   */
  attempts: {
    schemaVersion: 1;
    attemptId: string;
    intentId: string;
    intentRevision: 1;
    ordinal: number;
    createdAt: number;
    state:
      | {
          kind: "reserved";
          at: number;
          reconcileAfter: number;
        }
      | {
          kind: "unknown";
          at: number;
          providerMessageId: string | null;
          reason: "timeout" | "connectionLost" | "workerInterrupted";
          reconcileAfter: number;
        }
      | {
          kind: "accepted" | "delivered" | "read";
          at: number;
          providerMessageId: string | null;
        }
      | {
          kind: "failed";
          at: number;
          providerMessageId: string | null;
          classification:
            | "technical"
            | "policy"
            | "suppressed"
            | "invalidRecipient";
          evidenceId: string | null;
        }
      | {
          kind: "revoked";
          at: number;
          providerMessageId: string | null;
          evidenceId: string | null;
        }
      | {
          kind: "notDispatched";
          at: number;
          reason:
            | "superseded"
            | "expired"
            | "permissionRevoked"
            | "reservationExpired"
            | "permitExpired"
            | "campaignEnded"
            | "recipientWithdrawn";
        };
    authorization: {
      permissionRevision: string;
      checkedAt: number;
      validUntil: number;
      instructionRevision: number;
    };
    mode: "live";
    context: {
      mode: "live";
      applicationId: string;
      organizerId: string;
      eventId: string;
      uid: string;
      sourceResponseId: string;
      approvedAtMillis: number;
      approvalRevision: number;
    };
    binding: {
      routeId: "approvalWhatsapp" | "approvalSms" | "approvalEmail";
      senderId: string;
      bindingRevision: number;
      recipientEndpointId: string;
      fallbackOwner: "catch";
    };
  }[];
  deliveryConflict: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * Private immutable approval WhatsApp dispatch correlation, created atomically with its shared outbox claim.
 */
export interface EventApprovalNotificationDispatchDocument {
  schemaVersion: 1;
  attemptId: string;
  messageId: string;
  context: {
    mode: "live";
    applicationId: string;
    organizerId: string;
    eventId: string;
    uid: string;
    sourceResponseId: string;
    approvedAtMillis: number;
    approvalRevision: number;
  };
  /**
   * organizerSenderConnections document id that owned the send.
   */
  senderId: string;
  bindingRevision: number;
  providerAccountId: string;
  providerPhoneNumberId: string;
  /**
   * Content hash of the sender connection snapshot authorized at claim.
   */
  senderHash: string;
  recipientEndpointId: string;
  /**
   * Hash of the E.164 destination; the raw number never appears here.
   */
  endpointHash: string;
  templateDocumentId: string;
  templateHash: string;
  /**
   * Content hash of the rendered template + variables; the status callback must carry the matching correlation.
   */
  payloadHash: string;
  createdAt: number;
}

/**
 * Private pointers to explicitly designated applicant-submitted profile and organizer-card answers. Submission prepares a proposal, never a claimed or public profile.
 */
export interface ParticipantFormProfileProposalDocument {
  uid: string;
  organizerId: string;
  formId: string;
  versionId: string;
  responseId: string;
  /**
   * @minItems 1
   * @maxItems 100
   */
  fields: {
    questionId: string;
    destination: "catchProfile" | "organizerCard";
    canonicalFieldId:
      | (
          | "givenName"
          | "familyName"
          | "displayName"
          | "dateOfBirth"
          | "age"
          | "gender"
          | "phoneNumber"
          | "email"
          | "instagramHandle"
          | "linkedinUrl"
          | "profilePhoto"
          | "city"
          | "heightCm"
          | "occupation"
          | "company"
          | "education"
          | "languages"
          | "relationshipGoal"
          | "interestedInGenders"
          | "drinking"
          | "smoking"
          | "religion"
          | "workout"
          | "diet"
          | "children"
        )
      | null;
  }[];
  createdAt: FirebaseFirestore.Timestamp;
  claimedAt?: FirebaseFirestore.Timestamp;
}

/**
 * Explicit event-specific mini-profile selection. Pointers only; current membership, profile and card revisions must still match.
 */
export interface EventChatProfileShareDocument {
  eventId: string;
  uid: string;
  organizerId: string | null;
  revision: number;
  selection: {
    profileRevision: number;
    membershipRevision: number;
    /**
     * @maxItems 14
     */
    coreFieldIds: (
      | "age"
      | "gender"
      | "city"
      | "heightCm"
      | "occupation"
      | "company"
      | "education"
      | "languages"
      | "relationshipGoal"
      | "drinking"
      | "smoking"
      | "workout"
      | "diet"
      | "children"
    )[];
    photoId: string | null;
    card: {
      responseId: string;
      revision: number;
      /**
       * @minItems 1
       * @maxItems 20
       */
      questionIds: string[];
    } | null;
    firstName?: string;
    introduction?: string;
    termsVersion: "event-profile-sharing-v1" | "event-profile-sharing-v2";
  } | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Host-controlled event conversation availability. No attendee admission or profile data.
 */
export interface EventChatRoomDocument {
  eventId: string;
  organizerId: string;
  status: "open" | "announcementsOnly" | "paused" | "closed" | "archived";
  revision: number;
  createdByUid: string;
  updatedByUid: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  lastMessageSequence?: number;
  opensAtMillis?: number | null;
  closesAtMillis?: number | null;
}

/**
 * Explicit room participation. Current admission and claimed identity must still be rechecked on every access.
 */
export interface EventChatMembershipDocument {
  eventId: string;
  organizerId: string;
  uid: string;
  status: "joined" | "left" | "removed" | "banned";
  revision: number;
  termsVersion: "event-chat-v1";
  joinedAt: FirebaseFirestore.Timestamp;
  leftAt: FirebaseFirestore.Timestamp | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  notificationsMuted?: boolean;
  removedAt?: FirebaseFirestore.Timestamp | null;
  removedByUid?: string | null;
}

/**
 * Payload-bound idempotency receipt for an explicit room availability, membership, reaction or message safety action.
 */
export interface EventChatAccessReceiptDocument {
  eventId: string;
  uid: string;
  payloadHash: string;
  revision: number;
  createdAt: FirebaseFirestore.Timestamp;
}

/**
 * Server-owned event conversation message; replies are same-room references, never quoted copies.
 */
export interface EventChatMessageDocument {
  eventId: string;
  organizerId: string;
  uid: string | null;
  sequence: number;
  text: string | null;
  replyToMessageId: string | null;
  status: "visible" | "removed";
  /**
   * Legacy omission means text.
   */
  kind?: "text" | "announcement";
  payloadHash: string;
  reactionCounts: {
    like: number;
    love: number;
    laugh: number;
    wow: number;
    sad: number;
    thanks: number;
  };
  createdAt: FirebaseFirestore.Timestamp;
  removedAt: FirebaseFirestore.Timestamp | null;
}

/**
 * One current reaction per account and message; separate from aggregated anonymous counts.
 */
export interface EventChatReactionDocument {
  eventId: string;
  messageId: string;
  uid: string;
  reaction: ("like" | "love" | "laugh" | "wow" | "sad" | "thanks") | null;
  revision: number;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Bounded expiring typing indicator, never draft text.
 */
export interface EventChatPresenceDocument {
  eventId: string;
  uid: string;
  revision: number;
  expiresAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Private, immutable form choice. Never read as dispatch permission; promotion requires response ownership and verified control of the exact endpoint.
 */
export interface FormCommunicationConsentIntentDocument {
  organizerId: string;
  formId: string;
  versionId: string;
  responseId: string;
  endpointE164: string;
  termsVersion: "form-whatsapp-v2";
  /**
   * @minItems 1
   * @maxItems 3
   */
  decisions: {
    principal: "organizer" | "catch";
    purpose: "eventOperations" | "marketing";
    copyHash: string;
    decidedAt: FirebaseFirestore.Timestamp;
  }[];
  createdAt: FirebaseFirestore.Timestamp;
}

/**
 * Server-owned Catch WhatsApp preference. Never usable as organizer messaging permission.
 */
export interface CatchCommunicationPreferenceDocument {
  uid: string;
  whatsapp: {
    status: "unknown" | "optedIn" | "optedOut";
    /**
     * Only complete evidence may make an opted-in channel eligible for managed delivery.
     */
    evidenceStatus: "notApplicable" | "complete" | "incomplete";
    currentReceiptId: string | null;
    endpointE164?: string;
    sourceResponseId?: string;
    termsVersion: string | null;
    source:
      | null
      | "publicEventRegistration"
      | "hostFormResponse"
      | "participantSettings"
      | "unsubscribeLink"
      | "inboundStop"
      | "providerWebhook"
      | "legacyIncomplete";
    sourceEventId: string | null;
    updatedAt: FirebaseFirestore.Timestamp | null;
  };
  whatsappPurposes?: {
    eventOperations?: {
      status: "unknown" | "optedIn" | "optedOut";
      /**
       * Only complete evidence may make an opted-in channel eligible for managed delivery.
       */
      evidenceStatus: "notApplicable" | "complete" | "incomplete";
      currentReceiptId: string | null;
      endpointE164?: string;
      sourceResponseId?: string;
      termsVersion: string | null;
      source:
        | null
        | "publicEventRegistration"
        | "hostFormResponse"
        | "participantSettings"
        | "unsubscribeLink"
        | "inboundStop"
        | "providerWebhook"
        | "legacyIncomplete";
      sourceEventId: string | null;
      updatedAt: FirebaseFirestore.Timestamp | null;
    };
    marketing?: {
      status: "unknown" | "optedIn" | "optedOut";
      /**
       * Only complete evidence may make an opted-in channel eligible for managed delivery.
       */
      evidenceStatus: "notApplicable" | "complete" | "incomplete";
      currentReceiptId: string | null;
      endpointE164?: string;
      sourceResponseId?: string;
      termsVersion: string | null;
      source:
        | null
        | "publicEventRegistration"
        | "hostFormResponse"
        | "participantSettings"
        | "unsubscribeLink"
        | "inboundStop"
        | "providerWebhook"
        | "legacyIncomplete";
      sourceEventId: string | null;
      updatedAt: FirebaseFirestore.Timestamp | null;
    };
  };
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Immutable participant evidence for Catch WhatsApp, separate from every organizer permission.
 */
export interface CatchCommunicationPermissionReceiptDocument {
  uid: string;
  channel: "whatsapp";
  purpose?: "eventOperations" | "marketing";
  endpointE164?: string;
  sourceVersionId?: string;
  sourceDecidedAt?: FirebaseFirestore.Timestamp;
  decision: "optedIn" | "optedOut";
  evidenceStatus: "complete" | "incomplete";
  termsVersion: string | null;
  consentCopyHash: string | null;
  source:
    | "publicEventRegistration"
    | "hostFormResponse"
    | "participantSettings"
    | "unsubscribeLink"
    | "inboundStop"
    | "providerWebhook"
    | "legacyIncomplete";
  sourceEventId: string | null;
  sourceFormId: string | null;
  sourceResponseId: string | null;
  sourceProviderEventId: string | null;
  actorClass: "participant" | "provider" | "system";
  actorUid: string | null;
  identityStrength:
    | "unknown"
    | "emailVerified"
    | "phoneVerified"
    | "catchAccount";
  grantedAt: FirebaseFirestore.Timestamp | null;
  revokedAt: FirebaseFirestore.Timestamp | null;
  supersedesReceiptId: string | null;
  createdAt: FirebaseFirestore.Timestamp;
  sourceOrganizerId: string | null;
}

/**
 * Server-owned, organizer-scoped channel consent stored at organizerCommunicationPreferences/{organizerId_uid}.
 */
export interface OrganizerCommunicationPreferenceDocument {
  organizerId: string;
  uid: string;
  whatsapp: {
    status: "unknown" | "optedIn" | "optedOut";
    /**
     * Only complete evidence may make an opted-in channel eligible for managed delivery.
     */
    evidenceStatus: "notApplicable" | "complete" | "incomplete";
    currentReceiptId: string | null;
    endpointE164?: string;
    sourceResponseId?: string;
    termsVersion: string | null;
    source:
      | null
      | "publicEventRegistration"
      | "hostFormResponse"
      | "participantSettings"
      | "unsubscribeLink"
      | "inboundStop"
      | "providerWebhook"
      | "legacyIncomplete";
    sourceEventId: string | null;
    updatedAt: FirebaseFirestore.Timestamp | null;
  };
  whatsappPurposes?: {
    eventOperations?: {
      status: "unknown" | "optedIn" | "optedOut";
      /**
       * Only complete evidence may make an opted-in channel eligible for managed delivery.
       */
      evidenceStatus: "notApplicable" | "complete" | "incomplete";
      currentReceiptId: string | null;
      endpointE164?: string;
      sourceResponseId?: string;
      termsVersion: string | null;
      source:
        | null
        | "publicEventRegistration"
        | "hostFormResponse"
        | "participantSettings"
        | "unsubscribeLink"
        | "inboundStop"
        | "providerWebhook"
        | "legacyIncomplete";
      sourceEventId: string | null;
      updatedAt: FirebaseFirestore.Timestamp | null;
    };
    marketing?: {
      status: "unknown" | "optedIn" | "optedOut";
      /**
       * Only complete evidence may make an opted-in channel eligible for managed delivery.
       */
      evidenceStatus: "notApplicable" | "complete" | "incomplete";
      currentReceiptId: string | null;
      endpointE164?: string;
      sourceResponseId?: string;
      termsVersion: string | null;
      source:
        | null
        | "publicEventRegistration"
        | "hostFormResponse"
        | "participantSettings"
        | "unsubscribeLink"
        | "inboundStop"
        | "providerWebhook"
        | "legacyIncomplete";
      sourceEventId: string | null;
      updatedAt: FirebaseFirestore.Timestamp | null;
    };
  };
  sms: {
    status: "unknown" | "optedIn" | "optedOut";
    /**
     * Only complete evidence may make an opted-in channel eligible for managed delivery.
     */
    evidenceStatus: "notApplicable" | "complete" | "incomplete";
    currentReceiptId: string | null;
    endpointE164?: string;
    sourceResponseId?: string;
    termsVersion: string | null;
    source:
      | null
      | "publicEventRegistration"
      | "hostFormResponse"
      | "participantSettings"
      | "unsubscribeLink"
      | "inboundStop"
      | "providerWebhook"
      | "legacyIncomplete";
    sourceEventId: string | null;
    updatedAt: FirebaseFirestore.Timestamp | null;
  };
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Immutable participant-controlled grant or withdrawal evidence for one organizer and channel. Current preference projections reference these receipts but never replace their history.
 */
export interface OrganizerCommunicationPermissionReceiptDocument {
  organizerId: string;
  uid: string;
  channel: "whatsapp" | "sms";
  purpose?: "eventOperations" | "marketing";
  endpointE164?: string;
  sourceVersionId?: string;
  sourceDecidedAt?: FirebaseFirestore.Timestamp;
  decision: "optedIn" | "optedOut";
  evidenceStatus: "complete" | "incomplete";
  termsVersion: string | null;
  consentCopyHash: string | null;
  source:
    | "publicEventRegistration"
    | "hostFormResponse"
    | "participantSettings"
    | "unsubscribeLink"
    | "inboundStop"
    | "providerWebhook"
    | "legacyIncomplete";
  sourceEventId: string | null;
  sourceFormId: string | null;
  sourceResponseId: string | null;
  sourceProviderEventId: string | null;
  actorClass: "participant" | "provider" | "system";
  actorUid: string | null;
  identityStrength:
    | "unknown"
    | "emailVerified"
    | "phoneVerified"
    | "catchAccount";
  grantedAt: FirebaseFirestore.Timestamp | null;
  revokedAt: FirebaseFirestore.Timestamp | null;
  supersedesReceiptId: string | null;
  createdAt: FirebaseFirestore.Timestamp;
}

/**
 * Server-owned organizer-scoped contact projection. It is not a Consumer profile and may contain restricted operational contact data.
 */
export interface OrganizerContactDocument {
  organizerId: string;
  displayName: string;
  /**
   * Organizer-scoped label correction. It never changes the Consumer profile or a provider/roster source row.
   */
  displayNameOverride?: string | null;
  searchName: string;
  linkedUid: string | null;
  phoneE164: string | null;
  email: string | null;
  identityState: "unlinked" | "verified" | "ambiguous" | "merged";
  identityConfidence: "eventOnly" | "proposed" | "verified";
  primarySource:
    | "catchBooking"
    | "hostImport"
    | "hostManual"
    | "webOtp"
    | "providerSync"
    | "hostForm";
  /**
   * @maxItems 20
   */
  ambiguousCandidateContactIds: string[];
  firstSeenAt: FirebaseFirestore.Timestamp;
  lastSeenAt: FirebaseFirestore.Timestamp;
  sourceCount: number;
  whatsappStatus: "unknown" | "optedIn" | "optedOut";
  smsStatus: "unknown" | "optedIn" | "optedOut";
  /**
   * Organizer-authored manual CRM tag ids. These are distinct from computed segment ids in organizerContactTraits.
   *
   * @maxItems 5
   */
  manualTagIds?: string[];
  revision: number;
  mergedIntoContactId: string | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  deletedAt: FirebaseFirestore.Timestamp | null;
  /**
   * Organizer-requested CRM hiding. Operational attendee and audit facts remain intact.
   */
  hiddenAt?: FirebaseFirestore.Timestamp | null;
  hiddenBy?: string | null;
  /**
   * Bounded organizer-audience contribution snapshot used only to restore a hidden contact without recomputing private event history.
   */
  hiddenTraitSnapshot?: OrganizerContactTraitDocument | null;
}

/**
 * Server-owned provenance for one organizer contact source. Source facts are immutable; only currentContactId moves during a receipt-backed merge or unmerge.
 */
export interface OrganizerContactOriginDocument {
  organizerId: string;
  currentContactId: string;
  originContactId: string;
  sourceKind:
    | "catchBooking"
    | "hostImport"
    | "hostManual"
    | "webOtp"
    | "providerSync"
    | "hostForm";
  sourceEntityKind:
    | "eventAttendee"
    | "manualEntry"
    | "hostFormResponse"
    | "providerRecord"
    | "importBatch"
    | "webRegistration"
    | "hostApplicationResponse";
  sourceEntityId: string;
  eventId: string | null;
  formId: string | null;
  responseId: string | null;
  actorClass: "participant" | "organizerManager" | "provider" | "system";
  actorUid: string | null;
  observedAt: FirebaseFirestore.Timestamp;
  originVersion: 1;
  createdAt: FirebaseFirestore.Timestamp;
}

/**
 * Organizer-scoped, author-stamped CRM note. Notes are exposed only through manager-authorized callables and are excluded from contact exports.
 */
export interface OrganizerContactNoteDocument {
  organizerId: string;
  contactId: string;
  authorUid: string;
  body: string;
  revision: number;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  updatedByUid: string;
}

/**
 * Manager-asserted outreach attempt on one organizer contact. Records are append-only through the manager-authorized record callable, appear on the contact timeline, and are excluded from contact exports.
 */
export interface OrganizerContactOutreachDocument {
  organizerId: string;
  contactId: string;
  authorUid: string;
  channel: "phoneCall" | "whatsapp" | "email" | "sms" | "inPerson" | "other";
  outcome:
    | "reached"
    | "noAnswer"
    | "leftMessage"
    | "wrongContact"
    | "attempted";
  note?: string;
  occurredAt: FirebaseFirestore.Timestamp;
  revision: number;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  updatedByUid: string;
}

/**
 * Organizer-authored manual CRM tag vocabulary. Tag ids are structurally distinct from computed audience segment ids.
 */
export interface OrganizerContactTagVocabularyDocument {
  organizerId: string;
  /**
   * @maxItems 20
   */
  tags: {
    tagId: string;
    label: string;
    normalizedLabel: string;
    createdByUid: string;
    createdAt: FirebaseFirestore.Timestamp;
  }[];
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * One reusable Customers-owned organizer CRM audience. Definitions use only the closed reviewed predicate vocabulary and never contain event-scoped or arbitrary Firestore queries.
 */
export interface OrganizerSavedAudienceDocument {
  organizerId: string;
  audienceId: string;
  scope: "organizerCrm";
  name: string;
  status: "active" | "archived";
  definition: {
    join: "all" | "any";
    /**
     * @minItems 1
     * @maxItems 8
     */
    predicates: (
      | {
          kind: "computedSegment";
          segmentId:
            | "new_to_organizer"
            | "past_attendee"
            | "first_time_attendee"
            | "repeat_attendee"
            | "regular"
            | "lapsed_regular"
            | "reliable_attendee"
            | "needs_confirmation"
            | "advocate"
            | "high_impact_advocate"
            | "whatsapp_reachable"
            | "sms_reachable";
        }
      | {
          kind: "manualTag";
          manualTagId: string;
        }
      | {
          kind: "attendanceCount";
          operator: "atLeast" | "atMost";
          eventCount: number;
        }
      | {
          kind: "lastSeenWithinDays";
          days: number;
        }
      | {
          kind: "reachableForIntent";
          intent: "organizerWhatsappCampaign";
        }
      | {
          kind: "applicationStatus";
          formId: string;
          reviewStatus:
            | "submitted"
            | "inReview"
            | "approved"
            | "waitlisted"
            | "declined";
        }
      | {
          kind: "formAnswer";
          formId: string;
          versionId: string;
          questionId: string;
          value: string | boolean;
        }
      | {
          kind: "attendedEvent";
          eventId: string;
        }
      | {
          kind: "spend";
          operator: "atLeast" | "atMost";
          currency: string;
          amountMinor: number;
          withinDays: number | null;
        }
      | {
          kind: "staticMembers";
          /**
           * @minItems 0
           * @maxItems 2500
           */
          contactIds: string[];
        }
      | {
          kind: "directoryFilters";
          /**
           * @maxItems 12
           */
          segmentIds: (
            | "new_to_organizer"
            | "past_attendee"
            | "first_time_attendee"
            | "repeat_attendee"
            | "regular"
            | "lapsed_regular"
            | "reliable_attendee"
            | "needs_confirmation"
            | "advocate"
            | "high_impact_advocate"
            | "whatsapp_reachable"
            | "sms_reachable"
          )[];
          /**
           * @maxItems 20
           */
          manualTagIds: string[];
        }
    )[];
  };
  definitionHash: string;
  definitionVersion: number;
  revision: number;
  createdByUid: string;
  updatedByUid: string;
  lastPreviewMatchCount: number | null;
  lastPreviewReachSummary?: null | {
    inCatch: number;
    automatic: number;
    byHand: number;
    unavailable: number;
  };
  lastPreviewAt: FirebaseFirestore.Timestamp | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  archivedAt: FirebaseFirestore.Timestamp | null;
}

/**
 * One durable host-performed external handoff. Catch may record preparation, external-app acceptance, and explicit host assertions, but never delivery or read state.
 */
export interface OrganizerManualSendTaskDocument {
  organizerId: string;
  taskId: string;
  contactId: string;
  sourceKind: "individualConversation" | "campaignRecipient";
  sourceId: string;
  intent: "individualConversation" | "savedAudienceCampaign";
  routeId: "personalWhatsappHandoff";
  deliveryMode: "byHand";
  status:
    | "queued"
    | "handoffOpened"
    | "hostMarkedSent"
    | "skipped"
    | "cancelled"
    | "superseded"
    | "expired";
  active: boolean;
  revision: number;
  idempotencyKey: string;
  requestHash: string;
  displayNameSnapshot: string;
  endpointE164Snapshot: string;
  endpointHash: string;
  permissionSnapshot: {
    whatsappStatus: "unknown" | "optedIn";
    adminSuppressed: false;
    recordedAt: FirebaseFirestore.Timestamp;
  };
  capabilitySnapshot: {
    version: number;
    managedRouteAvailable: boolean;
  };
  prefillText: string;
  prefillHash: string;
  openCount: number;
  createdByUid: string;
  updatedByUid: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  openedAt: FirebaseFirestore.Timestamp | null;
  hostMarkedSentAt: FirebaseFirestore.Timestamp | null;
  skippedAt: FirebaseFirestore.Timestamp | null;
  cancelledAt: FirebaseFirestore.Timestamp | null;
  supersededAt: FirebaseFirestore.Timestamp | null;
  expiresAt: FirebaseFirestore.Timestamp;
}

/**
 * Server-owned evaluated Host Today attention projection. Executable trigger, resolution, permission, deadline, and dedupe policy remains versioned in the Host attention catalog rather than embedded as prose in each document.
 */
export interface OrganizerAttentionItemDocument {
  schemaVersion: 1;
  attentionId: string;
  organizerId: string;
  kind:
    | "eventLiveOperations"
    | "eventAssistanceCaseReview"
    | "eventAssistanceDeliveryReview"
    | "eventWaitlistReview"
    | "eventJoinRequestReview"
    | "applicationReview"
    | "providerSyncFailure"
    | "formAutomationFailure"
    | "payoutSetup"
    | "attendanceSync"
    | "dressRehearsal"
    | "eventSuccessPreparation"
    | "roomLayoutSetup"
    | "eventStaffing"
    | "formResponseReview"
    | "inboxReply"
    | "postEventReconciliation"
    | "momentStaffAttention"
    | "eventOfferPaymentFollowUp";
  scope: "organizer" | "event" | "application" | "form" | "thread" | "account";
  sourceOwner:
    | "events"
    | "eventParticipations"
    | "organizerApplications"
    | "providerSyncRuns"
    | "organizerFormAutomationRuns"
    | "hostPaymentAccounts"
    | "hostAttendanceOutbox"
    | "eventAssistanceCases"
    | "operationWorkItems"
    | "eventSuccessPlans"
    | "eventRehearsals"
    | "eventStaffGrants"
    | "organizerFormResponses"
    | "organizerWhatsappThreads"
    | "eventAttendees"
    | "organizerMomentSends"
    | "organizerEventOffers";
  sourceId: string;
  sourceRevision: string;
  eventId: string | null;
  status: "open" | "resolved" | "expired" | "superseded";
  consequence:
    | "blocksLiveOperation"
    | "risksGuestExperience"
    | "risksRevenue"
    | "delaysResponse"
    | "degradesAutomation"
    | "requiresReconciliation"
    | "preparationIncomplete"
    | "informational";
  blocking: boolean;
  urgency: "immediate" | "soon" | "upcoming";
  destination: {
    route:
      | "hostEventManage"
      | "hostApplications"
      | "hostOrganizerPayments"
      | "hostAudienceForms"
      | "hostInbox"
      | "hostDressRehearsal"
      | "hostEvents"
      | "hostProgramWork";
    section: string | null;
    eventId: string | null;
    applicationId: string | null;
    formId: string | null;
    threadId: string | null;
  };
  context: {
    eventName: string | null;
    subjectLabel: string | null;
    count: number | null;
    provider: string | null;
    errorCode: string | null;
  };
  dedupeKey: string;
  policyVersion: number;
  resolutionVersion: number;
  assignedHostUid: string | null;
  openedAt: FirebaseFirestore.Timestamp;
  dueAt: FirebaseFirestore.Timestamp;
  actionExpiresAt: FirebaseFirestore.Timestamp | null;
  sourceUpdatedAt: FirebaseFirestore.Timestamp;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  resolvedAt: FirebaseFirestore.Timestamp | null;
  purgeAt: FirebaseFirestore.Timestamp | null;
}

/**
 * Server-owned entitlement document at organizerEntitlements/{organizerId} holding purchased plan grants and metered usage. Written only by admin grant/revoke callables in the pilot; managers receive a bounded callable projection.
 */
export interface OrganizerEntitlementsDocument {
  schemaVersion: 1;
  organizerId: string;
  /**
   * @maxItems 50
   */
  grants: {
    grantId: string;
    /**
     * Durable grant operation identity after the short-lived mutation receipt expires; absent only on legacy grants.
     */
    operationContentHash?: string;
    /**
     * Original grant result revision for exact replay after receipt expiry; absent only on legacy grants.
     */
    operationResultRevision?: number;
    sku:
      | "wedding_essentials"
      | "wedding_pro"
      | "wedding_signature"
      | "wedding_transport_addon"
      | "planner_annual";
    unit: "program" | "organizerYear";
    quantityTotal: number;
    quantityConsumed: number;
    validFrom: FirebaseFirestore.Timestamp;
    validUntil: FirebaseFirestore.Timestamp | null;
    source: "manualInvoice" | "checkout" | "promo";
    receiptRef: string | null;
    note: string | null;
    grantedBy: string;
    grantedAt: FirebaseFirestore.Timestamp;
    revokedAt: FirebaseFirestore.Timestamp | null;
    revokedBy: string | null;
    revokeReason: string | null;
  }[];
  meters: {
    flightDaysUsed: number;
    waConversationsUsed: number;
    periodStartsAt: FirebaseFirestore.Timestamp;
  };
  revision: number;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Idempotency receipt at organizerEntitlementReceipts/{receiptId} for admin entitlement mutations. receiptId is organizerId_operationId; a matching contentHash replays the stored result, a different hash fails closed.
 */
export interface OrganizerEntitlementReceiptDocument {
  schemaVersion: 1;
  receiptId: string;
  operationId: string;
  organizerId: string;
  actorUid: string;
  action: "grant" | "revoke";
  contentHash: string;
  resultRevision: number;
  grantId: string;
  createdAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;
}

/**
 * Server-only identity evidence edge used for keyed candidate lookup. Hashes are restricted identifiers, not anonymous data.
 */
export interface OrganizerContactIdentityLinkDocument {
  organizerId: string;
  contactId: string;
  originContactId: string;
  /**
   * Legacy evidence-row key: an attendee id for roster sources or a deterministic form-response key for Host Forms.
   */
  attendeeId: string;
  kind: "uid" | "phone" | "email" | "provider";
  identityHash: string;
  hashVersion: "hmac-sha256-v1";
  confidence: "proposed" | "verified";
  source:
    | "catchBooking"
    | "hostImport"
    | "hostManual"
    | "webOtp"
    | "providerSync"
    | "hostForm";
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Singleton organizer-scoped ownership claim for a person-verified UID or phone identity.
 */
export interface OrganizerContactIdentityClaimDocument {
  organizerId: string;
  kind: "uid" | "phone";
  identityHash: string;
  hashVersion: "hmac-sha256-v1";
  verifiedContactId: string;
  originVerifiedContactId: string;
  state: "verified" | "conflicted";
  /**
   * @maxItems 20
   */
  conflictingContactIds: string[];
  revision: number;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Rebuildable organizer-person-event fact edge projected from the canonical operational attendee.
 */
export interface OrganizerContactEventEdgeDocument {
  organizerId: string;
  contactId: string;
  originContactId: string;
  eventId: string;
  attendeeId: string;
  displayName: string;
  eventDisplayName?: string | null;
  eventOriginMode?: "catchNative" | "externalCompanion" | null;
  eventProvider?:
    | "catch"
    | "generic"
    | "luma"
    | "eventbrite"
    | "partiful"
    | "posh"
    | "bookmyshow"
    | "district"
    | "sortmyscene"
    | "airbnb"
    | null;
  linkedUid: string | null;
  phoneE164: string | null;
  email: string | null;
  source:
    | "catchBooking"
    | "hostImport"
    | "hostManual"
    | "webOtp"
    | "providerSync";
  status: "invited" | "registered" | "waitlisted" | "checkedIn" | "cancelled";
  expected: boolean;
  registered: boolean;
  cancelled: boolean;
  checkedIn: boolean;
  eventStartAt: FirebaseFirestore.Timestamp | null;
  eventEndAt: FirebaseFirestore.Timestamp | null;
  registeredAt: FirebaseFirestore.Timestamp | null;
  cancelledAt: FirebaseFirestore.Timestamp | null;
  checkedInAt: FirebaseFirestore.Timestamp | null;
  revenueAmountMinor?: number | null;
  revenueCurrency?: string | null;
  revenueSource?:
    | "hostImport"
    | "hostEstimate"
    | "providerOrder"
    | "hostAttested"
    | null;
  revenueAllocation?: "perAttendee" | "sharedOrder" | null;
  revenueOrderReference?: string | null;
  inviteLinkId?: string | null;
  inviteCapturedAt?: FirebaseFirestore.Timestamp | null;
  sourceCreatedAt: FirebaseFirestore.Timestamp;
  sourceUpdatedAt: FirebaseFirestore.Timestamp;
  revision: number;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Rebuildable, explainable organizer-contact CRM traits. Sensitive Event Success answers are excluded by contract.
 */
export interface OrganizerContactTraitDocument {
  organizerId: string;
  contactId: string;
  expectedEventCount: number;
  attendedEventCount: number;
  cancelledEventCount: number;
  noShowCount: number;
  importedEventCount: number;
  referredRegistrationCount: number;
  referredCheckedInCount: number;
  referredCheckedIn365DayCount: number;
  linkedAccount: boolean;
  firstSeenAt: FirebaseFirestore.Timestamp;
  lastSeenAt: FirebaseFirestore.Timestamp;
  firstAttendedAt: FirebaseFirestore.Timestamp | null;
  lastAttendedAt: FirebaseFirestore.Timestamp | null;
  attendanceRate: number | null;
  /**
   * @maxItems 16
   */
  segmentIds: (
    | "new_to_organizer"
    | "past_attendee"
    | "first_time_attendee"
    | "repeat_attendee"
    | "regular"
    | "lapsed_regular"
    | "reliable_attendee"
    | "needs_confirmation"
    | "advocate"
    | "high_impact_advocate"
    | "whatsapp_reachable"
    | "sms_reachable"
  )[];
  definitionVersion: number;
  whatsappStatus: "unknown" | "optedIn" | "optedOut";
  smsStatus: "unknown" | "optedIn" | "optedOut";
  sourceCoverage: "exact" | "partial" | "insufficientData";
  projectionVersion: number;
  computedAt: FirebaseFirestore.Timestamp;
}

/**
 * Server-maintained scalable organizer audience summary projected from contact traits.
 */
export interface OrganizerAudienceSummaryDocument {
  organizerId: string;
  contactCount: number;
  pastAttendeeCount: number;
  repeatAttendeeCount: number;
  linkedAccountCount: number;
  importedContactCount: number;
  advocateCount: number;
  highImpactAdvocateCount: number;
  whatsappOptInCount: number;
  smsOptInCount: number;
  sourceCoverage: "exact" | "partial";
  projectionVersion: number;
  computedAt: FirebaseFirestore.Timestamp;
}

/**
 * Short-lived exactly-once receipt for a contact-trait delta applied to an organizer audience summary.
 */
export interface OrganizerAudienceProjectionReceiptDocument {
  organizerId: string;
  eventId: string;
  createdAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;
}

/**
 * Immutable evidence for a manager-confirmed organizer contact merge or its reversal.
 */
export interface OrganizerContactMergeReceiptDocument {
  organizerId: string;
  operation: "merge" | "unmerge";
  survivorContactId: string;
  sourceContactId: string;
  /**
   * @maxItems 20
   */
  evidence: (
    | "sameVerifiedUid"
    | "sameVerifiedPhone"
    | "sameImportedPhone"
    | "sameEmail"
    | "managerConfirmed"
  )[];
  /**
   * @maxItems 20
   */
  conflicts: string[];
  actorUid: string;
  survivorRevision: number;
  sourceRevision: number;
  /**
   * @maxItems 400
   */
  movedEdgeIds: string[];
  /**
   * @maxItems 400
   */
  movedIdentityEvidenceIds: string[];
  /**
   * @maxItems 400
   */
  movedClaimIds: string[];
  /**
   * @maxItems 400
   */
  movedOriginIds: string[];
  movedEdgeCount: number;
  movedIdentityEvidenceCount: number;
  movedClaimCount: number;
  movedOriginCount: number;
  idempotencyKey: string;
  reversalOfReceiptId: string | null;
  createdAt: FirebaseFirestore.Timestamp;
  /**
   * @maxItems 200
   */
  seatMoves?: {
    eventId: string;
    aliasId: string;
    kind: "contact" | "contactOrigin";
    valueHash: string;
    before: {
      canonicalKey: string;
      identityRevision: number;
      migrationRevision: number;
      state: "ready";
    } | null;
    after: {
      canonicalKey: string;
      identityRevision: number;
      migrationRevision: number;
      state: "ready";
    };
  }[];
  /**
   * @maxItems 100
   */
  seatEventGuards?: {
    eventId: string;
    ledgerRevision: number;
    migrationRevision: number;
    sourceReservation: {
      canonicalKey: string;
      identityRevision: number;
      revision: number;
      active: boolean;
    } | null;
    survivorReservation: {
      canonicalKey: string;
      identityRevision: number;
      revision: number;
      active: boolean;
    } | null;
    /**
     * @maxItems 200
     */
    aliasIdsBefore: string[];
    sourceAlias: {
      canonicalKey: string;
      identityRevision: number;
      migrationRevision: number;
      state: "ready";
    } | null;
    survivorAlias: {
      canonicalKey: string;
      identityRevision: number;
      migrationRevision: number;
      state: "ready";
    } | null;
  }[];
  /**
   * @maxItems 200
   */
  seatAdmissionGuards?: {
    eventId: string;
    responseId: string;
    ownershipId: string;
    receiptId: string | null;
  }[];
  /**
   * @maxItems 400
   */
  survivorOriginIdsBefore?: string[];
  /**
   * @maxItems 200
   */
  sourceOriginAliasIdsBefore?: string[];
}

/**
 * Latest manager decision for one deterministic organizer-contact candidate pair. A different-people decision suppresses the pair until the same manager reopens it.
 */
export interface OrganizerContactMergeReviewDecisionDocument {
  schemaVersion: 1;
  decisionId: string;
  organizerId: string;
  /**
   * @minItems 2
   * @maxItems 2
   */
  contactIds: string[];
  state: "differentPeople" | "reopened";
  reviewedByUid: string;
  reviewedAt: FirebaseFirestore.Timestamp;
  reopenedByUid: string | null;
  reopenedAt: FirebaseFirestore.Timestamp | null;
  revision: number;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Safe organizer-owned messaging sender metadata. Provider access tokens live in Secret Manager, never Firestore.
 */
export interface OrganizerSenderConnectionDocument {
  organizerId: string;
  channel: "whatsapp";
  provider: "metaCloudApi";
  status:
    | "pending"
    | "testing"
    | "active"
    | "degraded"
    | "blocked"
    | "tokenRevoked"
    | "disconnected";
  wabaId: string | null;
  phoneNumberId: string | null;
  businessId: string | null;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  secretVersionResource: string | null;
  qualityRating: null | "GREEN" | "YELLOW" | "RED" | "UNKNOWN";
  messagingLimitTier: string | null;
  templateSyncStatus: "notStarted" | "current" | "stale" | "failed";
  webhookStatus: "notSubscribed" | "subscribed" | "degraded";
  testStatus: "notSent" | "pending" | "delivered" | "failed";
  testProviderMessageId: string | null;
  testRecipientHash: string | null;
  connectedByUid: string;
  revision: number;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  lastHealthSyncAt?: FirebaseFirestore.Timestamp | null;
  disconnectedAt: FirebaseFirestore.Timestamp | null;
}

/**
 * Safe organizer-owned booking-provider connection metadata. Provider credentials live in Secret Manager, never Firestore.
 */
export interface OrganizerProviderConnectionDocument {
  organizerId: string;
  provider: "luma";
  adapterClass: "A";
  status: "active" | "degraded" | "credentialRevoked" | "disconnected";
  externalAccountId: string;
  externalAccountName: string;
  secretVersionResource: string | null;
  syncMode: "manualPoll";
  capabilities: {
    eventList: boolean;
    rosterIdentity: boolean;
    registrationStatus: boolean;
    providerCheckIn: boolean;
    orderAmount: boolean;
    refundStatus: boolean;
    referralCode: boolean;
    webhooks: boolean;
    writeBookings: boolean;
  };
  connectedByUid: string;
  revision: number;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  lastHealthSyncAt: FirebaseFirestore.Timestamp | null;
  lastSuccessfulSyncAt: FirebaseFirestore.Timestamp | null;
  lastErrorCode: string | null;
  disconnectedAt: FirebaseFirestore.Timestamp | null;
}

/**
 * Provider-neutral organizer-owned application form metadata. Published questions live in immutable version documents.
 */
export interface OrganizerApplicationFormDocument {
  organizerId: string;
  createdByUid: string;
  title: string;
  description: string | null;
  status: "draft" | "published" | "archived";
  defaultTargetKind: "organizer" | "event" | "campaign";
  activeVersionId: string | null;
  revision: number;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  archivedAt: FirebaseFirestore.Timestamp | null;
}

/**
 * Immutable published or imported snapshot of one organizer application form.
 */
export interface OrganizerApplicationFormVersionDocument {
  organizerId: string;
  formId: string;
  version: number;
  state: "draftSnapshot" | "published" | "retired";
  title: string;
  description: string | null;
  /**
   * @minItems 1
   * @maxItems 100
   */
  questions: {
    questionId: string;
    key: string;
    label: string;
    helpText: string | null;
    kind:
      | "shortText"
      | "longText"
      | "singleChoice"
      | "multiChoice"
      | "date"
      | "phone"
      | "email"
      | "url"
      | "number"
      | "boolean"
      | "file";
    required: boolean;
    /**
     * @maxItems 100
     */
    options: {
      optionId: string;
      label: string;
      value: string;
    }[];
    canonicalFieldId:
      | (
          | "givenName"
          | "familyName"
          | "displayName"
          | "dateOfBirth"
          | "age"
          | "gender"
          | "phoneNumber"
          | "email"
          | "instagramHandle"
          | "linkedinUrl"
          | "profilePhoto"
          | "city"
          | "heightCm"
          | "occupation"
          | "company"
          | "education"
          | "languages"
          | "relationshipGoal"
          | "interestedInGenders"
          | "drinking"
          | "smoking"
          | "religion"
          | "workout"
          | "diet"
          | "children"
        )
      | null;
    privacyClass: "contact" | "profile" | "sensitive" | "organizerCustom";
    prefillPolicy: "never" | "participantReviewRequired";
    hostPresentation: "detailOnly" | "filterable" | "sortable";
  }[];
  consentCopy: string;
  consentVersion: string;
  retentionCopy: string;
  createdByUid: string;
  createdAt: FirebaseFirestore.Timestamp;
  publishedAt: FirebaseFirestore.Timestamp | null;
}

/**
 * Organizer-owned generic form metadata and lifecycle. Editable content lives in a draft and published content in immutable versions.
 */
export interface OrganizerFormDocument {
  /**
   * Unreleased form response reservations awaiting a fee. Legacy omitted means zero.
   */
  pendingPaymentCount?: number;
  organizerId: string;
  createdByUid: string;
  title: string;
  description: string | null;
  purpose:
    | "application"
    | "registration"
    | "intake"
    | "waiver"
    | "feedback"
    | "survey";
  status: "draft" | "published" | "paused" | "archived";
  templateId: string | null;
  publicFormId: string;
  defaultTargetKind: "organizer" | "event" | "campaign";
  defaultTargetId: string | null;
  activeVersionId: string | null;
  draftRevision: number;
  publishedVersion: number;
  submittedResponseCount: number;
  consequenceProjection?: {
    version: 1;
    coverage: "exact" | "identityOnly" | "unavailable";
    identityPolicy:
      | (
          | "anonymous"
          | "emailVerified"
          | "phoneVerified"
          | "emailOrPhoneVerified"
          | "catchAccount"
        )
      | null;
    /**
     * @maxItems 7
     */
    enabledAutomationActionKinds: (
      | "notifyTeam"
      | "addOrganizerTag"
      | "createCrmContact"
      | "addApplicationQueue"
      | "proposeEventAttendee"
      | "signedWebhook"
      | "campaignHandoff"
    )[];
    enabledAutomationActionKindCounts: {
      notifyTeam: number;
      addOrganizerTag: number;
      createCrmContact: number;
      addApplicationQueue: number;
      proposeEventAttendee: number;
      signedWebhook: number;
      campaignHandoff: number;
    };
  };
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  publishedAt: FirebaseFirestore.Timestamp | null;
  pausedAt: FirebaseFirestore.Timestamp | null;
  archivedAt: FirebaseFirestore.Timestamp | null;
  lastResponseAt: FirebaseFirestore.Timestamp | null;
}

/**
 * Server-owned exact hostname lease and verified form binding. Client reads and writes are forbidden.
 */
export interface OrganizerFormDomainDocument {
  hostname: string;
  organizerId: string;
  formId: string;
  publicFormId: string;
  ownershipChallenge: string;
  expectedCname: string;
  status: "pending" | "verified" | "active" | "revoked";
  certificateStatus: "pending" | "ready" | "failed";
  verifiedAtMillis: number | null;
  generation: number;
  reservedAtMillis: number;
  pendingExpiresAtMillis: number;
}

/**
 * Merchant-owned Razorpay OAuth connection. Secret values are held in the bound credential vault; this server-only document contains pinned references.
 */
export interface OrganizerPaymentConnectionDocument {
  organizerId: string;
  provider: "razorpay";
  mode: "test" | "live";
  status: "connecting" | "ready" | "needsAttention" | "disconnected";
  accountId: string | null;
  publicToken: string | null;
  secretVersionResource: string | null;
  tokenExpiresAt: FirebaseFirestore.Timestamp | null;
  webhookId: string | null;
  webhookUrl: string | null;
  webhookVerifiedAt: FirebaseFirestore.Timestamp | null;
  connectedByUid: string;
  revision: number;
  refreshLeaseUntil: FirebaseFirestore.Timestamp | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  disconnectedAt: FirebaseFirestore.Timestamp | null;
  lastErrorCode: string | null;
}

/**
 * Single-use hashed OAuth state bound to initiating user, organizer, connection and mode.
 */
export interface OrganizerPaymentOauthStateDocument {
  organizerId: string;
  connectionId: string;
  actorUid: string;
  mode: "test" | "live";
  status: "pending" | "exchanging" | "completed" | "failed";
  createdAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;
  completedAt: FirebaseFirestore.Timestamp | null;
}

/**
 * Operator-owned app defaults and organizer overrides. Null inherits at organizer scope and disables at app scope. An explicit disabled selection never inherits.
 */
export interface PaymentRoutingPolicyDocument {
  scope: "app" | "organizer";
  organizerId: string | null;
  revision: number;
  formFee:
    | (
        | {
            route: "disabled";
          }
        | {
            route:
              | "razorpayRoute"
              | "razorpayOAuth"
              | "stripeConnectDirect"
              | "stripeConnectDestination";
            mode: "test" | "live";
            currency: string;
            merchantCountry: string;
          }
      )
    | null;
  eventAdmission:
    | (
        | {
            route: "disabled";
          }
        | {
            route:
              | "razorpayRoute"
              | "razorpayOAuth"
              | "stripeConnectDirect"
              | "stripeConnectDestination";
            mode: "test" | "live";
            currency: string;
            merchantCountry: string;
          }
      )
    | null;
  updatedAt: FirebaseFirestore.Timestamp;
  lastMutationHash?: string;
}

/**
 * Durable form fee ledger. Frozen answers remain in the revision-bound response draft; payment is separate from application review and event admission.
 */
export interface OrganizerFormPaymentDocument {
  routing?: {
    version: 1;
    amountMinor: number;
    transferAmountMinor: number | null;
    settlementHold: boolean | null;
    purpose: "formFee" | "eventAdmission";
    organizerId: string;
    selection: {
      route:
        | "razorpayRoute"
        | "razorpayOAuth"
        | "stripeConnectDirect"
        | "stripeConnectDestination";
      mode: "test" | "live";
      currency: string;
      merchantCountry: string;
    };
    policySource: "app" | "organizer" | "legacy";
    appRevision: number;
    organizerRevision: number;
    bindingId: string;
    merchantAccountId: string;
    destinationAccountId: string | null;
    configurationVersion: string;
    checkoutKey: string | null;
  };
  organizerId: string;
  formId: string;
  versionId: string;
  draftId: string;
  respondentUid: string;
  connectionId: string | null;
  accountId: string;
  mode: "test" | "live";
  draftRevision: number;
  answersHash: string;
  identity: {
    displayName: string | null;
    email: string | null;
    phoneE164: string | null;
    searchName: string | null;
    origin: "anonymous" | "respondentGranted" | "organizerAcquired";
  };
  amountPaise: number;
  currency: "INR";
  description: string;
  refundPolicy: string;
  receipt: string;
  status:
    | "creatingOrder"
    | "orderUnknown"
    | "checkoutReady"
    | "verifying"
    | "captured"
    | "submitted"
    | "failed"
    | "expired"
    | "refundPending"
    | "refunded"
    | "reviewRequired";
  providerOrderId: string | null;
  providerPaymentId: string | null;
  providerRefundId: string | null;
  refundedAmountPaise: number;
  responseId: string | null;
  reservationReleased: boolean;
  leaseUntil: FirebaseFirestore.Timestamp | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  checkoutExpiresAt: FirebaseFirestore.Timestamp;
  capturedAt: FirebaseFirestore.Timestamp | null;
  submittedAt: FirebaseFirestore.Timestamp | null;
  lastErrorCode: string | null;
}

/**
 * Deduplicated, verified merchant webhook receipt. Raw provider payloads and credentials are never stored.
 */
export interface OrganizerFormPaymentWebhookDocument {
  connectionId: string | null;
  accountId: string;
  providerEventId: string;
  event: string;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  status: "pending" | "processed" | "ignored";
  createdAt: FirebaseFirestore.Timestamp;
  processedAt: FirebaseFirestore.Timestamp | null;
  expiresAt: FirebaseFirestore.Timestamp;
  nextAttemptAt: FirebaseFirestore.Timestamp;
  platformConfigurationVersion?: string;
}

/**
 * Mutable optimistic-revision builder state for one organizer form.
 */
export interface OrganizerFormDraftDocument {
  organizerId: string;
  formId: string;
  revision: number;
  definition: {
    title: string;
    description: string | null;
    purpose:
      | "application"
      | "registration"
      | "intake"
      | "waiver"
      | "feedback"
      | "survey";
    defaultTargetKind: "organizer" | "event" | "campaign";
    defaultTargetId: string | null;
    identityPolicy:
      | "anonymous"
      | "emailVerified"
      | "phoneVerified"
      | "emailOrPhoneVerified"
      | "catchAccount";
    /**
     * @minItems 1
     * @maxItems 40
     */
    sections: {
      sectionId: string;
      title: string;
      description: string | null;
      pageBreak: boolean;
      /**
       * @maxItems 100
       */
      questions: {
        questionId: string;
        key: string;
        label: string;
        helpText: string | null;
        kind:
          | "shortText"
          | "longText"
          | "singleChoice"
          | "multiChoice"
          | "date"
          | "phone"
          | "email"
          | "url"
          | "number"
          | "boolean"
          | "file"
          | "acknowledgement"
          | "signature";
        required: boolean;
        /**
         * @maxItems 100
         */
        options: {
          optionId: string;
          label: string;
          value: string;
        }[];
        canonicalFieldId:
          | (
              | "givenName"
              | "familyName"
              | "displayName"
              | "dateOfBirth"
              | "age"
              | "gender"
              | "phoneNumber"
              | "email"
              | "instagramHandle"
              | "linkedinUrl"
              | "profilePhoto"
              | "city"
              | "heightCm"
              | "occupation"
              | "company"
              | "education"
              | "languages"
              | "relationshipGoal"
              | "interestedInGenders"
              | "drinking"
              | "smoking"
              | "religion"
              | "workout"
              | "diet"
              | "children"
            )
          | null;
        privacyClass: "contact" | "profile" | "sensitive" | "organizerCustom";
        /**
         * Omitted legacy values mean organizerOnly. A canonical mapping never grants profile sharing permission. Catch profile and organizer card answers remain private until participant claim and explicit sharing.
         */
        answerDestination?: "organizerOnly" | "catchProfile" | "organizerCard";
        /**
         * Optional published audience intent. Omission on older versions means organizerOnly; selection and event-specific consent are still required before any attendee projection.
         */
        answerAudience?: {
          mode: "organizerOnly" | "eventMembersWithConsent";
          eventProfileSlot: null | "customRow";
        };
        prefillPolicy: "never" | "participantReviewRequired";
        hostPresentation: "detailOnly" | "filterable" | "sortable";
        validation: {
          minLength: number | null;
          maxLength: number | null;
          minNumber: number | null;
          maxNumber: number | null;
          earliestDate: string | null;
          latestDate: string | null;
          minSelections: number | null;
          maxSelections: number | null;
          maxFileCount: number | null;
          maxFileSizeBytes: number | null;
          /**
           * @maxItems 20
           */
          allowedMimeTypes: string[];
          patternPreset:
            | null
            | "lettersAndSpaces"
            | "alphanumeric"
            | "postalCode"
            | "handle";
          customError: string | null;
        };
      }[];
    }[];
    /**
     * @maxItems 100
     */
    logicRules: {
      ruleId: string;
      conditionMode: "all" | "any";
      /**
       * @minItems 1
       * @maxItems 20
       */
      conditions: {
        questionId: string;
        operator:
          | "equals"
          | "notEquals"
          | "contains"
          | "notContains"
          | "greaterThan"
          | "lessThan"
          | "answered"
          | "notAnswered";
        /**
         * @maxItems 20
         */
        expectedValues: (string | number | boolean)[];
      }[];
      action:
        | "showQuestion"
        | "hideQuestion"
        | "showSection"
        | "hideSection"
        | "routeToSection"
        | "finish";
      targetQuestionId: string | null;
      targetSectionId: string | null;
    }[];
    appearance: {
      preset: "editorial" | "minimal" | "activity";
      logoAssetId: string | null;
      coverAssetId: string | null;
      activityKind: string | null;
    };
    availability: {
      opensAt: FirebaseFirestore.Timestamp | null;
      closesAt: FirebaseFirestore.Timestamp | null;
      responseLimit: number | null;
      closedMessage: string | null;
    };
    consent: {
      consentCopy: string;
      consentVersion: string;
      retentionCopy: string;
    };
    payment?: {
      connectionId: string | null;
      amountPaise: number;
      currency: "INR";
      description: string;
      refundPolicy: string;
    } | null;
    /**
     * Controls which separate, optional, initially unchecked WhatsApp choices are offered. These settings are never respondent consent.
     */
    messagingConsent?: {
      organizerWhatsapp: boolean;
      catchWhatsapp: boolean;
      organizerOperationsWhatsapp?: boolean;
      organizerMarketingWhatsapp?: boolean;
      catchMarketingWhatsapp?: boolean;
    };
    eventProfile?: {
      enabled: boolean;
      /**
       * @maxItems 4
       */
      allowedSlots: (
        | "displayName"
        | "portrait"
        | "introduction"
        | "customRow"
      )[];
      maxCustomRows: number;
      noticeVersion: "event-profile-sharing-v2";
    };
    completion: {
      title: string;
      message: string | null;
      actionKind: "none" | "externalUrl" | "event" | "eventRuntime";
      actionLabel: string | null;
      actionUrl: string | null;
    };
  };
  updatedByUid: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Immutable published definition of one generic organizer form version.
 */
export interface OrganizerFormVersionDocument {
  organizerId: string;
  formId: string;
  version: number;
  sourceDraftRevision: number;
  definition: {
    title: string;
    description: string | null;
    purpose:
      | "application"
      | "registration"
      | "intake"
      | "waiver"
      | "feedback"
      | "survey";
    defaultTargetKind: "organizer" | "event" | "campaign";
    defaultTargetId: string | null;
    identityPolicy:
      | "anonymous"
      | "emailVerified"
      | "phoneVerified"
      | "emailOrPhoneVerified"
      | "catchAccount";
    /**
     * @minItems 1
     * @maxItems 40
     */
    sections: {
      sectionId: string;
      title: string;
      description: string | null;
      pageBreak: boolean;
      /**
       * @maxItems 100
       */
      questions: {
        questionId: string;
        key: string;
        label: string;
        helpText: string | null;
        kind:
          | "shortText"
          | "longText"
          | "singleChoice"
          | "multiChoice"
          | "date"
          | "phone"
          | "email"
          | "url"
          | "number"
          | "boolean"
          | "file"
          | "acknowledgement"
          | "signature";
        required: boolean;
        /**
         * @maxItems 100
         */
        options: {
          optionId: string;
          label: string;
          value: string;
        }[];
        canonicalFieldId:
          | (
              | "givenName"
              | "familyName"
              | "displayName"
              | "dateOfBirth"
              | "age"
              | "gender"
              | "phoneNumber"
              | "email"
              | "instagramHandle"
              | "linkedinUrl"
              | "profilePhoto"
              | "city"
              | "heightCm"
              | "occupation"
              | "company"
              | "education"
              | "languages"
              | "relationshipGoal"
              | "interestedInGenders"
              | "drinking"
              | "smoking"
              | "religion"
              | "workout"
              | "diet"
              | "children"
            )
          | null;
        privacyClass: "contact" | "profile" | "sensitive" | "organizerCustom";
        /**
         * Omitted legacy values mean organizerOnly. A canonical mapping never grants profile sharing permission. Catch profile and organizer card answers remain private until participant claim and explicit sharing.
         */
        answerDestination?: "organizerOnly" | "catchProfile" | "organizerCard";
        /**
         * Optional published audience intent. Omission on older versions means organizerOnly; selection and event-specific consent are still required before any attendee projection.
         */
        answerAudience?: {
          mode: "organizerOnly" | "eventMembersWithConsent";
          eventProfileSlot: null | "customRow";
        };
        prefillPolicy: "never" | "participantReviewRequired";
        hostPresentation: "detailOnly" | "filterable" | "sortable";
        validation: {
          minLength: number | null;
          maxLength: number | null;
          minNumber: number | null;
          maxNumber: number | null;
          earliestDate: string | null;
          latestDate: string | null;
          minSelections: number | null;
          maxSelections: number | null;
          maxFileCount: number | null;
          maxFileSizeBytes: number | null;
          /**
           * @maxItems 20
           */
          allowedMimeTypes: string[];
          patternPreset:
            | null
            | "lettersAndSpaces"
            | "alphanumeric"
            | "postalCode"
            | "handle";
          customError: string | null;
        };
      }[];
    }[];
    /**
     * @maxItems 100
     */
    logicRules: {
      ruleId: string;
      conditionMode: "all" | "any";
      /**
       * @minItems 1
       * @maxItems 20
       */
      conditions: {
        questionId: string;
        operator:
          | "equals"
          | "notEquals"
          | "contains"
          | "notContains"
          | "greaterThan"
          | "lessThan"
          | "answered"
          | "notAnswered";
        /**
         * @maxItems 20
         */
        expectedValues: (string | number | boolean)[];
      }[];
      action:
        | "showQuestion"
        | "hideQuestion"
        | "showSection"
        | "hideSection"
        | "routeToSection"
        | "finish";
      targetQuestionId: string | null;
      targetSectionId: string | null;
    }[];
    appearance: {
      preset: "editorial" | "minimal" | "activity";
      logoAssetId: string | null;
      coverAssetId: string | null;
      activityKind: string | null;
    };
    availability: {
      opensAt: FirebaseFirestore.Timestamp | null;
      closesAt: FirebaseFirestore.Timestamp | null;
      responseLimit: number | null;
      closedMessage: string | null;
    };
    consent: {
      consentCopy: string;
      consentVersion: string;
      retentionCopy: string;
    };
    payment?: {
      connectionId: string | null;
      amountPaise: number;
      currency: "INR";
      description: string;
      refundPolicy: string;
    } | null;
    /**
     * Controls which separate, optional, initially unchecked WhatsApp choices are offered. These settings are never respondent consent.
     */
    messagingConsent?: {
      organizerWhatsapp: boolean;
      catchWhatsapp: boolean;
      organizerOperationsWhatsapp?: boolean;
      organizerMarketingWhatsapp?: boolean;
      catchMarketingWhatsapp?: boolean;
    };
    eventProfile?: {
      enabled: boolean;
      /**
       * @maxItems 4
       */
      allowedSlots: (
        | "displayName"
        | "portrait"
        | "introduction"
        | "customRow"
      )[];
      maxCustomRows: number;
      noticeVersion: "event-profile-sharing-v2";
    };
    completion: {
      title: string;
      message: string | null;
      actionKind: "none" | "externalUrl" | "event" | "eventRuntime";
      actionLabel: string | null;
      actionUrl: string | null;
    };
  };
  createdByUid: string;
  createdAt: FirebaseFirestore.Timestamp;
  publishedAt: FirebaseFirestore.Timestamp;
}

/**
 * Expiring version-bound respondent autosave state.
 */
export interface OrganizerFormResponseDraftDocument {
  messagingDecision?: {
    termsVersion: "form-whatsapp-v1" | "form-whatsapp-v2";
    organizerWhatsapp: boolean;
    catchWhatsapp: boolean;
    organizerDecidedAt: FirebaseFirestore.Timestamp;
    catchDecidedAt: FirebaseFirestore.Timestamp;
    organizerOperationsWhatsapp?: boolean;
    organizerMarketingWhatsapp?: boolean;
    catchMarketingWhatsapp?: boolean;
    organizerOperationsDecidedAt?: FirebaseFirestore.Timestamp;
    organizerMarketingDecidedAt?: FirebaseFirestore.Timestamp;
    catchMarketingDecidedAt?: FirebaseFirestore.Timestamp;
  };
  /**
   * Server-only checkout lock; prevents edits while a fee is unresolved.
   */
  paymentAttemptId?: string | null;
  organizerId: string;
  formId: string;
  versionId: string;
  publicFormId: string;
  status: "active" | "submitted" | "expired" | "withdrawn";
  revision: number;
  identityKind:
    | "anonymous"
    | "emailVerified"
    | "phoneVerified"
    | "catchAccount";
  respondentUid: string | null;
  draftTokenHash: string | null;
  answers: {
    [k: string]: string | number | boolean | null | string[];
  };
  consentAccepted: boolean;
  consentVersion: string;
  sourceLinkId: string | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;
  submittedResponseId: string | null;
}

/**
 * Immutable submitted response envelope with withdrawal state.
 */
export interface OrganizerFormResponseDocument {
  organizerId: string;
  formId: string;
  versionId: string;
  publicFormId: string;
  draftId: string;
  status: "submitted" | "withdrawn";
  identityKind:
    | "anonymous"
    | "emailVerified"
    | "phoneVerified"
    | "catchAccount";
  respondentUid: string | null;
  identity: {
    displayName: string | null;
    email: string | null;
    phoneE164: string | null;
    searchName: string | null;
    origin: "anonymous" | "respondentGranted" | "organizerAcquired";
  };
  withdrawalTokenHash: string | null;
  answers: {
    [k: string]: string | number | boolean | null | string[];
  };
  /**
   * @maxItems 4000
   */
  answerSnapshots: {
    questionId: string;
    key: string;
    label: string;
    kind:
      | "shortText"
      | "longText"
      | "singleChoice"
      | "multiChoice"
      | "date"
      | "phone"
      | "email"
      | "url"
      | "number"
      | "boolean"
      | "file"
      | "acknowledgement"
      | "signature";
    answer: string | number | boolean | null | string[];
  }[];
  consentVersion: string;
  sourceLinkId: string | null;
  completionMillis: number;
  submittedAt: FirebaseFirestore.Timestamp;
  withdrawnAt: FirebaseFirestore.Timestamp | null;
}

/**
 * Version- and draft-scoped metadata for private respondent uploads; bytes remain in protected Storage.
 */
export interface OrganizerFormAssetDocument {
  organizerId: string;
  formId: string;
  versionId: string;
  draftId: string;
  questionId: string;
  respondentUid: string | null;
  uploadTokenHash: string;
  storagePath: string;
  originalFileName: string;
  contentType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
  declaredSizeBytes: number;
  declaredSha256: string;
  sizeBytes: number | null;
  status: "uploading" | "ready" | "rejected" | "deleted";
  createdAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;
  finalizedAt: FirebaseFirestore.Timestamp | null;
  deletedAt: FirebaseFirestore.Timestamp | null;
}

/**
 * Precomputed form/version funnel or privacy-aware question aggregate.
 */
export interface OrganizerFormAggregateDocument {
  organizerId: string;
  formId: string;
  versionId: string;
  scope: "version" | "question";
  questionId: string | null;
  questionLabel: string | null;
  questionKind:
    | (
        | "shortText"
        | "longText"
        | "singleChoice"
        | "multiChoice"
        | "date"
        | "phone"
        | "email"
        | "url"
        | "number"
        | "boolean"
        | "file"
        | "acknowledgement"
        | "signature"
      )
    | null;
  privacyClass: null | "contact" | "profile" | "sensitive" | "organizerCustom";
  opens: number;
  starts: number;
  submissions: number;
  withdrawals: number;
  completionMillisTotal: number;
  /**
   * @maxItems 12
   */
  completionBuckets: {
    upperBoundMillis: number;
    count: number;
  }[];
  /**
   * @maxItems 100
   */
  choiceCounts: {
    value: string | boolean;
    label: string;
    count: number;
  }[];
  numericCount: number;
  numericSum: number;
  numericMin: number | null;
  numericMax: number | null;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Idempotency marker for one aggregate projection event.
 */
export interface OrganizerFormAggregateEventDocument {
  organizerId: string;
  formId: string;
  versionId: string;
  responseId: string;
  eventKind: "submitted" | "withdrawn";
  projectedAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;
}

/**
 * Asynchronous, expiring, manager-requested form response export receipt.
 */
export interface OrganizerFormExportDocument {
  organizerId: string;
  formId: string;
  requestedByUid: string;
  requestId: string;
  format: "csv" | "xlsx";
  /**
   * @minItems 1
   * @maxItems 2
   */
  statuses: ("submitted" | "withdrawn")[];
  versionId: string | null;
  fromMillis: number | null;
  toMillis: number | null;
  status: "pending" | "running" | "completed" | "failed" | "expired";
  rowCount: number;
  storagePath: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  completedAt: FirebaseFirestore.Timestamp | null;
  expiresAt: FirebaseFirestore.Timestamp;
  /**
   * Optional exact typed filter and sort. Export covers all matches, not one page.
   */
  responseQuery?: QueryOrganizerFormResponsesCallablePayload | null;
  /**
   * Required with responseQuery; changed results fail rather than silently exporting a different set.
   */
  expectedResultHash?: string | null;
  /**
   * Required with responseQuery; binds the published definition and filter semantics.
   */
  expectedQueryHash?: string | null;
}

/**
 * Manager-authored, revisioned, explicit form automation.
 */
export interface OrganizerFormAutomationRuleDocument {
  organizerId: string;
  formId: string | null;
  name: string;
  enabled: boolean;
  revision: number;
  trigger:
    | "responseSubmitted"
    | "responseWithdrawn"
    | "answerMatches"
    | "applicationAccepted"
    | "eventAttended";
  condition: {
    questionId: string;
    operator:
      | "equals"
      | "notEquals"
      | "contains"
      | "notContains"
      | "greaterThan"
      | "lessThan"
      | "answered"
      | "notAnswered";
    /**
     * @maxItems 20
     */
    expectedValues: (string | number | boolean)[];
  } | null;
  /**
   * @minItems 1
   * @maxItems 10
   */
  actions: {
    actionId: string;
    kind:
      | "notifyTeam"
      | "addOrganizerTag"
      | "createCrmContact"
      | "addApplicationQueue"
      | "proposeEventAttendee"
      | "signedWebhook"
      | "campaignHandoff";
    tagId: string | null;
    eventId: string | null;
    webhookUrl: string | null;
    webhookSecret: string | null;
    channel: null | "whatsapp" | "email";
    campaignId?: string | null;
    campaignRevision?: number | null;
  }[];
  createdByUid: string;
  updatedByUid: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  triggerEventId?: string | null;
  delayMinutes?: number;
  conditionVersionId?: string | null;
}

/**
 * Idempotent, observable execution of one rule revision for one response event.
 */
export interface OrganizerFormAutomationRunDocument {
  organizerId: string;
  formId: string | null;
  ruleId: string;
  ruleRevision: number;
  responseId: string | null;
  eventKind:
    | "submitted"
    | "withdrawn"
    | "applicationAccepted"
    | "eventAttended";
  status:
    | "pending"
    | "running"
    | "succeeded"
    | "partiallyFailed"
    | "failed"
    | "skipped";
  attemptCount: number;
  /**
   * @maxItems 10
   */
  actionResults: {
    actionId: string;
    kind:
      | "notifyTeam"
      | "addOrganizerTag"
      | "createCrmContact"
      | "addApplicationQueue"
      | "proposeEventAttendee"
      | "signedWebhook"
      | "campaignHandoff";
    status: "succeeded" | "failed" | "skipped";
    resultId: string | null;
    errorCode: string | null;
  }[];
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  completedAt: FirebaseFirestore.Timestamp | null;
  sourceId?: string;
  sourceOccurredAt?: FirebaseFirestore.Timestamp;
  dueAt?: FirebaseFirestore.Timestamp | null;
  leaseOwner?: string | null;
  leaseExpiresAt?: FirebaseFirestore.Timestamp | null;
}

/**
 * Idempotent reviewed downstream conversion and safe-undo boundary.
 */
export interface OrganizerFormConversionReceiptDocument {
  organizerId: string;
  formId: string;
  responseId: string;
  kind: "crmContact" | "application" | "eventAttendeeProposal" | "followUp";
  requestId: string;
  actorUid: string;
  status: "pending" | "completed" | "failed";
  /**
   * @maxItems 100
   */
  fields: {
    destinationField: string;
    label: string;
    value: string | number | boolean | null;
    origin: "verifiedIdentity" | "formAnswer" | "hostOverride";
    conflict: string | null;
  }[];
  resultId: string | null;
  undoStatus: "notAvailable" | "available" | "used" | "expired";
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  completedAt: FirebaseFirestore.Timestamp | null;
}

/**
 * Organizer-owned source-attributed stable public form link.
 */
export interface OrganizerFormShareLinkDocument {
  organizerId: string;
  formId: string;
  publicFormId: string;
  label: string;
  source: string | null;
  tokenHash: string;
  createdByUid: string;
  createdAt: FirebaseFirestore.Timestamp;
  openCount: number;
  startCount: number;
  submissionCount: number;
}

/**
 * Organizer-scoped application review summary with no provider-specific answer shape.
 */
export interface OrganizerApplicationDocument {
  organizerId: string;
  formId: string;
  formVersionId: string;
  targetKind: "organizer" | "event" | "campaign";
  targetId: string | null;
  linkedUid: string | null;
  contactId: string | null;
  applicantDisplayName: string;
  applicantDisplayNameNormalized: string;
  reviewStatus:
    | "submitted"
    | "inReview"
    | "approved"
    | "waitlisted"
    | "declined"
    | "withdrawn";
  latestResponseId: string;
  source: {
    kind: "native" | "tabularImport" | "connector";
    providerId: string | null;
    externalFormId: string | null;
    externalResponseId: string | null;
    importReceiptId: string | null;
  };
  assignedReviewerUid: string | null;
  reviewNote: string | null;
  revision: number;
  submittedAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  /**
   * Server-owned approval occurrence. Note-only review edits retain it; a new approval transition replaces it.
   */
  approvalNotificationBasis?: {
    revision: number;
    approvedAtMillis: number;
  };
  reviewedAt: FirebaseFirestore.Timestamp | null;
}

/**
 * Immutable answer snapshot for one native, imported, or connector-originated organizer application response.
 */
export interface OrganizerApplicationResponseDocument {
  organizerId: string;
  applicationId: string;
  formId: string;
  formVersionId: string;
  linkedUid: string | null;
  /**
   * @minItems 1
   * @maxItems 100
   */
  answers: {
    questionId: string;
    questionKey: string;
    questionLabel: string;
    questionKind:
      | "shortText"
      | "longText"
      | "singleChoice"
      | "multiChoice"
      | "date"
      | "phone"
      | "email"
      | "url"
      | "number"
      | "boolean"
      | "file";
    canonicalFieldId:
      | (
          | "givenName"
          | "familyName"
          | "displayName"
          | "dateOfBirth"
          | "age"
          | "gender"
          | "phoneNumber"
          | "email"
          | "instagramHandle"
          | "linkedinUrl"
          | "profilePhoto"
          | "city"
          | "heightCm"
          | "occupation"
          | "company"
          | "education"
          | "languages"
          | "relationshipGoal"
          | "interestedInGenders"
          | "drinking"
          | "smoking"
          | "religion"
          | "workout"
          | "diet"
          | "children"
        )
      | null;
    privacyClass: "contact" | "profile" | "sensitive" | "organizerCustom";
    hostPresentation: "detailOnly" | "filterable" | "sortable";
    value: {
      valueKind:
        | "empty"
        | "text"
        | "number"
        | "boolean"
        | "date"
        | "options"
        | "assets";
      textValue: string | null;
      numberValue: number | null;
      booleanValue: boolean | null;
      dateValue: string | null;
      /**
       * @maxItems 100
       */
      optionValues: string[];
      /**
       * @maxItems 10
       */
      assetIds: string[];
    };
  }[];
  source: {
    kind: "native" | "tabularImport" | "connector";
    providerId: string | null;
    externalFormId: string | null;
    externalResponseId: string | null;
    importReceiptId: string | null;
  };
  consentVersion: string | null;
  grantId: string | null;
  submittedAt: FirebaseFirestore.Timestamp;
}

/**
 * Metadata for a private file uploaded with an organizer application; bytes remain in protected Storage.
 */
export interface OrganizerApplicationAssetDocument {
  organizerId: string;
  applicationId: string;
  responseId: string;
  questionId: string;
  uploadedByUid: string | null;
  storagePath: string;
  originalFileName: string;
  contentType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
  sizeBytes: number;
  sha256: string;
  status: "pendingScan" | "ready" | "rejected" | "deleted";
  createdAt: FirebaseFirestore.Timestamp;
  deletedAt: FirebaseFirestore.Timestamp | null;
}

/**
 * Reusable provider-neutral mapping from external tabular columns to one Catch form version.
 */
export interface OrganizerApplicationSourceMappingDocument {
  organizerId: string;
  formId: string;
  formVersionId: string;
  name: string;
  sourceKind: "csv" | "xlsx" | "connector";
  providerId: string | null;
  externalFormId: string | null;
  headerFingerprint: string;
  /**
   * @minItems 1
   * @maxItems 250
   */
  columns: {
    sourceHeader: string;
    sourceHeaderNormalized: string;
    action: "map" | "ignore";
    questionId: string | null;
    transform:
      | "identity"
      | "trim"
      | "e164"
      | "isoDate"
      | "number"
      | "boolean"
      | "splitOptions"
      | "assetUrl";
  }[];
  createdByUid: string;
  revision: number;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Idempotency and result receipt for one bounded application import commit.
 */
export interface OrganizerApplicationImportReceiptDocument {
  organizerId: string;
  formId: string;
  formVersionId: string;
  mappingId: string | null;
  uploadedByUid: string;
  importKey: string;
  fileName: string;
  format: "csv" | "xlsx" | "connector";
  payloadHash: string;
  status: "completed" | "partial" | "failed";
  rowCount: number;
  createdCount: number;
  skippedCount: number;
  /**
   * @maxItems 100
   */
  errors: {
    rowId: string;
    code: string;
    message: string;
  }[];
  createdAt: FirebaseFirestore.Timestamp;
  completedAt: FirebaseFirestore.Timestamp | null;
}

/**
 * Participant-private reusable application values. This is neither a Catch dating profile nor organizer-visible CRM data.
 */
export interface ParticipantIntakeProfileDocument {
  /**
   * @maxItems 40
   */
  fields: {
    canonicalFieldId:
      | "givenName"
      | "familyName"
      | "displayName"
      | "dateOfBirth"
      | "age"
      | "gender"
      | "phoneNumber"
      | "email"
      | "instagramHandle"
      | "linkedinUrl"
      | "profilePhoto"
      | "city"
      | "heightCm"
      | "occupation"
      | "company"
      | "education"
      | "languages"
      | "relationshipGoal"
      | "interestedInGenders"
      | "drinking"
      | "smoking"
      | "religion"
      | "workout"
      | "diet"
      | "children";
    value: {
      valueKind:
        | "empty"
        | "text"
        | "number"
        | "boolean"
        | "date"
        | "options"
        | "assets";
      textValue: string | null;
      numberValue: number | null;
      booleanValue: boolean | null;
      dateValue: string | null;
      /**
       * @maxItems 100
       */
      optionValues: string[];
      /**
       * @maxItems 10
       */
      assetIds: string[];
    };
    sourceApplicationId: string | null;
    reviewedByParticipantAt: FirebaseFirestore.Timestamp;
    updatedAt: FirebaseFirestore.Timestamp;
  }[];
  revision: number;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Append-stable consent receipt granting one organizer access to exact submitted fields for one application. Only revokedAt may transition after creation.
 */
export interface ParticipantOrganizerDataGrantDocument {
  participantUid: string;
  organizerId: string;
  applicationId: string;
  responseId: string;
  formVersionId: string;
  purpose: "organizerApplicationReview";
  /**
   * @minItems 1
   * @maxItems 100
   */
  grantedQuestionIds: string[];
  /**
   * @maxItems 40
   */
  grantedCanonicalFieldIds: (
    | "givenName"
    | "familyName"
    | "displayName"
    | "dateOfBirth"
    | "age"
    | "gender"
    | "phoneNumber"
    | "email"
    | "instagramHandle"
    | "linkedinUrl"
    | "profilePhoto"
    | "city"
    | "heightCm"
    | "occupation"
    | "company"
    | "education"
    | "languages"
    | "relationshipGoal"
    | "interestedInGenders"
    | "drinking"
    | "smoking"
    | "religion"
    | "workout"
    | "diet"
    | "children"
  )[];
  consentVersion: string;
  consentCopyHash: string;
  grantedAt: FirebaseFirestore.Timestamp;
  revokedAt: FirebaseFirestore.Timestamp | null;
}

/**
 * Stable mapping and field-level authority between one Catch event and one organizer-authorized booking-provider event.
 */
export interface ExternalEventMappingDocument {
  organizerId: string;
  eventId: string;
  connectionId: string;
  provider: "luma";
  externalEventId: string;
  status: "active" | "paused" | "disconnected";
  fieldAuthority: {
    rosterIdentity: "provider";
    registrationStatus: "provider";
    checkIn: "providerWhenPresent";
    orderAmount: "unavailable";
    refundStatus: "unavailable";
    referralCode: "unavailable";
  };
  revision: number;
  createdByUid: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  lastSyncAt: FirebaseFirestore.Timestamp | null;
  lastSuccessfulSyncAt: FirebaseFirestore.Timestamp | null;
  lastSyncStatus: "never" | "running" | "completed" | "partial" | "failed";
  lastSyncRunId: string | null;
  disconnectedAt: FirebaseFirestore.Timestamp | null;
}

/**
 * Idempotent audit and replay receipt for one external-provider event reconciliation.
 */
export interface ProviderSyncRunDocument {
  organizerId: string;
  eventId: string;
  connectionId: string;
  mappingId: string;
  provider: "luma";
  clientOperationId: string;
  inputHash: string;
  status: "running" | "completed" | "partial" | "failed";
  pageCount: number;
  receivedCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  truncated: boolean;
  errorCode: string | null;
  startedByUid: string;
  startedAt: FirebaseFirestore.Timestamp;
  completedAt: FirebaseFirestore.Timestamp | null;
  expiresAt: FirebaseFirestore.Timestamp;
}

/**
 * Sanitized provider template metadata used for preview and send eligibility.
 */
export interface OrganizerMessageTemplateDocument {
  organizerId: string;
  connectionId: string;
  providerTemplateId: string;
  name: string;
  language: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION" | "UNKNOWN";
  status:
    | "APPROVED"
    | "PENDING"
    | "REJECTED"
    | "PAUSED"
    | "DISABLED"
    | "DELETED"
    | "UNKNOWN";
  /**
   * @maxItems 20
   */
  variableNames: string[];
  /**
   * @maxItems 20
   */
  parameterBindings: {
    variableName: string;
    component: "header" | "body" | "button";
    position: number;
    buttonIndex: number | null;
  }[];
  hasMediaHeader: boolean;
  /**
   * @maxItems 10
   */
  buttonKinds: (
    | "URL"
    | "PHONE_NUMBER"
    | "QUICK_REPLY"
    | "COPY_CODE"
    | "UNKNOWN"
  )[];
  /**
   * @maxItems 10
   */
  buttonLabels?: (string | null)[];
  parameterFormat?: "NAMED" | "POSITIONAL" | "UNKNOWN";
  /**
   * @maxItems 10
   */
  buttonUrls?: (string | null)[];
  contentHash?: string;
  providerUpdatedAt: FirebaseFirestore.Timestamp | null;
  syncedAt: FirebaseFirestore.Timestamp;
}

/**
 * Organizer-contact channel frequency and suppression state rechecked immediately before delivery.
 */
export interface OrganizerContactChannelStateDocument {
  organizerId: string;
  contactId: string;
  channel: "whatsapp";
  endpointHash: string;
  suppressionStatus:
    | "none"
    | "optedOut"
    | "providerBlocked"
    | "invalidEndpoint"
    | "adminSuppressed";
  suppressionSource: null | "preference" | "inboundStop" | "provider" | "admin";
  /**
   * Independent organizer pause. It never replaces a person opt-out or provider suppression.
   */
  adminSuppressed?: boolean;
  campaignAcceptedCount: number;
  lastCampaignAcceptedAt: FirebaseFirestore.Timestamp | null;
  lastInboundAt: FirebaseFirestore.Timestamp | null;
  lastReplyAt: FirebaseFirestore.Timestamp | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * One organizer-owned cross-event campaign with frozen approval and aggregate delivery state.
 */
export interface OrganizerCampaignDocument {
  organizerId: string;
  createdByUid: string;
  messageClass: "eventFollowUp" | "organizerUpdate" | "organizerPromotion";
  channel: "whatsapp";
  status:
    | "draft"
    | "previewed"
    | "approved"
    | "scheduled"
    | "resolving"
    | "sending"
    | "completed"
    | "partiallyFailed"
    | "cancelled"
    | "blocked";
  name: string;
  /**
   * Legacy read compatibility only. New campaign writes use savedAudienceId and persist an empty array.
   *
   * @maxItems 5
   */
  segmentIds: (
    | "first_time_attendee"
    | "repeat_attendee"
    | "regular"
    | "lapsed_regular"
    | "reliable_attendee"
    | "advocate"
    | "high_impact_advocate"
    | "whatsapp_reachable"
  )[];
  /**
   * Customers-owned reusable audience used by every new campaign. Null or absent only on legacy segment-authored campaigns.
   */
  savedAudienceId?: string | null;
  savedAudienceRevision?: number | null;
  savedAudienceDefinitionHash?: string | null;
  /**
   * Where recipients resolve from. Absent reads as savedAudience backed by savedAudienceId. kind=programSelection draws recipients from programFunctionGuests/programGuests instead of CRM audiences.
   */
  recipientSource?: {
    kind: "savedAudience" | "programSelection";
    /**
     * Required when kind=programSelection; ignored otherwise.
     */
    programId?: string | null;
    /**
     * Restricts to guests invited to these functions; null or empty means every function in the program.
     *
     * @maxItems 32
     */
    functionIds?: string[] | null;
    /**
     * Restricts to matching per-function RSVP states; null or empty means every status.
     *
     * @maxItems 4
     */
    rsvpStatuses?: ("pending" | "attending" | "declined" | "maybe")[] | null;
    /**
     * When true, one message is sent per household primary contact instead of per guest. Default false.
     */
    householdDedupe?: boolean | null;
  } | null;
  connectionId: string;
  templateId: string;
  templateVariables: {
    [k: string]: string;
  };
  eventId: string | null;
  inviteDestinationKind:
    | null
    | "catchEvent"
    | "eventRuntime"
    | "externalBooking"
    | "marketingLanding";
  scheduledAt: FirebaseFirestore.Timestamp | null;
  /**
   * Exact audience-state hash stored by preview and required unchanged at approval; retained as the frozen recipient snapshot hash after approval.
   */
  recipientSnapshotHash: string | null;
  contentHash: string;
  audienceCounts: {
    total: number;
    reachable: number;
    optedOut: number;
    invalid: number;
    duplicate: number;
    unsupported: number;
    frequencyCapped: number;
    providerBlocked: number;
    unknown: number;
  };
  deliveryCounts: {
    pending: number;
    suppressed: number;
    accepted: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    replied: number;
    optedOut: number;
  };
  revision: number;
  leaseOwner: string | null;
  leaseExpiresAt: FirebaseFirestore.Timestamp | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  approvedAt: FirebaseFirestore.Timestamp | null;
  dispatchedAt: FirebaseFirestore.Timestamp | null;
  completedAt: FirebaseFirestore.Timestamp | null;
  cancelledAt: FirebaseFirestore.Timestamp | null;
}

/**
 * Server-owned organizer-scoped index of one completed event announcement, including bounded contact delivery state for CRM history.
 */
export interface OrganizerBroadcastSummaryDocument {
  organizerId: string;
  broadcastId: string;
  eventId: string;
  eventName: string;
  audience: "booked" | "prospective" | "everyone";
  recipientCount: number;
  sentAt: FirebaseFirestore.Timestamp;
  partialFailure: boolean;
  /**
   * @maxItems 500
   */
  recipientContactIds: string[];
  recipientDeliveryStates: {
    [k: string]: "available" | "failed";
  };
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Frozen recipient eligibility and monotonic delivery receipt for one organizer campaign contact.
 */
export interface OrganizerCampaignRecipientDocument {
  organizerId: string;
  campaignId: string;
  /**
   * CRM contact for saved-audience recipients; null on programSelection rows — program identity lives in programRecipient.
   */
  contactId: string | null;
  /**
   * Program-native recipient identity for recipientSource=programSelection campaigns. One doc per resolved recipientKey (guest:{id} or household:{id}); contactId is null on these rows.
   */
  programRecipient?: {
    programId: string;
    /**
     * guest:{guestId} or household:{householdId}; hashed into the document id in place of contactId.
     */
    recipientKey: string;
    /**
     * Program guests covered by this recipient; one for guest recipients, household members for deduped rows.
     *
     * @minItems 1
     * @maxItems 50
     */
    guestIds: string[];
    /**
     * Household carrying messaging consent for this recipient — the dedupe household for household:{id} rows or the guest's household otherwise.
     */
    householdId: string | null;
    endpointGuestId: string;
    /**
     * Snapshot of the household's explicit messaging consent at approve time; grant decisions re-read live at dispatch.
     */
    messagingConsent: {
      granted: boolean;
      grantedAt: FirebaseFirestore.Timestamp | null;
      source: "householdRsvpLink" | "staff" | "import" | "whatsappStop" | null;
    } | null;
  } | null;
  channel: "whatsapp";
  eligibility: "eligible" | "excluded";
  exclusionReason:
    | null
    | "optedOut"
    | "noVerifiedEndpoint"
    | "duplicateEndpoint"
    | "frequencyCapped"
    | "providerBlocked"
    | "invalidEndpoint"
    | "unknownPermission"
    | "identityUnresolved"
    | "deleted";
  endpointE164: string | null;
  endpointHash: string | null;
  permissionTermsVersion: string | null;
  permissionUpdatedAt: FirebaseFirestore.Timestamp | null;
  renderedVariablesHash: string;
  inviteLinkId: string | null;
  status:
    | "pending"
    | "sending"
    | "suppressed"
    | "accepted"
    | "sent"
    | "delivered"
    | "read"
    | "failed"
    | "replied"
    | "optedOut";
  providerMessageId: string | null;
  providerErrorCategory:
    | null
    | "authentication"
    | "template"
    | "quality"
    | "rateLimit"
    | "invalidRecipient"
    | "policy"
    | "provider"
    | "unknown";
  retryEligible: boolean;
  attemptCount: number;
  leaseOwner: string | null;
  leaseExpiresAt: FirebaseFirestore.Timestamp | null;
  acceptedAt: FirebaseFirestore.Timestamp | null;
  sentAt: FirebaseFirestore.Timestamp | null;
  deliveredAt: FirebaseFirestore.Timestamp | null;
  readAt: FirebaseFirestore.Timestamp | null;
  failedAt: FirebaseFirestore.Timestamp | null;
  repliedAt: FirebaseFirestore.Timestamp | null;
  optedOutAt: FirebaseFirestore.Timestamp | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * TTL idempotency receipt for one authenticated provider webhook event.
 */
export interface OrganizerCampaignWebhookReceiptDocument {
  provider: "metaCloudApi";
  providerEventId: string;
  organizerId: string | null;
  connectionId: string | null;
  eventKind:
    | "status"
    | "inbound"
    | "template"
    | "quality"
    | "account"
    | "unmatched";
  payloadHash: string;
  createdAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;
}

/**
 * Sanitized durable provider event queued after signature verification. Text and native reply labels follow the existing 30-day queue and 12-month Inbox retention. Native reply identifiers and provider correlation remain in the private queue and never authorize an action by themselves. Optional fields preserve compatibility with previously queued events.
 */
export interface OrganizerMessagingWebhookEventDocument {
  provider: "metaCloudApi";
  providerEventId: string;
  organizerId: string | null;
  connectionId: string | null;
  eventKind:
    | "status"
    | "inbound"
    | "template"
    | "quality"
    | "account"
    | "unmatched";
  providerMessageId: string | null;
  contextProviderMessageId: string | null;
  providerAccountId?: string | null;
  providerPhoneNumberId?: string | null;
  callbackData?: string | null;
  inboundReply?:
    | null
    | {
        kind: "templateQuickReply";
        payload: string;
        label: string;
      }
    | {
        kind: "replyButton";
        id: string;
        label: string;
      }
    | {
        kind: "listReply";
        id: string;
        label: string;
        description: string | null;
      };
  deliveryStatus: null | "sent" | "delivered" | "read" | "failed";
  endpointHash: string | null;
  isStop: boolean;
  hasReply: boolean;
  inboundBody: string | null;
  providerErrorCode: number | null;
  /**
   * Complete bounded error-code evidence from signed ingress. Missing legacy evidence is unknown, never proof of an error-free status. Error text and details are not retained.
   */
  providerErrorEvidence?:
    | {
        kind: "none";
      }
    | {
        kind: "codes";
        /**
         * @minItems 1
         * @maxItems 10
         */
        codes: number[];
      }
    | {
        kind: "unusable";
      };
  providerOccurredAt: FirebaseFirestore.Timestamp | null;
  /**
   * Event Assistance consumer checkpoint, independent from campaign and Inbox processing. Waiting outcomes retry; other outcomes are terminal for this signed event.
   */
  assistanceProcessing?: {
    sourceHash: string;
    attemptCount: number;
    updatedAt: FirebaseFirestore.Timestamp;
    outcome:
      | {
          kind: "delivery";
          disposition:
            | "applied"
            | "duplicateOrOlder"
            | "conflictingEvidence"
            | "unconfirmed";
        }
      | {
          kind: "reply";
          disposition: "accepted" | "replayed";
        }
      | {
          kind: "waiting";
          reason: "deliveryUnconfirmed";
        }
      | {
          kind: "ignored";
        }
      | {
          kind: "rejected";
          reason:
            | "unavailable"
            | "deliveryScope"
            | "scopeMismatch"
            | "staleIntent"
            | "invalidChoice"
            | "expired"
            | "alreadyResponded"
            | "noLongerNeeded"
            | "factsStale"
            | "guestStateChanged";
        };
  };
  processingStatus: "pending" | "processed" | "unmatched" | "failed";
  attemptCount: number;
  createdAt: FirebaseFirestore.Timestamp;
  processedAt: FirebaseFirestore.Timestamp | null;
  expiresAt: FirebaseFirestore.Timestamp;
}

/**
 * Server-only organizer/contact WhatsApp thread summary with a 12-month rolling retention boundary.
 */
export interface OrganizerWhatsappThreadDocument {
  schemaVersion: 1;
  threadId: string;
  organizerId: string;
  contactId: string;
  connectionId: string;
  endpointHash: string;
  /**
   * @maxItems 50
   */
  eventIds: string[];
  lastMessageBody: string;
  lastMessageDirection: "inbound" | "outbound";
  lastMessageAt: FirebaseFirestore.Timestamp;
  lastInboundAt: FirebaseFirestore.Timestamp;
  serviceWindowExpiresAt: FirebaseFirestore.Timestamp;
  messageCount: number;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;
}

/**
 * Server-only inbound or outbound WhatsApp body retained for 12 months.
 */
export interface OrganizerWhatsappMessageDocument {
  schemaVersion: 1;
  messageId: string;
  threadId: string;
  organizerId: string;
  contactId: string;
  connectionId: string;
  direction: "inbound" | "outbound";
  body: string;
  providerMessageId: string;
  actorUid: string | null;
  occurredAt: FirebaseFirestore.Timestamp;
  createdAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;
}

/**
 * Server-only at-most-once reservation for one organizer WhatsApp reply attempt.
 */
export interface OrganizerWhatsappReplyOperationDocument {
  schemaVersion: 1;
  operationId: string;
  organizerId: string;
  threadId: string;
  contactId: string;
  messageId: string;
  bodyHash: string;
  expectedLastInboundAtMillis: number;
  actorUid: string;
  state: "pending" | "completed" | "unknown";
  providerMessageId: string | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;
}

/**
 * Server-owned organizer listing claim request stored at organizerClaimRequests/{requestId}.
 */
export interface OrganizerClaimRequestDocument {
  requestId: string;
  organizerId: string;
  requesterUid: string;
  requesterName: string;
  requesterRole:
    | "owner"
    | "founder"
    | "manager"
    | "marketer"
    | "venueManager"
    | "other";
  businessEmail: string | null;
  businessPhone: string | null;
  /**
   * @maxItems 8
   */
  proofUrls: string[];
  message: string | null;
  status: "pending" | "approved" | "rejected" | "withdrawn" | "superseded";
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  decidedAt: FirebaseFirestore.Timestamp | null;
  decidedByUid: string | null;
  decisionReason: string | null;
  previousRequestId: string | null;
}

/**
 * Server-owned time-slot claim stored at organizerScheduleLocks/{organizerId_slot}.
 */
export interface OrganizerScheduleLockDocument {
  ownerType: "organizer";
  ownerId: string;
  slot: number;
  eventId: string;
  organizerId: string;
  startTimeMillis: number;
  endTimeMillis: number;
}

/**
 * Legacy organizer-post projection stored at clubs/{clubId}/posts/{postId} during the clubs-to-organizers migration.
 */
export interface ClubPostDocument {
  authorUid: string;
  text: string;
  photoPath?: string | null;
  eventId?: string | null;
  audience: "followers";
  createdAt: FirebaseFirestore.Timestamp;
  status: "active" | "removed";
}

/**
 * Canonical club membership edge stored at clubMemberships/{membershipId}.
 */
export interface ClubMembershipDocument {
  clubId: string;
  uid: string;
  role: "owner" | "host" | "member";
  status: "active" | "left" | "deleted";
  pushNotificationsEnabled: boolean;
  joinedAt: FirebaseFirestore.Timestamp;
  leftAt: FirebaseFirestore.Timestamp | null;
  deletedAt: FirebaseFirestore.Timestamp | null;
}

/**
 * Server-owned singleton claim stored at clubHostClaims/{uid} to enforce one hosted club per user.
 */
export interface ClubHostClaimDocument {
  uid: string;
  clubId: string;
  createdAt: FirebaseFirestore.Timestamp;
}

/**
 * Server-owned organizer listing claim request stored at clubClaimRequests/{requestId}.
 */
export interface ClubClaimRequestDocument {
  requestId: string;
  clubId: string;
  requesterUid: string;
  requesterName: string;
  requesterRole:
    | "owner"
    | "founder"
    | "manager"
    | "marketer"
    | "venueManager"
    | "other";
  businessEmail: string | null;
  businessPhone: string | null;
  /**
   * @maxItems 8
   */
  proofUrls: string[];
  message: string | null;
  status: "pending" | "approved" | "rejected" | "withdrawn" | "superseded";
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  decidedAt: FirebaseFirestore.Timestamp | null;
  decidedByUid: string | null;
  decisionReason: string | null;
  previousRequestId: string | null;
}

/**
 * Canonical event document stored at events/{eventId}. The event id is the document id and is not stored in document data.
 */
export interface EventDocument {
  /**
   * Organizer-authored event name. Legacy documents may omit it and use the client-derived fallback title.
   */
  name?: string;
  clubId: string;
  organizerId?: string;
  /**
   * Optional organizer venue used to prefill this event. Meeting location and capacity remain event-local snapshots.
   */
  sourceVenueId?: string | null;
  eventOrigin?: EventOrigin;
  runtimeAccess?: EventRuntimeAccess;
  startTime: FirebaseFirestore.Timestamp;
  endTime?: FirebaseFirestore.Timestamp;
  meetingPoint?: string;
  meetingLocation?: EventMeetingLocation;
  startingPointLat?: number;
  startingPointLng?: number;
  locationDetails?: string | null;
  /**
   * @maxItems 40
   */
  itinerary?: {
    id: string;
    kind: "gather" | "activity" | "stop" | "break" | "transition" | "finish";
    offsetMinutes: number;
    durationMinutes?: number | null;
    title: string;
    description?: string | null;
    location?: {
      name: string;
      address?: string | null;
      placeId?: string | null;
      latitude: number;
      longitude: number;
      notes?: string | null;
    } | null;
    routeDistanceMeters?: number | null;
  }[];
  photoUrl?: string | null;
  eventPhotos?: UploadedPhoto[];
  distanceKm?: number;
  eventFormat?: EventFormatSnapshot;
  pace?: "easy" | "moderate" | "fast" | "competitive";
  capacityLimit?: number;
  description?: string;
  priceInPaise?: number;
  currency?: string;
  bookedCount?: number;
  checkedInCount?: number;
  waitlistedCount?: number;
  status: "active" | "cancelled";
  cancelledAt?: FirebaseFirestore.Timestamp | null;
  cancellationReason?: string | null;
  /**
   * When true, the published marketing event route may register a phone-OTP identity into eventAttendees without creating a Consumer profile.
   */
  publicRegistrationEnabled?: boolean;
  constraints?: EventConstraints;
  eventPolicy?: EventPolicyBundleDocument | null;
  genderCounts: {
    [k: string]: number;
  };
  cohortCounts: {
    [k: string]: number;
  };
  waitlistedCohortCounts: {
    [k: string]: number;
  };
  crossPathsPairHeldCount?: number;
  crossPathsPairConfirmedCount?: number;
  crossPathsPairHeldCohortCounts?: {
    [k: string]: number;
  };
  crossPathsDiscoveryEnabled?: boolean;
  discoveryMarketId?: string;
  discoveryCityName?: string;
  discoveryActivityKind?:
    | "socialRun"
    | "running"
    | "walking"
    | "pickleball"
    | "padel"
    | "tennis"
    | "badminton"
    | "cycling"
    | "spinClass"
    | "yoga"
    | "strengthTraining"
    | "pubQuiz"
    | "barCrawl"
    | "dinner"
    | "singlesMixer"
    | "openActivity";
  discoveryGeoCell?: string;
  discoveryHasOpenSpots?: boolean;
  discoveryAvailability?: "open" | "waitlist" | "gated" | "full" | "cancelled";
  /**
   * @maxItems 4
   */
  discoveryOpenCohorts?: (
    | "menInterestedInWomen"
    | "womenInterestedInMen"
    | "queerOrOpen"
    | "nonBinaryOrOther"
  )[];
  /**
   * @maxItems 4
   */
  discoveryWaitlistCohorts?: (
    | "menInterestedInWomen"
    | "womenInterestedInMen"
    | "queerOrOpen"
    | "nonBinaryOrOther"
  )[];
  discoveryInviteRequired?: boolean;
  discoveryMembershipRequired?: boolean;
  discoveryManualApprovalRequired?: boolean;
  discoveryMinAge?: number;
  discoveryMaxAge?: number;
  /**
   * Server-owned deterministic search projection used by admin event publishing. Rebuildable from canonical event and organizer fields; not consumed by the app.
   */
  adminSearch?: {
    /**
     * @maxItems 120
     */
    tokens: string[];
    sortKey: string;
    updatedAt: FirebaseFirestore.Timestamp;
    updatedBySource: "adminUpdateEventDetails" | "adminEventSearchBackfill";
  };
  createdAt?: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp;
  /**
   * Monotonic revision for immutable attendee-relevant plan change records. Missing legacy values read as zero.
   */
  planChangeRevision?: number;
  /**
   * Explicit publication boundary. Legacy absent values require full rich event data; new progressive events must declare their state.
   */
  publicationState?: "private" | "published";
  setupRevision?: number;
  eventCityId?: string;
  eventMarketId?: string;
  eventLocalDate?: string;
  eventLocalStartTime?: string;
  eventTimezone?: string;
  setupDefaults?: EventSetupDefaults;
  /**
   * Explicit registration capability. Older enabled events without this field support free OTP registration only.
   */
  publicRegistrationMode?: "closed" | "free" | "paid";
  publicRegistrationRevision?: number;
  firstPublishedAt?: FirebaseFirestore.Timestamp;
  /**
   * Explicit published declaration of Catch-assisted guest participation. Booking, payments, attendance and logistics alone do not qualify. Omit when not offered.
   *
   * @minItems 1
   * @maxItems 3
   */
  catchExperienceActivities?: (
    | "introductions"
    | "sharedActivities"
    | "rotations"
  )[];
}

/**
 * Immutable server-authored event plan change stored at eventPlanChanges/{sourceId}. Each revision captures the attendee-relevant event facts after one committed host edit.
 */
export interface EventPlanChangeDocument {
  schemaVersion: 1;
  sourceId: string;
  eventId: string;
  organizerId: string;
  revision: number;
  /**
   * @minItems 1
   * @maxItems 5
   */
  changedFields: (
    | "name"
    | "schedule"
    | "meetingLocation"
    | "itinerary"
    | "format"
  )[];
  eventTitle: string;
  startTime: FirebaseFirestore.Timestamp;
  endTime: FirebaseFirestore.Timestamp;
  meetingPoint: string;
  itineraryStopCount: number;
  occurredAt: FirebaseFirestore.Timestamp;
  validUntil: FirebaseFirestore.Timestamp;
  createdBy: string;
}

/**
 * Read-only external event document stored at externalEvents/{eventId}. These records are sourced from reviewed organizer intake candidates and may link to external booking platforms, but they never enable Catch booking, payments, reservations, waitlists, attendance, or schedule locks.
 */
export interface ExternalEventDocument {
  schemaVersion: 1;
  eventId: string;
  canonicalHostId: string;
  compatibilityClubId: string;
  title: string;
  description: string;
  startTime: FirebaseFirestore.Timestamp;
  endTime: FirebaseFirestore.Timestamp | null;
  timezone: string | null;
  meetingPoint: string;
  meetingLocation: {
    name: string;
    address: string | null;
    placeId: string | null;
    latitude: number | null;
    longitude: number | null;
    notes: string | null;
  };
  locationDetails: string | null;
  photoUrl: string | null;
  activity: {
    version: 1;
    activityKind:
      | "socialRun"
      | "running"
      | "walking"
      | "pickleball"
      | "padel"
      | "tennis"
      | "badminton"
      | "cycling"
      | "spinClass"
      | "yoga"
      | "strengthTraining"
      | "pubQuiz"
      | "barCrawl"
      | "dinner"
      | "singlesMixer"
      | "openActivity";
    interactionModel:
      | "pacePods"
      | "pairedRotations"
      | "teamRotations"
      | "seatedTable"
      | "freeFormMixer"
      | "hostLedProgram"
      | "openFormat";
    source: "heuristic" | "admin" | "source";
  };
  price: {
    displayText: string | null;
    parsedPriceInPaise: number | null;
    currency: string;
  };
  status: "active" | "cancelled";
  publicationStatus: "draft" | "public" | "archived" | "removed";
  organizerCapabilities: OrganizerSupplyCapabilities;
  booking: {
    mode: "external_outbound_only";
    catchBookingEnabled: false;
    catchPaymentsEnabled: false;
    catchReservationsEnabled: false;
    catchWaitlistEnabled: false;
    /**
     * @minItems 1
     * @maxItems 12
     */
    externalLinks: {
      platform: "bookMyShow" | "district" | "luma" | "partiful" | "sortMyScene";
      url: string;
      linkType: "booking_or_event_page" | "source_surface";
      sourceEventKey: string;
      candidateId: string;
      primary: boolean;
    }[];
  };
  discovery: {
    citySlug: (string | null) | null;
    countryCode: string | null;
    availability: "read_only_external";
    manualApprovalRequired: true;
  };
  dedupe: {
    normalizedEventKey: string;
    primaryCandidateId: string;
    /**
     * @maxItems 24
     */
    duplicateCandidateIds: string[];
    conflictPolicy: "single_read_only_event_with_multiple_outbound_links";
  };
  externalSource: {
    candidateId: string;
    sourceEventKey: string;
    sourceEventId: string;
    platform: "bookMyShow" | "district" | "luma" | "partiful" | "sortMyScene";
    eventUrl: string | null;
    sourceUrl: string | null;
  };
  review: {
    eventReviewBatchId: string | null;
    reviewer: string | null;
    decidedAt: string | null;
    note: string | null;
    importPolicyAcknowledged: boolean;
    ownerSafeCopyReviewed: boolean;
    /**
     * @maxItems 6
     */
    blockerResolutions: ExternalEventBlockerResolution[];
  };
  takedown?: {
    removedAt: FirebaseFirestore.Timestamp;
    removedByUid: string;
    reason: string;
    receiptId: string;
  } | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Host-private access material for invite-only events stored at eventPrivateAccess/{eventId}.
 */
export interface EventPrivateAccessDocument {
  eventId: string;
  clubId: string;
  organizerId?: string;
  inviteCode: string;
  createdAt: FirebaseFirestore.Timestamp;
}

/**
 * Opaque event invitation metadata stored at eventInviteLinks/{inviteLinkId}. The public bearer token is stored separately in a server-only secret document.
 */
export interface EventInviteLinkDocument {
  eventId: string;
  clubId: string;
  organizerId?: string;
  hostUid: string;
  label: string;
  source: string | null;
  tokenHash: string;
  contractVersion?: number;
  linkKind?:
    | "hostChannel"
    | "directRecipient"
    | "attendeeReferrer"
    | "promoter"
    | "partner";
  ownerContactId?: string | null;
  ownerUid?: string | null;
  intendedRecipientContactId?: string | null;
  campaignId?: string | null;
  issuanceChannel?:
    | "hostApp"
    | "consumerApp"
    | "runtimeWeb"
    | "campaign"
    | "api"
    | "formAutomation";
  destinationKind?:
    | "catchEvent"
    | "eventRuntime"
    | "externalBooking"
    | "marketingLanding";
  tokenVersion?: number;
  attributionWindowEndsAt?: FirebaseFirestore.Timestamp | null;
  openCount: number;
  likelyHumanOpenCount?: number;
  shareIntentCount?: number;
  verifiedRegistrationCount?: number;
  referredRegistrationCount?: number;
  referredCheckedInCount?: number;
  requestCount: number;
  confirmedCount: number;
  paidCount: number;
  checkedInCount: number;
  catcherCount: number;
  matchCount: number;
  chatStartedCount: number;
  disabledAt: FirebaseFirestore.Timestamp | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Server-only bearer token material for one event invitation link.
 */
export interface EventInviteLinkSecretDocument {
  eventId: string;
  organizerId: string;
  token: string;
  tokenHash: string;
  tokenVersion: number;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Short-lived privacy-minimized evidence that an invitation URL was resolved.
 */
export interface EventInviteTouchDocument {
  eventId: string;
  organizerId: string;
  inviteLinkId: string;
  touchKind: "open" | "redirect";
  surface:
    | "consumerApp"
    | "hostApp"
    | "runtimeWeb"
    | "marketingWeb"
    | "unknown";
  actorUid: string | null;
  sessionHash: string | null;
  likelyHuman: boolean;
  botReason: "previewCrawler" | "knownBot" | "missingClientSignal" | null;
  attributionEligible: boolean;
  createdAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;
}

/**
 * Evidence that a signed-in actor opened a Catch-owned share surface; it is not proof that a message was sent.
 */
export interface EventShareIntentDocument {
  eventId: string;
  organizerId: string;
  inviteLinkId: string;
  actorUid: string;
  actorKind: "host" | "attendee" | "member";
  surface: "hostApp" | "consumerApp" | "runtimeWeb";
  creativeId: string | null;
  channelHint: "systemShare" | "copyLink" | "whatsapp" | "sms" | "email" | null;
  createdAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;
}

/**
 * Immutable evidence assigning or reversing one downstream event fact to one invitation link.
 */
export interface EventInviteAttributionDocument {
  eventId: string;
  organizerId: string;
  inviteLinkId: string;
  linkKind:
    | "hostChannel"
    | "directRecipient"
    | "attendeeReferrer"
    | "promoter"
    | "partner";
  ownerContactId: string | null;
  intendedRecipientContactId: string | null;
  subjectContactId: string | null;
  subjectUid: string | null;
  factKind: "registration" | "booking" | "checkIn" | "revenue" | "refund";
  operation: "credit" | "reversal";
  sourceKind:
    | "catchParticipation"
    | "eventAttendee"
    | "provider"
    | "selfReport";
  sourceFactId: string;
  primaryCredit: boolean;
  confidence: "exact" | "reconciled" | "selfReported";
  referralCredit: boolean;
  amountMinor?: number | null;
  currency?: string | null;
  reversalOfAttributionId: string | null;
  occurredAt: FirebaseFirestore.Timestamp;
  createdAt: FirebaseFirestore.Timestamp;
}

/**
 * Canonical event roster edge stored at eventParticipations/{participationId}.
 */
export interface EventParticipationDocument {
  eventId: string;
  clubId: string;
  organizerId?: string;
  uid: string;
  status: "signedUp" | "waitlisted" | "attended" | "cancelled" | "deleted";
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  signedUpAt: FirebaseFirestore.Timestamp | null;
  waitlistedAt: FirebaseFirestore.Timestamp | null;
  attendedAt: FirebaseFirestore.Timestamp | null;
  cancelledAt: FirebaseFirestore.Timestamp | null;
  deletedAt: FirebaseFirestore.Timestamp | null;
  genderAtSignup: ("man" | "woman" | "nonBinary" | "other") | null;
  cohortAtSignup?: string | null;
  paymentId: string | null;
  /**
   * Manual-approval request state for request-to-join events. Null for regular waitlist edges.
   */
  hostApprovalStatus?: "pending" | "approved" | "declined" | null;
  hostApprovalDecidedAt?: FirebaseFirestore.Timestamp | null;
  hostApprovalDecidedBy?: string | null;
  /**
   * Mirror of the current waitlist offer state for cheap roster and attendee CTA reads.
   */
  waitlistOfferStatus?:
    | ("active" | "accepted" | "declined" | "expired" | "cancelled")
    | null;
  waitlistOfferedAt?: FirebaseFirestore.Timestamp | null;
  waitlistOfferExpiresAt?: FirebaseFirestore.Timestamp | null;
  waitlistOfferAcceptedAt?: FirebaseFirestore.Timestamp | null;
  waitlistOfferId?: string | null;
  /**
   * Named host invite link that first attributed this participation, when present.
   */
  inviteLinkId?: string | null;
  /**
   * Host-facing source label copied from the invite link for durable reporting.
   */
  inviteSource?: string | null;
  /**
   * Server time when invite attribution was first attached to the roster edge.
   */
  inviteCapturedAt?: FirebaseFirestore.Timestamp | null;
  /**
   * Historical pointer to the active community decision checked by the admission transaction; later revocation does not rewrite this booking evidence.
   */
  communityMembershipAtSignup?: {
    membershipId: string;
    revision: number;
    decisionId: string;
  };
}

/**
 * Private event-scoped operational attendee stored at eventAttendees/{attendeeId}.
 */
export interface EventAttendeeDocument {
  eventId: string;
  clubId: string;
  organizerId: string;
  displayName: string;
  searchName: string;
  source:
    | "catchBooking"
    | "hostImport"
    | "hostManual"
    | "webOtp"
    | "providerSync";
  status: "invited" | "registered" | "waitlisted" | "checkedIn" | "cancelled";
  linkedUid: string | null;
  phoneE164: string | null;
  email: string | null;
  /**
   * Private organizer-reported roster city; never a verified participant profile or eligibility input.
   */
  cityMarketId?: string | null;
  citySource?: "hostImport" | "hostManual" | null;
  externalReference: string | null;
  /**
   * Provider or import-supplied booking/arrival group shared by guests who are expected to arrive together.
   */
  arrivalGroup: string | null;
  ticketType: string | null;
  /**
   * Revenue allocated to this attendee in minor currency units. Organizer-reported and estimated values are not payment verification.
   */
  revenueAmountMinor?: number | null;
  revenueCurrency?: string | null;
  revenueSource?:
    | "hostImport"
    | "hostEstimate"
    | "providerOrder"
    | "hostAttested"
    | null;
  revenueAllocation?: "perAttendee" | "sharedOrder" | null;
  revenueOrderReference?: string | null;
  /**
   * Original shared-order total before deterministic attendee allocation.
   */
  revenueOrderAmountMinor?: number | null;
  importId: string | null;
  sourceRowId: string | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  registeredAt: FirebaseFirestore.Timestamp | null;
  waitlistedAt: FirebaseFirestore.Timestamp | null;
  checkedInAt: FirebaseFirestore.Timestamp | null;
  cancelledAt: FirebaseFirestore.Timestamp | null;
  checkedInBy: string | null;
  linkedAt: FirebaseFirestore.Timestamp | null;
  /**
   * First eligible opaque invitation link preserved on this operational attendee.
   */
  inviteLinkId?: string | null;
  inviteCapturedAt?: FirebaseFirestore.Timestamp | null;
  /**
   * Monotonic revision shared by all accountability writers. Missing legacy values read as zero.
   */
  accountabilityRevision?: number;
  /**
   * Monotonic revision for absolute Host attendance operations. Missing legacy values read as zero.
   */
  attendanceRevision?: number;
  /**
   * Operational status restored by an absolute undo. Null outside checked-in state.
   */
  preCheckInStatus?: "invited" | "registered" | "waitlisted" | null;
  /**
   * Host-recorded sweep result. It is current only when accountabilityResolvedForCheckInAt equals checkedInAt.
   */
  accountabilityResolution?: "returned" | "departed" | null;
  accountabilityResolvedForCheckInAt?: FirebaseFirestore.Timestamp | null;
  accountabilityResolvedAt?: FirebaseFirestore.Timestamp | null;
  accountabilityResolvedBy?: string | null;
  /**
   * External source that most recently supplied provider-authoritative fields, independent of row creation source.
   */
  provider?:
    | "luma"
    | "eventbrite"
    | "partiful"
    | "posh"
    | "bookmyshow"
    | "district"
    | "sortmyscene"
    | "airbnb"
    | null;
  providerConnectionId?: string | null;
  providerGuestId?: string | null;
  providerSyncedAt?: FirebaseFirestore.Timestamp | null;
  providerDataRevision?: number;
}

/**
 * Server-owned, expiring event staff access. Event-wide operator permissions and group duties have independent expiry and authority; neither grants organizer or CRM access.
 */
export interface EventStaffGrantDocument {
  organizerId: string;
  eventId: string;
  uid: string;
  displayName: string;
  phoneLastFour: string;
  role: "checkInOperator" | "eventOperator";
  /**
   * @minItems 0
   * @maxItems 4
   */
  permissions: (
    | "viewRoster"
    | "setAttendance"
    | "reviewRuntimeClaims"
    | "publishLiveLocation"
  )[];
  status: "active" | "revoked";
  createdBy: string;
  createdAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;
  revokedBy: string | null;
  revokedAt: FirebaseFirestore.Timestamp | null;
  updatedAt: FirebaseFirestore.Timestamp;
  revision: number;
  /**
   * Independent event-wide permission expiry. Missing legacy values use expiresAt; null grants no event-wide permissions.
   */
  operatorExpiresAt?: FirebaseFirestore.Timestamp | null;
  /**
   * At most one independently expiring duty per configured event/group. No implied event-wide roster or check-in permission.
   *
   * @maxItems 20
   */
  groupDuties?: {
    groupId: string;
    duty: "lead" | "pacer" | "sweep";
    expiresAtMillis: number;
    sourceHash: string;
    grantedBy: string;
    grantedAtMillis: number;
  }[];
}

/**
 * Server-owned private wedding/corporate program root. Holds organizer ownership, lifecycle, enabled capabilities and transport tuning. Never publicly readable; guest logistics live in program-scoped collections.
 */
export interface OrganizerProgramDocument {
  organizerId: string;
  kind: "wedding" | "corporate" | "social" | "other";
  title: string;
  /**
   * IANA timezone identifier used for display and time-band boundaries.
   */
  timezone: string;
  startsAt: FirebaseFirestore.Timestamp;
  endsAt: FirebaseFirestore.Timestamp;
  /**
   * RSVP deadline anchor for Moments scheduling; absent until the organizer sets one.
   */
  rsvpDeadlineAt?: FirebaseFirestore.Timestamp | null;
  status: "draft" | "active" | "completed" | "archived";
  /**
   * @maxItems 8
   */
  capabilities: (
    | "arrivalsTransport"
    | "accommodation"
    | "forms"
    | "messaging"
  )[];
  /**
   * Immutable snapshot of the organizer entitlement terms captured at program creation. Absent on programs predating entitlements; owning callables treat absence as the unpaid default ceiling.
   */
  entitlement?: {
    /**
     * Catalog key from contracts/catalogs/organizer_entitlement_skus.json at grant time.
     */
    sku: string;
    limits: {
      guests: number;
      functions: number;
      staffAssignments: number;
      momentsPerFunction: number;
    };
    /**
     * Ceiling on organizerPrograms.capabilities; an enabled capability must also appear here.
     *
     * @maxItems 8
     */
    capabilitiesAllowed: (
      | "arrivalsTransport"
      | "accommodation"
      | "forms"
      | "messaging"
    )[];
    grantedAtMillis: number;
    /**
     * Manual invoice or checkout reference recorded by the granting admin.
     */
    receiptRef: string | null;
  } | null;
  /**
   * Optional display labels for programHouseholds.side (such as bride/groom or two family names); defaults to generic partner labels.
   */
  householdSideLabels?: {
    partnerA?: string;
    partnerB?: string;
  } | null;
  transportSettings: {
    /**
     * Anchored curb-time window used by grouping suggestions. Default 30 minutes.
     */
    bandWindowMillis: number;
    /**
     * Ceiling on how long a physically ready party waits before a group is flagged overdue. Default 10 minutes for premium events.
     */
    maxReadyWaitMillis: number;
    /**
     * Default landing-to-curb lag for domestic arrivals.
     */
    domesticExitLagMillis: number;
    /**
     * Default landing-to-curb lag for international arrivals.
     */
    internationalExitLagMillis: number;
    /**
     * Program-scoped vehicle catalog consumed by grouping suggestions; ids are unique per program.
     *
     * @maxItems 16
     */
    vehicleClasses: {
      id: string;
      label: string;
      passengerCapacity: number;
      luggageCapacity: number;
      /**
       * @maxItems 12
       */
      capabilities: ("wheelchairAccessible" | "extraLuggage" | "childSeat")[];
      sortOrder: number;
    }[];
  };
  createdBy: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  /**
   * Immutable normalized create-command fingerprint for request-key replay. Absent on legacy programs; never changed by program edits or lifecycle transitions.
   */
  createRequestHash?: string;
  revision: number;
  /**
   * Timestamp of the explicit archive action. Lifecycle: draft/active -> completed -> archived.
   */
  archivedAt?: FirebaseFirestore.Timestamp | null;
  /**
   * Status the program held before archive; unarchiveProgram restores it during the grace window.
   */
  archivedFromStatus?: ("draft" | "active" | "completed" | "archived") | null;
  /**
   * Retention clock: archivedAt + 14 days. The anonymize sweep processes once this passes.
   */
  anonymizeAt?: FirebaseFirestore.Timestamp | null;
  /**
   * Set once the retention sweep scrubbed identity/free-text fields. Anonymized programs remain archived and indefinitely retained.
   */
  anonymizedAt?: FirebaseFirestore.Timestamp | null;
}

/**
 * Server-owned private function (ceremony, reception, offsite session) inside a program. Separate from public events documents; no public read surface exists.
 */
export interface ProgramFunctionDocument {
  programId: string;
  organizerId: string;
  name: string;
  startsAt: FirebaseFirestore.Timestamp;
  endsAt: FirebaseFirestore.Timestamp;
  venueName: string;
  venueNotes?: string | null;
  /**
   * Optional precise venue pin selected from Places or dropped manually; venueName remains the display string.
   */
  venueLocation?: {
    name: string;
    address?: string | null;
    placeId?: string | null;
    latitude: number;
    longitude: number;
    notes?: string | null;
  } | null;
  /**
   * Short wardrobe guidance shown on invitations and reminders, such as 'Pastel formal' or 'Poolside casual'.
   */
  dressCode?: string | null;
  /**
   * Guest-facing instructions for this function (entry gate, shuttle note, what to bring). Never carries staff-only detail.
   */
  instructions?: string | null;
  /**
   * Absent on functions written before per-function invitations; reads as allGuests.
   */
  invitationMode?: "allGuests" | "selectedGuests";
  /**
   * When true, functionCheckIn/functionLead duties may mark programFunctionGuests attendanceStatus at the door.
   */
  checkInEnabled?: boolean;
  /**
   * Server-maintained rollup of attending party sizes for catering and venue counts.
   */
  expectedCount?: number | null;
  /**
   * Server-maintained rollup of programFunctionGuests attendanceStatus=checkedIn.
   */
  checkedInCount?: number | null;
  status: "scheduled" | "completed" | "cancelled";
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  revision: number;
  /**
   * Identity/free-text scrub marker set by the archive retention sweep; null until anonymized.
   */
  anonymizedAt?: FirebaseFirestore.Timestamp | null;
}

/**
 * Server-owned per-function invitation, RSVP and door-attendance join record. One document per (functionId, guestId) pair; the document id is the deterministic `${functionId}_${guestId}` join key so invites and responses upsert idempotently. Per-function truth lives here; programGuests.rsvpStatus is only a derived rollup.
 */
export interface ProgramFunctionGuestDocument {
  programId: string;
  organizerId: string;
  functionId: string;
  guestId: string;
  /**
   * Whether this guest is on the function's invitation list. Rows exist only for functions with invitationMode=selectedGuests when invited=false; allGuests functions may omit rows entirely.
   */
  invited: boolean;
  rsvpStatus: "pending" | "attending" | "declined" | "maybe";
  /**
   * Door/arrival state for one guest at one function. expected is the default for invited guests; noShow is marked after the function ends.
   */
  attendanceStatus: "expected" | "checkedIn" | "noShow";
  /**
   * Attending party size including children when the guest RSVPs for more than themselves; null reads as 1.
   */
  partySize?: number | null;
  /**
   * When the guest's current RSVP response was recorded; null while still pending.
   */
  respondedAt?: FirebaseFirestore.Timestamp | null;
  /**
   * Optional guest note captured with the response, such as dietary or plus-one detail.
   */
  responseNote?: string | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  revision: number;
  /**
   * Which channel recorded the current response: staff entry, the signed household RSVP link, or a manifest import. Null while pending.
   */
  responseSource?: "staff" | "householdLink" | "import" | null;
  /**
   * Staff uid who recorded a staff-sourced response; null for household-link and imported responses.
   */
  recordedByUid?: string | null;
  /**
   * Identity/free-text scrub marker set by the archive retention sweep; null until anonymized.
   */
  anonymizedAt?: FirebaseFirestore.Timestamp | null;
}

/**
 * Server-owned append-only door journal entry for one program function. The document id is the deterministic journalId derived from (scope, functionId, guestId, action, occurredAtMillis, actorUid), so device retries and offline outbox replays collapse to one entry. Attendance truth projects from this journal onto programFunctionGuests.attendanceStatus; clients never write either surface directly.
 */
export interface ProgramDoorJournalDocument {
  programId: string;
  organizerId: string;
  functionId: string;
  /**
   * programGuests member the entry acts on; walkInCreate entries may name a guest the function never invited.
   */
  guestId: string;
  /**
   * Staff uid who recorded the action at the door.
   */
  actorUid: string;
  action:
    | "checkIn"
    | "undoCheckIn"
    | "markNoShow"
    | "walkInCreate"
    | "partySizeAdjust";
  /**
   * Client-declared action time folded into the idempotency key and journal ordering.
   */
  occurredAtMillis: number;
  /**
   * Door device identifier for audit; null when the device supplies none.
   */
  deviceId: string | null;
  /**
   * Attending party size set by walkInCreate or partySizeAdjust; null on every other action.
   */
  partySize: number | null;
  /**
   * Optional door note such as a late-arrival explanation.
   */
  note: string | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  revision: number;
  /**
   * Identity/free-text scrub marker set by the archive retention sweep; null until anonymized.
   */
  anonymizedAt?: FirebaseFirestore.Timestamp | null;
}

/**
 * Server-owned person-level wedding/corporate guest record. One document per invited person; household membership and optional CRM contact links are explicit. A shared phone number never merges two guests.
 */
export interface ProgramGuestDocument {
  programId: string;
  organizerId: string;
  displayName: string;
  householdId: string | null;
  /**
   * Optional link to organizerContacts. Absence never blocks guest operations.
   */
  contactId: string | null;
  /**
   * Optional reachable phone for this person. Shared family phones do not merge identities.
   */
  phoneE164: string | null;
  email: string | null;
  /**
   * Planner-side reference such as a spreadsheet id or invitation code.
   */
  externalReference: string | null;
  /**
   * Current canonical social membership truth. Host selections update it through upsertProgramGuest; imported group labels append source-labelled suggestions without changing this projection.
   *
   * @maxItems 20
   */
  groupIds: string[];
  invitationStatus: "notInvited" | "invited" | "delivered" | "responded";
  /**
   * Derived program-wide rollup maintained by the server from programFunctionGuests rows (any attending -> attending, else strongest other response). Per-function truth lives only on programFunctionGuests; writers never set this directly.
   */
  rsvpStatus: "pending" | "attending" | "declined" | "maybe";
  source: "manual" | "import" | "formResponse";
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  revision: number;
  /**
   * Identity/free-text scrub marker set by the archive retention sweep; null until anonymized.
   */
  anonymizedAt?: FirebaseFirestore.Timestamp | null;
  /**
   * Current values are a projection of these exact immutable same-program assertions. Absent fields have unknown acquisition provenance.
   */
  fieldSelections?: {
    displayName?: string;
    phoneE164?: string;
    email?: string;
  };
  /**
   * Imported conflicting assertions awaiting explicit host field choice. All historical assertions remain in their scoped ledger.
   */
  fieldConflicts?: {
    /**
     * @maxItems 20
     */
    displayName?: string[];
    /**
     * @maxItems 20
     */
    phoneE164?: string[];
    /**
     * @maxItems 20
     */
    email?: string[];
  };
  /**
   * Exact immutable host membership choices; includes and excludes survive every import.
   *
   * @maxItems 100
   */
  membershipSelections?: {
    groupId: string;
    assertionId: string;
  }[];
  /**
   * Source-labelled unapproved membership assertions. Never add canonical groupIds without a host choice.
   *
   * @maxItems 100
   */
  membershipSuggestions?: {
    groupId: string;
    assertionId: string;
  }[];
}

/**
 * Server-owned organizer-defined guest grouping for a program. Guests carry groupIds[] on their own documents — that array is membership truth; the group document carries the queryable label, dimension, and denormalized memberCount used for headcount cuts, room allocation, and group-targeted Moments. Dimensions are free-form keys suggested per program kind (weddings: side/lineage/relation; corporate: company/delegation/country); labels are always organizer-defined. The wedding couple-side axis remains programHouseholds.side with organizerPrograms.householdSideLabels; groups are the general mechanism for every other cut.
 */
export interface ProgramGuestGroupDocument {
  programId: string;
  organizerId: string;
  /**
   * Organizer-defined display label, e.g. "Sharma family" or "Acme delegation".
   */
  label: string;
  /**
   * Grouping axis key. Conventional values per program kind (weddings: side/lineage/relation; corporate: company/delegation/country); other keys are allowed so organizers can model arbitrary cuts.
   */
  dimension: string;
  /**
   * Organizer-controlled ordering within a dimension; lower sorts first.
   */
  sortOrder: number;
  /**
   * Denormalized count of programGuests documents whose groupIds contain this group. Maintained transactionally by guest upsert, manifest import, and group delete.
   */
  memberCount: number;
  /**
   * Optional programHotels link: where members of this group stay. Distance-aware moment lead times (audience.travelTimeLead) resolve each guest to the hotel of their first hotel-linked group.
   */
  hotelId: string | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  revision: number;
  /**
   * Identity/free-text scrub marker set by the archive retention sweep; null until anonymized.
   */
  anonymizedAt?: FirebaseFirestore.Timestamp | null;
}

/**
 * Server-owned household invitation grouping for program guests. Carries the invited party's primary contact and delivery preference; member guest ids are bounded.
 */
export interface ProgramHouseholdDocument {
  programId: string;
  organizerId: string;
  /**
   * Human label such as 'The Sharma family' used on invitations and rosters.
   */
  label: string;
  primaryContactName: string | null;
  primaryPhoneE164: string | null;
  primaryEmail: string | null;
  /**
   * @minItems 0
   * @maxItems 50
   */
  memberGuestIds: string[];
  /**
   * Invitation delivery preference; does not grant messaging consent by itself.
   */
  deliveryPreference: "whatsapp" | "sms" | "email" | "none";
  /**
   * Optional side assignment used for per-side counts and seating; labels are configured on the program.
   */
  side?: ("partnerA" | "partnerB" | "mutual") | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  revision: number;
  /**
   * Explicit household messaging consent. Absent means never asked; granted:true only ever follows an explicit tick — RSVP acceptance alone is not consent.
   */
  messagingConsent?: {
    granted: boolean;
    grantedAt: FirebaseFirestore.Timestamp | null;
    /**
     * Channel that recorded the consent decision; whatsappStop is an inbound STOP reply captured by the messaging webhook.
     */
    source: "householdRsvpLink" | "staff" | "import" | "whatsappStop" | null;
  } | null;
  /**
   * Identity/free-text scrub marker set by the archive retention sweep; null until anonymized.
   */
  anonymizedAt?: FirebaseFirestore.Timestamp | null;
  fieldSelections?: {
    displayName?: string;
    phoneE164?: string;
    email?: string;
  };
  fieldConflicts?: {
    /**
     * @maxItems 20
     */
    displayName?: string[];
    /**
     * @maxItems 20
     */
    phoneE164?: string[];
    /**
     * @maxItems 20
     */
    email?: string[];
  };
}

/**
 * Server-owned, expiring program staff access. Duties are named and station-scoped; a grant never confers organizer, CRM, messaging or cross-program authority.
 */
export interface ProgramStaffGrantDocument {
  organizerId: string;
  programId: string;
  uid: string;
  displayName: string | null;
  phoneLastFour: string | null;
  /**
   * Up to eight independently expiring scope tuples. Identical tuples may be renewed; different tuples remain separate.
   *
   * @minItems 1
   * @maxItems 8
   */
  duties: {
    duty:
      | "programAdmin"
      | "programCoordinator"
      | "guestRelations"
      | "communications"
      | "functionCheckIn"
      | "functionLead"
      | "airportGreeter"
      | "hotelDesk"
      | "transportDispatcher"
      | "reconciliationViewer"
      | "stakeholderViewer";
    /**
     * Pickup restriction; empty means all program pickup points. Both resource restrictions must be met by the same assignment.
     *
     * @maxItems 32
     */
    pickupPointIds: string[];
    /**
     * Destination restriction; empty means all program hotels. Restrictions from different assignments never combine into new routes.
     *
     * @maxItems 64
     */
    hotelIds: string[];
    /**
     * Function restriction for functionCheckIn and functionLead duties; absent or empty means all program functions. Optional on documents written before function-scoped duties existed.
     *
     * @maxItems 64
     */
    functionIds?: string[];
    /**
     * Exclusive expiry of this exact duty and resource scope. Independent of other assignments.
     */
    expiresAtMillis: number;
  }[];
  status: "active" | "revoked";
  createdBy: string;
  createdAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;
  revokedBy: string | null;
  revokedAt: FirebaseFirestore.Timestamp | null;
  updatedAt: FirebaseFirestore.Timestamp;
  revision: number;
  /**
   * Identity/free-text scrub marker set by the archive retention sweep; null until anonymized.
   */
  anonymizedAt?: FirebaseFirestore.Timestamp | null;
  /**
   * Server-owned proof that this exact program owner approved access, directly or through a current programAdmin. The inherited deadline bounds every delegated renewal. Optional only for legacy creator-issued records.
   */
  programAuthorization?: {
    ownerUid: string;
    approvedByUid: string;
    approvedAtMillis: number;
    authorizedUntilMillis: number;
  };
}

/**
 * Server-owned single-use staff invite bound to a phone number. Redeeming the invite requires a signed-in account whose verified phone matches; redemption materializes a programStaffGrants document.
 */
export interface ProgramStaffInviteDocument {
  organizerId: string;
  programId: string;
  phoneE164: string | null;
  displayName: string | null;
  /**
   * @minItems 1
   * @maxItems 8
   */
  duties: {
    duty:
      | "programAdmin"
      | "programCoordinator"
      | "guestRelations"
      | "communications"
      | "functionCheckIn"
      | "functionLead"
      | "airportGreeter"
      | "hotelDesk"
      | "transportDispatcher"
      | "reconciliationViewer"
      | "stakeholderViewer";
    /**
     * Pickup restriction; empty means all program pickup points. Both resource restrictions must be met by the same assignment.
     *
     * @maxItems 32
     */
    pickupPointIds: string[];
    /**
     * Destination restriction; empty means all program hotels. Restrictions from different assignments never combine into new routes.
     *
     * @maxItems 64
     */
    hotelIds: string[];
    /**
     * Function restriction for functionCheckIn and functionLead duties; absent or empty means all program functions. Optional on documents written before function-scoped duties existed.
     *
     * @maxItems 64
     */
    functionIds?: string[];
  }[];
  status: "pending" | "claimed" | "revoked";
  createdBy: string;
  createdAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;
  claimedByUid: string | null;
  claimedAt: FirebaseFirestore.Timestamp | null;
  revokedBy: string | null;
  revokedAt: FirebaseFirestore.Timestamp | null;
  updatedAt: FirebaseFirestore.Timestamp;
  revision: number;
  /**
   * Identity/free-text scrub marker set by the archive retention sweep; null until anonymized.
   */
  anonymizedAt?: FirebaseFirestore.Timestamp | null;
  /**
   * Server-owned proof that this exact program owner approved access, directly or through a current programAdmin. The inherited deadline bounds every delegated renewal. Optional only for legacy creator-issued records.
   */
  programAuthorization?: {
    ownerUid: string;
    approvedByUid: string;
    approvedAtMillis: number;
    authorizedUntilMillis: number;
  };
}

/**
 * Server-owned program pickup station such as an airport terminal arrivals zone. Scopes greeter and dispatcher duties and transport grouping.
 */
export interface ProgramPickupPointDocument {
  programId: string;
  organizerId: string;
  kind: "airport" | "railway" | "venue" | "other";
  /**
   * Station label such as 'DEL T3 arrivals exit 4'.
   */
  label: string;
  iataCode: string | null;
  terminal: string | null;
  meetingZone: string | null;
  latitude: number | null;
  longitude: number | null;
  /**
   * Guest-facing pickup instructions shown on travel confirmations.
   */
  instructions: string | null;
  active: boolean;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  revision: number;
}

/**
 * Server-owned program accommodation property. Scopes hotel-desk duties, guest stays and transport destinations.
 */
export interface ProgramHotelDocument {
  programId: string;
  organizerId: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  receptionContact: string | null;
  notes: string | null;
  active: boolean;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  revision: number;
  /**
   * Identity/free-text scrub marker set by the archive retention sweep; null until anonymized.
   */
  anonymizedAt?: FirebaseFirestore.Timestamp | null;
}

/**
 * Server-owned per-guest lodging assignment. Roommates explicitly share a stable roomOccupancyId; roomLabel is display-only. Legacy rows remain separate until explicitly joined.
 */
export interface ProgramStayDocument {
  programId: string;
  organizerId: string;
  /**
   * Exactly one guest per stay; room sharing is explicit and independent of invitation household and social groups.
   */
  guestId: string;
  /**
   * programHotels doc the guest stays at; must belong to the same program.
   */
  hotelId: string;
  /**
   * programRoomBlocks doc this stay draws capacity from; null for ad-hoc assignments outside any block.
   */
  roomBlockId: string | null;
  /**
   * Physical room assignment (e.g. '412') set by the hotel desk; null until allocated.
   */
  roomLabel: string | null;
  /**
   * Planned check-in; null while the stay is requested but undated.
   */
  startsAt: FirebaseFirestore.Timestamp | null;
  /**
   * Planned check-out; null while undated.
   */
  endsAt: FirebaseFirestore.Timestamp | null;
  /**
   * Stay lifecycle: held (reserved, not confirmed) → confirmed → checkedIn → checkedOut; cancelled releases block capacity.
   */
  status: "held" | "confirmed" | "checkedIn" | "checkedOut" | "cancelled";
  /**
   * When the hotel marked the room ready for this guest.
   */
  roomReadyAt: FirebaseFirestore.Timestamp | null;
  /**
   * When the guest actually reached the hotel (hotel-desk observed).
   */
  hotelArrivedAt: FirebaseFirestore.Timestamp | null;
  notes: string | null;
  /**
   * How the stay row entered the program — mirrors programTravelLegs.source.
   */
  source: "manual" | "import" | "planner";
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  revision: number;
  /**
   * Identity/free-text scrub marker set by the archive retention sweep; null until anonymized.
   */
  anonymizedAt?: FirebaseFirestore.Timestamp | null;
  /**
   * Server-minted shared-room identity. Missing legacy rows use stayId; labels and households never imply sharing.
   */
  roomOccupancyId?: string;
  /**
   * Explicit private lodging room-sharing party identity; absent on unverified legacy/manual assignments.
   */
  lodgingPartyId?: string;
  /**
   * Stable dated lodging inventory unit identity; never inferred from roomLabel.
   */
  lodgingInventoryId?: string;
}

/**
 * Server-owned reserved room inventory at a programHotels doc — a labelled block of rooms held for a stay window, optionally earmarked for guest groups. Stays consume capacity through roomBlockId; assignedCount is the server-maintained rollup.
 */
export interface ProgramRoomBlockDocument {
  programId: string;
  organizerId: string;
  /**
   * programHotels doc this block reserves rooms at; must belong to the same program.
   */
  hotelId: string;
  /**
   * Organizer-facing block name, e.g. 'Bride family — Deluxe'.
   */
  label: string;
  /**
   * Optional hotel room class (Deluxe, Suite). Null when the block is type-agnostic.
   */
  roomType: string | null;
  /**
   * Rooms held under this block.
   */
  totalRooms: number;
  /**
   * Peak simultaneous occupied rooms across local contract nights; recomputed from explicit occupancy identities, not guest rows.
   */
  assignedCount: number;
  /**
   * programGuestGroups this block is earmarked for; allocation prefers matching groups before general inventory.
   *
   * @maxItems 12
   */
  heldForGroupIds: string[];
  startsAt: FirebaseFirestore.Timestamp;
  endsAt: FirebaseFirestore.Timestamp;
  /**
   * Operational notes visible to organizer and hotel desk (rate contact, holding conditions).
   */
  notes?: string | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  revision: number;
  /**
   * Identity/free-text scrub marker set by the archive retention sweep; null until anonymized.
   */
  anonymizedAt?: FirebaseFirestore.Timestamp | null;
  /**
   * Coordinator-verified occupant limit for each contracted room. Defaults to one when unknown; does not establish bed type or accessibility.
   */
  maxOccupantsPerRoom?: number;
}

/**
 * Server-owned per-guest travel leg. Carries itinerary facts, flight status snapshots, readiness/claim state and reviewed manual overrides. Provider facts are linked, never copied over manual observations.
 */
export interface ProgramTravelLegDocument {
  programId: string;
  organizerId: string;
  /**
   * Exactly one guest per leg; companions get their own legs sharing a party.
   */
  guestId: string;
  /**
   * Server-maintained membership index of the canonical party legIds. Only party membership commands and manifest import may change it.
   */
  partyId: string | null;
  kind: "inbound" | "outbound" | "ground";
  flightNumber: string | null;
  carrierCode: string | null;
  originIata: string | null;
  destinationIata: string | null;
  scheduledArrivalAt: FirebaseFirestore.Timestamp | null;
  estimatedArrivalAt: FirebaseFirestore.Timestamp | null;
  actualArrivalAt: FirebaseFirestore.Timestamp | null;
  flightStatus:
    | "scheduled"
    | "enroute"
    | "landed"
    | "delayed"
    | "cancelled"
    | "diverted"
    | "unknown";
  /**
   * Resolved flight identity for enrichment: flight number, airports and scheduled arrival instant. Shared across passengers on that flight.
   */
  flightInstanceId: string | null;
  /**
   * True for international sectors; selects the program's international exit lag. Null/false uses the domestic lag.
   */
  international?: boolean | null;
  pickupPointId: string | null;
  destinationHotelId: string | null;
  /**
   * Free-text destination when the drop is not a configured hotel.
   */
  destinationLabel: string | null;
  readiness:
    | "expected"
    | "ready"
    | "dispatched"
    | "arrived"
    | "disrupted"
    | "noShow";
  /**
   * Observed curb-ready timestamp; outranks every estimate.
   */
  readyAt: FirebaseFirestore.Timestamp | null;
  claimedByUid: string | null;
  claimedAt: FirebaseFirestore.Timestamp | null;
  /**
   * Reviewed manual curb estimate; outranks flight-derived timing.
   */
  manualCurbAt: FirebaseFirestore.Timestamp | null;
  manualCurbNote: string | null;
  /**
   * Seats this leg consumes, including children without their own guest record.
   */
  passengers: number;
  luggageUnits: number;
  /**
   * @maxItems 12
   */
  requiredCapabilities: (
    | "wheelchairAccessible"
    | "extraLuggage"
    | "childSeat"
  )[];
  /**
   * VIP/private transfers never share a suggested vehicle.
   */
  dedicatedVehicle: boolean;
  source: "manual" | "import" | "formResponse" | "planner";
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  revision: number;
  /**
   * Provider-reported arrival terminal (e.g. T3). Staff display only; pickup point authority stays with pickupPointId.
   */
  arrivalTerminal: string | null;
  /**
   * Last successful provider refresh; null when the leg has never been enriched.
   */
  flightRefreshedAt: FirebaseFirestore.Timestamp | null;
  /**
   * Scheduler cursor for flight polling and subscription reconciliation. Null only when no polling or provider cleanup remains.
   */
  flightNextRefreshAt: FirebaseFirestore.Timestamp | null;
  /**
   * Attached provider subscription, retained until deletion is confirmed. A pending create is represented by flightAlertFlightNumber even before its id is known.
   */
  flightAlertSubscriptionId?: string | null;
  /**
   * Latest applied provider observation timestamp; older or replayed observations cannot overwrite current facts.
   */
  flightProviderUpdatedAt?: FirebaseFirestore.Timestamp | null;
  /**
   * Provider subject for the attached or pending subscription. Retained across failures and rebooking until reconciled.
   */
  flightAlertFlightNumber?: string | null;
  /**
   * Short server lease for subscription reconciliation. Provider requests run outside transactions; expired leases can be recovered.
   */
  flightAlertLease?: null | {
    token: string;
    expiresAt: FirebaseFirestore.Timestamp;
  };
  /**
   * Identity/free-text scrub marker set by the archive retention sweep; null until anonymized.
   */
  anonymizedAt?: FirebaseFirestore.Timestamp | null;
}

/**
 * Server-owned ride-together membership for specific travel legs. This is independent of invitation households and does not apply to a guest's other journeys.
 */
export interface ProgramTravelPartyDocument {
  programId: string;
  organizerId: string;
  label: string | null;
  dedicatedVehicle: boolean;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  revision: number;
  /**
   * Explicit travel legs in this ride-together party. Guest identities are derived from those legs. An existing un-dispatched party may be emptied to release its members.
   *
   * @minItems 0
   * @maxItems 50
   */
  legIds: string[];
  /**
   * Identity/free-text scrub marker set by the archive retention sweep; null until anonymized.
   */
  anonymizedAt?: FirebaseFirestore.Timestamp | null;
}

/**
 * Durable journal for one program's archive-anonymization run. Document id equals the program id (a program anonymizes at most once). Phases record per-collection progress so a crashed or chunked run resumes idempotently.
 */
export interface ProgramRetentionRunDocument {
  programId: string;
  organizerId: string;
  status: "running" | "completed" | "failed";
  /**
   * Per-collection progress journal; one entry per scrubbed collection, appended in order as phases complete.
   *
   * @maxItems 23
   */
  phases: {
    collection: string;
    processed: number;
    /**
     * Last document id processed in this phase; resume token for chunked sweeps.
     */
    cursor: string | null;
    completedAtMillis?: number | null;
  }[];
  startedAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  completedAt?: FirebaseFirestore.Timestamp | null;
  leaseUntil: FirebaseFirestore.Timestamp | null;
  /**
   * Fencing token for the worker currently holding the run lease.
   */
  leaseToken: string | null;
  error: string | null;
  revision: number;
}

/**
 * Private durable program delivery outbox. The immutable intent and bounded attempt history survive moment-run completion and delayed provider callbacks. Recipient endpoints are references; transport credentials and guest bearer grants belong to their own private stores.
 */
export interface ProgramDeliveryMessageDocument {
  schemaVersion: 1;
  messageId: string;
  revision: number;
  intent: {
    schemaVersion: 1;
    intentId: string;
    revision: number;
    context: {
      mode: "live";
      programId: string;
      organizerId: string;
    };
    programId: string;
    recipient: {
      kind: "guest" | "household" | "staff";
      /**
       * Stable recipient identity inside the program (guest id, household id, or staff uid). Endpoint resolution lives in the facts reader, never in the intent.
       */
      recipientKey: string;
    };
    workflow: {
      kind: "programMoment";
      momentId: string;
      /**
       * Moment-run occurrence identity. Phase 3 refines this into an explicit occurrence key once anchor revisions exist.
       */
      runId: string;
    };
    createdAt: number;
    expiresAt: number;
    /**
     * @minItems 1
     * @maxItems 3
     */
    permittedRoutes: ("organizerProgramWhatsapp" | "catchProgramActivity")[];
    deliveryPolicy: {
      maxAttempts: number;
      maxAttemptsPerRoute: number;
      minimumRetrySeconds: number;
    };
    kind: "programReminder";
    title: string;
    body: string;
    /**
     * The program/moment fact revision this intent was issued under. Reservation authority expires with it.
     */
    instructionRevision: number;
    /**
     * Approved WhatsApp template content for organizerProgramWhatsapp routes. Frozen at intent time; sender credentials never appear here.
     */
    whatsapp?: {
      connectionId: string;
      templateId: string;
      variables: {
        [k: string]: string;
      };
    };
    /**
     * Frozen staff activity and push semantics; claim revalidates the original Moment revision and current recipient authority.
     */
    activity?:
      | {
          appRole: "host";
          audienceDuty: string;
          /**
           * @maxItems 200
           */
          scopeIds: string[] | null;
          actionKind: "push";
          notificationType: string;
          preferenceKey: string;
        }
      | {
          appRole: "host";
          audienceDuty: string;
          /**
           * @maxItems 200
           */
          scopeIds: string[] | null;
          actionKind: "staffAttention";
          actionDuty: string;
          severity: "info" | "warning" | "urgent";
        };
  };
  lifecycle: "active" | "cancelled" | "superseded" | "responded";
  /**
   * @maxItems 6
   */
  attempts: {
    schemaVersion: 1;
    attemptId: string;
    intentId: string;
    intentRevision: number;
    ordinal: number;
    createdAt: number;
    state:
      | {
          kind: "reserved";
          at: number;
          reconcileAfter: number;
        }
      | {
          kind: "unknown";
          at: number;
          providerMessageId: string | null;
          reason:
            | "timeout"
            | "connectionLost"
            | "workerInterrupted"
            | "sdkOutcomeUnknown";
          reconcileAfter: number;
        }
      | {
          kind: "accepted" | "delivered" | "read";
          at: number;
          providerMessageId: string | null;
        }
      | {
          kind: "failed";
          at: number;
          providerMessageId: string | null;
          classification:
            | "technical"
            | "policy"
            | "suppressed"
            | "invalidRecipient";
          evidenceId: string | null;
        }
      | {
          kind: "revoked";
          at: number;
          providerMessageId: string | null;
          evidenceId: string | null;
        }
      | {
          kind: "notDispatched";
          at: number;
          reason:
            | "superseded"
            | "responded"
            | "expired"
            | "permissionRevoked"
            | "reservationExpired"
            | "permitExpired"
            | "programEnded"
            | "rsvpChanged"
            | "recipientWithdrawn";
        };
    mode: "live";
    context: {
      mode: "live";
      programId: string;
      organizerId: string;
    };
    binding:
      | {
          routeId: "organizerProgramWhatsapp";
          transport: "whatsapp";
          senderIdentity: "organizerManaged";
          provider: "meta" | "gupshup" | "twilio";
          senderId: string;
          bindingRevision: number;
          recipientEndpointId: string;
          fallbackOwner: "catch" | "provider";
        }
      | {
          routeId: "catchProgramActivity";
          transport: "catchApp";
          senderIdentity: "catchPlatform";
          provider: "catchActivity" | "fcm";
          senderId: string;
          bindingRevision: number;
          recipientEndpointId: string;
          fallbackOwner: "catch";
          /**
           * Frozen at reservation and claim for local activity only; never FCM submission evidence.
           */
          pushSuppressionReason?: "noEndpoint" | "preferenceOff";
        };
    authorization: {
      permissionRevision: string;
      checkedAt: number;
      validUntil: number;
      instructionRevision: number;
    };
  }[];
  deliveryConflict: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * Private claim-time binding between one program delivery attempt and the exact Meta WhatsApp submission. Webhook status callbacks verify against this record before a receipt can merge into the program delivery outbox.
 */
export interface ProgramWhatsappDispatchDocument {
  schemaVersion: 1;
  attemptId: string;
  messageId: string;
  context: {
    mode: "live";
    programId: string;
    organizerId: string;
  };
  /**
   * organizerSenderConnections document id that owned the send.
   */
  senderId: string;
  bindingRevision: number;
  providerAccountId: string;
  providerPhoneNumberId: string;
  /**
   * Content hash of the sender connection snapshot authorized at claim.
   */
  senderHash: string;
  recipientEndpointId: string;
  /**
   * Hash of the E.164 destination; the raw number never appears here.
   */
  endpointHash: string;
  templateDocumentId: string;
  templateHash: string;
  /**
   * Content hash of the rendered template + variables; the status callback must carry the matching correlation.
   */
  payloadHash: string;
  createdAt: number;
}

/**
 * Private durable campaign delivery outbox. The immutable intent and bounded attempt history survive dispatch interruption and delayed provider callbacks. The organizerCampaignRecipients row remains the CRM/report mirror; this record is the execution authority. Recipient endpoints are references; transport credentials stay in their own private stores.
 */
export interface CampaignDeliveryMessageDocument {
  schemaVersion: 1;
  messageId: string;
  revision: number;
  intent: {
    schemaVersion: 1;
    intentId: string;
    revision: number;
    context: {
      mode: "live";
      organizerId: string;
      campaignId: string;
      recipientId: string;
    };
    campaignId: string;
    recipient: {
      kind: "campaignRecipient";
      /**
       * organizerCampaignRecipients document id — the frozen per-recipient campaign row. Endpoint and consent facts resolve at claim time, never in the intent.
       */
      recipientKey: string;
    };
    workflow: {
      kind: "campaignDispatch";
      campaignId: string;
      recipientId: string;
    };
    createdAt: number;
    expiresAt: number;
    /**
     * @minItems 1
     * @maxItems 1
     */
    permittedRoutes: "organizerWhatsappCampaign"[];
    deliveryPolicy: {
      maxAttempts: number;
      maxAttemptsPerRoute: number;
      minimumRetrySeconds: number;
    };
    kind: "campaignMessage";
    /**
     * The campaign dispatch epoch (dispatchedAt millis) this intent was issued under. Reservation authority expires when the campaign's dispatch epoch changes.
     */
    instructionRevision: number;
    /**
     * Approved WhatsApp template content frozen from the campaign/recipient snapshot; sender credentials never appear here.
     */
    whatsapp: {
      connectionId: string;
      templateId: string;
      variables: {
        [k: string]: string;
      };
    };
  };
  lifecycle: "active" | "cancelled" | "superseded" | "responded";
  /**
   * @maxItems 6
   */
  attempts: {
    schemaVersion: 1;
    attemptId: string;
    intentId: string;
    intentRevision: number;
    ordinal: number;
    createdAt: number;
    state:
      | {
          kind: "reserved";
          at: number;
          reconcileAfter: number;
        }
      | {
          kind: "unknown";
          at: number;
          providerMessageId: string | null;
          reason: "timeout" | "connectionLost" | "workerInterrupted";
          reconcileAfter: number;
        }
      | {
          kind: "accepted" | "delivered" | "read";
          at: number;
          providerMessageId: string | null;
        }
      | {
          kind: "failed";
          at: number;
          providerMessageId: string | null;
          classification:
            | "technical"
            | "policy"
            | "suppressed"
            | "invalidRecipient";
          evidenceId: string | null;
        }
      | {
          kind: "revoked";
          at: number;
          providerMessageId: string | null;
          evidenceId: string | null;
        }
      | {
          kind: "notDispatched";
          at: number;
          reason:
            | "superseded"
            | "expired"
            | "permissionRevoked"
            | "reservationExpired"
            | "permitExpired"
            | "campaignEnded"
            | "recipientWithdrawn";
        };
    mode: "live";
    context: {
      mode: "live";
      organizerId: string;
      campaignId: string;
      recipientId: string;
    };
    binding: {
      routeId: "organizerWhatsappCampaign";
      transport: "whatsapp";
      senderIdentity: "organizerManaged";
      provider: "meta";
      /**
       * organizerSenderConnections document id that owns the send.
       */
      senderId: string;
      bindingRevision: number;
      recipientEndpointId: string;
      fallbackOwner: "catch";
    };
    authorization: {
      permissionRevision: string;
      checkedAt: number;
      validUntil: number;
      instructionRevision: number;
    };
  }[];
  deliveryConflict: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * Private claim-time binding between one campaign delivery attempt and the exact Meta WhatsApp submission. Webhook status callbacks verify against this record before a receipt can merge into the campaign delivery outbox.
 */
export interface CampaignWhatsappDispatchDocument {
  schemaVersion: 1;
  attemptId: string;
  messageId: string;
  context: {
    mode: "live";
    organizerId: string;
    campaignId: string;
    recipientId: string;
  };
  /**
   * organizerSenderConnections document id that owned the send.
   */
  senderId: string;
  bindingRevision: number;
  providerAccountId: string;
  providerPhoneNumberId: string;
  /**
   * Content hash of the sender connection snapshot authorized at claim.
   */
  senderHash: string;
  recipientEndpointId: string;
  /**
   * Hash of the E.164 destination; the raw number never appears here.
   */
  endpointHash: string;
  templateDocumentId: string;
  templateHash: string;
  /**
   * Content hash of the rendered template + variables; the status callback must carry the matching correlation.
   */
  payloadHash: string;
  createdAt: number;
}

/**
 * Private durable form-automation delivery outbox. The immutable intent and bounded attempt history survive dispatch interruption and delayed provider callbacks. The companion organizerMomentRuns row remains the organizer-visible journal; this record is the execution authority. Recipient endpoints are references; transport credentials stay in their own private stores.
 */
export interface AutomationDeliveryMessageDocument {
  schemaVersion: 1;
  messageId: string;
  revision: number;
  intent: {
    schemaVersion: 1;
    intentId: string;
    revision: number;
    context: {
      mode: "live";
      organizerId: string;
      ruleId: string;
      /**
       * Approved rule revision the intent was authorized under. Claim re-reads the live rule; a changed revision stops the intent as superseded.
       */
      ruleRevision: number;
      actionId: string;
      eventKind:
        | "submitted"
        | "withdrawn"
        | "applicationAccepted"
        | "eventAttended";
      sourceId: string;
      /**
       * Source-event occurrence time; part of the durable occurrence identity alongside ruleId/actionId/eventKind/sourceId.
       */
      occurredAtMillis: number;
      /**
       * The business delay horizon the automation engine computed (max(occurredAt, eventEndAt) + delayMinutes). Claim re-derives it from the live event and rule.
       */
      dueAtMillis: number;
      /**
       * Contact identity resolved from the source event at handoff. Claim re-derives the current identity from the live source event, so a merge follows the send to the surviving contact.
       */
      contactId: string;
      /**
       * organizerCampaigns document id of the recipe the action pinned.
       */
      recipeCampaignId: string;
      recipeRevision: number;
    };
    ruleId: string;
    recipient: {
      kind: "organizerContact";
      /**
       * organizerContacts document id resolved at handoff. Endpoint and consent facts resolve at claim time, never in the intent.
       */
      recipientKey: string;
    };
    workflow: {
      kind: "automationSend";
      /**
       * The rule's server-managed companion moment.
       */
      momentId: string;
      /**
       * The occurrence-keyed moment run journaling this send.
       */
      runId: string;
    };
    createdAt: number;
    expiresAt: number;
    /**
     * @minItems 1
     * @maxItems 1
     */
    permittedRoutes: "organizerWhatsappAutomation"[];
    deliveryPolicy: {
      maxAttempts: number;
      maxAttemptsPerRoute: number;
      minimumRetrySeconds: number;
    };
    kind: "automationMessage";
    /**
     * The companion moment's revision at handoff. Reservation authority expires when the synced rule projection changes.
     */
    instructionRevision: number;
    /**
     * Approved WhatsApp template content frozen at handoff, including the rendered invite variables; sender credentials never appear here.
     */
    whatsapp: {
      connectionId: string;
      templateId: string;
      variables: {
        [k: string]: string;
      };
      /**
       * Event destination pinned by the recipe; claim re-verifies the event is still active and owned.
       */
      eventId: string | null;
      /**
       * Per-occurrence invitation link minted at handoff; claim re-reads its secret so a rotated or revoked link fails closed.
       */
      inviteLinkId: string | null;
    };
  };
  lifecycle: "active" | "cancelled" | "superseded" | "responded";
  /**
   * @maxItems 6
   */
  attempts: {
    schemaVersion: 1;
    attemptId: string;
    intentId: string;
    intentRevision: number;
    ordinal: number;
    createdAt: number;
    state:
      | {
          kind: "reserved";
          at: number;
          reconcileAfter: number;
        }
      | {
          kind: "unknown";
          at: number;
          providerMessageId: string | null;
          reason: "timeout" | "connectionLost" | "workerInterrupted";
          reconcileAfter: number;
        }
      | {
          kind: "accepted" | "delivered" | "read";
          at: number;
          providerMessageId: string | null;
        }
      | {
          kind: "failed";
          at: number;
          providerMessageId: string | null;
          classification:
            | "technical"
            | "policy"
            | "suppressed"
            | "invalidRecipient";
          evidenceId: string | null;
        }
      | {
          kind: "revoked";
          at: number;
          providerMessageId: string | null;
          evidenceId: string | null;
        }
      | {
          kind: "notDispatched";
          at: number;
          reason:
            | "superseded"
            | "expired"
            | "permissionRevoked"
            | "reservationExpired"
            | "permitExpired"
            | "campaignEnded"
            | "recipientWithdrawn";
        };
    mode: "live";
    context: {
      mode: "live";
      organizerId: string;
      ruleId: string;
      /**
       * Approved rule revision the intent was authorized under. Claim re-reads the live rule; a changed revision stops the intent as superseded.
       */
      ruleRevision: number;
      actionId: string;
      eventKind:
        | "submitted"
        | "withdrawn"
        | "applicationAccepted"
        | "eventAttended";
      sourceId: string;
      /**
       * Source-event occurrence time; part of the durable occurrence identity alongside ruleId/actionId/eventKind/sourceId.
       */
      occurredAtMillis: number;
      /**
       * The business delay horizon the automation engine computed (max(occurredAt, eventEndAt) + delayMinutes). Claim re-derives it from the live event and rule.
       */
      dueAtMillis: number;
      /**
       * Contact identity resolved from the source event at handoff. Claim re-derives the current identity from the live source event, so a merge follows the send to the surviving contact.
       */
      contactId: string;
      /**
       * organizerCampaigns document id of the recipe the action pinned.
       */
      recipeCampaignId: string;
      recipeRevision: number;
    };
    binding: {
      routeId: "organizerWhatsappAutomation";
      transport: "whatsapp";
      senderIdentity: "organizerManaged";
      provider: "meta";
      /**
       * organizerSenderConnections document id that owns the send.
       */
      senderId: string;
      bindingRevision: number;
      recipientEndpointId: string;
      fallbackOwner: "catch";
    };
    authorization: {
      permissionRevision: string;
      checkedAt: number;
      validUntil: number;
      instructionRevision: number;
    };
  }[];
  deliveryConflict: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * Private claim-time binding between one automation delivery attempt and the exact Meta WhatsApp submission. Webhook status callbacks verify against this record before a receipt can merge into the automation delivery outbox.
 */
export interface AutomationWhatsappDispatchDocument {
  schemaVersion: 1;
  attemptId: string;
  messageId: string;
  context: {
    mode: "live";
    organizerId: string;
    ruleId: string;
    /**
     * Approved rule revision the intent was authorized under. Claim re-reads the live rule; a changed revision stops the intent as superseded.
     */
    ruleRevision: number;
    actionId: string;
    eventKind:
      | "submitted"
      | "withdrawn"
      | "applicationAccepted"
      | "eventAttended";
    sourceId: string;
    /**
     * Source-event occurrence time; part of the durable occurrence identity alongside ruleId/actionId/eventKind/sourceId.
     */
    occurredAtMillis: number;
    /**
     * The business delay horizon the automation engine computed (max(occurredAt, eventEndAt) + delayMinutes). Claim re-derives it from the live event and rule.
     */
    dueAtMillis: number;
    /**
     * Contact identity resolved from the source event at handoff. Claim re-derives the current identity from the live source event, so a merge follows the send to the surviving contact.
     */
    contactId: string;
    /**
     * organizerCampaigns document id of the recipe the action pinned.
     */
    recipeCampaignId: string;
    recipeRevision: number;
  };
  /**
   * organizerSenderConnections document id that owned the send.
   */
  senderId: string;
  bindingRevision: number;
  providerAccountId: string;
  providerPhoneNumberId: string;
  /**
   * Content hash of the sender connection snapshot authorized at claim.
   */
  senderHash: string;
  recipientEndpointId: string;
  /**
   * Hash of the E.164 destination; the raw number never appears here.
   */
  endpointHash: string;
  templateDocumentId: string;
  templateHash: string;
  /**
   * Content hash of the rendered template + variables; the status callback must carry the matching correlation.
   */
  payloadHash: string;
  createdAt: number;
}

/**
 * Unified send definition: initiation x sense x action over an event, program, or organizer scope. Server-owned; managed through the organizer moment callables. Edits reset status to draft and clear approval (approve-the-rule-once). Organizer-scope moments are the server-managed projections of form automation rules — they are never authored directly.
 */
export interface OrganizerMomentDocument {
  momentId: string;
  scope: {
    kind: "event" | "program" | "organizer";
    /**
     * Required when kind=event; must be null otherwise.
     */
    eventId?: string | null;
    /**
     * Required when kind=program; must be null otherwise.
     */
    programId?: string | null;
    /**
     * Required when kind=organizer; must be null otherwise. Organizer scope hosts server-managed form-automation companion moments.
     */
    organizerId?: string | null;
  };
  /**
   * Denormalized scope.kind for list queries.
   */
  scopeKind: "event" | "program" | "organizer";
  /**
   * Denormalized scope id (eventId, programId, or organizerId) for list queries.
   */
  scopeId: string;
  name: string;
  initiation: {
    kind: "manual" | "scheduled" | "anchored" | "triggered";
    /**
     * Scheduled fire time; required when kind=scheduled.
     */
    atMillis?: number | null;
    /**
     * Required when kind=anchored.
     */
    anchorKind?:
      | (
          | "scopeStart"
          | "scopeEnd"
          | "functionStart"
          | "functionEnd"
          | "rsvpDeadline"
          | "travelLegTime"
        )
      | null;
    /**
     * Function/leg id for scoped anchors; null anchors to the scope itself.
     */
    anchorId?: string | null;
    /**
     * Minutes relative to the anchor; negative is before. Applied as an absolute-time shift after any calendar offset.
     */
    offsetMinutes?: number | null;
    /**
     * Calendar days relative to the anchor in the scope's timezone, preserving the anchor's local wall-clock time; negative is before. Applied after offsetMonths, before offsetMinutes.
     */
    offsetDays?: number | null;
    /**
     * Calendar months relative to the anchor in the scope's timezone, preserving local wall-clock time; the day-of-month clamps to the target month's length. Negative is before. Applied first.
     */
    offsetMonths?: number | null;
    /**
     * Required when kind=triggered.
     */
    triggerKind?:
      | ("lateArrivalAtHotel" | "flightDisrupted" | "formAutomation")
      | null;
    /**
     * Optional function scope for triggered moments.
     */
    functionId?: string | null;
    /**
     * Server-managed binding to the form-automation rule action; required when triggerKind=formAutomation. The rule stays the authored object — this projection carries its approved revision pins.
     */
    automation?: {
      ruleId: string;
      ruleRevision: number;
      actionId: string;
      recipeCampaignId: string;
      recipeRevision: number;
    } | null;
  };
  sense: "individual" | "audience";
  audience: {
    kind:
      | "subject"
      | "eventParticipants"
      | "functionGuests"
      | "households"
      | "staffDuty";
    /**
     * eventParticipants: participation statuses included.
     *
     * @maxItems 4
     */
    statuses?: "signedUp"[] | null;
    /**
     * functionGuests: the function whose guests resolve.
     */
    functionId?: string | null;
    /**
     * functionGuests: RSVP states included.
     *
     * @maxItems 4
     */
    rsvp?: ("attending" | "maybe")[] | null;
    /**
     * functionGuests: one send per household when true (default).
     */
    householdDedupe?: boolean | null;
    /**
     * functionGuests: shift each recipient's due time earlier by their hotel→function travel estimate (hotel comes from the guest's hotel-linked group). Legal only on program scopes.
     */
    travelTimeLead?: boolean | null;
    /**
     * households: restrict to households with a pending member.
     */
    rsvpPendingOnly?: boolean | null;
    /**
     * staffDuty: duty whose grant holders resolve.
     */
    duty?: string | null;
    /**
     * staffDuty: optional function/pickupPoint/hotel ids; null means all.
     *
     * @maxItems 50
     */
    scopeIds?: string[] | null;
  };
  action: {
    kind: "sendTemplate" | "push" | "staffAttention";
    /**
     * sendTemplate: organizerSenderConnections doc id.
     */
    connectionId?: string | null;
    /**
     * sendTemplate: organizerMessageTemplates doc id.
     */
    templateId?: string | null;
    /**
     * sendTemplate: template variable substitutions.
     */
    variables?: {
      [k: string]: string;
    } | null;
    /**
     * push: activity/push type written to the feed.
     */
    notificationType?: string | null;
    /**
     * push: user notification preference gating FCM.
     */
    preferenceKey?: string | null;
    /**
     * staffAttention: duty the attention item targets.
     */
    duty?: string | null;
    /**
     * staffAttention: attention severity.
     */
    severity?: "info" | "warning" | "urgent" | null;
    /**
     * staffAttention: rendered attention title.
     */
    titleTemplate?: string | null;
  };
  status: "draft" | "armed" | "paused" | "done";
  /**
   * Approve-the-rule-once record; required while armed.
   */
  approval: {
    approvedByUid: string;
    approvedAtMillis: number;
  } | null;
  /**
   * systemDefault moments (e.g. the T-15m event reminder) are seeded by the server and cannot be deleted. formAutomation moments are server-managed projections of automation rules — arm/pause state mirrors rule.enabled.
   */
  origin: "organizer" | "systemDefault" | "formAutomation";
  revision: number;
  createdAtMillis: number;
  updatedAtMillis: number;
}

/**
 * Server-owned planned/fired run for a moment. Time-based runId encodes moment + anchor revision + nominal due time; mutable travel wake and deferrals are separate. Triggered/manual identities retain subject/requestKey.
 */
export interface OrganizerMomentRunDocument {
  runId: string;
  momentId: string;
  dueAtMillis: number;
  /**
   * Scheduled occurrence time (anchor plus offsets), the identity axis behind runId; dueAtMillis is the mutable next-wake time and may differ for deferrals.
   */
  nominalDueAtMillis?: number;
  /**
   * Hard stop on firing this run; a deferred run past expiry skips instead of sending late.
   */
  expiresAtMillis?: number;
  occurrenceVersion?: 2;
  plannedWakeAtMillis?: number;
  travelPlanHash?: string;
  anchorRevision: number;
  status:
    | "planned"
    | "resolving"
    | "dispatched"
    | "skipped"
    | "superseded"
    | "failed";
  targetFunctionId?: string | null;
  /**
   * Triggered runs: the fact's subject (e.g. travel leg id).
   */
  subjectId?: string | null;
  /**
   * Skip/failure reason written at run transition.
   */
  reason?: string | null;
  recipients?: number | null;
  sent?: number | null;
  /**
   * Suppression reason -> recipient count rollup.
   */
  suppressed?: {
    [k: string]: number;
  } | null;
  suppressedNoEndpoint?: number | null;
  /**
   * Immutable first-ingestion Moment revision, CloudEvent instant and committed recovery-window origin; never renewed by due-time deferral.
   */
  travelOccurrence?: {
    momentRevision: number;
    occurredAtMillis: number;
    createdAtMillis: number;
  };
  /**
   * Occurrence binding for form-automation sends. Present only on runs materialized by the automation handoff; delivery evidence lives in automationDeliveryMessages.
   */
  automation?: {
    ruleId: string;
    ruleRevision: number;
    actionId: string;
    eventKind:
      | "submitted"
      | "withdrawn"
      | "applicationAccepted"
      | "eventAttended";
    sourceId: string;
    occurredAtMillis: number;
    /**
     * Business-delay horizon computed by the automation engine at handoff; the delivery claim re-derives it from live facts.
     */
    dueAtMillis: number;
    /**
     * Contact identity resolved at handoff; claim re-derives the live identity so merges follow the send.
     */
    contactId: string;
    /**
     * Durable intent record this run executes; the outbox owns the actual attempt history.
     */
    deliveryMessageId: string;
  } | null;
}

/**
 * Per-recipient send decision for a moment run; document id is {runId}_{recipientKey} so retries never double-send and every suppression carries its audited reason.
 */
export interface OrganizerMomentSendDocument {
  momentId: string;
  /**
   * Stable recipient idempotency key: household:|guest:|uid:|contact: prefixed.
   */
  recipientKey: string;
  decision: "sent" | "suppressed";
  /**
   * Suppression reason; null on sent.
   */
  reason?:
    | "noEndpoint"
    | "preferenceOff"
    | "noConsent"
    | "optedOut"
    | "endpointSuppressed"
    | "dailyCap"
    | "deliveryConflict"
    | "superseded"
    | "expired"
    | "programEnded"
    | "recipientWithdrawn"
    | "permissionRevoked"
    | "frequencyCapped"
    | "hostReview"
    | null;
  /**
   * Scope-local calendar day (YYYY-MM-DD) for per-endpoint daily caps.
   */
  dayKey: string;
  createdAtMillis: number;
  /**
   * Run that produced this send; set on staffAttention sends so the attention projection can group recipients per run.
   */
  runId?: string | null;
  /**
   * Moment action kind; staffAttention rows feed the organizer attention projection.
   */
  actionKind?: "sendTemplate" | "push" | "staffAttention" | null;
  /**
   * Owning organizer for attention projection queries.
   */
  organizerId?: string | null;
  scopeKind?: "event" | "program" | "organizer" | null;
  scopeId?: string | null;
  /**
   * staffAttention: duty the alert targeted.
   */
  duty?: string | null;
  /**
   * staffAttention: alert severity.
   */
  severity?: "info" | "warning" | "urgent" | null;
  /**
   * staffAttention: rendered alert title.
   */
  title?: string | null;
  /**
   * Durable intent record that executed this send (automation/program durable deliveries); the outbox owns the attempt history this row projects.
   */
  deliveryMessageId?: string | null;
  /**
   * Outbox evidence projected for this recipient. Unknown never implies confirmed delivery. notDispatched is a proven-unsent retry projection; the original run window and authority still apply.
   */
  deliveryState?:
    | "accepted"
    | "unknown"
    | "delivered"
    | "read"
    | "failed"
    | "revoked"
    | "notDispatched"
    | null;
}

/**
 * Server-owned pagination state for the moment sweep. The armed-moments scan advances a durable cursor so discovery stays bounded at any armed-moment count.
 */
export interface OrganizerMomentSweepStateDocument {
  sweepId: string;
  /**
   * Last armed-moment doc id scanned; null restarts the scan.
   */
  afterMomentId: string | null;
  updatedAtMillis: number;
}

/**
 * Server-owned organizer-level taxi/coach subcontractor identity. Program use requires an explicit binding; rate cards and commercial terms ship with the reconciliation slice.
 */
export interface TransportVendorDocument {
  organizerId: string;
  name: string;
  contactName: string | null;
  phoneE164: string | null;
  /**
   * Programs this vendor is bound to; dispatch may only snapshot bound vendors.
   *
   * @maxItems 100
   */
  programIds: string[];
  active: boolean;
  notes: string | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  revision: number;
}

/**
 * Server-owned dispatched vehicle record. The dispatch act is the reconciliation atom: plate, vendor, class and manifest are snapshotted at departure. Airport, hotel and finance surfaces read field-redacted projections.
 */
export interface TransportTripDocument {
  programId: string;
  organizerId: string;
  kind: "guestTransfer" | "repositioning";
  pickupPointId: string;
  destinationHotelId: string | null;
  destinationLabel: string | null;
  /**
   * Program vehicle-class catalog id snapshotted at dispatch.
   */
  vehicleClassId: string;
  vendorId: string | null;
  vendorNameSnapshot: string | null;
  /**
   * Uppercased plate with separators stripped; the reconciliation join key.
   */
  plateNormalized: string;
  plateDisplay: string;
  /**
   * @maxItems 50
   */
  partyIds: string[];
  /**
   * @minItems 1
   * @maxItems 50
   */
  legIds: string[];
  passengerCount: number;
  status: "enRoute" | "arrived" | "cancelled" | "voided";
  departedAt: FirebaseFirestore.Timestamp;
  departedByUid: string;
  arrivedAt: FirebaseFirestore.Timestamp | null;
  /**
   * Dispatcher/manager who voided the trip.
   */
  voidedByUid: string | null;
  /**
   * Required reason recorded when a dispatch is voided; reviewed in reconciliation.
   */
  voidReason: string | null;
  arrivedByUid: string | null;
  /**
   * Optional agreed rate frozen at dispatch; commercial terms ship with the reconciliation slice.
   */
  rateSnapshot: {
    currency: string;
    amountMinor: number;
    pricingKind: "perTrip" | "perVehicleDay" | "custom";
  } | null;
  /**
   * Idempotent dispatch key; a replay returns the original trip.
   */
  clientOperationId: string;
  notes: string | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  revision: number;
  /**
   * Facts captured atomically when dispatch is recorded, including offline departures recorded later. Absent only on legacy trips; never reconstructed as historical evidence from current records.
   */
  dispatchSnapshot?: {
    recordedAt: FirebaseFirestore.Timestamp;
    vehicleClass: {
      id: string;
      label: string;
      passengerCapacity: number;
      luggageCapacity: number;
      /**
       * @maxItems 12
       */
      capabilities: ("wheelchairAccessible" | "extraLuggage" | "childSeat")[];
      sortOrder: number;
    };
    /**
     * @minItems 1
     * @maxItems 50
     */
    manifest: {
      legId: string;
      guestId: string;
      guestDisplayName: string;
      partyId: string | null;
      passengers: number;
      luggageUnits: number;
    }[];
  };
  /**
   * Identity/free-text scrub marker set by the archive retention sweep; null until anonymized.
   */
  anonymizedAt?: FirebaseFirestore.Timestamp | null;
}

/**
 * Server-owned unique binding from a travel leg to its active trip. Created in the same transaction as dispatch so two staff cannot board one leg twice.
 */
export interface TransportActiveAssignmentDocument {
  programId: string;
  legId: string;
  tripId: string;
  status: "active" | "released";
  assignedAt: FirebaseFirestore.Timestamp;
  releasedAt: FirebaseFirestore.Timestamp | null;
  revision: number;
}

/**
 * Server-owned organizer-wide occupancy of a normalized vehicle plate. Dispatch reserves the vehicle atomically with its passenger assignments. Arrival or void releases only the matching trip; active reservations never expire by age.
 */
export interface TransportVehicleAssignmentDocument {
  programId: string;
  tripId: string;
  status: "active" | "released";
  assignedAt: FirebaseFirestore.Timestamp;
  releasedAt: FirebaseFirestore.Timestamp | null;
  revision: number;
  organizerId: string;
  plateNormalized: string;
}

/**
 * Server-owned idempotency receipt for offline-replayed transport mutations. An exact retry returns the original result; a conflicting reuse of the client operation id fails closed.
 */
export interface TransportOperationReceiptDocument {
  programId: string;
  operationKind:
    | "markReady"
    | "claim"
    | "unclaim"
    | "markDisrupted"
    | "dispatch"
    | "markArrived"
    | "voidTrip"
    | "manifestImport";
  clientOperationId: string;
  actorUid: string;
  /**
   * Stable hash of the mutation payload; a same-id different-payload replay is rejected.
   */
  requestHash: string;
  tripId: string | null;
  legId: string | null;
  /**
   * Committed entity revision returned to a replayed caller.
   */
  resultRevision: number;
  createdAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;
  /**
   * Serialized operation response for exact replay of compound results (e.g. manifest import summaries). Null for scalar-result operations.
   */
  resultJson: string | null;
  /**
   * For manifestImport only: number of input rows already resolved. With completedRowIndices, rows may finish out of order so a whole travel party fits one transaction; older partial receipts use a contiguous input prefix.
   */
  completedRows?: number;
  /**
   * Guests already applied by a resumable manifest import; prevents two source rows updating one person across chunks.
   *
   * @maxItems 500
   */
  importedGuestIds?: string[];
  /**
   * For manifestImport only: original input indices atomically resolved with their complete travel party. Includes explicitly rejected rows; its length equals completedRows.
   *
   * @maxItems 500
   */
  completedRowIndices?: number[];
}

/**
 * Short-lived server-only idempotency receipt for one absolute Host attendance operation.
 */
export interface EventAttendeeAttendanceReceiptDocument {
  eventId: string;
  organizerId: string;
  attendeeId: string;
  actorUid: string;
  clientOperationId: string;
  desiredCheckedIn: boolean;
  priorRevision: number;
  acceptedRevision: number;
  changed: boolean;
  createdAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;
}

/**
 * Idempotency and audit receipt for one Host operational-roster import.
 */
export interface EventAttendeeImportDocument {
  eventId: string;
  clubId: string;
  organizerId: string;
  uploadedBy: string;
  importKey: string;
  fileName: string;
  format: "csv" | "xlsx" | "manual";
  payloadHash: string;
  status: "completed" | "partial" | "failed";
  rowCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  /**
   * @maxItems 100
   */
  errors: {
    rowId: string;
    code: string;
    message: string;
  }[];
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  completedAt: FirebaseFirestore.Timestamp | null;
}

/**
 * Server-only, expiring capability that routes a verified forwarded roster to one event and Host identity.
 */
export interface EventRosterHandoffDocument {
  eventId: string;
  clubId: string;
  organizerId: string;
  hostUid: string;
  tokenHash: string;
  provider:
    | "generic"
    | "luma"
    | "eventbrite"
    | "partiful"
    | "posh"
    | "bookmyshow"
    | "district"
    | "sortmyscene"
    | "airbnb";
  status: "active" | "expired" | "revoked";
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;
}

/**
 * Participant-private runtime identity stored at eventRuntimeParticipants/{eventId_uid}.
 */
export interface EventRuntimeParticipantDocument {
  eventId: string;
  clubId: string;
  organizerId: string;
  uid: string;
  eventAttendeeId: string | null;
  identityVersion: 1;
  claimMethod:
    | "verifiedPhone"
    | "signedAttendeeToken"
    | "verifiedEmail"
    | "hostApproval"
    | "catchParticipation";
  accessStatus:
    | "pendingApproval"
    | "needsInput"
    | "ready"
    | "optedOut"
    | "revoked";
  /**
   * @maxItems 10
   */
  requiredFieldIds: (
    | "displayName"
    | "gender"
    | "interestedInGenders"
    | "relationshipGoal"
    | "dateOfBirth"
    | "paceBand"
    | "skillBand"
    | "dietaryAndSeatingNotes"
    | "questionnaireAnswerIds"
    | "teamName"
  )[];
  /**
   * @maxItems 10
   */
  completedFieldIds: (
    | "displayName"
    | "gender"
    | "interestedInGenders"
    | "relationshipGoal"
    | "dateOfBirth"
    | "paceBand"
    | "skillBand"
    | "dietaryAndSeatingNotes"
    | "questionnaireAnswerIds"
    | "teamName"
  )[];
  /**
   * Monotonic accepted runtime-profile submission revision. Legacy documents omit it and read as zero.
   */
  profileRevision?: number;
  runtimeProfile: {
    displayName: string;
    gender: ("man" | "woman" | "nonBinary" | "other") | null;
    /**
     * @maxItems 4
     */
    interestedInGenders: ("man" | "woman" | "nonBinary" | "other")[];
    relationshipGoal:
      | "relationship"
      | "casual"
      | "marriage"
      | "friendship"
      | "unsure"
      | null;
    dateOfBirth: FirebaseFirestore.Timestamp | null;
    paceBand: "competitive" | "fast" | "moderate" | "easy" | null;
    skillBand: "beginner" | "intermediate" | "advanced" | null;
    dietaryAndSeatingNotes: string | null;
    /**
     * @maxItems 8
     */
    questionnaireAnswerIds: string[];
    teamName: string | null;
  };
  consents: {
    runtimeTermsVersion: string;
    sensitiveDataTermsVersion: string | null;
    saveAsCatchPrefill: boolean;
  };
  claimedAt: FirebaseFirestore.Timestamp;
  readyAt: FirebaseFirestore.Timestamp | null;
  revokedAt: FirebaseFirestore.Timestamp | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Current source-fenced request for missing event-scoped runtime profile data.
 */
export interface EventRuntimeDataRequestDocument {
  schemaVersion: 1;
  requestId: string;
  eventId: string;
  organizerId: string;
  attendeeId: string;
  uid: string;
  revision: number;
  profileRevision: number;
  sourceHash: string;
  operationId: string;
  /**
   * @minItems 1
   * @maxItems 10
   */
  fieldIds: (
    | "displayName"
    | "gender"
    | "interestedInGenders"
    | "relationshipGoal"
    | "dateOfBirth"
    | "paceBand"
    | "skillBand"
    | "dietaryAndSeatingNotes"
    | "questionnaireAnswerIds"
    | "teamName"
  )[];
  /**
   * @maxItems 10
   */
  completedFieldIds: (
    | "displayName"
    | "gender"
    | "interestedInGenders"
    | "relationshipGoal"
    | "dateOfBirth"
    | "paceBand"
    | "skillBand"
    | "dietaryAndSeatingNotes"
    | "questionnaireAnswerIds"
    | "teamName"
  )[];
  status: "pending" | "completed";
  requestedBy: "systemWithinPolicy";
  requestedAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;
  completedAt: FirebaseFirestore.Timestamp | null;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Immutable idempotency receipt for one required-data command.
 */
export interface EventRuntimeDataRequestReceiptDocument {
  schemaVersion: 1;
  receiptId: string;
  requestId: string;
  eventId: string;
  organizerId: string;
  attendeeId: string;
  uid: string;
  operationId: string;
  requestHash: string;
  requestRevision: number;
  profileRevision: number;
  sourceHash: string;
  /**
   * @minItems 1
   * @maxItems 10
   */
  fieldIds: (
    | "displayName"
    | "gender"
    | "interestedInGenders"
    | "relationshipGoal"
    | "dateOfBirth"
    | "paceBand"
    | "skillBand"
    | "dietaryAndSeatingNotes"
    | "questionnaireAnswerIds"
    | "teamName"
  )[];
  expiresAt: FirebaseFirestore.Timestamp;
  createdAt: FirebaseFirestore.Timestamp;
}

/**
 * Short-lived server-owned venue-presence authority shown only in the Host live QR.
 */
export interface EventVenueSessionDocument {
  eventId: string;
  organizerId: string;
  createdBy: string;
  issuedAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;
}

/**
 * Server-only single-use receipt binding one attendee to one live venue session.
 */
export interface EventVenueSessionRedemptionDocument {
  eventId: string;
  sessionId: string;
  uid: string;
  purpose: "attendance" | "firstHello";
  redeemedAt: FirebaseFirestore.Timestamp;
  consumedAt: FirebaseFirestore.Timestamp | null;
  expiresAt: FirebaseFirestore.Timestamp;
}

/**
 * Server-owned liveness heartbeat stored at eventSuccessPresence/{eventId_uid}; presence state is derived from heartbeatAt and deployment policy rather than persisted.
 */
export interface EventSuccessPresenceDocument {
  eventId: string;
  clubId: string;
  organizerId: string;
  uid: string;
  surface: "flutter" | "web";
  heartbeatAt: FirebaseFirestore.Timestamp;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Server-owned, short-lived Host or operator position for one moving event. Attendee positions are never collected.
 */
export interface EventLivePositionDocument {
  eventId: string;
  clubId: string;
  organizerId: string;
  uid: string;
  role: "host" | "operator";
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  headingDegrees: number | null;
  recordedAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Server-owned Host resolution for a checked-in late attendee stored at eventSuccessLateArrivals/{eventId_uid}.
 */
export interface EventSuccessLateArrivalDocument {
  eventId: string;
  clubId: string;
  organizerId: string;
  uid: string;
  resolvedByUid: string;
  status: "insertedIntoOpenPair" | "extendedUnit" | "heldForNextRound";
  targetRoundIndex: number;
  assignmentDraftRevision: number;
  reason: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * An immutable synthetic departure manifest with a separately revised checkpoint observation.
 */
export interface EventRehearsalMovementDocument {
  sessionId: string;
  clockId: string;
  groupId: string;
  progressRevision: number;
  departure: {
    sourceHash: string;
    destination:
      | {
          kind: "fixedPlace";
          placeId: string;
          lateEntry: "allowed" | "hostDecision" | "closed";
        }
      | {
          kind: "itineraryStop";
          itineraryId: string;
          stopId: string;
        }
      | {
          kind: "groupCheckpoint";
          routeId: string;
          groupId: string;
          checkpointId: string;
        };
    confirmedAt: number;
    confirmedBy: string;
    operationId: string;
    roster: {
      /**
       * @maxItems 50
       */
      members: {
        attendeeId: string;
        displayName: string;
        visitHash: string;
        episodeId: string | null;
        membershipHash: string | null;
      }[];
      selectionHash: string;
    } | null;
    checkpointRequest: {
      responsibleOperatorId: string;
      dueAt: number;
    } | null;
  };
  report: {
    revision: number;
    rosterHash: string;
    /**
     * @maxItems 50
     */
    accountedFor: string[];
    reportedAt: number;
    reportedBy: string;
    correctionReason: string | null;
  } | null;
  assignment?: {
    revision: number;
    responsibleOperatorId: string;
    previousResponsibleOperatorId: string;
    assignedBy: string;
    assignedAt: number;
    reason: string;
    operationId: string;
  };
  closeout?: {
    revision: number;
    previousRevision: number;
    changedBy: string;
    changedAt: number;
    reason: string;
    decision:
      | {
          kind: "close";
          report: {
            revision: number;
            rosterHash: string;
            /**
             * @maxItems 50
             */
            accountedFor: string[];
            reportedAt: number;
            reportedBy: string;
            correctionReason: string | null;
          };
          /**
           * @maxItems 50
           */
          dispositions: {
            kind: "resolved";
            disposition: "returned" | "departed";
            revision: number;
            resolvedAt: number;
            resolvedBy: string;
            sourceHash: string;
            attendeeId: string;
          }[];
        }
      | {
          kind: "reopen";
        };
    operationId: string;
  };
}

/**
 * An immutable synthetic route override layered on a recorded rehearsal departure.
 */
export interface EventRehearsalRouteDecisionDocument {
  sessionId: string;
  clockId: string;
  groupId: string;
  progressRevision: number;
  previousRevision: number;
  departureRevision: number;
  sourceHash: string;
  alternativeId: string;
  destination:
    | {
        kind: "fixedPlace";
        placeId: string;
        lateEntry: "allowed" | "hostDecision" | "closed";
      }
    | {
        kind: "itineraryStop";
        itineraryId: string;
        stopId: string;
      }
    | {
        kind: "groupCheckpoint";
        routeId: string;
        groupId: string;
        checkpointId: string;
      };
  decisionId: string;
  operationId: string;
  decidedBy: string;
  decidedAt: number;
}

/**
 * Server-owned isolated Host rehearsal session stored at eventRehearsals/{sessionId}.
 */
export interface EventRehearsalDocument {
  organizerId: string;
  clubId: string;
  ownerUid: string;
  sourceEventId: string | null;
  sourceEventRevision: string | null;
  publicRehearsalId: string;
  viewerTokenHash: string;
  scenarioId:
    | "smoothRun"
    | "lateAndNoShow"
    | "earlyExitAndReturn"
    | "rosterAndCapacity"
    | "walkInAndAmbiguousClaim"
    | "privacyAndKeepApart"
    | "lowConnectivity"
    | "concurrentHosts"
    | "revealInterrupted"
    | "externalProfiles"
    | "accountabilitySweep";
  seed: number;
  actorCount: number;
  actionCount: number;
  status: "draft" | "ready" | "running" | "paused" | "complete" | "expired";
  setup: {
    title: string;
    locationName: string;
    durationMinutes: number;
    hostGoal: string;
    attendeePrompt: string;
    /**
     * @minItems 1
     * @maxItems 8
     */
    moduleIds: (
      | "arrival"
      | "firstHello"
      | "pods"
      | "rotations"
      | "conversationCues"
      | "reveal"
      | "afterglow"
      | "accountability"
    )[];
    unitOutcome?: "none" | "completion" | "score" | "rank";
    /**
     * Frozen, synthetic-only movement truth used by dress rehearsal. It never reads or writes a real person's live position.
     */
    movementSimulation?: {
      /**
       * @maxItems 40
       */
      itinerary: {
        id: string;
        kind:
          | "gather"
          | "activity"
          | "stop"
          | "break"
          | "transition"
          | "finish";
        offsetMinutes: number;
        durationMinutes?: number | null;
        title: string;
        description?: string | null;
        location?: {
          name: string;
          address?: string | null;
          placeId?: string | null;
          latitude: number;
          longitude: number;
          notes?: string | null;
        } | null;
        routeDistanceMeters?: number | null;
      }[];
      routePlan: null | {
        version: 1 | 2;
        movementMode: "run" | "walk" | "ride" | "mixed";
        routeShape: "loop" | "outAndBack" | "pointToPoint";
        groupStrategy: "together" | "paceGroups" | "selfDirected";
        stopCadence: "continuous" | "flexibleStops" | "hostedStops";
        /**
         * @minItems 1
         * @maxItems 7
         */
        stopKinds: (
          | "water"
          | "regroup"
          | "venue"
          | "photoSpot"
          | "viewpoint"
          | "hazard"
          | "turnaround"
        )[];
        /**
         * @minItems 1
         * @maxItems 6
         */
        roleKinds: (
          | "routeLead"
          | "sweep"
          | "pacer"
          | "stopHost"
          | "marshal"
          | "photographer"
        )[];
        /**
         * @minItems 2
         * @maxItems 500
         */
        path?: {
          latitude: number;
          longitude: number;
        }[];
        /**
         * @maxItems 12
         */
        paceGroups?: {
          id: string;
          label: string;
          targetPaceSecondsPerKm?: number | null;
          sortOrder: number;
        }[];
        liveTrackingPolicy?: {
          mode: "disabled" | "hostOnly" | "authorizedOperators";
          staleAfterSeconds: number;
          retentionMinutes: number;
        };
      };
      /**
       * @maxItems 2
       */
      livePositions: {
        role: "host" | "operator";
        latitude: number;
        longitude: number;
        recordedOffsetMinutes: number;
      }[];
      lateArrivalGuidance: string | null;
    };
    eventFormat?: {
      version: 1;
      activityKind:
        | "socialRun"
        | "running"
        | "walking"
        | "pickleball"
        | "padel"
        | "tennis"
        | "badminton"
        | "cycling"
        | "spinClass"
        | "yoga"
        | "strengthTraining"
        | "pubQuiz"
        | "barCrawl"
        | "dinner"
        | "singlesMixer"
        | "openActivity";
      interactionModel:
        | "pacePods"
        | "pairedRotations"
        | "teamRotations"
        | "seatedTable"
        | "freeFormMixer"
        | "hostLedProgram"
        | "openFormat";
      customActivityLabel?: string;
      defaultPlaybookId?: string;
      /**
       * @maxItems 30
       */
      defaultModuleIds?: string[];
      /**
       * Optional event-success behavior primitives for custom or unsupported activity formats. These fields translate a saved event format into the small set of primitives event success can reason about.
       */
      eventSuccessPrimitives?: {
        phoneAvailability?:
          | "continuous"
          | "plannedPauses"
          | "arrivalAndPostEventOnly"
          | "hostOnlyLive"
          | "noneDuringActivity";
        rotationSuitability?: "none" | "plannedBreaks" | "continuousRounds";
        assignmentAlgorithm?:
          | "none"
          | "pacePods"
          | "socialPods"
          | "pairRotations"
          | "teamBalancer"
          | "tableSeating";
        compatibilityPolicy?:
          | "none"
          | "socialCohortBalance"
          | "mutualInterestOnly"
          | "questionnaireClueOnly";
        matchingObjective?:
          | "coverage"
          | "romantic"
          | "affinity"
          | "novelty"
          | "balance"
          | "spread";
        unitOutcome?: "none" | "completion" | "score" | "rank";
        accountability?: "none" | "rollCall" | "sweep";
        durationShape?: "continuous" | "rounds" | "courses" | "segments";
      };
      activityDetails?: {
        /**
         * Composable operations for an event that moves through a route. Activity kind remains the broader format authority.
         */
        routePlan?: {
          version: 1 | 2;
          movementMode: "run" | "walk" | "ride" | "mixed";
          routeShape: "loop" | "outAndBack" | "pointToPoint";
          groupStrategy: "together" | "paceGroups" | "selfDirected";
          stopCadence: "continuous" | "flexibleStops" | "hostedStops";
          /**
           * @minItems 1
           * @maxItems 7
           */
          stopKinds: (
            | "water"
            | "regroup"
            | "venue"
            | "photoSpot"
            | "viewpoint"
            | "hazard"
            | "turnaround"
          )[];
          /**
           * @minItems 1
           * @maxItems 6
           */
          roleKinds: (
            | "routeLead"
            | "sweep"
            | "pacer"
            | "stopHost"
            | "marshal"
            | "photographer"
          )[];
          /**
           * @minItems 2
           * @maxItems 500
           */
          path?: {
            latitude: number;
            longitude: number;
          }[];
          /**
           * @maxItems 12
           */
          paceGroups?: {
            id: string;
            label: string;
            targetPaceSecondsPerKm?: number | null;
            sortOrder: number;
          }[];
          liveTrackingPolicy?: {
            mode: "disabled" | "hostOnly" | "authorizedOperators";
            staleAfterSeconds: number;
            retentionMinutes: number;
          };
        };
        /**
         * Optional host-authored notes for public event pages. Blank notes are omitted.
         */
        publicDetails?: {
          requirements?: string;
          accessibility?: string;
          included?: string;
          [k: string]: unknown;
        };
        [k: string]: unknown;
      };
    };
    successDefaults?: {
      enabled?: boolean;
      layoutId?: string | null;
      playbookId?: string;
      /**
       * @maxItems 24
       */
      selectedModuleIds?: string[];
      moduleSelectionConfigured?: boolean;
      structureConfig?: {
        [k: string]: unknown;
      };
      hostGoal?: string;
      wingmanRequestsEnabled?: boolean;
      contextualOpenersEnabled?: boolean;
      compatibilityAffectsRanking?: boolean;
      questionnaireConfig?: {
        templateId: string;
        customTitle?: string | null;
        /**
         * @maxItems 8
         */
        customQuestions?: {
          id: string;
          prompt: string;
          /**
           * @minItems 2
           * @maxItems 5
           */
          options: {
            id: string;
            label: string;
          }[];
        }[];
      };
      attendeePrompt?: string | null;
    };
  };
  setupRevision: number;
  runtimeRevision: number;
  activeStepIndex: number;
  virtualStartedAt: FirebaseFirestore.Timestamp;
  virtualNow: FirebaseFirestore.Timestamp;
  faultId:
    | "none"
    | "latency"
    | "oneShotFailure"
    | "listenerDisconnect"
    | "staleRevision"
    | "duplicateDelivery"
    | "legacyFixture"
    | "reducedMotion"
    | "lowBandwidth";
  faultConsumed: boolean;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;
  completedAt: FirebaseFirestore.Timestamp | null;
  staff?: {
    clockId: string;
    revision: number;
    /**
     * @maxItems 50
     */
    operators: {
      operatorId: string;
      displayName: string;
      /**
       * @maxItems 20
       */
      duties: {
        groupId: string;
        duty: "lead" | "pacer" | "sweep";
        expiresAtMillis: number;
        sourceHash: string;
        grantedBy: string;
        grantedAtMillis: number;
      }[];
    }[];
  };
  assistanceSettings?: {
    clockId: string;
    runtime: {
      status: "enabled" | "paused";
      configuration: {
        /**
         * @minItems 1
         * @maxItems 3
         */
        routes: (
          | "catchEventSms"
          | "catchEventRcs"
          | "organizerEventWhatsapp"
        )[];
        deliveryPolicy: {
          maxAttempts: number;
          maxAttemptsPerRoute: number;
          minimumRetrySeconds: number;
        };
        responseDeadline: number | null;
        /**
         * @maxItems 17
         */
        laterChoices?: {
          label: string;
          target:
            | {
                kind: "fixedPlace";
                placeId: string;
                lateEntry: "allowed" | "hostDecision" | "closed";
              }
            | {
                kind: "itineraryStop";
                itineraryId: string;
                stopId: string;
              }
            | {
                kind: "groupCheckpoint";
                routeId: string;
                groupId: string;
                checkpointId: string;
              };
        }[];
        /**
         * @minItems 1
         * @maxItems 6
         */
        outcomes: (
          | {
              kind: "accepted" | "delivered" | "read" | "revoked";
            }
          | {
              kind: "failed";
              classification:
                | "technical"
                | "policy"
                | "suppressed"
                | "invalidRecipient";
            }
          | {
              kind: "unknown";
              reason: "timeout" | "connectionLost" | "workerInterrupted";
            }
        )[];
      };
    } | null;
    /**
     * @maxItems 41
     */
    preferences: {
      groupId: string;
      preference:
        | {
            kind: "inherit";
          }
        | {
            kind: "disabled";
          }
        | {
            kind: "configured";
            template: {
              kind: "lateJoin";
              version: 1;
              setting:
                | {
                    kind: "enabled";
                    authority: "observe" | "prepare" | "executeWithinPolicy";
                  }
                | {
                    kind: "disabled";
                    reason: "hostChoice" | "organizerDefault";
                  };
              config: {
                destination:
                  | {
                      kind: "confirmedGroupProgress";
                    }
                  | (
                      | {
                          kind: "fixedPlace";
                          placeId: string;
                          lateEntry: "allowed" | "hostDecision" | "closed";
                        }
                      | {
                          kind: "itineraryStop";
                          itineraryId: string;
                          /**
                           * @minItems 1
                           * @maxItems 1000
                           */
                          permittedStopIds: string[];
                        }
                      | {
                          kind: "groupCheckpoint";
                          routeId: string;
                          groupId: string;
                          /**
                           * @minItems 1
                           * @maxItems 1000
                           */
                          permittedCheckpointIds: string[];
                        }
                    );
                cutoff:
                  | {
                      kind: "eventEnd";
                    }
                  | {
                      kind: "time";
                      /**
                       * UTC milliseconds.
                       */
                      at: number;
                    };
                maxMessagesPerEpisode: number;
                minimumMinutesBetweenMessages: number;
                updateOn: "materialGuidanceChange";
                unanswered: "keepUnknownUntilCutoff" | "hostReviewAtDeadline";
              };
            };
          };
    }[];
  };
  unitOutcomes?: {
    unitOutcome: "completion" | "score" | "rank";
    revision: number;
    /**
     * @maxItems 500
     */
    records: {
      unitId: string;
      round: number;
      outcome:
        | {
            kind: "completion";
            completed: boolean;
          }
        | {
            kind: "score";
            score: number;
          }
        | {
            kind: "rank";
            rank: number;
          };
      stateRevision: number;
      operationId: string;
      recordedBy: string;
      recordedAt: FirebaseFirestore.Timestamp;
    }[];
  };
  revealControl?: {
    revision: number;
    status: "idle" | "countingDown" | "revealed";
    publishedRound: number;
    pendingRound: number | null;
    startedAt: FirebaseFirestore.Timestamp | null;
    countdownSeconds: number;
    lastDecisionId: string | null;
    lastAction: ("startCountdown" | "cancelPending" | "publish") | null;
  };
  allocationState?: {
    revision: number;
    /**
     * @maxItems 100
     */
    proposals: {
      proposalId: string;
      /**
       * @minItems 1
       * @maxItems 50
       */
      attendeeIds: string[];
      targetUnitId: string;
      baseRevision: number;
      status: "pending" | "published" | "stale";
      decisionId: string | null;
      publishedRevision: number | null;
      proposedBy: string;
      operationId: string;
      proposedAt: FirebaseFirestore.Timestamp;
      publishedAt: FirebaseFirestore.Timestamp | null;
    }[];
  };
  rosterReconciliation?: {
    sourceId: string;
    sourceRevision: number;
    /**
     * @minItems 2
     * @maxItems 52
     */
    rows: {
      rowId: string;
      outcome: "imported" | "duplicate" | "ambiguous" | "failed";
      actorId: string | null;
    }[];
    status: "pending" | "reconciled";
    reconciliationRevision: number;
    lastOperationId: string | null;
    reconciledBy: string | null;
    reconciledAt: FirebaseFirestore.Timestamp | null;
  };
  guestSource?: "simulated" | "event";
  /**
   * Private frozen roster names and attendance only. No production identity or contact fields.
   *
   * @minItems 2
   * @maxItems 50
   */
  rosterSnapshot?: {
    displayName: string;
    status: "expected" | "present";
  }[];
}

/**
 * Synthetic practical help requests, retained until rehearsal reset or expiry. No live guest or safety case is written.
 */
export interface EventRehearsalCaseDocument {
  [k: string]: unknown;
}

/**
 * Synthetic message evidence isolated from the live outbox; deleted with its rehearsal session.
 */
export interface EventRehearsalMessageDocument {
  sessionId: string;
  actorId: string;
  plan: {
    /**
     * Explicit observe, prepare, execute or disabled practice mode. Absence preserves earlier executable recipes.
     */
    setting?:
      | {
          kind: "enabled";
          authority: "observe" | "prepare" | "executeWithinPolicy";
        }
      | {
          kind: "disabled";
          reason: "hostChoice" | "organizerDefault";
        };
    policy: {
      destination:
        | {
            kind: "fixedPlace";
            placeId: string;
            lateEntry: "allowed" | "hostDecision" | "closed";
          }
        | {
            kind: "itineraryStop";
            itineraryId: string;
            /**
             * @minItems 1
             * @maxItems 1000
             */
            permittedStopIds: string[];
          }
        | {
            kind: "groupCheckpoint";
            routeId: string;
            groupId: string;
            /**
             * @minItems 1
             * @maxItems 1000
             */
            permittedCheckpointIds: string[];
          };
      cutoff:
        | {
            kind: "eventEnd";
          }
        | {
            kind: "time";
            /**
             * UTC milliseconds.
             */
            at: number;
          };
      maxMessagesPerEpisode: number;
      minimumMinutesBetweenMessages: number;
      updateOn: "materialGuidanceChange";
      unanswered: "keepUnknownUntilCutoff" | "hostReviewAtDeadline";
    };
    guidance: {
      /**
       * Nonnegative safe integer revision.
       */
      revision: number;
      destination:
        | {
            kind: "fixedPlace";
            placeId: string;
            lateEntry: "allowed" | "hostDecision" | "closed";
          }
        | {
            kind: "itineraryStop";
            itineraryId: string;
            stopId: string;
          }
        | {
            kind: "groupCheckpoint";
            routeId: string;
            groupId: string;
            checkpointId: string;
          };
      materialKey: string;
      text: string;
      /**
       * UTC milliseconds.
       */
      validUntil: number;
    };
    departureConfirmed: boolean;
    responseDeadline: number | null;
    /**
     * @minItems 1
     * @maxItems 3
     */
    routes: ("catchEventSms" | "catchEventRcs" | "organizerEventWhatsapp")[];
    deliveryPolicy: {
      maxAttempts: number;
      maxAttemptsPerRoute: number;
      minimumRetrySeconds: number;
    };
    /**
     * @maxItems 17
     */
    laterChoices?: {
      label: string;
      target:
        | {
            kind: "fixedPlace";
            placeId: string;
            lateEntry: "allowed" | "hostDecision" | "closed";
          }
        | {
            kind: "itineraryStop";
            itineraryId: string;
            stopId: string;
          }
        | {
            kind: "groupCheckpoint";
            routeId: string;
            groupId: string;
            checkpointId: string;
          };
    }[];
  };
  record: EventAssistanceMessageDocument;
  handoff?: {
    actorUid: string;
    at: number;
    operationId: string;
  };
  /**
   * Server-derived accepted-group proof for a group checkpoint instruction. Unbound historical group messages remain evidence only.
   */
  membershipBinding?: {
    episodeId: string;
    groupId: string;
    groupSourceHash: string;
    assignmentRevision: number;
  };
  /**
   * Server-derived confirmed departure proof. Historical messages without this proof remain evidence only.
   */
  movementBinding?: {
    groupId: string;
    progressRevision: number;
    sourceHash: string;
  };
}

/**
 * Synthetic participant state stored only for an isolated rehearsal.
 */
export interface EventRehearsalActorDocument {
  sessionId: string;
  actorId: string;
  displayName: string;
  persona:
    | "firstTimer"
    | "regular"
    | "quiet"
    | "connector"
    | "external"
    | "sparseProfile"
    | "accessibilityNeeds"
    | "walkIn";
  status:
    | "expected"
    | "present"
    | "late"
    | "noShow"
    | "departed"
    | "returned"
    | "disconnected"
    | "walkIn"
    | "ambiguousClaim";
  connectionState?: "connected" | "disconnected";
  guestMoment:
    | "welcome"
    | "checkIn"
    | "firstHello"
    | "assignment"
    | "rotation"
    | "pause"
    | "reveal"
    | "afterglow"
    | "complete";
  optedOut: boolean;
  /**
   * @maxItems 10
   */
  keepApartActorIds: string[];
  helpRequested: boolean;
  promptCompleted: boolean;
  layoutUnitId: string | null;
  confirmedLayoutUnitId: string | null;
  lastActionAt: FirebaseFirestore.Timestamp | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  assistance?: {
    intention:
      | {
          kind: "unknown";
        }
      | {
          kind: "onMyWay";
          claimedEta: number | null;
        }
      | {
          kind: "joinLater";
          target:
            | {
                kind: "fixedPlace";
                placeId: string;
                lateEntry: "allowed" | "hostDecision" | "closed";
              }
            | {
                kind: "itineraryStop";
                itineraryId: string;
                stopId: string;
              }
            | {
                kind: "groupCheckpoint";
                routeId: string;
                groupId: string;
                checkpointId: string;
              };
        }
      | {
          kind: "notComing";
        };
    latestMessageId: string | null;
  };
  assistanceAutomation?: {
    clockId: string;
    status: "enabled" | "paused";
    plan: {
      /**
       * Explicit observe, prepare, execute or disabled practice mode. Absence preserves earlier executable recipes.
       */
      setting?:
        | {
            kind: "enabled";
            authority: "observe" | "prepare" | "executeWithinPolicy";
          }
        | {
            kind: "disabled";
            reason: "hostChoice" | "organizerDefault";
          };
      policy: {
        destination:
          | {
              kind: "fixedPlace";
              placeId: string;
              lateEntry: "allowed" | "hostDecision" | "closed";
            }
          | {
              kind: "itineraryStop";
              itineraryId: string;
              /**
               * @minItems 1
               * @maxItems 1000
               */
              permittedStopIds: string[];
            }
          | {
              kind: "groupCheckpoint";
              routeId: string;
              groupId: string;
              /**
               * @minItems 1
               * @maxItems 1000
               */
              permittedCheckpointIds: string[];
            };
        cutoff:
          | {
              kind: "eventEnd";
            }
          | {
              kind: "time";
              /**
               * UTC milliseconds.
               */
              at: number;
            };
        maxMessagesPerEpisode: number;
        minimumMinutesBetweenMessages: number;
        updateOn: "materialGuidanceChange";
        unanswered: "keepUnknownUntilCutoff" | "hostReviewAtDeadline";
      };
      guidance: {
        /**
         * Nonnegative safe integer revision.
         */
        revision: number;
        destination:
          | {
              kind: "fixedPlace";
              placeId: string;
              lateEntry: "allowed" | "hostDecision" | "closed";
            }
          | {
              kind: "itineraryStop";
              itineraryId: string;
              stopId: string;
            }
          | {
              kind: "groupCheckpoint";
              routeId: string;
              groupId: string;
              checkpointId: string;
            };
        materialKey: string;
        text: string;
        /**
         * UTC milliseconds.
         */
        validUntil: number;
      };
      departureConfirmed: boolean;
      responseDeadline: number | null;
      /**
       * @minItems 1
       * @maxItems 3
       */
      routes: ("catchEventSms" | "catchEventRcs" | "organizerEventWhatsapp")[];
      deliveryPolicy: {
        maxAttempts: number;
        maxAttemptsPerRoute: number;
        minimumRetrySeconds: number;
      };
      /**
       * @maxItems 17
       */
      laterChoices?: {
        label: string;
        target:
          | {
              kind: "fixedPlace";
              placeId: string;
              lateEntry: "allowed" | "hostDecision" | "closed";
            }
          | {
              kind: "itineraryStop";
              itineraryId: string;
              stopId: string;
            }
          | {
              kind: "groupCheckpoint";
              routeId: string;
              groupId: string;
              checkpointId: string;
            };
      }[];
    };
    /**
     * @minItems 1
     * @maxItems 6
     */
    outcomes: (
      | {
          kind: "accepted" | "delivered" | "read" | "revoked";
        }
      | {
          kind: "failed";
          classification:
            | "technical"
            | "policy"
            | "suppressed"
            | "invalidRecipient";
        }
      | {
          kind: "unknown";
          reason: "timeout" | "connectionLost" | "workerInterrupted";
        }
    )[];
    nextOutcomeIndex: number;
    evaluation: {
      at: number;
      policy:
        | (
            | {
                kind: "resolved";
                reason: "joined" | "declined";
              }
            | {
                kind: "cancelled";
                reason:
                  | "eventClosed"
                  | "notAdmitted"
                  | "policyDisabled"
                  | "participationInactive";
              }
            | {
                kind: "expired";
                reason: "cutoff" | "lateEntryClosed";
              }
            | {
                kind: "wait";
                reason:
                  | "departureUnconfirmed"
                  | "attendanceUnknown"
                  | "guidanceUnavailable"
                  | "throttled"
                  | "unchanged"
                  | "participationUnknown";
              }
            | {
                kind: "hostDecision";
                reason: "unreachable" | "entryDecision" | "missingInformation";
                guidance: {
                  /**
                   * Nonnegative safe integer revision.
                   */
                  revision: number;
                  destination:
                    | {
                        kind: "fixedPlace";
                        placeId: string;
                        lateEntry: "allowed" | "hostDecision" | "closed";
                      }
                    | {
                        kind: "itineraryStop";
                        itineraryId: string;
                        stopId: string;
                      }
                    | {
                        kind: "groupCheckpoint";
                        routeId: string;
                        groupId: string;
                        checkpointId: string;
                      };
                  materialKey: string;
                  text: string;
                  /**
                   * UTC milliseconds.
                   */
                  validUntil: number;
                } | null;
              }
            | {
                kind: "update";
                guidance: {
                  /**
                   * Nonnegative safe integer revision.
                   */
                  revision: number;
                  destination:
                    | {
                        kind: "fixedPlace";
                        placeId: string;
                        lateEntry: "allowed" | "hostDecision" | "closed";
                      }
                    | {
                        kind: "itineraryStop";
                        itineraryId: string;
                        stopId: string;
                      }
                    | {
                        kind: "groupCheckpoint";
                        routeId: string;
                        groupId: string;
                        checkpointId: string;
                      };
                  materialKey: string;
                  text: string;
                  /**
                   * UTC milliseconds.
                   */
                  validUntil: number;
                };
                messageKey: string;
                shouldSend: boolean;
                nextEvaluationAt: number | null;
              }
          )
        | null;
      delivery:
        | {
            kind: "paused";
          }
        | {
            kind: "notApplicable";
          }
        | {
            kind: "scriptExhausted";
          }
        | {
            kind: "stop";
            reason:
              | "responded"
              | "cancelled"
              | "superseded"
              | "expired"
              | "eventClosed"
              | "permissionRevoked"
              | "guestPresent"
              | "guestDeclined"
              | "notAdmitted"
              | "hostStopped"
              | "participationInactive";
          }
        | {
            kind: "delivered";
            /**
             * @maxItems 6
             */
            attemptIds: string[];
          }
        | {
            kind: "reconcile";
            /**
             * @maxItems 6
             */
            attemptIds: string[];
            notBefore: number;
          }
        | {
            kind: "refreshFacts";
            reason: "eventFactsStale" | "routeFactsStale";
          }
        | {
            kind: "wait";
            notBefore: number;
            reason: "retryBackoff";
          }
        | {
            kind: "hostDecision";
            reason:
              | "noEligibleRoute"
              | "attemptLimit"
              | "policyRejected"
              | "recipientNeedsReview"
              | "providerOwnsFallback"
              | "conflictingDeliveryEvidence"
              | "historyUnavailable"
              | "configurationUnavailable";
          };
    } | null;
    /**
     * Server-owned event configuration enrollment. Absence preserves the explicitly configured per-guest recipe.
     */
    origin?: "eventSettings";
  };
  /**
   * Preserves a pre-existing help flag without fabricating a typed request. New actors initialize false.
   */
  untrackedHelpRequested?: boolean;
  visit?: {
    attendanceRevision: number;
    checkedInAtMillis: number | null;
    accountabilityRevision: number;
    resolution: {
      disposition: "returned" | "departed";
      visitRevision: number;
      checkedInAtMillis: number;
      resolvedAtMillis: number;
      resolvedBy: string;
    } | null;
  };
  participation?: {
    revision: number;
    episodeRevision: number;
    state: "active" | "departed" | "pending";
  };
  groupMembership?: {
    clockId: string;
    episodeId: string;
    revision: number;
    accepted: {
      groupId: string;
      groupSourceHash: string;
      responsibleOperatorId: string;
      acceptedAt: number;
    } | null;
    transfer:
      | (
          | {
              transferId: string;
              from: string | null;
              to: string;
              targetSourceHash: string;
              receivingOperatorId: string;
              requestedBy: string;
              requestedAt: number;
              expiresAt: number;
              status: "pending";
              resolvedAt: null;
              resolvedBy: null;
            }
          | {
              transferId: string;
              from: string | null;
              to: string;
              targetSourceHash: string;
              receivingOperatorId: string;
              requestedBy: string;
              requestedAt: number;
              expiresAt: number;
              status: "accepted" | "rejected" | "cancelled";
              resolvedAt: number;
              resolvedBy: string;
            }
        )
      | null;
    createdAt: number;
    updatedAt: number;
    /**
     * Membership revision of the last placement, accepted transfer or removal. Proposals preserve it; absent legacy evidence cannot authorize group directions.
     */
    assignmentRevision?: number;
  };
  requiredData?: {
    profileRevision: number;
    /**
     * @maxItems 10
     */
    completedFieldIds: (
      | "displayName"
      | "gender"
      | "interestedInGenders"
      | "relationshipGoal"
      | "dateOfBirth"
      | "paceBand"
      | "skillBand"
      | "dietaryAndSeatingNotes"
      | "questionnaireAnswerIds"
      | "teamName"
    )[];
    requestRevision: number;
    request: {
      revision: number;
      sourceHash: string;
      /**
       * @minItems 1
       * @maxItems 10
       */
      fieldIds: (
        | "displayName"
        | "gender"
        | "interestedInGenders"
        | "relationshipGoal"
        | "dateOfBirth"
        | "paceBand"
        | "skillBand"
        | "dietaryAndSeatingNotes"
        | "questionnaireAnswerIds"
        | "teamName"
      )[];
      /**
       * @maxItems 10
       */
      completedFieldIds: (
        | "displayName"
        | "gender"
        | "interestedInGenders"
        | "relationshipGoal"
        | "dateOfBirth"
        | "paceBand"
        | "skillBand"
        | "dietaryAndSeatingNotes"
        | "questionnaireAnswerIds"
        | "teamName"
      )[];
      status: "pending" | "completed";
      requestedAt: FirebaseFirestore.Timestamp;
      expiresAt: FirebaseFirestore.Timestamp;
      completedAt: FirebaseFirestore.Timestamp | null;
    } | null;
  };
}

/**
 * Bounded idempotency and reproduction record for rehearsal actions.
 */
export interface EventRehearsalActionDocument {
  sessionId: string;
  clientActionId: string;
  actorUid: string | null;
  actorId: string | null;
  kind: "control" | "behavior" | "spatial" | "guest" | "setup" | "system";
  name: string;
  runtimeRevision: number;
  virtualNow: FirebaseFirestore.Timestamp;
  createdAt: FirebaseFirestore.Timestamp;
  requestHash?: string;
}

/**
 * Ephemeral anonymous guest slot for a rehearsal web link.
 */
export interface EventRehearsalGuestViewDocument {
  sessionId: string;
  slotId: string;
  actorId: string;
  tokenHash: string;
  createdAt: FirebaseFirestore.Timestamp;
  lastSeenAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;
}

/**
 * Host-reviewable pending runtime identity claim stored at eventRuntimeClaimRequests/{eventId_uid}.
 */
export interface EventRuntimeClaimRequestDocument {
  eventId: string;
  clubId: string;
  organizerId: string;
  uid: string;
  displayName: string;
  phoneLastFour: string;
  /**
   * @maxItems 20
   */
  candidateAttendeeIds: string[];
  status: "pending" | "approved" | "rejected" | "cancelled";
  reviewedBy: string | null;
  reviewReason: string | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  reviewedAt: FirebaseFirestore.Timestamp | null;
}

/**
 * Private per-user Cross Paths consent edge stored at eventCrossPathsConsents/{eventId_uid} and written only by setCrossPathsEventConsent.
 */
export interface EventCrossPathsConsentDocument {
  eventId: string;
  uid: string;
  enabled: boolean;
  termsVersion: number;
  consentedAt: FirebaseFirestore.Timestamp | null;
  updatedAt: FirebaseFirestore.Timestamp;
  revokedAt: FirebaseFirestore.Timestamp | null;
  source: "booking_success" | "event_detail" | "settings";
}

/**
 * Server-only reviewed eligibility record for showing one member in Cross Paths. It stores coarse readiness reasons and a profile fingerprint, never an attractiveness score.
 */
export interface CrossPathsShowcaseEligibilityDocument {
  status: "eligible" | "needsReview" | "paused";
  /**
   * @maxItems 12
   */
  reasonCodes: (
    | "insufficient_photos"
    | "incomplete_prompts"
    | "missing_relationship_goal"
    | "broken_media"
    | "photo_moderation_pending"
    | "photo_moderation_rejected"
    | "public_profile_missing"
    | "profile_changed"
    | "reviewer_hold"
    | "manual_pause"
  )[];
  ruleVersion: number;
  reviewVersion: number;
  profileFingerprint: string;
  reviewChecklist: {
    primaryPortraitClear: boolean;
    profileRepresentsCurrentMember: boolean;
    showcasePolicyReviewed: boolean;
  };
  reviewNote: string;
  reviewedByUid: string;
  reviewedAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Server-only, session-idempotent Cross Paths exposure receipt used for ranking fatigue. It contains no private preference values or roster projection.
 */
export interface CrossPathsSuggestionExposureDocument {
  viewerUid: string;
  candidateUid: string;
  eventId: string;
  sessionIdHash: string;
  rankingVersion: number;
  shownAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;
}

/**
 * Callable-owned event-scoped invitation stored at crossPathsInvitations/{deterministicEventSenderHash}.
 */
export interface CrossPathsInvitationDocument {
  eventId: string;
  senderUid: string;
  recipientUid: string;
  /**
   * @minItems 2
   * @maxItems 2
   */
  participantIds: string[];
  status:
    | "pending"
    | "accepted"
    | "declined"
    | "cancelled"
    | "expired"
    | "invalidated";
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;
  respondedAt: FirebaseFirestore.Timestamp | null;
  cancelledAt: FirebaseFirestore.Timestamp | null;
  invalidatedAt: FirebaseFirestore.Timestamp | null;
  invalidationReason:
    | null
    | "event_unavailable"
    | "participation_cancelled"
    | "consent_revoked"
    | "safety_state_changed"
    | "competing_plan_accepted"
    | "plan_cancelled"
    | "hold_expired";
  conversationId: string | null;
  pairHoldId: string | null;
}

/**
 * Server-owned, short-lived companion-seat reservation for an accepted Cross Paths invitation.
 */
export interface CrossPathsPairHoldDocument {
  eventId: string;
  invitationId: string;
  organizerId: string;
  requesterUid: string;
  attendeeUid: string;
  /**
   * @minItems 2
   * @maxItems 2
   */
  participantIds: string[];
  status: "active" | "confirmed" | "expired" | "cancelled" | "invalidated";
  requesterBookingStatus: "held" | "confirmed" | "cancelled";
  attendeeBookingStatus: "confirmed" | "cancelled";
  requesterCohortId: string;
  attendeeCohortId: string;
  requesterPriceInPaise: number;
  attendeePriceInPaise: number;
  currency: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;
  confirmedAt: FirebaseFirestore.Timestamp | null;
  releasedAt: FirebaseFirestore.Timestamp | null;
  releaseReason:
    | null
    | "expired"
    | "cancelled"
    | "event_unavailable"
    | "participation_cancelled"
    | "safety_state_changed"
    | "payment_failed";
  paymentId: string | null;
  conversationId: string | null;
}

/**
 * Server-owned delivery receipt for an organizer event broadcast stored at eventBroadcasts/{broadcastId}.
 */
export interface EventBroadcastDocument {
  eventId: string;
  clubId: string;
  organizerId?: string;
  actorUid: string;
  audience: "booked" | "prospective" | "everyone";
  title: string;
  body: string;
  /**
   * @maxItems 500
   */
  targetUids: string[];
  status: "processing" | "completed" | "partial" | "failed";
  recipientCount: number;
  excludedCount: number;
  activityAvailableCount: number;
  pushAttemptedCount: number;
  pushAcceptedCount: number;
  pushFailedCount: number;
  pushUnknownCount: number;
  /**
   * @maxItems 20
   */
  pushErrorCodes: string[];
  deliveries: {
    [k: string]: {
      activityStatus: "created" | "existing" | "failed";
      pushStatus: "ineligible" | "accepted" | "failed" | "unknown";
      activityNotificationId: string;
      excluded?: boolean;
      errorCode?: string;
    };
  };
  leaseOwner: string;
  leaseExpiresAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  completedAt?: FirebaseFirestore.Timestamp | null;
}

/**
 * Server-owned waitlist offer stored at eventWaitlistOffers/{eventId_uid}. Offers reserve a waitlist slot until accepted, declined, expired, or cancelled.
 */
export interface EventWaitlistOfferDocument {
  eventId: string;
  clubId: string;
  organizerId?: string;
  uid: string;
  cohortAtOffer: string;
  status: "active" | "accepted" | "declined" | "expired" | "cancelled";
  source: "host" | "autoPromotion" | "ratioBalancing" | "cancellation";
  offeredBy: string | null;
  offeredAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;
  decidedAt: FirebaseFirestore.Timestamp | null;
  expiringNotifiedAt?: FirebaseFirestore.Timestamp | null;
  inviteLinkId?: string | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Host-owned live event-success setup stored at eventSuccessPlans/{eventId}. The event id is the document id and is also stored for cheap validation and reads.
 */
export interface EventSuccessPlanDocument {
  eventId: string;
  clubId: string;
  organizerId?: string;
  layoutId?: string | null;
  /**
   * @maxItems 300
   */
  affinityConstraints?: {
    aUid: string;
    bUid: string;
    value: "mustPair" | "mustSplit" | "avoidRepeat" | "neutral";
    scope: "thisRound" | "pinned";
  }[];
  /**
   * @maxItems 300
   */
  spatialOverrides?: {
    uid: string;
    targetPeerUid: string;
    layoutUnitId: string;
    scope: "thisRound" | "pinned";
  }[];
  playbookId: string;
  /**
   * @maxItems 24
   */
  selectedModuleIds: string[];
  targetAttendeeCount: number;
  structureConfig?: {
    [k: string]: unknown;
  };
  /**
   * @maxItems 8
   */
  assignmentFeatureRules?: {
    featureId: string;
    formId: string;
    versionId: string;
    questionId: string;
    transformVersion: number;
    kind: "category" | "set" | "number" | "ordinal";
    mode: "preferSimilar" | "preferDifferent" | "balanceAcrossGroups";
    weight: number;
    /**
     * @maxItems 40
     */
    optionIds?: string[];
    scoreByOptionId?: {
      [k: string]: number;
    };
    minimum?: number;
    maximum?: number;
  }[];
  assignmentFeatureRevision?: number;
  assignmentFeatureRequestId?: string;
  assignmentFeatureConfigHash?: string;
  hostGoal: string;
  wingmanRequestsEnabled: boolean;
  contextualOpenersEnabled: boolean;
  compatibilityAffectsRanking?: boolean;
  questionnaireConfig?: {
    templateId: string;
    customTitle?: string | null;
    /**
     * @maxItems 8
     */
    customQuestions?: {
      id: string;
      prompt: string;
      /**
       * @minItems 2
       * @maxItems 5
       */
      options: {
        id: string;
        label: string;
      }[];
    }[];
  };
  /**
   * Whether assigned attendees begin unselected or preselected in the end-of-event conversation graph. Missing legacy values resolve to optIn.
   */
  conversationGraphConsentMode?: "optIn" | "optOut";
  activeStepIndex: number;
  liveControlRevision?: number;
  assignmentDraftRevision?: number;
  publishedRotationRoundIndex?: number;
  publishedRevealRoundIndex?: number;
  status: "setup" | "live" | "complete";
  revealStatus?: "idle" | "countingDown" | "revealed";
  activeRevealRoundIndex?: number;
  revealStartedAt?: FirebaseFirestore.Timestamp | null;
  attendeePrompt?: string | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  frozenAt?: FirebaseFirestore.Timestamp | null;
  completedAt?: FirebaseFirestore.Timestamp | null;
}

/**
 * Private participant-owned decision for one event and immutable form answer. Not implied by form submission, profile sharing, messaging consent, or host configuration.
 */
export interface EventAssignmentFeatureConsentDocument {
  eventId: string;
  organizerId: string;
  uid: string;
  responseId: string;
  featureId: string;
  formId: string;
  versionId: string;
  questionId: string;
  transformVersion: number;
  purpose: "eventAssignmentMatching";
  status: "granted" | "withdrawn";
  receiptId: string;
  revision: number;
  lastRequestId: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Attendee-private end-of-event conversation edges stored at eventSuccessConversationGraphs/{eventId_uid}. Hosts consume aggregate scorecard counts only.
 */
export interface EventSuccessConversationGraphDocument {
  eventId: string;
  clubId: string;
  organizerId: string;
  uid: string;
  status: "submitted" | "skipped";
  /**
   * @maxItems 1000
   */
  selectedUids: string[];
  assignedSelectedCount: number;
  assignedCandidateCount: number;
  /**
   * Snapshot of the event plan mode shown for this response.
   */
  consentMode: "optIn" | "optOut";
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Reusable organizer-owned parametric room layout stored at organizerEventSuccessLayouts/{organizerId_layoutId}. Derived coordinates and proximity edges are never persisted.
 */
export interface OrganizerEventSuccessLayoutDocument {
  organizerId: string;
  layoutId: string;
  label: string;
  /**
   * @minItems 1
   * @maxItems 200
   */
  units: {
    id: string;
    label: string;
    shape: "round" | "rect" | "row" | "court" | "zone";
    capacity: number;
    gridX: number;
    gridY: number;
    order: number;
  }[];
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Reusable organizer-owned event venue stored at organizerEventVenues/{organizerId_venueId}. Events copy the meeting location and capacity so later venue edits never rewrite event history.
 */
export interface OrganizerEventVenueDocument {
  organizerId: string;
  venueId: string;
  label: string;
  /**
   * Canonical meeting location selected from Google Places or a manually pinned map coordinate.
   */
  meetingLocation: {
    name: string;
    address?: string | null;
    placeId?: string | null;
    latitude: number;
    longitude: number;
    notes?: string | null;
  };
  defaultEventCapacity?: number | null;
  status: "active" | "archived";
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Server-owned host-only precomputed assignment stored at eventSuccessAssignmentDrafts/{eventId_moduleId_uid} until its round is published.
 */
export interface EventSuccessAssignmentDraftDocument {
  eventId: string;
  clubId: string;
  organizerId: string;
  uid: string;
  moduleId: "guided_rotations";
  roundIndex: number;
  baseAssignmentRevision: number;
  assignment: EventSuccessAssignmentDocument;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  assignmentFeatureGuard?: {
    revision: number;
    configHash: string;
    /**
     * @maxItems 8
     */
    snapshots: {
      eventId: string;
      organizerId: string;
      uid: string;
      featureId: string;
      formId: string;
      versionId: string;
      questionId: string;
      transformVersion: number;
      consentReceiptId: string;
      responseId: string;
      value:
        | {
            kind: "category" | "ordinal";
            optionId: string;
          }
        | {
            kind: "set";
            /**
             * @minItems 1
             * @maxItems 40
             */
            optionIds: string[];
          }
        | {
            kind: "number";
            value: number;
          };
    }[];
  };
}

/**
 * Attendee-owned decomposed post-event feedback stored at eventSuccessFeedback/{eventId_uid}. Raw notes and safety concerns are private to the attendee and backend safety/coaching pipelines.
 */
export interface EventSuccessFeedbackDocument {
  eventId: string;
  clubId: string;
  organizerId?: string;
  uid: string;
  welcomeRating: number;
  structureRating: number;
  metNewPeopleCount: number;
  safetyConcern: boolean;
  privateNote?: string | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Attendee-owned opt-out preferences for live event guidance stored at eventSuccessPreferences/{eventId_uid}.
 */
export interface EventSuccessPreferenceDocument {
  eventId: string;
  clubId: string;
  organizerId?: string;
  uid: string;
  microPodsOptedOut: boolean;
  guidedRotationsOptedOut: boolean;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Attendee-owned compatibility questionnaire answers stored at eventSuccessCompatibilityResponses/{eventId_uid}. Hosts cannot read individual answers.
 */
export interface EventSuccessCompatibilityResponseDocument {
  eventId: string;
  clubId: string;
  organizerId?: string;
  uid: string;
  /**
   * @minItems 1
   * @maxItems 8
   */
  answerIds: string[];
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Explicit attendee request for host-visible introduction help stored at eventSuccessWingmanRequests/{eventId_uid}.
 */
export interface EventSuccessWingmanRequestDocument {
  eventId: string;
  clubId: string;
  organizerId?: string;
  requesterUid: string;
  targetUid: string;
  status: "active" | "withdrawn";
  hostVisibleConsent: true;
  note?: string | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Server-owned First Hello arrival mission stored at eventSuccessArrivalMissions/{eventId_uid}.
 */
export interface EventSuccessArrivalMissionDocument {
  eventId: string;
  clubId: string;
  organizerId?: string;
  observerUid: string;
  targetUid: string;
  targetDisplayName: string;
  targetContext: string;
  question: string;
  /**
   * @minItems 2
   * @maxItems 4
   */
  answerOptions: {
    id: string;
    label: string;
  }[];
  venueSessionId: string;
  venueSessionRedemptionId: string;
  status: "active" | "completed" | "skipped";
  selectedAnswerId?: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  completedAt?: FirebaseFirestore.Timestamp;
}

/**
 * Server-owned live guidance assignment stored at eventSuccessAssignments/{eventId_moduleId_uid}.
 */
export interface EventSuccessAssignmentDocument {
  eventId: string;
  clubId: string;
  organizerId?: string;
  uid: string;
  moduleId: "micro_pods" | "guided_rotations";
  label: string;
  displayTitle: string;
  displaySubtitle?: string | null;
  /**
   * @maxItems 20
   */
  peerUids: string[];
  unitKind?: "wholeGroup" | "pods" | "pairs" | "teams" | "tables";
  unitIndex?: number;
  unitLabel?: string;
  layoutUnitId?: string;
  confirmedLayoutUnitId?: string | null;
  whySummary?: string;
  /**
   * @maxItems 12
   */
  whyCodes?: (
    | "host_override"
    | "mutual_interest"
    | "one_way_interest"
    | "questionnaire_match"
    | "social_fallback"
    | "balanced_group"
    | "fresh_peer"
    | "repeat_peer"
    | "sit_out"
    | "pair_slot"
    | "pod_slot"
    | "table_slot"
    | "team_slot"
    | "whole_group_slot"
  )[];
  rotationFairness?: {
    assignedRoundCount: number;
    sitOutRoundCount: number;
    uniquePeerCount: number;
    repeatPeerCount: number;
  };
  /**
   * @maxItems 24
   */
  sitOutSlots?: {
    roundIndex: number;
    label: string;
    startsAt: FirebaseFirestore.Timestamp;
    endsAt: FirebaseFirestore.Timestamp;
    whySummary: string;
    /**
     * @maxItems 12
     */
    whyCodes: "sit_out"[];
  }[];
  /**
   * @maxItems 24
   */
  rotationSlots?: {
    slotId?: string;
    roundIndex: number;
    label: string;
    startsAt: FirebaseFirestore.Timestamp;
    endsAt: FirebaseFirestore.Timestamp;
    peerUid: string;
    unitKind?: "pairs";
    unitIndex?: number;
    resourceUnitId?: string;
    peerCount?: number;
    compatibility:
      | "mutual_interest"
      | "one_way_interest"
      | "questionnaire_match"
      | "social"
      | "host_override";
    whySummary?: string;
    /**
     * @maxItems 12
     */
    whyCodes?: (
      | "host_override"
      | "mutual_interest"
      | "one_way_interest"
      | "questionnaire_match"
      | "social_fallback"
      | "fresh_peer"
      | "repeat_peer"
      | "pair_slot"
    )[];
  }[];
  /**
   * @maxItems 24
   */
  groupRotationSlots?: {
    slotId?: string;
    roundIndex: number;
    label: string;
    unitLabel: string;
    unitKind?: "wholeGroup" | "pods" | "pairs" | "teams" | "tables";
    unitIndex?: number;
    startsAt: FirebaseFirestore.Timestamp;
    endsAt: FirebaseFirestore.Timestamp;
    /**
     * @maxItems 20
     */
    peerUids: string[];
    peerCount?: number;
    compatibility:
      | "mutual_interest"
      | "one_way_interest"
      | "questionnaire_match"
      | "social"
      | "mixed"
      | "host_override";
    whySummary?: string;
    /**
     * @maxItems 12
     */
    whyCodes?: (
      | "host_override"
      | "mutual_interest"
      | "questionnaire_match"
      | "social_fallback"
      | "balanced_group"
      | "fresh_peer"
      | "repeat_peer"
      | "pair_slot"
      | "pod_slot"
      | "table_slot"
      | "team_slot"
      | "whole_group_slot"
    )[];
  }[];
  source: "server_v1" | "host_override_v1" | "server";
  /**
   * Opaque, public-safe identity of the feature inputs used by a server assignment. Raw answer and source identifiers remain private.
   */
  assignmentFeatureAudit?: {
    algorithmVersion: "typed-soft-features-v1";
    configHash: string;
    inputSnapshotId: string;
  };
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Server-owned outcome rounds stored at eventSuccessUnitOutcomes/{eventId}. Hosts may read the source; attendees consume the standings projection.
 */
export interface EventSuccessUnitOutcomesDocument {
  eventId: string;
  clubId: string;
  organizerId?: string;
  unitOutcome: "completion" | "score" | "rank";
  revision: number;
  /**
   * @maxItems 101
   */
  rounds: {
    roundIndex: number;
    /**
     * @minItems 1
     * @maxItems 200
     */
    entries: (
      | {
          unitId: string;
          unitLabel: string;
          completed: boolean;
        }
      | {
          unitId: string;
          unitLabel: string;
          score: number;
        }
      | {
          unitId: string;
          unitLabel: string;
          rank: number;
        }
    )[];
  }[];
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Server-owned attendee-readable standings snapshots stored at eventSuccessStandings/{eventId}.
 */
export interface EventSuccessStandingsDocument {
  eventId: string;
  clubId: string;
  organizerId?: string;
  unitOutcome: "score" | "rank";
  revision: number;
  latestRoundIndex: number;
  /**
   * @minItems 1
   * @maxItems 101
   */
  rounds: {
    roundIndex: number;
    /**
     * @minItems 1
     * @maxItems 200
     */
    entries: {
      unitId: string;
      unitLabel: string;
      position: number;
      value: number;
      roundsRecorded: number;
    }[];
  }[];
  /**
   * @minItems 1
   * @maxItems 200
   */
  entries: {
    unitId: string;
    unitLabel: string;
    position: number;
    value: number;
    roundsRecorded: number;
  }[];
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Server-owned aggregate event coaching metrics stored at eventSuccessScorecards/{eventId}. Raw attendee feedback remains private.
 */
export interface EventSuccessScorecardDocument {
  eventId: string;
  clubId: string;
  organizerId?: string;
  bookedCount: number;
  checkedInCount: number;
  feedbackCount: number;
  attendeesWhoMetTwoPlusPeople: number;
  catchSentCount: number;
  attendeesWhoCaughtSomeone: number;
  catchRecipientCount: number;
  catchRate: number;
  mutualMatchCount: number;
  chatStartedCount: number;
  averageWelcomeRating: number;
  averageStructureRating: number;
  safetyIncidentCount: number;
  /**
   * Host-visible aggregate conversation outcomes. Person-to-person edges remain in attendee-private documents.
   */
  conversationGraph?: {
    responseCount: number;
    skippedCount: number;
    conversationCount: number;
    attendeesWithTwoPlusConversations: number;
    excludedAttendeeCount: number;
    assignedConversationCount: number;
    assignedOpportunityCount: number;
  };
  /**
   * Host-visible operating funnel from acquisition through connection. Counts are aggregate-only and rebuilt from canonical documents.
   */
  funnel: {
    inviteLinkCount: number;
    inviteOpenCount: number;
    totalDemandCount: number;
    requestCount: number;
    pendingRequestCount: number;
    approvedRequestCount: number;
    declinedRequestCount: number;
    directSignupCount: number;
    waitlistJoinCount: number;
    waitlistOfferCount: number;
    waitlistOfferActiveCount: number;
    waitlistOfferAcceptedCount: number;
    waitlistOfferDeclinedCount: number;
    waitlistOfferExpiredCount: number;
    checkoutStartedCount: number;
    paymentPendingCount: number;
    paymentCompletedCount: number;
    paymentFailedCount: number;
    paymentRefundedCount: number;
    bookedCount: number;
    checkedInCount: number;
    noShowCount: number;
    catchSentCount: number;
    attendeesWhoCaughtSomeone: number;
    mutualMatchCount: number;
    chatStartedCount: number;
    repeatAttendeeCount: number;
  };
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Catch-private safety review item materialized from event feedback concerns.
 */
export interface EventSafetyReportDocument {
  eventId: string;
  clubId: string;
  organizerId?: string;
  reporterUserId: string;
  feedbackId: string;
  source: "event_success_feedback";
  status: "open" | "reviewed" | "dismissed";
  note?: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Server-owned time-slot claim stored at clubScheduleLocks/{clubId_slot}.
 */
export interface ClubScheduleLockDocument {
  ownerType: "club";
  ownerId: string;
  slot: number;
  eventId: string;
  clubId: string;
  startTimeMillis: number;
  endTimeMillis: number;
}

/**
 * Server-owned time-slot claim stored at userEventScheduleLocks/{uid_slot}.
 */
export interface UserEventScheduleLockDocument {
  ownerType: "user";
  ownerId: string;
  slot: number;
  eventId: string;
  clubId: string;
  organizerId?: string;
  uid: string;
  startTimeMillis: number;
  endTimeMillis: number;
}

/**
 * Canonical saved-event edge stored at savedEvents/{savedEventId}.
 */
export interface SavedEventDocument {
  uid: string;
  eventId: string;
  savedAt: FirebaseFirestore.Timestamp;
}

/**
 * Canonical payment record stored at payments/{paymentId}.
 */
export interface PaymentDocument {
  userId: string;
  orderId: string;
  paymentId: string;
  eventId: string;
  amount: number;
  amountMinor?: number;
  currency: string;
  provider?: "razorpay" | "stripe";
  /**
   * refundFailed marks rejected admission with an unresolved refund. New records use cancellationRefund.state for pending versus reviewRequired; historical records without that intent need manual reconciliation. Only an observed full refund becomes refunded.
   */
  status: "pending" | "completed" | "failed" | "refunded" | "refundFailed";
  providerPaymentId?: string | null;
  checkoutSessionId?: string | null;
  hostUserId?: string;
  stripeAccountId?: string | null;
  applicationFeeAmount?: number;
  /**
   * Named host invite link attributed to this payment, when present.
   */
  inviteLinkId?: string | null;
  /**
   * Host-facing invite source copied from eventInviteLinks.
   */
  inviteSource?: string | null;
  /**
   * Pair hold consumed by this booking, when present.
   */
  crossPathsPairHoldId?: string | null;
  signUpFailed: boolean;
  createdAt: FirebaseFirestore.Timestamp;
  completedAt?: FirebaseFirestore.Timestamp;
  cancellationRefund?: LegacyPaymentRefundIntent;
  updatedAt?: FirebaseFirestore.Timestamp;
  /**
   * Frozen server-origin context for a new native Razorpay booking. Missing legacy context is unresolved, never automatic ownership adoption.
   */
  razorpayOwnership?: {
    projectId: string;
    schema: "1";
  };
}

/**
 * Server-only, project-bound progress for bounded payment recovery queues. Revision compare-and-set prevents stale concurrent invocations from moving discovery backward; a null cursor means wrap to the oldest eligible row.
 */
export interface NativeRefundRecoveryCursorDocument {
  stateId:
    | "pendingRefunds"
    | "cancelledRazorpayPayments"
    | "pendingRazorpayOrders";
  projectId: string;
  schema: "1";
  revision: number;
  /**
   * Queue-specific exclusive discovery position. Refund queues use the next-attempt order key and payment document id. pendingRazorpayOrders uses integer epoch nanoseconds plus the complete pending-order document id.
   */
  cursor: null | {
    /**
     * Canonical tagged primary Firestore order value for the selected recovery queue.
     */
    nextAttemptOrderKey:
      | ("double:nan" | "double:negativeInfinity" | "double:positiveInfinity")
      | string;
    /**
     * Exclusive secondary key. pendingRazorpayOrders and refund queues store the complete Firestore document id.
     */
    paymentId: string;
  };
  updatedAtMillis: number;
}

/**
 * Server-owned payout-provider account state. New documents use hostPaymentAccounts/{uid}_{provider}; legacy Stripe documents at {uid} remain readable during migration.
 */
export interface HostPaymentAccountDocument {
  userId: string;
  provider: "razorpay" | "stripe";
  country: string;
  defaultCurrency: string;
  providerAccountId: string;
  stripeAccountId: string;
  razorpayAccountId: string;
  razorpayProductId?: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  onboardingStatus: "notStarted" | "pending" | "complete" | "restricted";
  disabledReason?: string | null;
  /**
   * @maxItems 80
   */
  requirementsCurrentlyDue: string[];
  /**
   * @maxItems 80
   */
  requirementsPastDue: string[];
  /**
   * @maxItems 80
   */
  requirementsPendingVerification: string[];
  lastStripeEventId?: string | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Server-owned tracking record for a created-but-not-yet-fulfilled Razorpay order, stored at razorpayPendingOrders/{orderId}. Lets the webhook and reconciliation sweep recover bookings when the client verification callback never lands. Deleted once the matching payments/{paymentId} completed record exists.
 */
export interface RazorpayPendingOrderDocument {
  provider: "razorpay";
  orderId: string;
  userId: string;
  eventId: string;
  amountInPaise: number;
  currency: string;
  /**
   * pending until fulfilled (then the doc is deleted); failed when Razorpay reported payment.failed; expired when the reconciliation sweep found no captured payment after the grace window.
   */
  status: "pending" | "failed" | "expired";
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp;
  /**
   * Frozen server-origin context for a new native Razorpay booking. Missing legacy context is unresolved, never automatic ownership adoption.
   */
  razorpayOwnership?: {
    projectId: string;
    schema: "1";
  };
}

/**
 * Storage contract for contextual profile decisions stored at profileDecisions/{userId}/outgoing/{targetId}.
 */
export interface SwipeDocument {
  swiperId: string;
  targetId: string;
  eventId: string;
  direction: "like" | "pass";
  reactionTargetId?: string | null;
  reactionTargetType?:
    | "heroPhoto"
    | "photo"
    | "profilePrompt"
    | "compatibility"
    | "running"
    | "details"
    | "lifestyle"
    | null;
  reactionTargetLabel?: string | null;
  reactionTargetPreview?: string | null;
  comment?: string | null;
  createdAt: FirebaseFirestore.Timestamp;
}

/**
 * Canonical match document stored at matches/{matchId}.
 */
export interface MatchDocument {
  user1Id: string;
  user2Id: string;
  /**
   * @minItems 0
   */
  eventIds: string[];
  createdAt: FirebaseFirestore.Timestamp;
  lastMessageAt?: FirebaseFirestore.Timestamp | null;
  lastMessagePreview?: string | null;
  lastMessageSenderId?: string | null;
  unreadCounts: {
    [k: string]: number;
  };
  status: "active" | "blocked" | "closed";
  blockedBy?: string | null;
  blockedAt?: FirebaseFirestore.Timestamp | null;
  /**
   * @minItems 2
   * @maxItems 2
   */
  participantIds: string[];
  conversationType?: "match" | "clubHostInquiry" | "crossPathsEventPlan";
  clubId?: string;
  organizerId?: string;
  crossPathsInvitationId?: string;
  eventPlanExpiresAt?: FirebaseFirestore.Timestamp;
  closedAt?: FirebaseFirestore.Timestamp | null;
}

/**
 * Canonical chat message document stored at matches/{matchId}/messages/{messageId}.
 */
export interface ChatMessageDocument {
  senderId: string;
  text: string;
  imageUrl?: string | null;
  sentAt?: FirebaseFirestore.Timestamp | null;
}

/**
 * Canonical durable activity notification stored at notifications/{uid}/items/{notificationId}.
 */
export interface ActivityNotificationDocument {
  uid: string;
  type:
    | "message"
    | "match"
    | "eventReminder"
    | "eventSignup"
    | "waitlistPromotion"
    | "waitlistOffer"
    | "waitlistOfferExpiring"
    | "waitlistOfferExpired"
    | "eventCancelled"
    | "eventUpdated"
    | "clubUpdate"
    | "organizerUpdate"
    | "formResponse"
    | "crossPathsInvitation"
    | "crossPathsInvitationAccepted"
    | "crossPathsInvitationDeclined"
    | "crossPathsPlanCancelled";
  title: string;
  body: string;
  createdAt: FirebaseFirestore.Timestamp;
  readAt?: FirebaseFirestore.Timestamp | null;
  matchId?: string | null;
  eventId?: string | null;
  clubId?: string | null;
  organizerId?: string | null;
  postId?: string | null;
  invitationId?: string | null;
  actorUid?: string | null;
  actorName?: string | null;
}

/**
 * Canonical organizer review stored at reviews/{reviewId}. Verified reviews come from attended Catch events; unverified reviews can come from public listing pages.
 */
export interface ReviewDocument {
  organizerId: string;
  eventId?: string | null;
  /**
   * Catch user id for signed-in reviewers. Null for anonymous public listing reviews.
   */
  reviewerUserId: string | null;
  reviewerName: string;
  rating: number;
  comment: string;
  /**
   * Verified reviews are created only after attended Catch events; public listing reviews are unverified.
   */
  verificationStatus?: "verified" | "unverified";
  /**
   * Submission surface that created the review.
   */
  source?: "catchEvent" | "publicListing";
  /**
   * Public rendering status for organizer listing pages.
   */
  moderationStatus?: "published" | "pending" | "rejected";
  /**
   * True when the public display name should be the anonymous fallback rather than a user-supplied or profile name.
   */
  isAnonymous?: boolean;
  /**
   * Website path that submitted an unverified public listing review.
   */
  submittedFromPath?: string | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp | null;
  ownerResponse?: {
    hostUserId: string;
    hostName: string;
    hostAvatarUrl: string | null;
    message: string;
    createdAt: FirebaseFirestore.Timestamp;
    updatedAt: FirebaseFirestore.Timestamp;
  };
}

/**
 * Canonical safety block edge stored at blocks/{blockId}.
 */
export interface BlockDocument {
  blockerUserId: string;
  blockedUserId: string;
  createdAt: FirebaseFirestore.Timestamp;
  source: "profile" | "chat" | "match" | "support";
  reasonCode?: string;
}

/**
 * Canonical safety report stored at reports/{reportId}.
 */
export interface ReportDocument {
  reporterUserId: string;
  targetUserId: string;
  createdAt: FirebaseFirestore.Timestamp;
  source: "profile" | "chat" | "match" | "support";
  status: "open" | "reviewed" | "dismissed";
  reasonCode?: string;
  contextId?: string;
  notes?: string;
}

/**
 * Canonical moderation ticket stored at moderationFlags/{flagId}.
 */
export interface ModerationFlagDocument {
  targetUserId: string;
  flagType: "explicit_photo" | "banned_text" | "underage_content";
  source:
    | "profile_photo"
    | "club_image"
    | "chat_message"
    | "user_bio"
    | "club_description"
    | "review_comment";
  status: "pending" | "reviewed" | "dismissed";
  createdAt: FirebaseFirestore.Timestamp;
  reviewedAt?: FirebaseFirestore.Timestamp;
  contextId?: string;
  context?: string;
  safeSearchResults?: {
    [k: string]: string;
  };
}

/**
 * Server-owned account-deletion tombstone stored at deletedUsers/{uid}.
 */
export interface DeletedUserTombstoneDocument {
  uid: string;
  deletedAt: FirebaseFirestore.Timestamp;
  status: "processing" | "completed";
  updatedAt: FirebaseFirestore.Timestamp;
  completedAt?: FirebaseFirestore.Timestamp | null;
  retainedFor?: string[];
}

/**
 * Server-owned callable rate-limit counter stored at rateLimits/{docId}.
 */
export interface RateLimitDocument {
  uid: string;
  action: string;
  windowKey: number;
  count: number;
  expiresAt: FirebaseFirestore.Timestamp;
}

/**
 * Server-owned 15-minute response cache stored at hostAnalyticsSnapshots/{uid}_{scopeHash}.
 */
export interface HostAnalyticsSnapshotDocument {
  uid: string;
  scopeHash: string;
  response: HostAnalyticsCallableResponse;
  createdAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;
}

/**
 * Server-owned idempotency receipt stored at functionEventReceipts/{receiptId}.
 */
export interface FunctionEventReceiptDocument {
  handler: "onMessageCreated" | "onMatchCreated" | "moderatePhotoOnUpload";
  eventId?: string;
  matchId?: string;
  messageId?: string;
  createdAt: FirebaseFirestore.Timestamp;
}

/**
 * Server-owned reservation for a public website route. Stored at publicRouteReservations/{routeKey}; routeKey is derived from the normalized route path so route allocation is deterministic and transactionally claimable.
 */
export interface PublicRouteReservationDocument {
  /**
   * Deterministic document id derived from routePath by removing leading/trailing slash and replacing route separators with double underscores.
   */
  routeKey: string;
  routePath: string;
  routeKind: "organizerCanonical";
  /**
   * @minItems 2
   * @maxItems 3
   */
  routeSegments: string[];
  status: "active" | "released";
  ownerType: "club" | "organizer";
  ownerCollection: "clubs" | "organizers";
  ownerId: string;
  targetPath: string;
  slug: string;
  citySlug: string | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  lastVerifiedAt: FirebaseFirestore.Timestamp;
  lastVerifiedByUid: string;
  lastVerifiedSource:
    | "adminUpdateClubDetails"
    | "adminSetClubIndexStatus"
    | "adminUpdateOrganizerDetails"
    | "adminSetOrganizerIndexStatus"
    | "adminCreateOrganizerDraftFromCandidate"
    | "adminApproveOrganizerListing"
    | "createOrganizer"
    | "clubsToOrganizersMigration";
  releasedAt?: FirebaseFirestore.Timestamp | null;
  releasedByUid?: string | null;
  replacementRoutePath?: string | null;
}

/**
 * Tool-owned synthetic-data manifest stored at seedEvents/{manifestId}.
 */
export interface SeedEventManifestDocument {
  seedId: string;
  manifestId: string;
  generatedAt: FirebaseFirestore.Timestamp;
  anchorUserIds: string[];
  counts: {
    [k: string]: number;
  };
  paths: string[];
  appendMode?: boolean;
  appendedAnchorUserIds?: string[];
}

/**
 * Latest admin review decision stored at organizerIntakeReviewDecisions/{entityId}. Candidate evidence remains in operationRuns and operationWorkItems.
 */
export interface OrganizerIntakeReviewDecisionDocument {
  schemaVersion: 1;
  entityId: string;
  decision: "approve_public" | "hold" | "suppress";
  decisionStatus: "approved_public" | "held" | "suppressed";
  publishStatus: "draft" | "published" | "suppressed";
  indexStatus: "noindex" | "indexed";
  appVisibility: "hidden" | "discoverable";
  checklist: {
    identityReviewed: boolean;
    surfaceInventoryReviewed: boolean;
    ownerSafeCopyReviewed: boolean;
    marketScopeReviewed: boolean;
    mediaRightsReviewed: boolean;
    crawlDisabledReviewed: boolean;
    /**
     * True when the reviewer explicitly inspected manual reports that have no stored source artifact. Projection replay decides when this acknowledgement is required.
     */
    manualReportsReviewed?: boolean;
    claimTargetReviewed?: boolean;
    takedownPathReviewed?: boolean;
    impersonationReviewed?: boolean;
    operatingStatusReviewed?: boolean;
    eventAccuracyReviewed?: boolean;
    unclaimedAffordancesReviewed?: boolean;
  };
  note: string;
  reviewedByUid: string;
  reviewedAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  projectionState: "pending_static_generation" | "not_projectable";
}

/**
 * Latest admin review decision stored at eventIntakeReviewDecisions/{decisionId}. Source artifacts, marketing content, imported events, and canonical events are not stored here.
 */
export interface EventIntakeReviewDecisionDocument {
  schemaVersion: 1;
  decisionId: string;
  targetType:
    | "source_profile"
    | "query_template"
    | "run_plan"
    | "source_result"
    | "event_candidate";
  targetId: string;
  decision: "approve" | "needs_changes" | "hold" | "reject";
  decisionStatus: "approved" | "needs_changes" | "held" | "rejected";
  runId: string | null;
  note: string;
  checklist: {
    sourceReviewed: boolean;
    dateReviewed: boolean;
    venueReviewed: boolean;
    copyReviewed: boolean;
    rightsReviewed: boolean;
    noCatchHostingImplied: boolean;
  };
  /**
   * Changed fields only. Each entry freezes its reviewed before and after value.
   */
  edits: {
    [k: string]: {
      before: unknown;
      after: unknown;
    };
  };
  reviewedByUid: string;
  reviewedAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  effect: "decision_only_no_publish";
}

/**
 * One manual organizer-intake curation operation stored at organizerIntakeCurationDecisions/{operationId}. Candidate evidence remains in operationRuns and operationWorkItems.
 */
export interface OrganizerIntakeCurationDecisionDocument {
  schemaVersion: 1;
  operationId: string;
  operationType:
    | "attach_surface"
    | "create_entity_draft"
    | "merge_entity"
    | "split_surface"
    | "suppress_entity"
    | "surface_decision";
  operationStatus: "active" | "superseded";
  entityId?: string;
  sourceEntityId?: string;
  targetEntityId?: string;
  surfaceId?: string;
  newEntityId?: string;
  sourceCandidateId?: string;
  sourceWorkItemId?: string;
  sourceNormalizedKey?: string;
  /**
   * Public route slug reserved when a candidate becomes an organizer draft. It is intentionally separate from entityId.
   */
  publicSlug?: string;
  /**
   * Source artifact lineage for each field projected into the organizer draft.
   *
   * @maxItems 200
   */
  fieldProvenance?: {
    field: string;
    artifactId: string;
    contentHash: string;
    locator: string | null;
    extractedBy: "deterministic" | "model" | "human";
    extractorVersion: string;
    confidence: number | null;
  }[];
  decision?:
    | "accept_primary"
    | "accept_secondary"
    | "reject_wrong_entity"
    | "mark_ambiguous"
    | "mark_historical";
  surface?: {
    surfaceId: string;
    platform:
      | "bookMyShow"
      | "district"
      | "instagram"
      | "linkedin"
      | "luma"
      | "news"
      | "officialWebsite"
      | "partiful"
      | "sortMyScene"
      | "userReport"
      | "other";
    surfaceKind:
      | "eventListing"
      | "eventCalendar"
      | "organizerProfile"
      | "personProfile"
      | "press"
      | "socialProfile"
      | "website"
      | "wrongEntity";
    url: string | null;
    normalizedKey: string | null;
    role:
      | "primary"
      | "secondary"
      | "backup"
      | "historical"
      | "ambiguous"
      | "rejected";
    status: "active" | "candidate" | "ambiguous" | "historical" | "rejected";
    confidence: {
      entityMatch: "low" | "medium" | "high";
      ownership: "low" | "medium" | "high";
      city: "low" | "medium" | "high";
    };
    crawl: {
      eventDiscoveryStatus: "disabled" | "candidate" | "approved" | "paused";
      policy: "manualOnly" | "blocked" | "apiPreferred";
      supportsEventExtraction: boolean;
    };
    evidenceRefs: {
      type:
        | "hostDiscoveryRun"
        | "seedClub"
        | "userReportedSearchResult"
        | "manualNote";
      ref: string | null;
      description: string;
    }[];
    notes: string;
  };
  reason: string;
  reviewedByUid: string;
  reviewedAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Immutable, server-owned field correction captured when an admin first changes a source-seeded organizer value. Each correction owns a deterministic replay fixture id.
 */
export interface OrganizerIntakeFieldCorrectionDocument {
  schemaVersion: 1;
  correctionId: string;
  fixtureId: string;
  organizerId: string;
  sourceProfileId: string;
  sourceWorkItemId: string;
  sourceCandidateId: string;
  field:
    | "name"
    | "location"
    | "tags"
    | "publicProfile.sourceSummary"
    | "publicProfile.formats";
  extractedValue: string | null | string[];
  correctedValue: string | null | string[];
  artifactId: string;
  contentHash: string;
  locator: string | null;
  extractedBy: "deterministic" | "model" | "human";
  extractorVersion: string;
  confidence: number | null;
  reviewNote: string;
  correctedByUid: string;
  correctedAt: FirebaseFirestore.Timestamp;
}

/**
 * Latest admin event-candidate review decision stored at organizerEventCandidateReviewDecisions/{decisionId}. Raw provider event evidence and imported events are not stored here.
 */
export interface OrganizerEventCandidateReviewDecisionDocument {
  schemaVersion: 1;
  decisionId: string;
  candidateId: string;
  decision: "approve_for_import" | "hold" | "reject";
  decisionStatus: "approved_for_import" | "held" | "rejected";
  checklist: {
    identityReviewed: boolean;
    sourceEventReviewed: boolean;
    timeReviewed: boolean;
    locationReviewed: boolean;
    dedupeReviewed: boolean;
    ownerSafeCopyReviewed: boolean;
    importPolicyAcknowledged: boolean;
  };
  /**
   * @maxItems 6
   */
  blockerResolutions?: ExternalEventBlockerResolution[];
  note: string;
  reviewedByUid: string;
  reviewedAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  importState: "blocked_by_policy" | "not_importable" | "pending_import";
}

/**
 * Latest admin-reviewed event location resolution stored at organizerEventLocationResolutionDecisions/{resolutionId}. Raw provider lookup responses and imported events are not stored here.
 */
export interface OrganizerEventLocationResolutionDecisionDocument {
  schemaVersion: 1;
  resolutionId: string;
  candidateId: string;
  location: {
    name: string;
    address?: string | null;
    placeId?: string | null;
    latitude: number | null;
    longitude: number | null;
    notes?: string | null;
  };
  checklist: {
    sourceLocationReviewed: boolean;
    coordinatesReviewed: boolean;
    placeIdentityReviewed: boolean;
    importSafetyReviewed: boolean;
  };
  note: string;
  reviewedByUid: string;
  reviewedAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  resolutionStatus: "resolved";
}

/**
 * Latest admin/product policy-gap review decision stored at organizerPolicyGapReviewDecisions/{decisionId}. These decisions are review state only and do not enable organizer crawls, provider lookups, event imports, defaults, or naming migrations.
 */
export interface OrganizerPolicyGapReviewDecisionDocument {
  schemaVersion: 1;
  decisionId: string;
  gapId: string;
  decision: "accept" | "hold" | "reject";
  decisionStatus: "accepted" | "held" | "rejected";
  /**
   * @maxItems 20
   */
  requiredInputsReviewed: string[];
  checklist: {
    requiredInputsReviewed: boolean;
    costAndSafetyReviewed: boolean;
    implementationOwnerReviewed: boolean;
    behaviorStillDisabledAcknowledged: boolean;
  };
  note: string;
  reviewedByUid: string;
  reviewedAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  operationalState: "blocked_until_policy_encoded" | "not_approved";
}

export interface OrganizerEventOfferDocument {
  organizerId: string;
  eventId: string;
  contactId: string;
  applicationId: string;
  sourceKind: "application" | "formResponse";
  offerId: string;
  status: "draft" | "offered" | "withdrawn" | "expired";
  generation: number;
  revision: number;
  expiresAtMillis: number;
  organizerPaymentLink: string | null;
  paymentSnapshot: EventOfferPaymentSnapshot;
  offeredAtMillis: number | null;
  manualPayment: EventOfferManualPayment;
  createdAtMillis: number;
  updatedAtMillis: number;
}

export interface OrganizerEventOfferActionReceiptDocument {
  offerId: string;
  requestId: string;
  requestHash: string;
  resultingGeneration: number;
  resultingRevision: number;
}

export interface OrganizerEventOfferBatchReceiptDocument {
  organizerId: string;
  eventId: string;
  requestId: string;
  requestHash: string;
  /**
   * @minItems 1
   * @maxItems 25
   */
  results: {
    offerId: string;
    revision: number;
    generation: number;
  }[];
}

export interface OrganizerEventOfferAuditDocument {
  offerId: string;
  requestId: string;
  actorUid: string;
  kind:
    | "createDraft"
    | "reissueDraft"
    | "offer"
    | "withdraw"
    | "expire"
    | "recordEvidence"
    | "reconcileEvidence";
  beforeRevision: number;
  afterRevision: number;
  generation: number;
  atMillis: number;
  paymentStatus:
    | "none"
    | "evidenceSubmitted"
    | "hostAttestedReceived"
    | "rejected";
  bankReceiptChecked: boolean;
  reviewNote: string | null;
}
