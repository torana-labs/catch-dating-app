import 'package:catch_dating_app/contexts/connections/domain/swipe_window.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';

void main() {
  group('swipe window helpers', () {
    test('calculates the closing time 24 hours after the event ends', () {
      final endTime = DateTime(2026, 4, 20, 8);
      final event = buildEvent(
        startTime: endTime.subtract(const Duration(hours: 1)),
        endTime: endTime,
      );

      expect(swipeWindowClosesAt(event), DateTime(2026, 4, 21, 8));
    });

    test('filters events with an active swipe window', () {
      final now = DateTime(2026, 4, 22, 12);
      final openEvent = buildEvent(
        id: 'open',
        startTime: now.subtract(const Duration(hours: 3)),
        endTime: now.subtract(const Duration(hours: 2)),
      );
      final upcomingRun = buildEvent(
        id: 'upcoming',
        startTime: now.add(const Duration(hours: 2)),
        endTime: now.add(const Duration(hours: 3)),
      );
      final closedRun = buildEvent(
        id: 'closed',
        startTime: now.subtract(const Duration(hours: 30)),
        endTime: now.subtract(const Duration(hours: 29)),
      );

      expect(
        eventsWithOpenSwipeWindow([
          openEvent,
          upcomingRun,
          closedRun,
        ], now: now).map((event) => event.id).toList(),
        ['open'],
      );
    });

    test('selects the most recent event with an active swipe window', () {
      final now = DateTime(2026, 4, 22, 12);
      final olderRun = buildEvent(
        id: 'older',
        startTime: now.subtract(const Duration(hours: 6)),
        endTime: now.subtract(const Duration(hours: 5)),
      );
      final latestRun = buildEvent(
        id: 'latest',
        startTime: now.subtract(const Duration(hours: 3)),
        endTime: now.subtract(const Duration(hours: 2)),
      );

      expect(
        latestEventWithOpenSwipeWindow([olderRun, latestRun], now: now)?.id,
        'latest',
      );
    });
  });
}
