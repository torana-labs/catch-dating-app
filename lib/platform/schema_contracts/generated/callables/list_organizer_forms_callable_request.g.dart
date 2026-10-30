// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/list_organizer_forms_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Lists bounded organizer form summaries using an opaque cursor.
final class ListOrganizerFormsCallableRequest {
  const ListOrganizerFormsCallableRequest({
    required this.organizerId,
    required this.statuses,
    required this.purposes,
    required this.query,
    required this.cursor,
    required this.limit,
  });

  final String organizerId;
  final List<String> statuses;
  final List<String> purposes;
  final String? query;
  final String? cursor;
  final int limit;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'statuses': statuses,
    'purposes': purposes,
    'query': query,
    'cursor': cursor,
    'limit': limit,
  };
}
