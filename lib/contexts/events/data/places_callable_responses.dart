import 'package:catch_dating_app/contexts/events/domain/place.dart';

final class PlacesAutocompleteCallableResponse {
  const PlacesAutocompleteCallableResponse({required this.predictions});

  factory PlacesAutocompleteCallableResponse.fromCallableData(Object? data) {
    if (data case final Map<Object?, Object?> map) {
      final predictions = map['predictions'];
      if (predictions is List<Object?>) {
        return PlacesAutocompleteCallableResponse(
          predictions: predictions
              .whereType<Map<Object?, Object?>>()
              .map(PlaceAutocompleteSuggestion.fromJson)
              .toList(growable: false),
        );
      }
    }

    return const PlacesAutocompleteCallableResponse(predictions: []);
  }

  final List<PlaceAutocompleteSuggestion> predictions;
}

final class PlaceDetailsCallableResponse {
  const PlaceDetailsCallableResponse({required this.place});

  factory PlaceDetailsCallableResponse.fromCallableData(Object? data) {
    if (data case final Map<Object?, Object?> map) {
      final place = map['place'];
      if (place is Map<Object?, Object?>) {
        return PlaceDetailsCallableResponse(
          place: PlaceDetails.fromJson(place),
        );
      }
    }

    throw StateError('Place details response was missing place data.');
  }

  final PlaceDetails place;
}
