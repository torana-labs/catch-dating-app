// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/issue_program_household_rsvp_link_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Mint a signed RSVP link token for one household. The token carries only ids and an exclusive expiry; default expiry is the program end.
final class IssueProgramHouseholdRsvpLinkCallableRequest {
  const IssueProgramHouseholdRsvpLinkCallableRequest({
    required this.programId,
    required this.householdId,
    this.expiresAtMillis,
  });

  final String programId;
  final String householdId;
  final int? expiresAtMillis;

  Map<String, Object?> toJson() => {
    'programId': programId,
    'householdId': householdId,
    'expiresAtMillis': ?expiresAtMillis,
  };
}
