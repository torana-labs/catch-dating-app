// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_list_external_event_details_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by adminListExternalEventDetails. This lists read-only externalEvents/{eventId} rows for the admin event supply workspace.
final class AdminListExternalEventDetailsCallableRequest {
  const AdminListExternalEventDetailsCallableRequest({
    this.query,
    this.citySlug,
    this.citySlugs,
    this.publicationStatus,
    this.status,
    this.timeWindow,
    this.limit,
  });

  final String? query;
  final String? citySlug;
  final List<String>? citySlugs;
  final String? publicationStatus;
  final String? status;
  final String? timeWindow;
  final int? limit;

  Map<String, Object?> toJson() => {
    'query': ?query,
    'citySlug': ?citySlug,
    'citySlugs': ?citySlugs,
    'publicationStatus': ?publicationStatus,
    'status': ?status,
    'timeWindow': ?timeWindow,
    'limit': ?limit,
  };
}
