// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/places_autocomplete_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by placesAutocomplete.
final class PlacesAutocompleteCallableRequest {
  const PlacesAutocompleteCallableRequest({
    required this.input,
    this.sessionToken,
    this.countryIsoCode,
    this.latitude,
    this.longitude,
  });

  final String input;
  final String? sessionToken;
  final String? countryIsoCode;
  final double? latitude;
  final double? longitude;

  Map<String, Object?> toJson() => {
    'input': input,
    'sessionToken': ?sessionToken,
    'countryIsoCode': ?countryIsoCode,
    'latitude': ?latitude,
    'longitude': ?longitude,
  };
}
