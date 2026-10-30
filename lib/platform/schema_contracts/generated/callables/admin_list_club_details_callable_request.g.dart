// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_list_club_details_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Deprecated compatibility callable payload accepted by adminListClubDetails. The handler reads canonical organizer profile rows from organizers/{organizerId}; new clients use adminListOrganizerDetails.
final class AdminListClubDetailsCallableRequest {
  const AdminListClubDetailsCallableRequest({
    this.query,
    this.citySlug,
    this.citySlugs,
    this.publishStatus,
    this.appVisibility,
    this.limit,
  });

  final String? query;
  final String? citySlug;
  final List<String>? citySlugs;
  final String? publishStatus;
  final String? appVisibility;
  final int? limit;

  Map<String, Object?> toJson() => {
    'query': ?query,
    'citySlug': ?citySlug,
    'citySlugs': ?citySlugs,
    'publishStatus': ?publishStatus,
    'appVisibility': ?appVisibility,
    'limit': ?limit,
  };
}
