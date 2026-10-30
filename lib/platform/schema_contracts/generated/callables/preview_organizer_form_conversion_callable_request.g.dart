// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/preview_organizer_form_conversion_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Reviews one proposed downstream conversion without writing.
final class PreviewOrganizerFormConversionCallableRequest {
  const PreviewOrganizerFormConversionCallableRequest({
    required this.organizerId,
    required this.responseId,
    required this.kind,
    required this.eventId,
    required this.overrides,
  });

  final String organizerId;
  final String responseId;
  final String kind;
  final String? eventId;
  final Map<String, Object?> overrides;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'responseId': responseId,
    'kind': kind,
    'eventId': eventId,
    'overrides': overrides,
  };
}
