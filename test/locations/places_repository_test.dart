import 'package:catch_dating_app/contexts/events/data/places_repository.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/locations/domain/location_coordinate.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';

class TestFirebaseFunctions extends Fake implements FirebaseFunctions {
  final callables = <String, TestHttpsCallable>{};

  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) {
    return callables.putIfAbsent(name, () => TestHttpsCallable(name));
  }
}

class TestHttpsCallable extends Fake implements HttpsCallable {
  TestHttpsCallable(this.name);

  final String name;
  final calls = <Object?>[];
  Object? resultData;

  @override
  Future<HttpsCallableResult<T>> call<T>([dynamic parameters]) async {
    calls.add(parameters);
    return TestHttpsCallableResult<T>(resultData as T);
  }
}

class TestHttpsCallableResult<T> extends Fake
    implements HttpsCallableResult<T> {
  TestHttpsCallableResult(this.dataValue);

  final T dataValue;

  @override
  T get data => dataValue;
}

void main() {
  group('FirebasePlacesRepository', () {
    late TestFirebaseFunctions functions;
    late FirebasePlacesRepository repository;

    setUp(() {
      functions = TestFirebaseFunctions();
      repository = FirebasePlacesRepository(functions);
    });

    test('autocomplete sends typed payload and parses predictions', () async {
      functions.callables['placesAutocomplete'] =
          TestHttpsCallable('placesAutocomplete')
            ..resultData = {
              'predictions': [
                {
                  'placeId': 'cubbon-park',
                  'description': 'Cubbon Park, Bengaluru, Karnataka',
                  'mainText': 'Cubbon Park',
                  'secondaryText': 'Bengaluru, Karnataka',
                },
              ],
            };

      final suggestions = await repository.autocomplete(
        input: 'Cubbon',
        sessionToken: 'places-session-1',
        bias: const LocationCoordinate(12.9716, 77.5946),
        countryIsoCode: 'IN',
      );

      expect(functions.callables['placesAutocomplete']!.calls.single, {
        'input': 'Cubbon',
        'sessionToken': 'places-session-1',
        'countryIsoCode': 'IN',
        'latitude': 12.9716,
        'longitude': 77.5946,
      });
      expect(suggestions, hasLength(1));
      expect(suggestions.single.placeId, 'cubbon-park');
      expect(suggestions.single.mainText, 'Cubbon Park');
    });

    test('autocomplete treats malformed predictions as empty', () async {
      functions.callables['placesAutocomplete'] = TestHttpsCallable(
        'placesAutocomplete',
      )..resultData = {'ok': true};

      final suggestions = await repository.autocomplete(
        input: 'Cu',
        sessionToken: 'places-session-1',
      );

      expect(suggestions, isEmpty);
    });

    test('details sends typed payload and parses place coordinates', () async {
      functions.callables['placeDetails'] = TestHttpsCallable('placeDetails')
        ..resultData = {
          'place': {
            'placeId': 'india-gate',
            'displayName': 'India Gate',
            'formattedAddress': 'Kartavya Path, New Delhi',
            'latitude': 28.6129,
            'longitude': 77.2295,
          },
        };

      final details = await repository.details(
        placeId: 'india-gate',
        sessionToken: 'places-session-2',
      );

      expect(functions.callables['placeDetails']!.calls.single, {
        'placeId': 'india-gate',
        'sessionToken': 'places-session-2',
      });
      expect(details.displayName, 'India Gate');
      expect(details.location, const LocationCoordinate(28.6129, 77.2295));
    });

    test('details rejects missing coordinates', () async {
      functions.callables['placeDetails'] = TestHttpsCallable('placeDetails')
        ..resultData = {
          'place': {'placeId': 'india-gate', 'displayName': 'India Gate'},
        };

      await expectLater(
        repository.details(
          placeId: 'india-gate',
          sessionToken: 'places-session-2',
        ),
        throwsA(
          isA<BackendOperationException>()
              .having(
                (error) => error.context?.service,
                'service',
                BackendService.functions,
              )
              .having(
                (error) => error.context?.action,
                'action',
                'load place details',
              ),
        ),
      );
    });
  });
}
