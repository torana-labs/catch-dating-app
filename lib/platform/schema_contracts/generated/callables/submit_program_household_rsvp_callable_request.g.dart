// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/submit_program_household_rsvp_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Token-authenticated household RSVP submit. Responses are limited to guests in the token's household and apply atomically. messagingConsent records the explicit checkbox state; it is never implied by submitting.
final class SubmitProgramHouseholdRsvpCallableRequest {
  const SubmitProgramHouseholdRsvpCallableRequest({
    required this.token,
    required this.responses,
    required this.messagingConsent,
    this.travel,
  });

  final String token;
  final List<Map<String, Object?>> responses;
  final bool messagingConsent;
  final List<Map<String, Object?>>? travel;

  Map<String, Object?> toJson() => {
    'token': token,
    'responses': responses,
    'messagingConsent': messagingConsent,
    'travel': ?travel,
  };
}
