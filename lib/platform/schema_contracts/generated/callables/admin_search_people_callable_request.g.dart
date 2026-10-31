// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_search_people_payload.schema.json.
// Re-exported by lib/platform/schema_contracts/generated/callable_request_dtos.g.dart.

/// Search people by name, phone or user id; every search is written to the admin audit log.
final class AdminSearchPeopleCallableRequest {
  const AdminSearchPeopleCallableRequest({
    required this.query,
    required this.limit,
  });

  final String query;
  final int limit;

  Map<String, Object?> toJson() => {
    'query': query,
    'limit': limit,
  };
}
