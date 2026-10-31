/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Sanitized event and caller state for the no-download runtime.
 */
export interface GetEventRuntimeBootstrapCallableResponse {
  event: {
    eventId: string;
    publicRuntimeId: string;
    title: string;
    startTimeMillis: number;
    endTimeMillis: number;
    serverTimeMillis: number;
    locationName: string;
    checkedInCount: number;
    runtimeTermsVersion: string;
    /**
     * @maxItems 24
     */
    moduleIds: string[];
    interactionModel:
      | "pacePods"
      | "pairedRotations"
      | "teamRotations"
      | "seatedTable"
      | "freeFormMixer"
      | "hostLedProgram"
      | "openFormat";
    /**
     * @maxItems 40
     */
    itinerary: {
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
     * Fresh, privacy-bounded Host/operator positions. Stable account identifiers are never exposed.
     *
     * @maxItems 20
     */
    livePositions: {
      role: "host" | "operator";
      latitude: number;
      longitude: number;
      accuracyMeters: number | null;
      headingDegrees: number | null;
      recordedAtMillis: number;
      staleAtMillis: number;
    }[];
    layout: null | {
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
    };
    /**
     * Fields that must be completed before event mode opens: display name plus at most one server-selected pre-event payload. Optional preference fields are never required for entry.
     *
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
     * Plan-derived event-only answers the guest may provide to improve preference-aware suggestions. Guests may skip them and receive neutral assignments.
     *
     * @maxItems 10
     */
    optionalFieldIds: (
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
    questionnaireConfig: null | {
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
  };
  participant: null | {
    eventAttendeeId?: string | null;
    accessStatus:
      | "needsClaim"
      | "pendingApproval"
      | "needsInput"
      | "ready"
      | "optedOut"
      | "revoked";
    attendanceStatus:
      | "invited"
      | "registered"
      | "waitlisted"
      | "checkedIn"
      | "cancelled"
      | null;
    eventId: string;
    organizerId: string;
    /**
     * @maxItems 10
     */
    requiredFieldIds: string[];
    /**
     * @maxItems 10
     */
    completedFieldIds: string[];
    /**
     * Current event-scoped missing-data request. Omitted by older backends.
     */
    requiredDataRequest?: null | {
      revision: number;
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
      status: "pending" | "completed" | "expired";
      requestedAtMillis: number;
      expiresAtMillis: number;
      completedAtMillis: number | null;
    };
    runtimeProfile: {
      displayName: string;
      gender: "man" | "woman" | "nonBinary" | "other" | null;
      interestedInGenders: ("man" | "woman" | "nonBinary" | "other")[];
      relationshipGoal:
        | "relationship"
        | "casual"
        | "marriage"
        | "friendship"
        | "unsure"
        | null;
      dateOfBirthMillis: number | null;
      paceBand: "competitive" | "fast" | "moderate" | "easy" | null;
      skillBand: "beginner" | "intermediate" | "advanced" | null;
      dietaryAndSeatingNotes: string | null;
      /**
       * @maxItems 8
       */
      questionnaireAnswerIds: string[];
      teamName: string | null;
    };
  };
}
