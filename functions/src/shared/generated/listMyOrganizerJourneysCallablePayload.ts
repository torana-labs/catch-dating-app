/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * A host reads how an organizer's page got here. With organizerId, that organizer's journey for its hosts. With null, the journey of each page the caller has asked to claim and is still waiting on.
 */
export interface ListMyOrganizerJourneysCallablePayload {
  organizerId: string | null;
}
