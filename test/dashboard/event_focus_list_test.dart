import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/dashboard/presentation/dashboard_full_view_model.dart';
import 'package:catch_dating_app/dashboard/presentation/widgets/event_focus_list.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';
import '../test_pump_helpers.dart';

void main() {
  final now = DateTime(2026, 4, 23, 20);
  final closingFirst = buildEvent(
    id: 'closing-first',
    name: 'Closing first',
    checkedInCount: 3,
    startTime: now.subtract(const Duration(hours: 8)),
    endTime: now.subtract(const Duration(hours: 6)),
  );
  final closingLater = buildEvent(
    id: 'closing-later',
    name: 'Closing later',
    checkedInCount: 5,
    startTime: now.subtract(const Duration(hours: 4)),
    endTime: now.subtract(const Duration(hours: 2)),
  );
  final upcoming = buildEvent(
    id: 'upcoming',
    name: 'Upcoming event',
    bookedCount: 1,
    startTime: now.add(const Duration(days: 1)),
  );

  EventFocusActions actions(List<String> opened) => EventFocusActions(
    onViewEvent: (_) {},
    onCheckIn: (_) {},
    onOpenSwipe: (event) => opened.add(event.id),
    onWriteReview: (_) {},
    onOpenDirections: (_) {},
    onAddToCalendar: (_) {},
    onResetCheckInError: () {},
  );

  Future<void> pumpList(
    WidgetTester tester, {
    required List<Event> attended,
    required List<Event> booked,
    required List<String> opened,
    bool reducedMotion = false,
    ValueChanged<Event>? onImpression,
  }) async {
    final windowed = dashboardCatchWindowsFromEvents(attended, now: now);
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(disableAnimations: reducedMotion),
          child: child!,
        ),
        home: Scaffold(
          body: SingleChildScrollView(
            child: EventFocusList(
              windowedEvents: windowed,
              upcomingEvents: booked,
              actions: actions(opened),
              now: now,
              onWindowImpression: onImpression,
            ),
          ),
        ),
      ),
    );
    await tester.pump();
  }

  testWidgets(
    'renders all windows in expiry order before upcoming, with counts and CTAs',
    (tester) async {
      final opened = <String>[];
      final impressions = <String>[];
      await pumpList(
        tester,
        attended: [closingLater, closingFirst],
        booked: [upcoming],
        opened: opened,
        onImpression: (event) => impressions.add(event.id),
      );

      expect(find.byType(EventFocusCard), findsNWidgets(3));
      expect(find.text('3 checked in'), findsOneWidget);
      expect(find.text('5 checked in'), findsOneWidget);
      expect(impressions, ['closing-first', 'closing-later']);
      final firstY = tester.getTopLeft(find.text(closingFirst.title)).dy;
      final laterY = tester.getTopLeft(find.text(closingLater.title)).dy;
      final upcomingY = tester.getTopLeft(find.text(upcoming.title)).dy;
      expect(firstY, lessThan(laterY));
      expect(laterY, lessThan(upcomingY));

      await tester.tap(
        find.descendant(
          of: find.byKey(const ValueKey('event-focus-closing-first')),
          matching: find.text('Start catching'),
        ),
      );
      expect(opened, ['closing-first']);
      await tester.ensureVisible(find.text(closingLater.title));
      await tester.tap(find.text(closingLater.title));
      expect(opened, ['closing-first', 'closing-later']);
    },
  );

  testWidgets('shows a static rounded countdown when animations are disabled', (
    tester,
  ) async {
    final window = buildEvent(
      id: 'ninety-minutes',
      name: 'Ninety minutes left',
      checkedInCount: 2,
      startTime: now.subtract(const Duration(hours: 24)),
      endTime: now.subtract(const Duration(hours: 22, minutes: 30)),
    );
    await pumpList(
      tester,
      attended: [window],
      booked: const [],
      opened: <String>[],
      reducedMotion: true,
    );
    expect(find.text('2h left'), findsOneWidget);
    expect(find.text('1h 30m left'), findsNothing);
  });

  testWidgets('updates the countdown while the window remains open', (
    tester,
  ) async {
    final window = buildEvent(
      id: 'live-timer',
      checkedInCount: 2,
      startTime: now.subtract(const Duration(hours: 24)),
      endTime: now.subtract(const Duration(hours: 22, minutes: 30)),
    );
    await pumpList(
      tester,
      attended: [window],
      booked: const [],
      opened: <String>[],
    );
    expect(find.text('1h 30m left'), findsOneWidget);
    await pumpFeatureUiFor(tester, dashboardHomeClockTick);
    expect(find.text('1h 29m left'), findsOneWidget);
  });
}
