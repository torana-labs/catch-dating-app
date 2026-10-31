/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

import type {UploadedPhoto} from "./uploadedPhoto";

/**
 * Callable payload accepted by createEvent.
 */
export interface CreateEventCallablePayload {
  eventId?: string;
  name: string;
  organizerId: string;
  /**
   * Optional organizer venue provenance. The event still stores an independent meeting-location snapshot.
   */
  sourceVenueId?: string | null;
  startTimeMillis: number;
  endTimeMillis: number;
  meetingPoint: string;
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
  startingPointLat: number;
  startingPointLng: number;
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
  distanceKm: number;
  pace: "easy" | "moderate" | "fast" | "competitive";
  capacityLimit: number;
  description: string;
  priceInPaise: number;
  currency?: string;
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
  privateAccess?: {
    inviteCode?: string;
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
  eventSuccessDefaults?: {
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
  /**
   * External booking provenance for a companion-only operational event. Omit for a Catch-booked event.
   */
  externalOrigin?: {
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
    externalEventId?: string | null;
    externalEventUrl?: string | null;
    sourceExternalEventId?: string | null;
    adapterVersion?: string | null;
  };
  runtimeWalkInPolicy?: "deny" | "hostApproval" | "autoCreate";
  constraints?: {
    minAge?: number;
    maxAge?: number;
    maxMen?: number | null;
    maxWomen?: number | null;
  };
}
