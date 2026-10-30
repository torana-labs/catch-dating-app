// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/get_participant_form_profile_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Read exact owned prepared form data for profile review.
final class GetParticipantFormProfileCallableRequest {
  const GetParticipantFormProfileCallableRequest({
    required this.responseId,
  });

  final String responseId;

  Map<String, Object?> toJson() => {
    'responseId': responseId,
  };
}
