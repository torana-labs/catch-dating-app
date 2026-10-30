// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/get_organizer_form_response_detail_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Manager-authorized response detail request.
final class GetOrganizerFormResponseDetailCallableRequest {
  const GetOrganizerFormResponseDetailCallableRequest({
    required this.organizerId,
    required this.responseId,
  });

  final String organizerId;
  final String responseId;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'responseId': responseId,
  };
}
