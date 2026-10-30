// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/query_organizer_form_responses_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class QueryOrganizerFormResponsesCallableRequest {
  const QueryOrganizerFormResponsesCallableRequest({
    required this.organizerId,
    required this.formId,
    required this.versionId,
    required this.statuses,
    required this.predicate,
    required this.sort,
    required this.limit,
    required this.cursor,
  });

  final String organizerId;
  final String formId;
  final String versionId;
  final List<String> statuses;
  final Map<String, Object?>? predicate;
  final Map<String, Object?> sort;
  final int limit;
  final String? cursor;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'formId': formId,
    'versionId': versionId,
    'statuses': statuses,
    'predicate': predicate,
    'sort': sort,
    'limit': limit,
    'cursor': cursor,
  };
}
