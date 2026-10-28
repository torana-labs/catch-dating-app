import 'dart:async';

import 'package:catch_dating_app/auth/data/auth_repository.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/hosts/data/host_analytics_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

void main() {
  test('HostAnalyticsQuery serializes custom event-scoped ranges', () {
    final request = HostAnalyticsQuery(
      clubId: 'club-1',
      eventId: 'event-1',
      rangePreset: HostAnalyticsRangePreset.custom,
      startDate: DateTime(2026, 6),
      endDate: DateTime(2026, 6, 30),
      granularity: HostAnalyticsGranularity.week,
    ).toCallableRequest().toJson();

    expect(request, {
      'clubId': 'club-1',
      'eventId': 'event-1',
      'rangePreset': 'custom',
      'startDate': '2026-06-01',
      'endDate': '2026-06-30',
      'granularity': 'week',
    });
  });

  test('HostAnalyticsQuery omits date bounds for preset ranges', () {
    final request = HostAnalyticsQuery(
      clubId: 'club-1',
      rangePreset: HostAnalyticsRangePreset.ninetyDays,
      startDate: DateTime(2026, 2),
      endDate: DateTime(2026, 1, 31),
      granularity: HostAnalyticsGranularity.month,
    ).toCallableRequest().toJson();

    expect(request, {
      'clubId': 'club-1',
      'rangePreset': '90d',
      'granularity': 'month',
    });
  });

  test('HostAnalyticsQuery sends the 12-month preset and IANA timezone', () {
    const query = HostAnalyticsQuery(
      clubId: 'club-1',
      rangePreset: HostAnalyticsRangePreset.twelveMonths,
      granularity: HostAnalyticsGranularity.month,
      timezone: 'Asia/Kolkata',
    );
    final request = query.toCallableRequest().toJson();

    expect(request, {
      'clubId': 'club-1',
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
      'clubId': 'club-1',
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

  test('preset providers require fresh server reads after tab exit', () async {
    final repository = _CountingHostAnalyticsRepository();
    final container = ProviderContainer(
      overrides: [
        uidProvider.overrideWithValue(const AsyncData('account-a')),
        hostAnalyticsRepositoryProvider.overrideWithValue(repository),
      ],
    );
    addTearDown(container.dispose);

    const queries = [
      HostAnalyticsQuery(clubId: 'club-1', timezone: 'Asia/Kolkata'),
      HostAnalyticsQuery(
        clubId: 'club-1',
        rangePreset: HostAnalyticsRangePreset.ninetyDays,
        granularity: HostAnalyticsGranularity.week,
        timezone: 'Asia/Kolkata',
      ),
      HostAnalyticsQuery(
        clubId: 'club-1',
        rangePreset: HostAnalyticsRangePreset.twelveMonths,
        granularity: HostAnalyticsGranularity.month,
        timezone: 'Asia/Kolkata',
      ),
    ];

    Future<void> load(HostAnalyticsQuery query) async {
      final provider = hostAnalyticsProvider(query);
      final subscription = container.listen(provider, (_, _) {});
      await container.read(provider.future);
      subscription.close();
      await flushTestEventQueue();
    }

    for (final query in queries) {
      await load(query);
    }
    await load(queries.first);
    expect(repository.callCount, 4);

    container.invalidate(hostAnalyticsProvider(queries.first));
    await load(queries.first);
    expect(repository.callCount, 5);
  });
  test(
    'missing, loading and failed auth never load a private report',
    () async {
      for (final auth in <AsyncValue<String?>>[
        const AsyncData(null),
        const AsyncLoading(),
        AsyncError(StateError('auth unavailable'), StackTrace.empty),
      ]) {
        final repository = _CountingHostAnalyticsRepository();
        final container = ProviderContainer(
          retry: (_, _) => null,
          overrides: [
            uidProvider.overrideWithValue(auth),
            hostAnalyticsRepositoryProvider.overrideWithValue(repository),
          ],
        );
        final subscription = container.listen(
          hostAnalyticsProvider(const HostAnalyticsQuery()),
          (_, _) {},
        );
        await container.pump();
        expect(repository.callCount, 0);
        if (auth is AsyncData<String?>) {
          await expectLater(
            container.read(
              hostAnalyticsProvider(const HostAnalyticsQuery()).future,
            ),
            throwsA(isA<SignInRequiredException>()),
          );
        }
        subscription.close();
        container.dispose();
      }
    },
  );

  test(
    'reports reauthorize after tab exit, account changes and same-account reentry',
    () async {
      final repository = _CountingHostAnalyticsRepository();
      final accounts = StreamController<String?>();
      final container = ProviderContainer(
        retry: (_, _) => null,
        overrides: [
          uidProvider.overrideWith((ref) => accounts.stream),
          hostAnalyticsRepositoryProvider.overrideWithValue(repository),
        ],
      );
      addTearDown(accounts.close);
      addTearDown(container.dispose);
      // The app-wide auth foundation remains observed independently of tabs.
      container.listen(uidProvider, (_, _) {});
      const query = HostAnalyticsQuery(clubId: 'club-1');
      final provider = hostAnalyticsProvider(query);
      var subscription = container.listen(provider, (_, _) {});
      accounts.add('account-a');
      await flushTestEventQueue();
      await container.pump();
      await container.read(provider.future);
      subscription.close();
      await container.pump();
      expect(repository.callCount, 1);
      accounts.add('account-b');
      await flushTestEventQueue();
      await container.pump();
      subscription = container.listen(provider, (_, _) {});
      await container.read(provider.future);
      expect(repository.callCount, 2);
      accounts.add(null);
      await flushTestEventQueue();
      await container.pump();
      await expectLater(
        container.read(provider.future),
        throwsA(isA<SignInRequiredException>()),
      );
      accounts.add('account-b');
      await flushTestEventQueue();
      await container.pump();
      await container.read(provider.future);
      expect(repository.callCount, 3);
      subscription.close();
    },
  );

  for (final nextAccount in ['account-b', 'account-a']) {
    test(
      'late report cannot publish across auth transition to $nextAccount',
      () async {
        final repository = _CountingHostAnalyticsRepository();
        final accounts = StreamController<String?>();
        final container = ProviderContainer(
          retry: (_, _) => null,
          overrides: [
            uidProvider.overrideWith((ref) => accounts.stream),
            hostAnalyticsRepositoryProvider.overrideWithValue(repository),
          ],
        );
        addTearDown(accounts.close);
        addTearDown(container.dispose);
        final oldRead = Completer<HostAnalyticsReport>();
        repository.pending = oldRead;
        const query = HostAnalyticsQuery(clubId: 'club-1');
        final provider = hostAnalyticsProvider(query);
        final observed = <HostAnalyticsReport>[];
        container.listen(provider, (_, next) {
          if (next.asData?.value case final HostAnalyticsReport report) {
            observed.add(report);
          }
        });
        accounts.add('account-a');
        await flushTestEventQueue();
        await container.pump();
        expect(repository.callCount, 1);
        accounts.add(null);
        await flushTestEventQueue();
        await container.pump();
        repository.pending = null;
        accounts.add(nextAccount);
        await flushTestEventQueue();
        await container.pump();
        final fresh = await container.read(provider.future);
        expect(repository.callCount, 2);
        final stale = HostAnalyticsReport.fromCallableData({
          'generatedAt': '2000-01-01T00:00:00Z',
        });
        oldRead.complete(stale);
        await container.pump();
        expect(container.read(provider).asData?.value, same(fresh));
        expect(observed, isNot(contains(stale)));
      },
    );
  }

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
      const query = HostAnalyticsQuery(clubId: 'club-1');
      container.listen(hostAnalyticsProvider(query), (_, _) {});
      await expectLater(
        container.read(hostAnalyticsProvider(query).future),
        throwsStateError,
      );
      expect(repository.callCount, 1);
      expect(container.read(hostAnalyticsProvider(query)).asData, isNull);
    },
  );
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
