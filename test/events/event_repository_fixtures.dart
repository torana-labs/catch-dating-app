part of 'event_repository_test.dart';

// Deterministic Firebase collaborators and record builders for this suite.
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

Future<void> _seedEvent(FakeFirebaseFirestore firestore, Event event) {
  return firestore.collection('events').doc(event.id).set({
    ...event.toJson(),
    'publicationState': 'published',
  });
}

class _LifecycleEventRepository extends Fake implements EventRepository {
  _LifecycleEventRepository({required this.eventStream});

  final Stream<Event?> eventStream;

  @override
  Stream<Event?> watchEvent(String id) => eventStream;
}
