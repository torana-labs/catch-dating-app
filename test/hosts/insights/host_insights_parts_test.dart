import 'package:catch_dating_app/contexts/insights/parts/host_analytics_metric_tile.dart';
import 'package:catch_dating_app/contexts/insights/parts/host_analytics_night_row.dart';
import 'package:catch_dating_app/contexts/insights/parts/host_analytics_source_meter.dart';
import 'package:catch_dating_app/contexts/insights/parts/host_event_review_row.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Future<void> _pump(WidgetTester tester, Widget child) async {
  await tester.pumpWidget(
    MaterialApp(
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: CatchRoot(
        child: CatchScreen(body: CatchPageBody(child: child)),
      ),
    ),
  );
  await tester.pump();
}

void main() {
  testWidgets('a metric tile writes exact money, ratings, dashes and a '
      'caller note', (tester) async {
    await _pump(
      tester,
      const CatchStack(
        children: [
          HostAnalyticsMetricTile(
            label: 'Ticket sales',
            value: 1297400,
            currencyCode: 'INR',
            figure: HostAnalyticsFigure.moneyExact,
            previousValue: 1000000,
            note: 'from 24 payments',
          ),
          HostAnalyticsMetricTile(
            label: 'Rating',
            value: 4.75,
            figure: HostAnalyticsFigure.rating,
          ),
          HostAnalyticsMetricTile(label: 'New faces', value: null),
        ],
      ),
    );

    expect(find.text('₹12,974'), findsOneWidget);
    expect(find.text('from 24 payments'), findsOneWidget);
    expect(find.textContaining('Up'), findsNothing);
    expect(find.text('4.8'), findsOneWidget);
    expect(find.text('—'), findsOneWidget);
  });

  testWidgets('a night row says Full in success, or its fill', (tester) async {
    await _pump(
      tester,
      CatchStack(
        children: [
          HostAnalyticsNightRow(
            night: HostAnalyticsNight(
              eventId: 'full',
              title: 'Long Table Supper',
              startTime: DateTime(2026, 10, 21, 20),
              booked: 14,
              capacity: 14,
              rating: 4.9,
            ),
          ),
          HostAnalyticsNightRow(
            night: HostAnalyticsNight(
              eventId: 'open',
              title: 'Open Mic',
              startTime: DateTime(2026, 10, 22, 20),
              booked: 9,
            ),
          ),
        ],
      ),
    );

    final full = tester.widget<CatchIndexRow>(
      find.widgetWithText(CatchIndexRow, 'Long Table Supper'),
    );
    expect(full.status, 'Full');
    expect(full.statusTone, CatchIndexRowTone.success);
    expect(full.meta, '14 of 14 · rated 4.9');
    expect(full.date?.day, 'Wed');
    final open = tester.widget<CatchIndexRow>(
      find.widgetWithText(CatchIndexRow, 'Open Mic'),
    );
    expect(open.status, isNull);
    expect(open.progress, isNull);
    expect(open.meta, '9 booked');
  });

  testWidgets('the source meter keeps three sources and folds the rest into '
      'Other', (tester) async {
    await _pump(
      tester,
      const HostAnalyticsSourceMeter(
        label: 'Where visitors came from',
        shares: [
          HostAnalyticsSourceShare(source: 'qr', count: 4),
          HostAnalyticsSourceShare(source: 'instagram', count: 61),
          HostAnalyticsSourceShare(source: 'other', count: 2),
          HostAnalyticsSourceShare(source: 'whatsapp', count: 22),
          HostAnalyticsSourceShare(source: 'direct', count: 11),
        ],
      ),
    );

    final meter = tester.widget<CatchMeter>(find.byType(CatchMeter));
    expect(meter.variant, CatchMeterVariant.stack);
    expect(meter.parts.map((part) => part.label), [
      'Instagram',
      'WhatsApp',
      'Direct visits',
      'Other places',
    ]);
    expect(meter.parts.last.value, 6);
    expect(meter.parts.last.color, CatchMeterPartColor.muted);
  });

  testWidgets('a review row marks a Catch booking and hides an anonymous '
      'name', (tester) async {
    await _pump(
      tester,
      CatchStack(
        children: [
          HostEventReviewRow(
            review: Review(
              id: 'r1',
              organizerId: 'org-1',
              reviewerName: 'Rhea K.',
              rating: 4,
              comment: 'Great host.',
              createdAt: DateTime(2026, 10, 28),
            ),
          ),
          HostEventReviewRow(
            review: Review(
              id: 'r2',
              organizerId: 'org-1',
              reviewerName: 'Hidden Name',
              rating: 5,
              comment: '',
              source: 'import',
              isAnonymous: true,
              createdAt: DateTime(2026, 10, 28),
            ),
          ),
        ],
      ),
    );

    expect(find.text('Rhea K.'), findsOneWidget);
    expect(find.text('★★★★☆'), findsOneWidget);
    expect(find.text('Booked on Catch'), findsOneWidget);
    expect(find.text('Hidden Name'), findsNothing);
    expect(find.text('A guest'), findsOneWidget);
  });
}
