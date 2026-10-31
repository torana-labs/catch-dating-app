/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Host-owned live event-success setup stored at eventSuccessPlans/{eventId}. The event id is the document id and is also stored for cheap validation and reads.
 */
export interface EventSuccessPlanDocument {
  eventId: string;
  organizerId: string;
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
  revealStartedAt?: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
  attendeePrompt?: string | null;
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
  frozenAt?: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
  completedAt?: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
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
}
