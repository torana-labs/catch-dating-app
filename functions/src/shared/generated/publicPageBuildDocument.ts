/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Private build marker for one organizer's public page read models, stored at publicPageBuilds/{organizerId}. Each committed rebuild records when it read its sources, so a slower rebuild that read older sources is discarded instead of overwriting a newer page or reviving a withdrawn one.
 */
export interface PublicPageBuildDocument {
  schemaVersion: 1;
  organizerId: string;
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  sourceReadAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  /**
   * Whether the last committed rebuild produced an organizer page.
   */
  published: boolean;
  eventPageCount: number;
}
