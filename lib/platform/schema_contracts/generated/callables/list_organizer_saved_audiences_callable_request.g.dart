// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/list_organizer_saved_audiences_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Lists one organizer's reusable CRM audiences.
final class ListOrganizerSavedAudiencesCallableRequest {
  const ListOrganizerSavedAudiencesCallableRequest({
    required this.organizerId,
    this.status,
    this.limit,
    this.cursor,
    this.includeFilterOptions,
  });

  final String organizerId;
  final String? status;
  final int? limit;
  final String? cursor;
  final bool? includeFilterOptions;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'status': ?status,
    'limit': ?limit,
    'cursor': ?cursor,
    'includeFilterOptions': ?includeFilterOptions,
  };
}
