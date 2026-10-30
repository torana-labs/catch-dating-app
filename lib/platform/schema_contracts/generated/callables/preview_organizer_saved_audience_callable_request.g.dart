// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/preview_organizer_saved_audience_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Resolves an exact bounded preview for one saved CRM audience.
final class PreviewOrganizerSavedAudienceCallableRequest {
  const PreviewOrganizerSavedAudienceCallableRequest({
    required this.organizerId,
    required this.audienceId,
    this.expectedRevision,
    this.sampleLimit,
    this.cursor,
  });

  final String organizerId;
  final String audienceId;
  final int? expectedRevision;
  final int? sampleLimit;
  final String? cursor;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'audienceId': audienceId,
    'expectedRevision': ?expectedRevision,
    'sampleLimit': ?sampleLimit,
    'cursor': ?cursor,
  };
}
