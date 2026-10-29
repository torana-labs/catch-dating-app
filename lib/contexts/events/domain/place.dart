import 'package:catch_dating_app/locations/domain/location_coordinate.dart';

class PlaceAutocompleteSuggestion {
  const PlaceAutocompleteSuggestion({
    required this.placeId,
    required this.description,
    required this.mainText,
    required this.secondaryText,
  });

  factory PlaceAutocompleteSuggestion.fromJson(Map<Object?, Object?> json) {
    return PlaceAutocompleteSuggestion(
      placeId: json['placeId'] as String? ?? '',
      description: json['description'] as String? ?? '',
      mainText: json['mainText'] as String? ?? '',
      secondaryText: json['secondaryText'] as String? ?? '',
    );
  }

  final String placeId;
  final String description;
  final String mainText;
  final String secondaryText;
}

class PlaceDetails {
  const PlaceDetails({
    required this.placeId,
    required this.displayName,
    required this.formattedAddress,
    required this.location,
  });

  factory PlaceDetails.fromJson(Map<Object?, Object?> json) {
    final location = LocationCoordinate.fromNullable(
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
    );
    if (location == null) {
      throw StateError('Place details response was missing coordinates.');
    }

    return PlaceDetails(
      placeId: json['placeId'] as String? ?? '',
      displayName: json['displayName'] as String? ?? '',
      formattedAddress: json['formattedAddress'] as String? ?? '',
      location: location,
    );
  }

  final String placeId;
  final String displayName;
  final String formattedAddress;
  final LocationCoordinate location;
}
