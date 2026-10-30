// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/archive_organizer_saved_audience_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Archives one reusable CRM audience with optimistic revision control.
final class ArchiveOrganizerSavedAudienceCallableRequest {
  const ArchiveOrganizerSavedAudienceCallableRequest({
    required this.organizerId,
    required this.audienceId,
    required this.expectedRevision,
  });

  final String organizerId;
  final String audienceId;
  final int expectedRevision;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'audienceId': audienceId,
    'expectedRevision': expectedRevision,
  };
}
