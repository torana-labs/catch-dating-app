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

/// Seeds the server's public copy (#1666) as a reader off the team sees it.
Future<void> _seedPublicCopy(
  FakeFirebaseFirestore firestore,
  Event event, {
  Map<String, Object?> overrides = const {},
}) {
  return firestore.collection('publicEvents').doc(event.id).set({
    ...event.toJson(),
    'publicationState': 'published',
    'listing': event.listing.name,
    ...overrides,
  });
}

/// Firestore as a guest sees it for reads by id: rules deny every `events`
/// document, so the repository must fall back to `publicEvents`. (The fake
/// checks rules only on document reads; list fallbacks share the same helper,
/// covered in test/organizers/permission_fallback_test.dart, and the rules
/// suite covers what a guest may list.)
class _GuestFirestore extends FakeFirebaseFirestore {
  @override
  Future<void> maybeThrowSecurityException(String path, Object method) async {
    // Seeding writes stay allowed; only reads of an event are denied.
    if (path.startsWith('events/') && '$method'.endsWith('read')) {
      throw FirebaseException(
        plugin: 'cloud_firestore',
        code: 'permission-denied',
      );
    }
  }
}
