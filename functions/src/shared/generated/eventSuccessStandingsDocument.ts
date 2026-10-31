/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Server-owned attendee-readable standings snapshots stored at eventSuccessStandings/{eventId}.
 */
export interface EventSuccessStandingsDocument {
  eventId: string;
  organizerId: string;
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
