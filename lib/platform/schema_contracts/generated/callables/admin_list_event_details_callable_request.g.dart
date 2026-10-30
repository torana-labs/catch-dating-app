// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_list_event_details_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by adminListEventDetails. This lists canonical events/{eventId} rows for the admin event publishing workspace.
final class AdminListEventDetailsCallableRequest {
  const AdminListEventDetailsCallableRequest({
    this.query,
    this.clubId,
    this.organizerId,
    this.citySlug,
    this.citySlugs,
    this.activityKind,
    this.status,
    this.timeWindow,
    this.limit,
  });

  final String? query;
  final String? clubId;
  final String? organizerId;
  final String? citySlug;
  final List<String>? citySlugs;
  final String? activityKind;
  final String? status;
  final String? timeWindow;
  final int? limit;

  Map<String, Object?> toJson() => {
    'query': ?query,
    'clubId': ?clubId,
    'organizerId': ?organizerId,
    'citySlug': ?citySlug,
    'citySlugs': ?citySlugs,
    'activityKind': ?activityKind,
    'status': ?status,
    'timeWindow': ?timeWindow,
    'limit': ?limit,
  };
}
