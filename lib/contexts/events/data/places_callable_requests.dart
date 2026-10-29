import 'package:catch_dating_app/locations/domain/location_coordinate.dart';

export 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart'
    show PlaceDetailsCallableRequest;

// PlacesAutocompleteCallableRequest is hand-written because it flattens a
// LocationCoordinate? `bias` object into the payload's latitude/longitude
// fields at serialization time, a domain-to-DTO convenience the schema does
// not express. Generated equivalents would require callers to pass latitude
// and longitude directly.
final class PlacesAutocompleteCallableRequest {
  const PlacesAutocompleteCallableRequest({
    required this.input,
    required this.sessionToken,
    required this.bias,
    this.countryIsoCode,
  });

  final String input;
  final String sessionToken;
  final LocationCoordinate? bias;
  final String? countryIsoCode;

  Map<String, Object?> toJson() => {
    'input': input,
    'sessionToken': sessionToken,
    if (countryIsoCode != null) 'countryIsoCode': countryIsoCode,
    if (bias != null) ...{
      'latitude': bias!.latitude,
      'longitude': bias!.longitude,
    },
  };
}
