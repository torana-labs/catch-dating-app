/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Server-owned isolated Host rehearsal session stored at eventRehearsals/{sessionId}.
 */
export interface EventRehearsalDocument {
  organizerId: string;
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
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  virtualStartedAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  virtualNow: {
    _seconds: number;
    _nanoseconds: number;
  };
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
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  createdAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  updatedAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  expiresAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  completedAt: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
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
      /**
       * Serialized Firestore Timestamp fixture shape.
       */
      recordedAt: {
        _seconds: number;
        _nanoseconds: number;
      };
    }[];
  };
  revealControl?: {
    revision: number;
    status: "idle" | "countingDown" | "revealed";
    publishedRound: number;
    pendingRound: number | null;
    startedAt: {
      _seconds: number;
      _nanoseconds: number;
    } | null;
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
      /**
       * Serialized Firestore Timestamp fixture shape.
       */
      proposedAt: {
        _seconds: number;
        _nanoseconds: number;
      };
      publishedAt: {
        _seconds: number;
        _nanoseconds: number;
      } | null;
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
    reconciledAt: {
      _seconds: number;
      _nanoseconds: number;
    } | null;
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
