// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_list_listing_event_imports_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// One page of approved Supply Intake listings, most recently approved first, each with the events it imported and where each stands: published (by the publication policy or staff), withdrawn, ready for staff, needing a resolution, or blocked.
final class AdminListListingEventImportsCallableRequest {
  const AdminListListingEventImportsCallableRequest({
    required this.limit,
    required this.cursor,
  });

  final int limit;
  final String? cursor;

  Map<String, Object?> toJson() => {
    'limit': limit,
    'cursor': cursor,
  };
}
