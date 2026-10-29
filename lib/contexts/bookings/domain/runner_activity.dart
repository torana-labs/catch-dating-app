import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';

enum PhysicalActivityProvider { catchAttendance, appleHealth, healthConnect }

@Deprecated('Use PhysicalActivityProvider.')
typedef RunnerActivityProvider = PhysicalActivityProvider;

@Deprecated('Use ActivityKind.')
typedef RunnerActivityType = ActivityKind;

class PhysicalActivity {
  const PhysicalActivity({
    required this.stableId,
    required this.provider,
    required this.type,
    required this.startTime,
    required this.endTime,
    this.distanceMeters,
    this.isManualEntry = false,
    this.sourceName,
    this.matchedCatchEventId,
  });

  final String stableId;
  final PhysicalActivityProvider provider;
  final ActivityKind type;
  final DateTime startTime;
  final DateTime endTime;
  final double? distanceMeters;
  final bool isManualEntry;
  final String? sourceName;
  final String? matchedCatchEventId;

  double get distanceKm => (distanceMeters ?? 0) / 1000;
  Duration get duration => endTime.difference(startTime);
  int get durationMinutes => duration.inMinutes;
  bool get hasDistance => (distanceMeters ?? 0) > 0;

  bool overlaps(DateTime start, DateTime end) {
    return startTime.isBefore(end) && endTime.isAfter(start);
  }
}

@Deprecated('Use PhysicalActivity.')
typedef RunnerActivity = PhysicalActivity;
