import 'package:catch_dating_app/contexts/events/parts/event_catch_format.dart';
import 'package:catch_dating_app/contexts/events/parts/host_event_poster.dart';
import 'package:catch_dating_app/contexts/events/parts/host_event_week_row.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_attention_item.dart';
import 'package:catch_dating_app/contexts/insights/parts/host_analytics_metric_tile.dart';
import 'package:catch_dating_app/contexts/insights/parts/host_attention_row.dart';
import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'host_today_fixtures.dart';

Future<void> _pump(WidgetTester tester, Widget child) async {
  await tester.pumpWidget(
    MaterialApp(
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: CatchRoot(
        size: CatchWindowSize.compact,
        child: Material(child: SingleChildScrollView(child: child)),
      ),
    ),
  );
}

void main() {
  test('every activity takes a system format', () {
    expect(catchFormatForActivity(ActivityKind.socialRun), CatchFormat.run);
    expect(catchFormatForActivity(ActivityKind.padel), CatchFormat.courts);
    expect(catchFormatForActivity(ActivityKind.dinner), CatchFormat.dinner);
    expect(
      catchFormatForActivity(ActivityKind.barCrawl),
      CatchFormat.nightsOut,
    );
    expect(catchFormatForActivity(ActivityKind.pubQuiz), CatchFormat.games);
    for (final kind in ActivityKind.values) {
      expect(() => catchFormatForActivity(kind), returnsNormally);
    }
  });

  group('HostEventPoster', () {
    final evening = todayEvent('e', start: DateTime(2026, 10, 27, 19, 30));

    testWidgets('binds the event to the poster card', (tester) async {
      await _pump(
        tester,
        HostEventPoster(
          event: evening,
          now: todayNow,
          newFaces: 9,
          people: const ['Aanya Mehta', 'Kabir Rao'],
        ),
      );

      final card = tester.widget<CatchEventCard>(find.byType(CatchEventCard));
      expect(card.format, CatchFormat.games);
      expect(card.formatLabel, 'Pub quiz');
      expect(card.when, 'Tonight · doors at 7:30 PM');
      expect(card.place, 'Harbour Room');
      expect(card.counts.map((count) => '${count.value} ${count.label}'), [
        '26 Booked',
        '4 Waitlist',
        '9 New faces',
      ]);
      expect(card.people.map((person) => person.name), [
        'Aanya Mehta',
        'Kabir Rao',
      ]);
      expect(card.peopleTotal, 26);
    });

    testWidgets('leaves New faces out until the roster counted them', (
      tester,
    ) async {
      await _pump(tester, HostEventPoster(event: evening, now: todayNow));

      final card = tester.widget<CatchEventCard>(find.byType(CatchEventCard));
      expect(card.counts, hasLength(2));
      expect(card.people, isEmpty);
      expect(card.peopleTotal, isNull);
    });

    testWidgets('reads live, today and a later day from the clock', (
      tester,
    ) async {
      String whenAt(DateTime start, DateTime now) {
        return tester.widget<CatchEventCard>(find.byType(CatchEventCard)).when!;
      }

      await _pump(
        tester,
        HostEventPoster(
          event: todayEvent('l', start: DateTime(2026, 10, 27, 17)),
          now: todayNow,
        ),
      );
      expect(whenAt(DateTime(2026, 10, 27, 17), todayNow), 'Live now');

      await _pump(
        tester,
        HostEventPoster(
          event: todayEvent('d', start: DateTime(2026, 10, 27, 7)),
          now: DateTime(2026, 10, 27, 6),
        ),
      );
      expect(whenAt(DateTime(2026, 10, 27, 7), todayNow), 'Today · 7:00 AM');

      await _pump(
        tester,
        HostEventPoster(
          event: todayEvent('s', start: DateTime(2026, 11, 1, 6, 30)),
          now: todayNow,
        ),
      );
      expect(
        whenAt(DateTime(2026, 11, 1, 6, 30), todayNow),
        'Sun 1 Nov · 6:30 AM',
      );
    });
  });

  group('HostEventWeekRow', () {
    testWidgets('shows places left and the fill meter', (tester) async {
      await _pump(
        tester,
        HostEventWeekRow(
          event: todayEvent(
            'run',
            start: DateTime(2026, 11, 1, 6, 30),
            kind: ActivityKind.socialRun,
            booked: 32,
            capacity: 40,
          ),
        ),
      );

      final row = tester.widget<CatchIndexRow>(find.byType(CatchIndexRow));
      expect(row.date!.day, 'Sun');
      expect(row.date!.date, '1');
      expect(row.date!.format, CatchFormat.run);
      expect(row.meta, '6:30 AM · 32 of 40 booked');
      expect(row.status, '8 left');
      expect(row.statusTone, CatchIndexRowTone.neutral);
      expect(row.progress!.value, 32);
      expect(row.progress!.max, 40);
    });

    testWidgets('a full event reads Full in the success tone', (tester) async {
      await _pump(
        tester,
        HostEventWeekRow(
          event: todayEvent(
            'supper',
            start: DateTime(2026, 10, 29, 20),
            booked: 14,
            capacity: 14,
          ),
        ),
      );

      final row = tester.widget<CatchIndexRow>(find.byType(CatchIndexRow));
      expect(row.status, 'Full');
      expect(row.statusTone, CatchIndexRowTone.success);
    });
  });

  group('HostAttentionRow', () {
    testWidgets('marks urgency and gives the one action', (tester) async {
      var opened = 0;
      await _pump(
        tester,
        HostAttentionRow(
          item: todayAttention('join', dueAt: todayNow),
          onOpen: () => opened++,
        ),
      );

      final row = tester.widget<CatchIndexRow>(find.byType(CatchIndexRow));
      expect(row.marker, CatchIndexRowTone.warning);
      expect(row.title, 'Review join requests');
      expect(row.action!.label, 'Review');
      row.action!.onPressed!();
      row.onTap!();
      expect(opened, 2);
    });

    test('tones follow urgency', () {
      HostAttentionItem item(HostAttentionUrgency urgency) =>
          todayAttention('x', urgency: urgency, dueAt: todayNow);
      expect(
        hostAttentionTone(item(HostAttentionUrgency.soon)),
        CatchIndexRowTone.info,
      );
      expect(
        hostAttentionTone(item(HostAttentionUrgency.upcoming)),
        CatchIndexRowTone.success,
      );
    });
  });

  group('HostAnalyticsMetricTile', () {
    test('the change note compares with the previous period', () {
      expect(hostAnalyticsChangePercent(312, 264), 18);
      expect(hostAnalyticsChangePercent(90, 100), -10);
      expect(hostAnalyticsChangePercent(5, null), isNull);
      expect(hostAnalyticsChangePercent(5, 0), isNull);
    });

    testWidgets('a rise is a success note; money is compact', (tester) async {
      await _pump(
        tester,
        const Column(
          children: [
            HostAnalyticsMetricTile(
              label: 'Bookings',
              value: 312,
              previousValue: 264,
            ),
            HostAnalyticsMetricTile(
              label: 'Ticket sales',
              value: 14800000,
              previousValue: 15000000,
              currencyCode: 'INR',
            ),
          ],
        ),
      );

      final tiles = tester
          .widgetList<CatchMetricTile>(find.byType(CatchMetricTile))
          .toList();
      expect(tiles.first.note, 'Up 18%');
      expect(tiles.first.noteTone, CatchMetricTileTone.success);
      expect(tiles.last.note, 'Down 1%');
      expect(tiles.last.noteTone, CatchMetricTileTone.secondary);
      expect(find.text('312'), findsOneWidget);
      expect(find.textContaining('₹'), findsOneWidget);
    });
  });
}
