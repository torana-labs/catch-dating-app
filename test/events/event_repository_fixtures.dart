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

FirebaseException _permissionDenied() =>
    FirebaseException(plugin: 'cloud_firestore', code: 'permission-denied');

/// Firestore as a guest sees it: rules deny every `events` read, so the
/// repository must fall back to `publicEvents`.
class _GuestFirestore extends Fake implements FirebaseFirestore {
  _GuestFirestore(this.inner);

  final FakeFirebaseFirestore inner;

  @override
  CollectionReference<Map<String, dynamic>> collection(String path) =>
      path == 'events' ? _DeniedCollection() : inner.collection(path);
}

class _DeniedCollection extends Fake
    implements CollectionReference<Map<String, dynamic>> {
  @override
  dynamic noSuchMethod(Invocation invocation) =>
      switch (invocation.memberName) {
        #get => Future<QuerySnapshot<Map<String, dynamic>>>.error(
          _permissionDenied(),
        ),
        #snapshots => Stream<QuerySnapshot<Map<String, dynamic>>>.error(
          _permissionDenied(),
        ),
        #doc => _DeniedDocument(),
        _ => this,
      };
}

class _DeniedDocument extends Fake
    implements DocumentReference<Map<String, dynamic>> {
  @override
  Future<DocumentSnapshot<Map<String, dynamic>>> get([GetOptions? options]) =>
      Future.error(_permissionDenied());

  @override
  Stream<DocumentSnapshot<Map<String, dynamic>>> snapshots({
    bool includeMetadataChanges = false,
    ListenSource source = ListenSource.defaultSource,
  }) => Stream.error(_permissionDenied());
}
