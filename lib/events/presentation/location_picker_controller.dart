import 'package:catch_dating_app/contexts/events/data/places_repository.dart';
import 'package:catch_dating_app/kernel/location_coordinate.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'location_picker_controller.g.dart';

@riverpod
LocationPickerController locationPickerController(Ref ref) =>
    LocationPickerController(ref.watch(placesRepositoryProvider));

/// Owns remote place lookup operations for the location picker presentation.
class LocationPickerController {
  const LocationPickerController(this._placesRepository);

  final PlacesRepository _placesRepository;

  Future<List<PlaceAutocompleteSuggestion>> autocomplete({
    required String input,
    required String sessionToken,
    required LocationCoordinate bias,
    String? countryIsoCode,
  }) => _placesRepository.autocomplete(
    input: input,
    sessionToken: sessionToken,
    bias: bias,
    countryIsoCode: countryIsoCode,
  );

  Future<PlaceDetails> details({
    required String placeId,
    required String sessionToken,
  }) => _placesRepository.details(placeId: placeId, sessionToken: sessionToken);
}
