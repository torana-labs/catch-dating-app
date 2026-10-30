// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/get_program_household_rsvp_view_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Token-authenticated read of one household's RSVP surface. The signed token is the credential; no session is required.
final class GetProgramHouseholdRsvpViewCallableRequest {
  const GetProgramHouseholdRsvpViewCallableRequest({
    required this.token,
  });

  final String token;

  Map<String, Object?> toJson() => {
    'token': token,
  };
}
