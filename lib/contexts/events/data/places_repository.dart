import 'package:catch_dating_app/contexts/events/data/places_callable_requests.dart';
import 'package:catch_dating_app/contexts/events/data/places_callable_responses.dart';
import 'package:catch_dating_app/contexts/events/domain/place.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/locations/domain/location_coordinate.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

export 'package:catch_dating_app/contexts/events/domain/place.dart'
    show PlaceAutocompleteSuggestion, PlaceDetails;

part 'places_repository.g.dart';

// keepalive: Places repository is a shared Functions facade for location
// autocomplete and details lookups.
@Riverpod(keepAlive: true)
PlacesRepository placesRepository(Ref ref) =>
    FirebasePlacesRepository(ref.watch(firebaseFunctionsProvider));

abstract interface class PlacesRepository {
  Future<List<PlaceAutocompleteSuggestion>> autocomplete({
    required String input,
    required String sessionToken,
    LocationCoordinate? bias,
    String? countryIsoCode,
  });

  Future<PlaceDetails> details({
    required String placeId,
    required String sessionToken,
  });
}

class FirebasePlacesRepository implements PlacesRepository {
  const FirebasePlacesRepository(this._functions);

  final FirebaseFunctions _functions;

  @override
  Future<List<PlaceAutocompleteSuggestion>> autocomplete({
    required String input,
    required String sessionToken,
    LocationCoordinate? bias,
    String? countryIsoCode,
  }) async {
    final payload = PlacesAutocompleteCallableRequest(
      input: input,
      sessionToken: sessionToken,
      bias: bias,
      countryIsoCode: countryIsoCode,
    );
    return withBackendErrorContext(
      () async {
        final result = await _functions
            .httpsCallable('placesAutocomplete')
            .call<Object?>(payload.toJson());
        return PlacesAutocompleteCallableResponse.fromCallableData(
          result.data,
        ).predictions;
      },
      context: const BackendErrorContext(
        service: BackendService.functions,
        action: 'load place suggestions',
        resource: 'places',
      ),
    );
  }

  @override
  Future<PlaceDetails> details({
    required String placeId,
    required String sessionToken,
  }) async {
    final payload = PlaceDetailsCallableRequest(
      placeId: placeId,
      sessionToken: sessionToken,
    );
    return withBackendErrorContext(
      () async {
        final result = await _functions
            .httpsCallable('placeDetails')
            .call<Object?>(payload.toJson());
        return PlaceDetailsCallableResponse.fromCallableData(result.data).place;
      },
      context: const BackendErrorContext(
        service: BackendService.functions,
        action: 'load place details',
        resource: 'places',
      ),
    );
  }
}
