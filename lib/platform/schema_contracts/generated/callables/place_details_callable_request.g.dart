// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/place_details_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by placeDetails.
final class PlaceDetailsCallableRequest {
  const PlaceDetailsCallableRequest({
    required this.placeId,
    this.sessionToken,
  });

  final String placeId;
  final String? sessionToken;

  Map<String, Object?> toJson() => {
    'placeId': placeId,
    'sessionToken': ?sessionToken,
  };
}
