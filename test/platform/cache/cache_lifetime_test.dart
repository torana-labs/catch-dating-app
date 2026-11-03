import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/platform/cache/cache_policy.dart';
import 'package:catch_dating_app/platform/cache/cache_tags.dart';
import 'package:catch_dating_app/platform/cache/callable_read.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'cache_lifetime_harness.dart';

void main() {
  cacheLifetimeHarness(
    CacheHarnessSubject(
      description: 'A timed Cloud Function read',
      policy: CachePolicies.hostReports,
      readOwner: (session, id) =>
          _timedReadOwnerProvider(FakeRecordQuery(session, id)),
      overrides: (backend) => [_backendProvider.overrideWithValue(backend)],
      tagFor: FakeRecordTag.new,
      dataOf: (value) => (value! as CachedRead<String>).data,
    ),
  );

  cacheLifetimeHarness(
    CacheHarnessSubject(
      description: 'A session Cloud Function read',
      policy: CachePolicies.accountReference,
      readOwner: (session, id) =>
          _sessionReadOwnerProvider(FakeRecordQuery(session, id)),
      overrides: (backend) => [_backendProvider.overrideWithValue(backend)],
      tagFor: FakeRecordTag.new,
      dataOf: (value) => (value! as CachedRead<String>).data,
    ),
  );

  cacheLifetimeHarness(
    CacheHarnessSubject(
      description: 'A customer record that refetches on every return',
      policy: CachePolicies.hostCustomerRecords,
      readOwner: (session, id) =>
          _recordReadOwnerProvider(FakeRecordQuery(session, id)),
      overrides: (backend) => [_backendProvider.overrideWithValue(backend)],
      tagFor: FakeRecordTag.new,
      dataOf: (value) => (value! as CachedRead<String>).data,
    ),
  );

  cacheLifetimeHarness(
    CacheHarnessSubject(
      description: 'A Firestore listener kept after leaving',
      policy: CachePolicies.listener,
      readOwner: (session, id) =>
          _listenerReadOwnerProvider(FakeRecordQuery(session, id)),
      overrides: (backend) => [_backendProvider.overrideWithValue(backend)],
      tagFor: null,
      dataOf: (value) => value! as String,
    ),
  );

  test('retain refuses a session policy and retainForSession a timed one', () {
    final container = ProviderContainer.test();
    final misuse = Provider<void>((ref) {
      expect(
        () => ref.retain(CachePolicies.accountReference),
        throwsArgumentError,
      );
      expect(
        () =>
            ref.retainForSession(_EndlessSession(), CachePolicies.hostReports),
        throwsArgumentError,
      );
    });
    container.read(misuse);
  });

  test('CachePolicy staleness counts from the fetch', () {
    final fetchedAt = DateTime(2026, 11, 3, 9);
    expect(
      CachePolicies.hostReports.isStale(
        fetchedAt,
        fetchedAt.add(const Duration(minutes: 4)),
      ),
      isFalse,
    );
    expect(
      CachePolicies.hostReports.isStale(
        fetchedAt,
        fetchedAt.add(const Duration(minutes: 5)),
      ),
      isTrue,
    );
    expect(CachePolicies.listener.isStale(fetchedAt, DateTime(2030)), isFalse);
    expect(
      CachePolicies.hostCustomerRecords.isStale(fetchedAt, fetchedAt),
      isTrue,
    );
  });
}

/// The query a fake read owner is keyed by.
final class FakeRecordQuery implements CacheQuery<({String uid, String id})> {
  const FakeRecordQuery(this.session, this.id);

  final AuthenticatedSession session;
  final String id;

  @override
  ({String uid, String id}) toRequest() => (uid: session.uid, id: id);

  @override
  bool operator ==(Object other) =>
      other is FakeRecordQuery &&
      identical(other.session, session) &&
      other.id == id;

  @override
  int get hashCode => Object.hash(identityHashCode(session), id);
}

final class FakeRecordTag extends CacheTag {
  const FakeRecordTag(this.id);

  final String id;

  @override
  List<Object?> get props => [id];
}

final class _EndlessSession implements CacheSession {
  @override
  void Function() whenEnded(void Function() callback) => () {};
}

final _backendProvider = Provider<FakeCacheBackend>(
  (ref) => throw UnimplementedError('Override with a FakeCacheBackend.'),
);

Future<String> _fetch(Ref ref, ({String uid, String id}) request) =>
    ref.read(_backendProvider).fetch(uid: request.uid, id: request.id);

final class _TimedReadOwner extends AsyncNotifier<CachedRead<String>> {
  _TimedReadOwner(this.query);

  final FakeRecordQuery query;

  @override
  Future<CachedRead<String>> build() {
    ref.providesTags({FakeRecordTag(query.id)});
    return ref.callableRead(
      policy: CachePolicies.hostReports,
      query: query,
      fetch: (request) => _fetch(ref, request),
      previous: state.value,
    );
  }
}

final _timedReadOwnerProvider = AsyncNotifierProvider.autoDispose
    .family<_TimedReadOwner, CachedRead<String>, FakeRecordQuery>(
      _TimedReadOwner.new,
    );

final class _SessionReadOwner extends AsyncNotifier<CachedRead<String>> {
  _SessionReadOwner(this.query);

  final FakeRecordQuery query;

  @override
  Future<CachedRead<String>> build() {
    ref.providesTags({FakeRecordTag(query.id)});
    return ref.callableRead(
      policy: CachePolicies.accountReference,
      session: query.session,
      query: query,
      fetch: (request) => _fetch(ref, request),
      previous: state.value,
    );
  }
}

final _sessionReadOwnerProvider = AsyncNotifierProvider.autoDispose
    .family<_SessionReadOwner, CachedRead<String>, FakeRecordQuery>(
      _SessionReadOwner.new,
    );

final class _RecordReadOwner extends AsyncNotifier<CachedRead<String>> {
  _RecordReadOwner(this.query);

  final FakeRecordQuery query;

  @override
  Future<CachedRead<String>> build() {
    ref.providesTags({FakeRecordTag(query.id)});
    return ref.callableRead(
      policy: CachePolicies.hostCustomerRecords,
      query: query,
      fetch: (request) => _fetch(ref, request),
      previous: state.value,
    );
  }
}

final _recordReadOwnerProvider = AsyncNotifierProvider.autoDispose
    .family<_RecordReadOwner, CachedRead<String>, FakeRecordQuery>(
      _RecordReadOwner.new,
    );

final _listenerReadOwnerProvider = StreamProvider.autoDispose
    .family<String, FakeRecordQuery>((ref, query) {
      ref.retain(CachePolicies.listener);
      final request = query.toRequest();
      return ref
          .watch(_backendProvider)
          .watch(uid: request.uid, id: request.id);
    });
