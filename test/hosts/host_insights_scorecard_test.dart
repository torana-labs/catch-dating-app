import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/hosts/data/host_analytics_repository.dart';
import 'package:catch_dating_app/hosts/presentation/host_operations_screen.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

void main() {
  testWidgets('Host Insights renders the narrative scorecard hierarchy', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(390, 2200);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    String? openedEventId;
    var openedAllEvents = false;
    await _pumpReport(
      tester,
      report: _report(),
      onOpenEventReport: (eventId) => openedEventId = eventId,
      onOpenAllEvents: () => openedAllEvents = true,
    );

    expect(find.text('Updated 5m'), findsOneWidget);
    expect(
      find.byKey(const ValueKey('host-analytics-sync-footnote')),
      findsOneWidget,
    );
    expect(find.text('PERFORMANCE'), findsOneWidget);
    expect(find.text('TREND · BOOKINGS VS DEMAND'), findsOneWidget);
    expect(find.text('RECENT EVENTS'), findsOneWidget);
    expect(find.text('REVIEWS'), findsOneWidget);

    final primary = tester.widget<CatchMetricSection>(
      find.byKey(const ValueKey('host-analytics-primary-grid')),
    );
    expect(primary.metrics, hasLength(6));
    expect(primary.metrics.first.label, 'Profile & event views');
    expect(primary.metrics.first.value, '150');
    expect(primary.metrics.first.caption, '↑ 50% vs previous 30 days');

    await tester.tap(find.text('More metrics'));
    await pumpFeatureUi(tester);
    final secondary = tester.widget<CatchMetricSection>(
      find.byKey(const ValueKey('host-analytics-secondary-grid')),
    );
    expect(secondary.metrics, hasLength(4));
    expect(
      secondary.metrics.map((metric) => metric.label),
      containsAll([
        'Checkout drop-off',
        'Checkout conversion',
        'Chats started',
        'Event saves',
      ]),
    );

    expect(find.text('SERVER_LABEL'), findsNothing);
    expect(find.text('SERVER_CAPTION'), findsNothing);
    expect(find.text('SERVER_DATA_QUALITY_DETAIL'), findsNothing);
    expect(find.text('Demand'), findsOneWidget);
    expect(find.text('Bookings'), findsWidgets);
    expect(find.text('Jun 2'), findsOneWidget);
    expect(find.text('Payment issues'), findsOneWidget);
    expect(find.text('Published reviews'), findsOneWidget);
    expect(find.text('COACH'), findsNothing);

    await tester.ensureVisible(find.text('Event One'));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Event One'));
    await tester.pump();
    expect(openedEventId, 'event-1');

    await tester.ensureVisible(find.text('All events'));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('All events'));
    await tester.pump();
    expect(openedAllEvents, isTrue);
  });

  testWidgets('Host Insights handles empty trend and event ranges honestly', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(390, 1800);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await _pumpReport(
      tester,
      report: _report(trend: const [], events: const []),
      onOpenEventReport: (_) {},
      onOpenAllEvents: () {},
    );

    expect(find.text('No analytics in this range.'), findsOneWidget);
    expect(find.text('No events in this range.'), findsOneWidget);
    expect(find.text('All events'), findsOneWidget);
  });

  testWidgets('Host trend bucket tap reveals the exact pair detail', (
    tester,
  ) async {
    await _pumpReport(
      tester,
      report: _report(),
      onOpenEventReport: (_) {},
      onOpenAllEvents: () {},
    );

    final firstBar = find.byKey(
      const ValueKey<String>('host-analytics-trend-2026-06-02T00:00:00.000Z'),
    );
    expect(firstBar, findsOneWidget);
    await tester.ensureVisible(firstBar);
    tester.widget<HostAnalyticsBarTile>(firstBar).onTap();
    await pumpFeatureUi(tester);
    final detail = find.byKey(
      const ValueKey('host-analytics-trend-detail'),
      skipOffstage: false,
    );
    expect(detail, findsOneWidget);
    expect(
      tester.widget<CatchText>(detail).data,
      'Tue, 2 Jun: 18 demand · 12 bookings',
    );
  });

  testWidgets('Coach links attendance advice to the latest event report', (
    tester,
  ) async {
    String? openedEventId;
    await _pumpReport(
      tester,
      report: _report(attendanceRate: 59),
      onOpenEventReport: (eventId) => openedEventId = eventId,
      onOpenAllEvents: () {},
    );

    expect(find.text('COACH'), findsOneWidget);
    final attendance = find.byKey(
      const ValueKey('host-analytics-coach-attendance'),
    );
    await tester.ensureVisible(attendance);
    await tester.tap(attendance);
    expect(openedEventId, 'event-1');
  });

  testWidgets('Coach links checkout advice to event defaults', (tester) async {
    var openedDefaults = false;
    await _pumpReport(
      tester,
      report: _report(trend: [_trend(checkoutStarted: 10, checkoutDropoff: 3)]),
      onOpenEventReport: (_) {},
      onOpenAllEvents: () {},
      onOpenEventDefaults: () => openedDefaults = true,
    );

    final checkout = find.byKey(
      const ValueKey('host-analytics-coach-checkout-dropoff'),
    );
    await tester.ensureVisible(checkout);
    await tester.tap(checkout);
    expect(openedDefaults, isTrue);
  });

  test('Coach attendance rule requires two events below sixty percent', () {
    final recommendations = hostAnalyticsCoachRecommendations(
      _report(attendanceRate: 59),
    );
    expect(
      recommendations.map((item) => item.kind),
      contains(HostAnalyticsCoachRecommendationKind.attendance),
    );
  });

  test('Coach checkout rule fires at thirty percent drop-off', () {
    final recommendations = hostAnalyticsCoachRecommendations(
      _report(trend: [_trend(checkoutStarted: 10, checkoutDropoff: 3)]),
    );
    expect(
      recommendations.map((item) => item.kind),
      contains(HostAnalyticsCoachRecommendationKind.checkoutDropoff),
    );
  });

  test('Coach demand rule names an event at twice its bookings', () {
    final recommendations = hostAnalyticsCoachRecommendations(
      _report(
        trend: const [],
        events: [
          _event(
            'event-demand',
            'Demand Dash',
            bookedCount: 10,
            demandCount: 20,
          ),
        ],
      ),
    );
    expect(
      recommendations.single.kind,
      HostAnalyticsCoachRecommendationKind.demandCapacity,
    );
    expect(recommendations.single.eventId, 'event-demand');
    expect(recommendations.single.eventTitle, 'Demand Dash');
  });

  test('Coach repeat rule requires three complete visible event rows', () {
    final recommendations = hostAnalyticsCoachRecommendations(
      _report(
        trend: const [],
        events: [
          _event('event-1', 'One', repeatAttendeeCount: 0),
          _event('event-2', 'Two', repeatAttendeeCount: 0),
          _event('event-3', 'Three', repeatAttendeeCount: 0),
        ],
      ),
    );
    expect(
      recommendations.single.kind,
      HostAnalyticsCoachRecommendationKind.noRepeatAttendees,
    );
  });

  test('Coach returns at most two recommendations in rule priority order', () {
    final recommendations = hostAnalyticsCoachRecommendations(
      _report(
        attendanceRate: 59,
        trend: [_trend(checkoutStarted: 10, checkoutDropoff: 3)],
        events: [
          _event(
            'event-1',
            'One',
            bookedCount: 10,
            demandCount: 20,
            repeatAttendeeCount: 0,
          ),
          _event('event-2', 'Two', repeatAttendeeCount: 0),
          _event('event-3', 'Three', repeatAttendeeCount: 0),
        ],
      ),
    );
    expect(recommendations, hasLength(2));
    expect(
      recommendations[0].kind,
      HostAnalyticsCoachRecommendationKind.attendance,
    );
    expect(
      recommendations[1].kind,
      HostAnalyticsCoachRecommendationKind.checkoutDropoff,
    );
  });
}

Future<void> _pumpReport(
  WidgetTester tester, {
  required HostAnalyticsReport report,
  required ValueChanged<String> onOpenEventReport,
  required VoidCallback onOpenAllEvents,
  VoidCallback? onOpenEventDefaults,
}) async {
  await tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.light,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: Scaffold(
        body: SingleChildScrollView(
          child: HostAnalyticsReportBody(
            report: report,
            rangePreset: HostClubInsightsRangePreset.thirtyDays,
            currencyCode: 'INR',
            onOpenEventReport: onOpenEventReport,
            onOpenAllEvents: onOpenAllEvents,
            onOpenEventDefaults: onOpenEventDefaults ?? () {},
            now: DateTime.utc(2026, 6, 18, 12, 5),
          ),
        ),
      ),
    ),
  );
  await pumpFeatureUi(tester);
}

HostAnalyticsReport _report({
  List<HostAnalyticsTrendPoint>? trend,
  List<HostAnalyticsEventRow>? events,
  num attendanceRate = 80,
}) {
  HostAnalyticsMetricCard card(
    String id,
    num value,
    num previousValue, {
    HostAnalyticsMetricUnit unit = HostAnalyticsMetricUnit.count,
    HostAnalyticsMetricStatus status = HostAnalyticsMetricStatus.ready,
  }) {
    return HostAnalyticsMetricCard(
      id: id,
      label: 'SERVER_LABEL',
      value: value,
      previousValue: previousValue,
      unit: unit,
      status: status,
      caption: 'SERVER_CAPTION',
    );
  }

  return HostAnalyticsReport(
    generatedAt: DateTime.utc(2026, 6, 18, 12),
    timezone: 'Asia/Kolkata',
    summaryCards: [
      card(HostAnalyticsMetricIds.listingViews, 100, 80),
      card(HostAnalyticsMetricIds.eventViews, 50, 20),
      card(HostAnalyticsMetricIds.bookings, 20, 10),
      card(
        HostAnalyticsMetricIds.attendanceRate,
        attendanceRate,
        70,
        unit: HostAnalyticsMetricUnit.percent,
      ),
      card(
        HostAnalyticsMetricIds.revenue,
        100000,
        50000,
        unit: HostAnalyticsMetricUnit.moneyMinor,
      ),
      card(HostAnalyticsMetricIds.connections, 9, 6),
      card(HostAnalyticsMetricIds.newReviews, 4, 2),
      card(HostAnalyticsMetricIds.checkoutDropoff, 3, 4),
      card(
        HostAnalyticsMetricIds.checkoutConversionRate,
        75,
        60,
        unit: HostAnalyticsMetricUnit.percent,
      ),
      card(
        HostAnalyticsMetricIds.chats,
        6,
        4,
        status: HostAnalyticsMetricStatus.partial,
      ),
    ],
    trend:
        trend ??
        [
          HostAnalyticsTrendPoint(
            periodStart: DateTime.utc(2026, 6, 2),
            periodEnd: DateTime.utc(2026, 6, 8),
            metrics: const {
              HostAnalyticsTrendKeys.demand: 18,
              HostAnalyticsTrendKeys.bookings: 12,
            },
          ),
          HostAnalyticsTrendPoint(
            periodStart: DateTime.utc(2026, 6, 9),
            periodEnd: DateTime.utc(2026, 6, 15),
            metrics: const {
              HostAnalyticsTrendKeys.demand: 22,
              HostAnalyticsTrendKeys.bookings: 16,
            },
          ),
        ],
    topEvents:
        events ??
        [
          _event('event-1', 'Event One', checkoutDropoffCount: 2),
          _event('event-2', 'Event Two'),
        ],
    reviewSummary: const HostAnalyticsReviewSummary(
      newReviews: 4,
      publishedReviews: 3,
      verifiedReviews: 3,
      publicReviews: 3,
      ownerResponseCount: 2,
      averageRating: 4.7,
    ),
    discoverySummary: const HostAnalyticsDiscoverySummary(
      listingViews: 100,
      searchAppearances: 120,
      eventViews: 50,
      organizerSaves: 10,
      eventSaves: 8,
      contactClicks: 4,
      claimClicks: 1,
      outboundClicks: 3,
    ),
    dataQuality: const [
      HostAnalyticsDataQuality(
        id: 'mart',
        state: HostAnalyticsDataQualityState.partial,
        detail: 'SERVER_DATA_QUALITY_DETAIL',
      ),
    ],
  );
}

HostAnalyticsEventRow _event(
  String eventId,
  String title, {
  int checkoutDropoffCount = 0,
  int bookedCount = 20,
  int demandCount = 28,
  int repeatAttendeeCount = 4,
}) {
  return HostAnalyticsEventRow(
    eventId: eventId,
    clubId: 'club-1',
    title: title,
    startTime: DateTime.utc(2026, 6, 12),
    status: 'completed',
    bookedCount: bookedCount,
    checkedInCount: 16,
    waitlistedCount: 2,
    fillRate: 80,
    checkInRate: 80,
    grossRevenueMinor: 120000,
    currency: 'INR',
    checkoutStartedCount: 22,
    checkoutDropoffCount: checkoutDropoffCount,
    paymentCompletedCount: 20,
    paymentFailedCount: 0,
    paymentRefundedCount: 0,
    reviewCount: 3,
    averageRating: 4.7,
    demandCount: demandCount,
    inviteOpenCount: 7,
    mutualMatchCount: 5,
    chatStartedCount: 3,
    repeatAttendeeCount: repeatAttendeeCount,
  );
}

HostAnalyticsTrendPoint _trend({
  int checkoutStarted = 0,
  int checkoutDropoff = 0,
}) {
  return HostAnalyticsTrendPoint(
    periodStart: DateTime.utc(2026, 6, 2),
    periodEnd: DateTime.utc(2026, 6, 8),
    metrics: {
      HostAnalyticsTrendKeys.checkoutStarted: checkoutStarted,
      HostAnalyticsTrendKeys.checkoutDropoff: checkoutDropoff,
    },
  );
}
