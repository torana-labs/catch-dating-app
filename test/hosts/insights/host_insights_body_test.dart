import 'package:catch_dating_app/contexts/insights/parts/host_analytics_bar_indicator.dart';
import 'package:catch_dating_app/contexts/insights/parts/host_analytics_metric_tile.dart';
import 'package:catch_dating_app/contexts/insights/parts/host_analytics_night_row.dart';
import 'package:catch_dating_app/contexts/insights/parts/host_analytics_source_meter.dart';
import 'package:catch_dating_app/hosts/insights/host_insights_body.dart';
import 'package:catch_dating_app/hosts/insights/host_insights_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

final _supper = HostAnalyticsNight(
  eventId: 'supper',
  title: 'Long Table Supper',
  startTime: DateTime(2026, 10, 21, 20),
  booked: 14,
  capacity: 14,
  rating: 4.9,
);
final _trivia = HostAnalyticsNight(
  eventId: 'trivia',
  title: 'Tuesday Trivia Night',
  startTime: DateTime(2026, 10, 20, 19, 30),
  booked: 29,
  capacity: 30,
  rating: 4.8,
);

HostInsightsState _content(HostInsightsRange range) => HostInsightsState(
  status: HostInsightsStatus.content,
  range: range,
  stats: const [
    HostInsightsStat(
      kind: HostInsightsStatKind.bookings,
      value: 312,
      previousValue: 264,
    ),
    HostInsightsStat(
      kind: HostInsightsStatKind.ticketSales,
      value: 14800000,
      previousValue: 13300000,
      currencyCode: 'INR',
    ),
  ],
  bars: [
    HostAnalyticsBar(periodStart: DateTime(2026, 9, 29), value: 58),
    HostAnalyticsBar(periodStart: DateTime(2026, 10, 6), value: 64),
    HostAnalyticsBar(periodStart: DateTime(2026, 10, 13), value: 71),
    HostAnalyticsBar(periodStart: DateTime(2026, 10, 20), value: 82),
    HostAnalyticsBar(
      periodStart: DateTime(2026, 10, 27),
      value: 37,
      partial: true,
    ),
  ],
  sources: const [
    HostAnalyticsSourceShare(source: 'instagram', count: 61),
    HostAnalyticsSourceShare(source: 'whatsapp', count: 22),
    HostAnalyticsSourceShare(source: 'direct', count: 11),
    HostAnalyticsSourceShare(source: 'qr', count: 4),
    HostAnalyticsSourceShare(source: 'other', count: 2),
  ],
  visits: 3412,
  linkClicks: 1086,
  nights: [_supper, _trivia],
);

class _Calls {
  final ranges = <HostInsightsRange>[];
  final nights = <HostAnalyticsNight>[];
}

Future<_Calls> _pump(
  WidgetTester tester,
  HostInsightsState state, {
  Size size = const Size(390, 1800),
}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  final calls = _Calls();
  await tester.pumpWidget(
    MaterialApp(
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: CatchRoot(
        child: CatchScreen(
          body: HostInsightsBody(
            state: state,
            onRangeChanged: calls.ranges.add,
            onOpenNight: calls.nights.add,
          ),
        ),
      ),
    ),
  );
  await tester.pump();
  return calls;
}

void main() {
  testWidgets('thirty days shows the stats, weekly bookings, sources and the '
      'fullest nights in board order', (tester) async {
    final calls = await _pump(tester, _content(HostInsightsRange.thirtyDays));

    expect(find.text('312'), findsOneWidget);
    expect(find.text('Up 18%'), findsOneWidget);
    expect(find.text('Ticket sales'), findsOneWidget);
    expect(find.text('Bookings each week'), findsOneWidget);
    expect(find.text('29 Sep'), findsOneWidget);
    expect(find.text('Where visitors came from'), findsOneWidget);
    expect(find.text('Instagram · 61%'), findsOneWidget);
    expect(find.text('Other places · 6%'), findsOneWidget);
    expect(find.text('Your page had 3,412 visits'), findsOneWidget);
    expect(find.text('1,086 link clicks'), findsOneWidget);
    expect(find.text('14 of 14 · rated 4.9'), findsOneWidget);
    expect(find.text('Full'), findsOneWidget);
    expect(find.text('97%'), findsOneWidget);

    double top(String text) => tester.getTopLeft(find.text(text)).dy;
    expect(top('30 days'), lessThan(top('312')));
    expect(top('312'), lessThan(top('Bookings each week')));
    expect(
      top('Bookings each week'),
      lessThan(top('Where visitors came from')),
    );
    expect(
      top('Where visitors came from'),
      lessThan(top('Your fullest nights')),
    );

    await tester.tap(find.text('90 days'));
    expect(calls.ranges, [HostInsightsRange.ninetyDays]);

    await tester.tap(find.text('Long Table Supper'));
    expect(calls.nights.single.eventId, 'supper');
  });

  testWidgets('seven days counts bookings each day', (tester) async {
    await _pump(
      tester,
      HostInsightsState(
        status: HostInsightsStatus.content,
        range: HostInsightsRange.sevenDays,
        bars: [
          HostAnalyticsBar(periodStart: DateTime(2026, 10, 26), value: 4),
          HostAnalyticsBar(periodStart: DateTime(2026, 10, 27), value: 9),
        ],
      ),
    );

    expect(find.text('Bookings each day'), findsOneWidget);
    expect(find.text('Mon'), findsOneWidget);
    expect(find.text('Bookings each week'), findsNothing);
  });

  testWidgets('ninety days keeps the selected period', (tester) async {
    await _pump(tester, _content(HostInsightsRange.ninetyDays));

    final period = tester.widget<CatchPageTabBar<HostInsightsRange>>(
      find.byKey(const ValueKey<String>('host-insights-period')),
    );
    expect(period.selected, HostInsightsRange.ninetyDays);
  });

  testWidgets('an empty report says so instead of drawing zeros', (
    tester,
  ) async {
    await _pump(
      tester,
      const HostInsightsState(
        status: HostInsightsStatus.content,
        range: HostInsightsRange.thirtyDays,
      ),
    );

    expect(find.text('No bookings in this period.'), findsOneWidget);
    expect(find.text('No events in this period yet.'), findsOneWidget);
    expect(find.text('Where visitors came from'), findsNothing);
    expect(find.byType(CatchMetricTile), findsNothing);
  });

  testWidgets('loading keeps the period live over a skeleton', (tester) async {
    final calls = await _pump(
      tester,
      const HostInsightsState.loading(HostInsightsRange.thirtyDays),
    );

    expect(find.byType(CatchSkeleton), findsOneWidget);
    await tester.tap(find.text('7 days'));
    expect(calls.ranges, [HostInsightsRange.sevenDays]);
  });

  testWidgets('expanded windows lay the sections out as a feed', (
    tester,
  ) async {
    await _pump(
      tester,
      _content(HostInsightsRange.thirtyDays),
      size: const Size(1440, 1200),
    );

    expect(find.byType(CatchPaneLayout), findsOneWidget);
    expect(
      tester.getTopLeft(find.text('Your fullest nights')).dx,
      greaterThan(tester.getTopLeft(find.text('Bookings each week')).dx),
    );
  });

  testWidgets('four stats draw two to a row with Came back as a percentage', (
    tester,
  ) async {
    final base = _content(HostInsightsRange.thirtyDays);
    await _pump(
      tester,
      HostInsightsState(
        status: base.status,
        range: base.range,
        stats: [
          ...base.stats,
          const HostInsightsStat(
            kind: HostInsightsStatKind.cameBack,
            value: 42,
            previousValue: 35,
            figure: HostAnalyticsFigure.percent,
          ),
          const HostInsightsStat(
            kind: HostInsightsStatKind.followers,
            value: 1204,
          ),
        ],
        bars: base.bars,
        sources: base.sources,
        visits: base.visits,
        linkClicks: base.linkClicks,
        nights: base.nights,
      ),
    );
    expect(find.text('Came back'), findsOneWidget);
    expect(find.text('42%'), findsOneWidget);
    expect(find.text('Up 20%'), findsOneWidget);
    expect(find.text('Followers'), findsOneWidget);
    expect(find.text('1,204'), findsOneWidget);
    double top(String text) => tester.getTopLeft(find.text(text)).dy;
    expect(top('Came back'), greaterThan(top('312')));
    expect(top('Followers'), top('Came back'));
  });
}
