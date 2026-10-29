import 'package:catch_dating_app/clubs/presentation/detail/widgets/club_schedule_section.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/events/shared/event_agenda_list.dart';
import 'package:catch_dating_app/events/shared/event_tiles/event_tiles.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'clubs_test_helpers.dart';

void main() {
  group('ClubScheduleSection', () {
    testWidgets('renders direct date-rail cards with strip grouping', (
      tester,
    ) async {
      final events = _sameDayEvents();
      Event? selected;

      await pumpTestApp(
        tester,
        CustomScrollView(
          slivers: [
            ClubScheduleSection(
              events: events,
              bottomPadding: 0,
              onEventSelected: (event) => selected = event,
            ),
          ],
        ),
      );

      expect(find.byType(EventAgendaSliverList), findsNothing);
      expect(find.byType(EventAgendaTile), findsNothing);
      expect(find.byType(EventDateRailCard), findsNWidgets(3));
      expect(find.text('VIEW'), findsNothing);

      final cards = tester
          .widgetList<EventDateRailCard>(find.byType(EventDateRailCard))
          .toList(growable: false);
      expect(cards.map((card) => card.stripPosition), [
        EventDateRailCardStripPosition.first,
        EventDateRailCardStripPosition.middle,
        EventDateRailCardStripPosition.last,
      ]);

      final morningCard = find.byWidgetPredicate(
        (widget) => widget is EventDateRailCard && widget.event.id == 'morning',
        description: 'morning event date rail card',
      );
      await tester.tap(morningCard);
      await tester.pump();

      expect(selected, same(events.first));
    });

    testWidgets('keeps host-owned rows marked hosted', (tester) async {
      await pumpTestApp(
        tester,
        CustomScrollView(
          slivers: [
            ClubScheduleSection(
              events: _sameDayEvents().take(2).toList(growable: false),
              isHost: true,
              bottomPadding: 0,
            ),
          ],
        ),
      );

      final cards = tester
          .widgetList<EventDateRailCard>(find.byType(EventDateRailCard))
          .toList(growable: false);
      expect(cards.map((card) => card.statusLabel), ['HOSTED', 'HOSTED']);
      expect(
        find.textContaining('HOSTED', findRichText: true),
        findsNWidgets(2),
      );
    });

    testWidgets('preserves the inline empty state', (tester) async {
      await pumpTestApp(
        tester,
        const CustomScrollView(
          slivers: [ClubScheduleSection(events: [], bottomPadding: 0)],
        ),
      );

      expect(find.text('SCHEDULE'), findsOneWidget);
      expect(find.text('No events scheduled'), findsOneWidget);
      expect(
        find.text(
          'Future events will appear here once the host publishes one.',
        ),
        findsOneWidget,
      );
      expect(find.byType(EventDateRailCard), findsNothing);
    });
  });
}

List<Event> _sameDayEvents() {
  final day = DateTime(2026, 7, 9);
  return [
    buildEvent(id: 'morning', startTime: day.add(const Duration(hours: 6))),
    buildEvent(id: 'midday', startTime: day.add(const Duration(hours: 12))),
    buildEvent(id: 'evening', startTime: day.add(const Duration(hours: 18))),
  ];
}
