import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/contexts/bookings/domain/runner_activity.dart';

enum HealthActivityConnectionStatus {
  unsupported,
  needsHealthConnect,
  permissionRequired,
  connected,
}

enum WeeklyActivitySource { none, healthPlatform, catchFallback, mixed }

@Deprecated('Use WeeklyActivitySource.')
typedef WeeklyRunningActivitySource = WeeklyActivitySource;

class WeeklyActivitySummary {
  const WeeklyActivitySummary({
    required this.weekStart,
    required this.weekEnd,
    required this.distanceMetersByWeekday,
    required this.activeMinutesByWeekday,
    required this.activityCount,
    this.countsByKind = const {},
    this.refreshedAt,
  }) : assert(distanceMetersByWeekday.length == 7),
       assert(activeMinutesByWeekday.length == 7);

  final DateTime weekStart;
  final DateTime weekEnd;
  final List<double> distanceMetersByWeekday;
  final List<int> activeMinutesByWeekday;
  final int activityCount;
  final Map<ActivityKind, int> countsByKind;
  final DateTime? refreshedAt;

  @Deprecated('Use activityCount.')
  int get runCount => activityCount;

  double get totalDistanceMeters =>
      distanceMetersByWeekday.fold<double>(0, (sum, meters) => sum + meters);

  double get totalDistanceKm => totalDistanceMeters / 1000;

  int get totalActiveMinutes =>
      activeMinutesByWeekday.fold<int>(0, (sum, minutes) => sum + minutes);

  double get maxDailyDistanceMeters => distanceMetersByWeekday.fold<double>(
    0,
    (max, meters) => meters > max ? meters : max,
  );

  int get maxDailyActiveMinutes => activeMinutesByWeekday.fold<int>(
    0,
    (max, minutes) => minutes > max ? minutes : max,
  );

  bool get hasEvents => activityCount > 0;

  List<MapEntry<ActivityKind, int>> get topActivityCounts {
    final entries = countsByKind.entries.toList(growable: false)
      ..sort((a, b) => b.value.compareTo(a.value));
    return entries;
  }

  static DateTime weekStartFor(DateTime date) {
    return DateTime(date.year, date.month, date.day - (date.weekday - 1));
  }

  factory WeeklyActivitySummary.emptyForWeek(
    DateTime referenceDate, {
    DateTime? refreshedAt,
  }) {
    final weekStart = weekStartFor(referenceDate);
    return WeeklyActivitySummary(
      weekStart: weekStart,
      weekEnd: weekStart.add(const Duration(days: 7)),
      distanceMetersByWeekday: List<double>.filled(7, 0),
      activeMinutesByWeekday: List<int>.filled(7, 0),
      activityCount: 0,
      refreshedAt: refreshedAt,
    );
  }

  factory WeeklyActivitySummary.fromActivities(
    Iterable<PhysicalActivity> activities, {
    required DateTime referenceDate,
    DateTime? refreshedAt,
  }) {
    final weekStart = weekStartFor(referenceDate);
    final weekEnd = weekStart.add(const Duration(days: 7));
    final metersByWeekday = List<double>.filled(7, 0);
    final activeMinutesByWeekday = List<int>.filled(7, 0);
    final countsByKind = <ActivityKind, int>{};
    var count = 0;

    for (final activity in activities) {
      final startsInWeek =
          !activity.startTime.isBefore(weekStart) &&
          activity.startTime.isBefore(weekEnd);
      final distanceMeters = activity.distanceMeters ?? 0;
      final activeMinutes = activity.durationMinutes;
      if (!startsInWeek || (distanceMeters <= 0 && activeMinutes <= 0)) {
        continue;
      }

      final weekdayIndex = activity.startTime.weekday - 1;
      metersByWeekday[weekdayIndex] += distanceMeters;
      activeMinutesByWeekday[weekdayIndex] += activeMinutes;
      countsByKind.update(
        activity.type,
        (value) => value + 1,
        ifAbsent: () => 1,
      );
      count++;
    }

    return WeeklyActivitySummary(
      weekStart: weekStart,
      weekEnd: weekEnd,
      distanceMetersByWeekday: metersByWeekday,
      activeMinutesByWeekday: activeMinutesByWeekday,
      activityCount: count,
      countsByKind: Map.unmodifiable(countsByKind),
      refreshedAt: refreshedAt,
    );
  }
}

class WeeklyActivitySnapshot {
  const WeeklyActivitySnapshot({
    required this.connectionStatus,
    required this.platformLabel,
    required this.summary,
    required this.activities,
    required this.source,
    this.messageKind,
    this.canRequestPermission = false,
    this.canInstallHealthConnect = false,
  });

  final HealthActivityConnectionStatus connectionStatus;
  final String platformLabel;
  final WeeklyActivitySummary summary;
  final List<PhysicalActivity> activities;
  final WeeklyActivitySource source;
  final WeeklyActivityMessageKind? messageKind;
  final bool canRequestPermission;
  final bool canInstallHealthConnect;

  bool get hasPlatformConnection =>
      connectionStatus == HealthActivityConnectionStatus.connected;

  bool get hasEvents => summary.hasEvents;

  factory WeeklyActivitySnapshot.unsupported({
    required DateTime referenceDate,
    DateTime? refreshedAt,
  }) {
    return WeeklyActivitySnapshot(
      connectionStatus: HealthActivityConnectionStatus.unsupported,
      platformLabel: 'Health',
      summary: WeeklyActivitySummary.emptyForWeek(
        referenceDate,
        refreshedAt: refreshedAt,
      ),
      activities: const [],
      source: WeeklyActivitySource.none,
      messageKind: WeeklyActivityMessageKind.unsupported,
    );
  }

  factory WeeklyActivitySnapshot.needsHealthConnect({
    required DateTime referenceDate,
    DateTime? refreshedAt,
  }) {
    return WeeklyActivitySnapshot(
      connectionStatus: HealthActivityConnectionStatus.needsHealthConnect,
      platformLabel: 'Health Connect',
      summary: WeeklyActivitySummary.emptyForWeek(
        referenceDate,
        refreshedAt: refreshedAt,
      ),
      activities: const [],
      source: WeeklyActivitySource.none,
      messageKind: WeeklyActivityMessageKind.needsHealthConnect,
      canInstallHealthConnect: true,
    );
  }

  factory WeeklyActivitySnapshot.permissionRequired({
    required DateTime referenceDate,
    required String platformLabel,
    DateTime? refreshedAt,
  }) {
    return WeeklyActivitySnapshot(
      connectionStatus: HealthActivityConnectionStatus.permissionRequired,
      platformLabel: platformLabel,
      summary: WeeklyActivitySummary.emptyForWeek(
        referenceDate,
        refreshedAt: refreshedAt,
      ),
      activities: const [],
      source: WeeklyActivitySource.none,
      messageKind: WeeklyActivityMessageKind.permissionRequired,
      canRequestPermission: true,
    );
  }

  factory WeeklyActivitySnapshot.connected({
    required DateTime referenceDate,
    required String platformLabel,
    required List<PhysicalActivity> activities,
    DateTime? refreshedAt,
  }) {
    final summary = WeeklyActivitySummary.fromActivities(
      activities,
      referenceDate: referenceDate,
      refreshedAt: refreshedAt,
    );
    return WeeklyActivitySnapshot(
      connectionStatus: HealthActivityConnectionStatus.connected,
      platformLabel: platformLabel,
      summary: summary,
      activities: List.unmodifiable(activities),
      source: summary.hasEvents
          ? WeeklyActivitySource.healthPlatform
          : WeeklyActivitySource.none,
    );
  }

  WeeklyActivitySnapshot copyWith({
    WeeklyActivitySummary? summary,
    List<PhysicalActivity>? activities,
    WeeklyActivitySource? source,
    WeeklyActivityMessageKind? messageKind,
    bool clearMessage = false,
    bool? canRequestPermission,
    bool? canInstallHealthConnect,
  }) {
    return WeeklyActivitySnapshot(
      connectionStatus: connectionStatus,
      platformLabel: platformLabel,
      summary: summary ?? this.summary,
      activities: activities == null
          ? this.activities
          : List.unmodifiable(activities),
      source: source ?? this.source,
      messageKind: clearMessage ? null : messageKind ?? this.messageKind,
      canRequestPermission: canRequestPermission ?? this.canRequestPermission,
      canInstallHealthConnect:
          canInstallHealthConnect ?? this.canInstallHealthConnect,
    );
  }
}

enum WeeklyActivityMessageKind {
  unsupported,
  needsHealthConnect,
  permissionRequired,
  catchOnly,
}

@Deprecated('Use WeeklyActivitySnapshot.')
typedef WeeklyRunningActivitySnapshot = WeeklyActivitySnapshot;
