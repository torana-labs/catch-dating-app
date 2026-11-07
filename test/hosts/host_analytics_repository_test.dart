import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/insights/data/host_analytics_repository.dart';
import 'package:catch_dating_app/contexts/insights/domain/insights_tags.dart';
import 'package:catch_platform/cache/cache_policy.dart';
import 'package:catch_platform/cache/cache_tags.dart';
import 'package:catch_platform/cache/callable_read.dart';
import 'package:fake_async/fake_async.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../platform/cache/cache_lifetime_harness.dart';

void main() {
  test('HostAnalyticsQuery serializes custom event-scoped ranges', () {
    final request = HostAnalyticsQuery(
      organizerId: 'club-1',
      eventId: 'event-1',
      rangePreset: HostAnalyticsRangePreset.custom,
      startDate: DateTime(2026, 6),
      endDate: DateTime(2026, 6, 30),
      granularity: HostAnalyticsGranularity.week,
    ).toCallableRequest().toJson();

    expect(request, {
      'organizerId': 'club-1',
      'eventId': 'event-1',
      'rangePreset': 'custom',
      'startDate': '2026-06-01',
      'endDate': '2026-06-30',
      'granularity': 'week',
    });
  });

  test('HostAnalyticsQuery omits date bounds for preset ranges', () {
    final request = HostAnalyticsQuery(
      organizerId: 'club-1',
      rangePreset: HostAnalyticsRangePreset.ninetyDays,
      startDate: DateTime(2026, 2),
      endDate: DateTime(2026, 1, 31),
      granularity: HostAnalyticsGranularity.month,
    ).toCallableRequest().toJson();

    expect(request, {
      'organizerId': 'club-1',
      'rangePreset': '90d',
      'granularity': 'month',
    });
  });

  test('HostAnalyticsQuery sends the 12-month preset and IANA timezone', () {
    const query = HostAnalyticsQuery(
      organizerId: 'club-1',
      rangePreset: HostAnalyticsRangePreset.twelveMonths,
      granularity: HostAnalyticsGranularity.month,
      timezone: 'Asia/Kolkata',
    );
    final request = query.toCallableRequest().toJson();

    expect(request, {
      'organizerId': 'club-1',
      'rangePreset': '12m',
      'granularity': 'month',
      'timezone': 'Asia/Kolkata',
    });
  });

  test('trend wire keys stay pinned to the callable response fixture', () {
    final report = HostAnalyticsReport.fromCallableData({
      'generatedAt': '2026-06-18T12:00:00.000Z',
      'timezone': 'Asia/Kolkata',
      'summaryCards': [
        {
          'id': 'bookings',
          'label': 'SERVER_LABEL',
          'value': 12,
          'previousValue': 8,
          'unit': 'count',
          'status': 'ready',
        },
      ],
      'trend': [
        {
          'periodStart': '2026-06-01T18:30:00.000Z',
          'periodEnd': '2026-06-08T18:29:59.999Z',
          'metrics': {for (final key in HostAnalyticsTrendKeys.values) key: 1},
        },
      ],
      'topEvents': const [],
      'reviewSummary': const {},
      'discoverySummary': const {},
      'dataQuality': const [],
    });

    expect(report.timezone, 'Asia/Kolkata');
    expect(report.summaryCards.single.previousValue, 8);
    expect(
      report.trend.single.metrics.keys.toSet(),
      HostAnalyticsTrendKeys.values,
    );
    expect(report.linkSummary.links, isEmpty);
  });

  test('HostAnalyticsReport parses owner link clicks and their sources', () {
    final report = HostAnalyticsReport.fromCallableData({
      'generatedAt': '2026-06-18T12:00:00.000Z',
      'discoverySummary': const {'linkClicks': 7},
      'linkSummary': const {
        'links': [
          {
            'organizerId': 'org',
            'linkId': 'tickets',
            'label': 'Tickets',
            'clicks': 5,
          },
          {'organizerId': 'org', 'linkId': 'gone', 'label': null, 'clicks': 2},
        ],
        'trafficSources': [
          {'source': 'instagram', 'clicks': 4},
          {'source': 'other', 'clicks': 3},
          {'source': 'raw-referrer.example', 'clicks': 9},
        ],
      },
    });

    expect(report.discoverySummary.linkClicks, 7);
    expect(report.linkSummary.links.map((link) => (link.label, link.clicks)), [
      ('Tickets', 5),
      (null, 2),
    ]);
    expect(report.linkSummary.trafficSources, {
      HostAnalyticsTrafficSource.instagram: 4,
      HostAnalyticsTrafficSource.other: 3,
    });
  });

  test('HostAnalyticsEventRow parses full backend event metrics', () {
    final row = HostAnalyticsEventRow.fromMap({
      'eventId': 'event-1',
      'organizerId': 'club-1',
      'title': 'Morning miles',
      'startTime': '2026-06-18T02:30:00.000Z',
      'status': 'completed',
      'bookedCount': 24,
      'checkedInCount': 21,
      'waitlistedCount': 3,
      'fillRate': 80,
      'checkInRate': 87.5,
      'grossRevenueMinor': 120000,
      'currency': 'INR',
      'checkoutStartedCount': 29,
      'checkoutDropoffCount': 4,
      'paymentCompletedCount': 24,
      'paymentFailedCount': 2,
      'paymentRefundedCount': 1,
      'reviewCount': 7,
      'averageRating': 4.6,
      'demandCount': 31,
      'inviteOpenCount': 19,
      'mutualMatchCount': 8,
      'chatStartedCount': 5,
      'repeatAttendeeCount': 6,
    });

    expect(row.status, 'completed');
    expect(row.checkoutStartedCount, 29);
    expect(row.checkoutDropoffCount, 4);
    expect(row.paymentCompletedCount, 24);
    expect(row.paymentFailedCount, 2);
    expect(row.paymentRefundedCount, 1);
    expect(row.demandCount, 31);
    expect(row.chatStartedCount, 5);
    expect(row.repeatAttendeeCount, 6);
  });

  cacheLifetimeHarness(_harnessSubject);

  test('a roster write for one organizer refetches its and every-organizer '
      'reports only', () {
    runCacheHarness(_harnessSubject, (run) {
      final session = run.signIn('u1');
      final mine = run.listen(
        hostAnalyticsProvider(
          HostAnalyticsRead(
            session,
            const HostAnalyticsQuery(organizerId: 'a'),
          ),
        ),
      );
      final everyone = run.listen(
        hostAnalyticsProvider(
          HostAnalyticsRead(session, const HostAnalyticsQuery()),
        ),
      );
      final other = run.listen(
        hostAnalyticsProvider(
          HostAnalyticsRead(
            session,
            const HostAnalyticsQuery(organizerId: 'b'),
          ),
        ),
      );
      run.settle();
      expect(run.backend.requests, hasLength(3));

      run.container
          .read(cacheTagsProvider)
          .invalidate(InsightsTags.writtenFor('a'));
      run.settle();
      expect(run.backend.requestsFor('a'), 2);
      expect(run.backend.requestsFor('all'), 2);
      expect(run.backend.requestsFor('b'), 1);
      mine.close();
      everyone.close();
      other.close();
    });
  });

  test('a report that arrives after the session ends is never published', () {
    fakeAsync((async) {
      final repository = _CountingHostAnalyticsRepository();
      final accounts = StreamController<String?>();
      final container = ProviderContainer(
        retry: (_, _) => null,
        overrides: [
          uidProvider.overrideWith((ref) => accounts.stream),
          hostAnalyticsRepositoryProvider.overrideWithValue(repository),
        ],
      );
      container.listen(authenticatedSessionProvider, (_, _) {});
      final oldRead = Completer<HostAnalyticsReport>();
      repository.pending = oldRead;
      accounts.add('account-a');
      async.flushMicrotasks();
      final session = container.read(authenticatedSessionProvider).requireValue;
      final provider = hostAnalyticsProvider(
        HostAnalyticsRead(session, const HostAnalyticsQuery(organizerId: 'c')),
      );
      final observed = <AsyncValue<CachedRead<HostAnalyticsReport>>>[];
      container.listen(provider, (_, next) => observed.add(next));
      async.flushMicrotasks();
      expect(repository.callCount, 1);

      accounts.add('account-b');
      async.flushMicrotasks();
      oldRead.complete(
        HostAnalyticsReport.fromCallableData({
          'generatedAt': '2000-01-01T00:00:00Z',
        }),
      );
      async.flushMicrotasks();
      expect(observed.where((value) => value.hasValue), isEmpty);
      container.dispose();
      unawaited(accounts.close());
    });
  });

  test(
    'backend denial remains an error and is never replaced by a cached report',
    () async {
      final repository = _CountingHostAnalyticsRepository()..denied = true;
      final container = ProviderContainer(
        retry: (_, _) => null,
        overrides: [
          uidProvider.overrideWithValue(const AsyncData('account-a')),
          hostAnalyticsRepositoryProvider.overrideWithValue(repository),
        ],
      );
      addTearDown(container.dispose);
      final session = container.read(authenticatedSessionProvider).requireValue;
      final provider = hostAnalyticsProvider(
        HostAnalyticsRead(session, const HostAnalyticsQuery(organizerId: 'c')),
      );
      container.listen(provider, (_, _) {});
      await expectLater(container.read(provider.future), throwsStateError);
      expect(repository.callCount, 1);
      expect(container.read(provider).asData, isNull);
    },
  );
}

final _harnessSubject = CacheHarnessSubject(
  description: 'Host analytics',
  policy: CachePolicies.hostReports,
  readOwner: (session, id) => hostAnalyticsProvider(
    HostAnalyticsRead(session, HostAnalyticsQuery(organizerId: id)),
  ),
  overrides: (backend) => [
    hostAnalyticsRepositoryProvider.overrideWith(
      (ref) => _HarnessHostAnalyticsRepository(ref, backend),
    ),
  ],
  tagFor: InsightsTags.hostReports,
  dataOf: (value) => (value! as CachedRead<HostAnalyticsReport>).data.timezone,
);

/// Routes the analytics callable to the harness's counting backend. The
/// report's timezone carries the backend response so the harness can compare
/// values; the every-organizer query is recorded as `all`.
final class _HarnessHostAnalyticsRepository implements HostAnalyticsRepository {
  _HarnessHostAnalyticsRepository(this._ref, this._backend);

  final Ref _ref;
  final FakeCacheBackend _backend;

  @override
  Future<HostAnalyticsReport> getHostAnalytics(HostAnalyticsQuery query) async {
    final response = await _backend.fetch(
      uid: _ref.read(uidProvider).value ?? '',
      id: query.organizerId ?? 'all',
    );
    return HostAnalyticsReport.fromCallableData({
      'generatedAt': '2026-11-03T09:00:00.000Z',
      'timezone': response,
    });
  }
}

class _CountingHostAnalyticsRepository implements HostAnalyticsRepository {
  int callCount = 0;
  bool denied = false;
  Completer<HostAnalyticsReport>? pending;

  @override
  Future<HostAnalyticsReport> getHostAnalytics(HostAnalyticsQuery query) async {
    callCount += 1;
    if (denied) throw StateError('permission-denied');
    if (pending != null) return pending!.future;
    return HostAnalyticsReport.fromCallableData({
      'generatedAt': '2026-06-18T12:00:00.000Z',
      'timezone': query.timezone,
      'summaryCards': const [],
      'trend': const [],
      'topEvents': const [],
      'reviewSummary': const {},
      'discoverySummary': const {},
      'dataQuality': const [],
    });
  }
}
