// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/explore_search_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by exploreSearch.
final class ExploreSearchCallableRequest {
  const ExploreSearchCallableRequest({
    required this.query,
    this.cityName,
    this.limit,
  });

  final String query;
  final String? cityName;
  final int? limit;

  Map<String, Object?> toJson() => {
    'query': query,
    'cityName': ?cityName,
    'limit': ?limit,
  };
}
