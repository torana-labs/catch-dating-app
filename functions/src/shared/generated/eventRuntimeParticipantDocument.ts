/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Participant-private runtime identity stored at eventRuntimeParticipants/{eventId_uid}.
 */
export interface EventRuntimeParticipantDocument {
  eventId: string;
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
    dateOfBirth: {
      _seconds: number;
      _nanoseconds: number;
    } | null;
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
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  claimedAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  readyAt: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
  revokedAt: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
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
}
