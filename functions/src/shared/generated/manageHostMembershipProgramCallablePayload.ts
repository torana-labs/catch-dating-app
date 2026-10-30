/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Organizer-manager read and control of the organizer's paid membership program: enable with the ready Route account, disable, and host-wide billing pause/resume.
 */
export interface ManageHostMembershipProgramCallablePayload {
  action: "get" | "enable" | "disable" | "pauseBilling" | "resumeBilling";
  organizerId: string;
}
