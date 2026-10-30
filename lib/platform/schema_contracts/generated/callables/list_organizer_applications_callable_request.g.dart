// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/list_organizer_applications_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Manager-authorized paginated organizer application review query.
final class ListOrganizerApplicationsCallableRequest {
  const ListOrganizerApplicationsCallableRequest({
    required this.organizerId,
    this.contactId,
    this.formId,
    this.targetId,
    this.reviewStatus,
    this.query,
    this.sort,
    this.limit,
    this.cursor,
  });

  final String organizerId;
  final String? contactId;
  final String? formId;
  final String? targetId;
  final String? reviewStatus;
  final String? query;
  final String? sort;
  final int? limit;
  final String? cursor;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'contactId': ?contactId,
    'formId': ?formId,
    'targetId': ?targetId,
    'reviewStatus': ?reviewStatus,
    'query': ?query,
    'sort': ?sort,
    'limit': ?limit,
    'cursor': ?cursor,
  };
}
