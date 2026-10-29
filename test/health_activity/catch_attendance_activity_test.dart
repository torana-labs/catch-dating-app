import 'package:catch_dating_app/contexts/bookings/domain/catch_attendance_activity.dart';
import 'package:catch_dating_app/contexts/bookings/domain/runner_activity.dart';
import 'package:catch_dating_app/contexts/bookings/domain/weekly_activity_summary.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';

PhysicalActivity _platformActivity({
  required String id,
  required DateTime startTime,
  required double distanceMeters,
}) {
  return PhysicalActivity(
    stableId: id,
    provider: PhysicalActivityProvider.appleHealth,
    type: ActivityKind.running,
    startTime: startTime,
    endTime: startTime.add(const Duration(hours: 1)),
    distanceMeters: distanceMeters,
    sourceName: 'Apple Watch',
  );
}

void main() {
  test('uses Catch attended events as the weekly activity fallback', () {
    final now = DateTime(2026, 5, 13, 12);
    final attendedRun = buildEvent(
      id: 'catch-event',
      startTime: DateTime(2026, 5, 11, 6),
    );

    final snapshot = buildCatchAttendanceWeeklyActivitySnapshot(
      attendedEvents: [attendedRun],
      platformSnapshot: WeeklyActivitySnapshot.permissionRequired(
        referenceDate: now,
        platformLabel: 'Apple Health',
      ),
      referenceDate: now,
    );
    expect(snapshot.source, WeeklyActivitySource.catchFallback);
    expect(snapshot.canRequestPermission, isTrue);
    expect(snapshot.summary.totalDistanceKm, 5);
    expect(snapshot.summary.activityCount, 1);
  });

  test(
    'merges connected platform activity with non-overlapping Catch events',
    () {
      final now = DateTime(2026, 5, 13, 12);
      final catchEvent = buildEvent(
        id: 'catch-event',
        startTime: DateTime(2026, 5, 12, 7),
      );
      final platformActivity = _platformActivity(
        id: 'health-event',
        startTime: DateTime(2026, 5, 11, 7),
        distanceMeters: 3000,
      );

      final snapshot = buildCatchAttendanceWeeklyActivitySnapshot(
        attendedEvents: [catchEvent],
        platformSnapshot: WeeklyActivitySnapshot.connected(
          referenceDate: now,
          platformLabel: 'Apple Health',
          activities: [platformActivity],
        ),
        referenceDate: now,
      );
      expect(snapshot.source, WeeklyActivitySource.mixed);
      expect(snapshot.summary.totalDistanceKm, 8);
      expect(snapshot.summary.activityCount, 2);
      expect(snapshot.activities.map((activity) => activity.stableId), [
        'health-event',
        'catch:catch-event',
      ]);
    },
  );

  test('does not double count overlapping platform and Catch activity', () {
    final now = DateTime(2026, 5, 13, 12);
    final catchEvent = buildEvent(
      id: 'catch-event',
      startTime: DateTime(2026, 5, 12, 7),
      endTime: DateTime(2026, 5, 12, 8),
    );
    final platformActivity = _platformActivity(
      id: 'health-event',
      startTime: DateTime(2026, 5, 12, 7, 10),
      distanceMeters: 5100,
    );

    final snapshot = buildCatchAttendanceWeeklyActivitySnapshot(
      attendedEvents: [catchEvent],
      platformSnapshot: WeeklyActivitySnapshot.connected(
        referenceDate: now,
        platformLabel: 'Apple Health',
        activities: [platformActivity],
      ),
      referenceDate: now,
    );
    expect(snapshot.source, WeeklyActivitySource.healthPlatform);
    expect(snapshot.summary.totalDistanceMeters, 5100);
    expect(snapshot.summary.activityCount, 1);
    expect(snapshot.activities.map((activity) => activity.stableId), [
      'health-event',
    ]);
  });
}
