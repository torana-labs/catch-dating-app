import 'dart:async';

import 'package:catch_dating_app/platform/cache/app_clock.dart';
import 'package:catch_dating_app/platform/cache/cache_policy.dart';
import 'package:catch_dating_app/platform/cache/callable_read.dart';
import 'package:fake_async/fake_async.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('one callable read: first load, fresh return, stale return, failed '
      'refetch, hidden tab and timeout', () {
    fakeAsync((async) {
      final start = DateTime(2026, 11, 3, 9);
      final callable = _FakeCallable();
      final container = ProviderContainer(
        retry: (_, _) => null,
        overrides: [
          appClockProvider.overrideWithValue(
            AppClock.custom(() => start.add(async.elapsed)),
          ),
          _callableProvider.overrideWithValue(callable),
        ],
      );
      addTearDown(container.dispose);
      void settle() => async
        ..flushMicrotasks()
        ..elapse(Duration.zero)
        ..flushMicrotasks();
      const query = _InsightsQuery(organizerId: 'org-1', days: 7);
      final owner = _insightsProvider(query);

      // First view: loading, then data stamped by the app clock, built
      // from the key's own request.
      final first = container.listen(owner, (_, _) {});
      expect(container.read(owner).hasValue, isFalse);
      settle();
      var read = container.read(owner).requireValue;
      expect(callable.requests, [
        {'organizerId': 'org-1', 'days': 7},
      ]);
      expect(read.data, 'insights#1');
      expect(read.fetchedAt, start);
      first.close();

      // Return within staleAfter: instant, no request.
      async.elapse(const Duration(minutes: 4));
      final fresh = container.listen(owner, (_, _) {});
      settle();
      expect(container.read(owner).requireValue.data, 'insights#1');
      expect(callable.requests, hasLength(1));
      fresh.close();

      // Return after staleAfter: the kept data renders while one
      // background refetch runs, then the new data replaces it.
      async.elapse(const Duration(minutes: 2));
      final stale = container.listen(owner, (_, _) {});
      expect(container.read(owner).requireValue.data, 'insights#1');
      async.flushMicrotasks();
      expect(container.read(owner).isRefreshing, isTrue);
      settle();
      read = container.read(owner).requireValue;
      expect(read.data, 'insights#2');
      expect(read.fetchedAt, start.add(const Duration(minutes: 6)));
      expect(read.hasRefreshError, isFalse);
      stale.close();

      // A failed background refetch keeps the data and records the
      // failure; it never becomes an error state.
      async.elapse(const Duration(minutes: 6));
      callable.failNext = true;
      final failing = container.listen(owner, (_, _) {});
      settle();
      final kept = container.read(owner);
      expect(kept.hasError, isFalse);
      expect(kept.requireValue.data, 'insights#2');
      expect(kept.requireValue.hasRefreshError, isTrue);
      expect(kept.requireValue.fetchedAt, read.fetchedAt);
      expect(
        kept.requireValue.age(start.add(async.elapsed)),
        const Duration(minutes: 6),
      );

      // A hidden tab becoming visible runs the same check: still stale,
      // so it refetches and clears the failure.
      failing.pause();
      async.elapse(const Duration(hours: 1));
      settle();
      expect(callable.requests, hasLength(3));
      failing.resume();
      settle();
      expect(callable.requests, hasLength(4));
      expect(container.read(owner).requireValue.data, 'insights#4');
      expect(container.read(owner).requireValue.hasRefreshError, isFalse);
      failing.close();

      // A first read that outlasts the timeout fails.
      const slowQuery = _InsightsQuery(organizerId: 'org-2', days: 7);
      callable.hangNext = true;
      final slow = container.listen(_insightsProvider(slowQuery), (_, _) {});
      async.elapse(const Duration(seconds: 13));
      settle();
      expect(
        container.read(_insightsProvider(slowQuery)).error,
        isA<TimeoutException>(),
      );
      slow.close();
    });
  });

  test('a first read that fails rethrows instead of inventing data', () async {
    const client = CallableReadClient(clock: AppClock());
    await expectLater(
      client.read<Map<String, Object?>, String>(
        query: const _InsightsQuery(organizerId: 'org-1', days: 7),
        fetch: (_) => Future.error(StateError('down')),
        previous: null,
      ),
      throwsStateError,
    );
  });
}

final class _InsightsQuery implements CacheQuery<Map<String, Object?>> {
  const _InsightsQuery({required this.organizerId, required this.days});

  final String organizerId;
  final int days;

  @override
  Map<String, Object?> toRequest() => {
    'organizerId': organizerId,
    'days': days,
  };

  @override
  bool operator ==(Object other) =>
      other is _InsightsQuery &&
      other.organizerId == organizerId &&
      other.days == days;

  @override
  int get hashCode => Object.hash(organizerId, days);
}

final class _FakeCallable {
  final requests = <Map<String, Object?>>[];
  bool failNext = false;
  bool hangNext = false;

  Future<String> call(Map<String, Object?> request) {
    requests.add(request);
    if (hangNext) {
      hangNext = false;
      return Completer<String>().future;
    }
    if (failNext) {
      failNext = false;
      return Future.error(StateError('callable unavailable'));
    }
    return Future.value('insights#${requests.length}');
  }
}

final _callableProvider = Provider<_FakeCallable>(
  (ref) => throw UnimplementedError('Override with a _FakeCallable.'),
);

final class _Insights extends AsyncNotifier<CachedRead<String>> {
  _Insights(this.query);

  final _InsightsQuery query;

  @override
  Future<CachedRead<String>> build() => ref.callableRead(
    policy: CachePolicies.hostReports,
    query: query,
    fetch: ref.read(_callableProvider).call,
    previous: state.value,
  );
}

final _insightsProvider = AsyncNotifierProvider.autoDispose
    .family<_Insights, CachedRead<String>, _InsightsQuery>(_Insights.new);
