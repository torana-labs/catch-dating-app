/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

import type {UploadedPhoto} from "./uploadedPhoto";
import type {EventOrigin} from "./eventOrigin";
import type {EventRuntimeAccess} from "./eventRuntimeAccess";
import type {EventSetupDefaults} from "./eventSetupDefaults";

/**
 * Canonical event document stored at events/{eventId}. The event id is the document id and is not stored in document data.
 */
export type EventDocument = {
  [k: string]: unknown;
} & {
  /**
   * Organizer-authored event name. Legacy documents may omit it and use the client-derived fallback title.
   */
  name?: string;
  organizerId: string;
  /**
   * Optional organizer venue used to prefill this event. Meeting location and capacity remain event-local snapshots.
   */
  sourceVenueId?: string | null;
  eventOrigin?: EventOrigin;
  runtimeAccess?: EventRuntimeAccess;
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  startTime: {
    _seconds: number;
    _nanoseconds: number;
  };
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  endTime?: {
    _seconds: number;
    _nanoseconds: number;
  };
  meetingPoint?: string;
  /**
   * Canonical meeting location selected from Google Places or a manually pinned map coordinate.
   */
  meetingLocation?: {
    name: string;
    address?: string | null;
    placeId?: string | null;
    latitude: number;
    longitude: number;
    notes?: string | null;
  };
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
  pace?: "easy" | "moderate" | "fast" | "competitive";
  capacityLimit?: number;
  description?: string;
  priceInPaise?: number;
  currency?: string;
  bookedCount: number;
  checkedInCount: number;
  waitlistedCount: number;
  status: "active" | "cancelled";
  cancelledAt: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
  cancellationReason: string | null;
  /**
   * When true, the published marketing event route may register a phone-OTP identity into eventAttendees without creating a Consumer profile.
   */
  publicRegistrationEnabled?: boolean;
  constraints?: {
    minAge: number;
    maxAge: number;
    maxMen: number | null;
    maxWomen: number | null;
  };
  eventPolicy?: {
    /**
     * Version 2 models cancellation as notApplicable for free events. Version 1 remains readable for legacy snapshots.
     */
    version: 1 | 2;
    admission: {
      format:
        | "open"
        | "inviteOnly"
        | "manualApproval"
        | "fixedCohortCaps"
        | "balancedRatio"
        | "membersOnly";
      capacityLimit: number;
      waitlistPolicy: {
        mode:
          | "disabled"
          | "rankedOffer"
          | "broadcastFirstComeFirstServed"
          | "manualReview";
        offerWindowMinutes: number;
      };
      inviteRequired: boolean;
      membershipRequired: boolean;
      manualApprovalRequired: boolean;
      /**
       * When true, current approved organizer community members may skip event review. Does not waive invitation, capacity, cohort or payment rules. Missing means false.
       */
      approvedMembersSkipReview?: boolean;
      privateAccessPolicy: {
        mode: "none" | "inviteCode";
        inviteCodeHint: string | null;
        privateLinkEnabled: boolean;
      };
      cohortCapacityLimits: {
        [k: string]: number;
      };
      balancedRatioPolicy: {
        leftCohortId: string;
        rightCohortId: string;
        maxSkew: number;
        openingBufferPerCohort: number;
        outOfRatioCohortPolicy:
          | "admitWithinGeneralCapacity"
          | "waitlist"
          | "manualReview"
          | "reject";
      } | null;
      crossPathsPairInventory?: {
        enabled: boolean;
        reservedPairCapacity: number;
        holdDurationMinutes: number;
      };
    };
    pricing: {
      basePriceInPaise: number;
      cohortAdjustmentsInPaise: {
        [k: string]: number;
      };
      /**
       * @maxItems 20
       */
      demandPricingRules: {
        pricedCohortId: string;
        balancingCohortId: string;
        stepAdjustmentInPaise: number;
        maxAdjustmentInPaise: number;
        freeSkew: number;
        demandStep: number;
      }[];
    };
    cancellation: {
      policyId: "notApplicable" | "flexible" | "standard" | "strict";
    };
    settlement: {
      hostPayoutTiming: "afterEventCompletion";
    };
  };
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
    /**
     * Serialized Firestore Timestamp fixture shape.
     */
    updatedAt: {
      _seconds: number;
      _nanoseconds: number;
    };
    updatedBySource: "adminUpdateEventDetails" | "adminEventSearchBackfill";
  };
  /**
   * Internal demo seed marker used for cleanup and diagnostics.
   */
  synthetic?: boolean;
  /**
   * Internal demo seed prefix used for cleanup and diagnostics.
   */
  seedPrefix?: string;
  /**
   * Internal demo seed scenario name used for cleanup and diagnostics.
   */
  scenario?: string;
  /**
   * Internal demo-operations marker used for cleanup and diagnostics.
   */
  demoOps?: boolean;
  /**
   * Internal demo-operations id used for cleanup and diagnostics.
   */
  demoOpsId?: string;
  /**
   * Internal demo-operations command name used for cleanup and diagnostics.
   */
  demoOpsCommand?: string;
  /**
   * Server creation time of a progressively configured event.
   */
  createdAt?: {
    _seconds: number;
    _nanoseconds: number;
  };
  /**
   * Latest backend event mutation timestamp when supplied by its owner, including attendance aggregate updates. Legacy events may omit it.
   */
  updatedAt?: {
    _seconds: number;
    _nanoseconds: number;
  };
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
  /**
   * First explicit progressive publication. Retained on unpublish so prior schedule commitments cannot be treated as a new draft.
   */
  firstPublishedAt?: {
    _seconds: number;
    _nanoseconds: number;
  };
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
};
