/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Callable payload accepted by adminSetOrganizerIndexStatus.
 */
export interface AdminSetOrganizerIndexStatusCallablePayload {
  organizerId: string;
  indexStatus: "noindex" | "indexReady" | "indexed";
  checklist: {
    sourceEvidenceVerified: boolean;
    mediaRightsVerified: boolean;
    cadenceVerified: boolean;
    ownerContactVerified: boolean;
  };
  reviewNote?: string | null;
}
