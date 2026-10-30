// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/convert_organizer_form_response_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Idempotently applies one reviewed response conversion.
final class ConvertOrganizerFormResponseCallableRequest {
  const ConvertOrganizerFormResponseCallableRequest({
    required this.organizerId,
    required this.responseId,
    required this.kind,
    required this.eventId,
    required this.overrides,
    required this.requestId,
  });

  final String organizerId;
  final String responseId;
  final String kind;
  final String? eventId;
  final Map<String, Object?> overrides;
  final String requestId;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'responseId': responseId,
    'kind': kind,
    'eventId': eventId,
    'overrides': overrides,
    'requestId': requestId,
  };
}
