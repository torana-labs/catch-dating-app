import 'package:catch_dating_app/contexts/bookings/domain/runner_activity.dart';
import 'package:catch_dating_app/contexts/bookings/domain/weekly_activity_summary.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('WeeklyActivitySummary', () {
    test('uses Monday inclusive and next Monday exclusive week boundaries', () {
      final referenceDate = DateTime(2026, 5, 13, 12);
      final summary = WeeklyActivitySummary.fromActivities([
        _activity(
          startTime: DateTime(2026, 5, 10, 23, 59),
          distanceMeters: 9000,
        ),
        _activity(startTime: DateTime(2026, 5, 11)),
        _activity(startTime: DateTime(2026, 5, 17, 10), distanceMeters: 3000),
        _activity(startTime: DateTime(2026, 5, 18), distanceMeters: 7000),
      ], referenceDate: referenceDate);

      expect(summary.weekStart, DateTime(2026, 5, 11));
      expect(summary.weekEnd, DateTime(2026, 5, 18));
      expect(summary.activityCount, 2);
      expect(summary.totalDistanceKm, 8);
      expect(summary.totalActiveMinutes, 120);
      expect(summary.distanceMetersByWeekday[0], 5000);
      expect(summary.distanceMetersByWeekday[6], 3000);
      expect(summary.countsByKind[ActivityKind.running], 2);
    });

    test('counts non-distance activities by active minutes', () {
      final summary = WeeklyActivitySummary.fromActivities([
        _activity(
          startTime: DateTime(2026, 5, 11),
          type: ActivityKind.pickleball,
          distanceMeters: null,
        ),
      ], referenceDate: DateTime(2026, 5, 13));

      expect(summary.hasEvents, isTrue);
      expect(summary.activityCount, 1);
      expect(summary.totalDistanceMeters, 0);
      expect(summary.totalActiveMinutes, 60);
      expect(summary.countsByKind[ActivityKind.pickleball], 1);
    });

    test('ignores entries without distance or duration', () {
      final startTime = DateTime(2026, 5, 11);
      final summary = WeeklyActivitySummary.fromActivities([
        PhysicalActivity(
          stableId: 'zero',
          provider: PhysicalActivityProvider.appleHealth,
          type: ActivityKind.running,
          startTime: startTime,
          endTime: startTime,
          distanceMeters: 0,
        ),
      ], referenceDate: DateTime(2026, 5, 13));

      expect(summary.hasEvents, isFalse);
      expect(summary.activityCount, 0);
    });
  });
}

PhysicalActivity _activity({
  required DateTime startTime,
  ActivityKind type = ActivityKind.running,
  double? distanceMeters = 5000,
}) {
  return PhysicalActivity(
    stableId: startTime.toIso8601String(),
    provider: PhysicalActivityProvider.appleHealth,
    type: type,
    startTime: startTime,
    endTime: startTime.add(const Duration(hours: 1)),
    distanceMeters: distanceMeters,
  );
}
