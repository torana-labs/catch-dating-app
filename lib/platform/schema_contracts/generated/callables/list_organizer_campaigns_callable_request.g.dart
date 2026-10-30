// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/list_organizer_campaigns_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Manager-authorized paginated organizer Sends query.
final class ListOrganizerCampaignsCallableRequest {
  const ListOrganizerCampaignsCallableRequest({
    required this.organizerId,
    this.limit,
    this.cursor,
  });

  final String organizerId;
  final int? limit;
  final String? cursor;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'limit': ?limit,
    'cursor': ?cursor,
  };
}
