import 'package:catch_dating_app/contexts/bookings/domain/runner_activity.dart';
import 'package:catch_dating_app/contexts/bookings/domain/weekly_activity_summary.dart';
import 'package:catch_dating_app/contexts/events/events.dart';

WeeklyActivitySnapshot buildCatchAttendanceWeeklyActivitySnapshot({
  required List<Event> attendedEvents,
  required WeeklyActivitySnapshot platformSnapshot,
  required DateTime referenceDate,
}) {
  final catchActivities = attendedEvents
      .map(_activityFromCatchEvent)
      .toList(growable: false);

  if (!platformSnapshot.hasPlatformConnection) {
    final catchSummary = WeeklyActivitySummary.fromActivities(
      catchActivities,
      referenceDate: referenceDate,
      refreshedAt: platformSnapshot.summary.refreshedAt,
    );
    if (!catchSummary.hasEvents) {
      return platformSnapshot.copyWith(
        summary: catchSummary,
        activities: const [],
        source: WeeklyActivitySource.none,
      );
    }
    return platformSnapshot.copyWith(
      summary: catchSummary,
      activities: catchActivities,
      source: WeeklyActivitySource.catchFallback,
      messageKind: WeeklyActivityMessageKind.catchOnly,
    );
  }

  final platformActivities = platformSnapshot.activities;
  final catchOnlyActivities = catchActivities
      .where(
        (activity) => !_overlapsPlatformActivity(activity, platformActivities),
      )
      .toList(growable: false);
  final mergedActivities = [...platformActivities, ...catchOnlyActivities];
  final summary = WeeklyActivitySummary.fromActivities(
    mergedActivities,
    referenceDate: referenceDate,
    refreshedAt: platformSnapshot.summary.refreshedAt,
  );

  final source = _weeklyActivitySource(
    platformActivities: platformActivities,
    catchActivities: catchOnlyActivities,
    summary: summary,
  );

  return platformSnapshot.copyWith(
    summary: summary,
    activities: mergedActivities,
    source: source,
    clearMessage: source != WeeklyActivitySource.catchFallback,
    messageKind: source == WeeklyActivitySource.catchFallback
        ? WeeklyActivityMessageKind.catchOnly
        : null,
  );
}

PhysicalActivity _activityFromCatchEvent(Event event) {
  final activityKind = event.eventFormat.healthActivityKind;
  return PhysicalActivity(
    stableId: 'catch:${event.id}',
    provider: PhysicalActivityProvider.catchAttendance,
    type: activityKind,
    startTime: event.startTime,
    endTime: event.endTime,
    distanceMeters: activityKind.isDistanceBased
        ? event.distanceKm * 1000
        : null,
    sourceName: 'Catch',
    matchedCatchEventId: event.id,
  );
}

bool _overlapsPlatformActivity(
  PhysicalActivity catchActivity,
  List<PhysicalActivity> platformActivities,
) {
  final matchWindowStart = catchActivity.startTime.subtract(
    const Duration(minutes: 30),
  );
  final matchWindowEnd = catchActivity.endTime.add(const Duration(minutes: 30));
  return platformActivities.any(
    (activity) => activity.overlaps(matchWindowStart, matchWindowEnd),
  );
}

WeeklyActivitySource _weeklyActivitySource({
  required List<PhysicalActivity> platformActivities,
  required List<PhysicalActivity> catchActivities,
  required WeeklyActivitySummary summary,
}) {
  if (!summary.hasEvents) return WeeklyActivitySource.none;
  if (platformActivities.isNotEmpty && catchActivities.isNotEmpty) {
    return WeeklyActivitySource.mixed;
  }
  if (platformActivities.isNotEmpty) {
    return WeeklyActivitySource.healthPlatform;
  }
  return WeeklyActivitySource.catchFallback;
}
