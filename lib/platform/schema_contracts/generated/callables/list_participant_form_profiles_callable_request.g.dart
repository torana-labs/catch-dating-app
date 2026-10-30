// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/list_participant_form_profiles_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// List only the verified participant’s active form profile proposals and private cards.
final class ListParticipantFormProfilesCallableRequest {
  const ListParticipantFormProfilesCallableRequest({
    required this.cursor,
    required this.limit,
  });

  final String? cursor;
  final int limit;

  Map<String, Object?> toJson() => {
    'cursor': cursor,
    'limit': limit,
  };
}
