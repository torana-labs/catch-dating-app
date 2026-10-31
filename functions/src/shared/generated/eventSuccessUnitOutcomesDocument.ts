/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Server-owned outcome rounds stored at eventSuccessUnitOutcomes/{eventId}. Hosts may read the source; attendees consume the standings projection.
 */
export interface EventSuccessUnitOutcomesDocument {
  eventId: string;
  organizerId: string;
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
