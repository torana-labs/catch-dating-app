import 'package:catch_dating_app/contexts/connections/data/swipe_candidate_repository.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';

class TestFirebaseFunctions extends Fake implements FirebaseFunctions {
  final callables = <String, TestHttpsCallable>{};

  void setResponse(String name, Object? response) {
    (httpsCallable(name) as TestHttpsCallable).response = response;
  }

  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) {
    return callables.putIfAbsent(name, () => TestHttpsCallable(name));
  }
}

class TestHttpsCallable extends Fake implements HttpsCallable {
  TestHttpsCallable(this.name);

  final String name;
  final calls = <Object?>[];
  Object? response;

  @override
  Future<HttpsCallableResult<T>> call<T>([dynamic parameters]) async {
    calls.add(parameters);
    return TestHttpsCallableResult<T>(response as T);
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
  group('SwipeCandidateRepository', () {
    late TestFirebaseFunctions functions;
    late SwipeCandidateRepository repository;

    setUp(() {
      functions = TestFirebaseFunctions();
      repository = SwipeCandidateRepository(functions);
    });

    test('loads only the server-owned candidate response', () async {
      functions.setResponse('fetchSwipeCandidates', {
        'profiles': [
          {
            'uid': 'runner-2',
            'name': 'Rhea',
            'age': 29,
            'gender': 'woman',
            'profilePrompts': <Object?>[],
            'profilePhotos': <Object?>[],
          },
        ],
      });

      final candidates = await repository.fetchCandidates(eventId: 'event-1');

      final callable =
          functions.httpsCallable('fetchSwipeCandidates') as TestHttpsCallable;
      expect(callable.calls, [
        {'eventId': 'event-1'},
      ]);
      expect(candidates.map((profile) => profile.uid), ['runner-2']);
      expect(candidates.single.name, 'Rhea');
    });

    test('rejects malformed callable responses', () async {
      functions.setResponse('fetchSwipeCandidates', {'profiles': 'private'});

      await expectLater(
        repository.fetchCandidates(eventId: 'event-1'),
        throwsA(isA<BackendOperationException>()),
      );
    });
  });
}
