import 'dart:async';

import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/cache/cache_policy.dart';
import 'package:catch_platform/cache/callable_read.dart';
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
      expect(container.read(owner).hasError, isFalse);
      stale.close();

      // A failed background refetch keeps the data beside the error, as
      // Riverpod keeps a provider's previous value when a rebuild fails.
      async.elapse(const Duration(minutes: 6));
      callable.failNext = true;
      final failing = container.listen(owner, (_, _) {});
      settle();
      final kept = container.read(owner);
      expect(kept.hasError, isTrue);
      expect(kept.hasValue, isTrue);
      expect(kept.requireValue.data, 'insights#2');
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
      expect(container.read(owner).hasError, isFalse);
      failing.close();

      // A first read that outlasts the host reports first-load deadline
      // fails.
      const slowQuery = _InsightsQuery(organizerId: 'org-2', days: 7);
      callable.hangNext = true;
      final slow = container.listen(_insightsProvider(slowQuery), (_, _) {});
      async.elapse(const Duration(seconds: 19));
      expect(container.read(_insightsProvider(slowQuery)).isLoading, isTrue);
      async.elapse(const Duration(seconds: 1));
      settle();
      expect(
        container.read(_insightsProvider(slowQuery)).error,
        isA<TimeoutException>(),
      );
      slow.close();
    });
  });

  test('a first load and a refresh each run out at their own deadline, '
      'and a timed-out refresh keeps the data', () {
    fakeAsync((async) {
      final start = DateTime(2026, 11, 3, 9);
      final callable = _FakeCallable();
      final container = ProviderContainer.test(
        retry: (_, _) => null,
        overrides: [
          appClockProvider.overrideWithValue(
            AppClock.custom(() => start.add(async.elapsed)),
          ),
          _callableProvider.overrideWithValue(callable),
        ],
      );
      const query = _InsightsQuery(organizerId: 'org-1', days: 7);
      final owner = _liveProvider(query);

      // liveOperations: a first load gets six seconds.
      callable.hangNext = true;
      final first = container.listen(owner, (_, _) {});
      async.elapse(const Duration(milliseconds: 5999));
      expect(container.read(owner).isLoading, isTrue);
      async.elapse(const Duration(milliseconds: 1));
      async.flushMicrotasks();
      expect(container.read(owner).error, isA<TimeoutException>());
      expect(container.read(owner).hasValue, isFalse);

      // The user's Retry loads it.
      container.invalidate(owner);
      async
        ..flushMicrotasks()
        ..elapse(Duration.zero);
      expect(container.read(owner).requireValue.data, 'insights#2');
      final loadedAt = container.read(owner).requireValue.fetchedAt;

      // A refetch of data on screen gets five seconds, and running out
      // keeps the data beside the timeout.
      callable.hangNext = true;
      container.invalidate(owner);
      async.flushMicrotasks();
      expect(container.read(owner).isRefreshing, isTrue);
      async.elapse(const Duration(milliseconds: 4999));
      expect(container.read(owner).isRefreshing, isTrue);
      async.elapse(const Duration(milliseconds: 1));
      async.flushMicrotasks();
      final kept = container.read(owner);
      expect(kept.error, isA<TimeoutException>());
      expect(kept.requireValue.data, 'insights#2');
      expect(kept.requireValue.fetchedAt, loadedAt);
      first.close();
    });
  });

  test('a first read that fails rethrows instead of inventing data', () async {
    const client = CallableReadClient(clock: AppClock());
    await expectLater(
      client.read<Map<String, Object?>, String>(
        policy: CachePolicies.discovery,
        query: const _InsightsQuery(organizerId: 'org-1', days: 7),
        fetch: (_) => Future.error(StateError('down')),
        refreshing: false,
      ),
      throwsStateError,
    );
  });

  test('read classes the owner listed take their own deadlines; the rest '
      'take the default', () {
    Duration first(CachePolicy p) => p.deadline(refreshing: false);
    Duration again(CachePolicy p) => p.deadline(refreshing: true);
    expect(first(CachePolicies.liveOperations), const Duration(seconds: 6));
    expect(again(CachePolicies.liveOperations), const Duration(seconds: 5));
    expect(first(CachePolicies.bookingState), const Duration(seconds: 8));
    expect(again(CachePolicies.bookingState), const Duration(seconds: 8));
    expect(first(CachePolicies.hostReports), const Duration(seconds: 20));
    expect(again(CachePolicies.hostReports), const Duration(seconds: 20));
    for (final policy in [
      CachePolicies.discovery,
      CachePolicies.hostCustomerRecords,
      CachePolicies.accountReference,
      CachePolicies.listener,
    ]) {
      expect(first(policy), const Duration(seconds: 10), reason: '$policy');
      expect(again(policy), const Duration(seconds: 10), reason: '$policy');
    }
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
    refreshing: state.hasValue,
  );
}

final _insightsProvider = AsyncNotifierProvider.autoDispose
    .family<_Insights, CachedRead<String>, _InsightsQuery>(_Insights.new);

final class _Live extends AsyncNotifier<CachedRead<String>> {
  _Live(this.query);

  final _InsightsQuery query;

  @override
  Future<CachedRead<String>> build() => ref.callableRead(
    policy: CachePolicies.liveOperations,
    query: query,
    fetch: ref.read(_callableProvider).call,
    refreshing: state.hasValue,
  );
}

final _liveProvider = AsyncNotifierProvider.autoDispose
    .family<_Live, CachedRead<String>, _InsightsQuery>(_Live.new);
