// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/nominate_sales_organizer_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class NominateSalesOrganizerCallableRequest {
  const NominateSalesOrganizerCallableRequest({
    required this.requestId,
    required this.name,
    required this.city,
    required this.url,
    required this.relationshipContext,
  });

  final String requestId;
  final String name;
  final String city;
  final String url;
  final String? relationshipContext;

  Map<String, Object?> toJson() => {
    'requestId': requestId,
    'name': name,
    'city': city,
    'url': url,
    'relationshipContext': relationshipContext,
  };
}
