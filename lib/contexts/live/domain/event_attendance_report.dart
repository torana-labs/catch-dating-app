import 'package:meta/meta.dart';

/// One event's attendance report as `hostEventAttendanceReports/{eventId}`
/// holds it: the roster report `getEventAttendanceReport` returns, kept by
/// the server's triggers. A report not written yet reads as null.
@immutable
class EventAttendanceReport {
  const EventAttendanceReport({
    required this.attended,
    required this.recordedNoShows,
    required this.unreviewed,
    required this.notExpected,
    required this.noShowAttendeeIds,
  });

  /// Reads the stored document; null when it is missing or not a report.
  static EventAttendanceReport? fromFirestore(Map<String, Object?>? data) {
    final view = data?['view'];
    if (view is! Map) return null;
    final counts = view['counts'];
    final members = view['members'];
    if (counts is! Map || members is! List) return null;
    int sum(Object? group) => group is Map
        ? group.values.whereType<int>().fold(0, (a, b) => a + b)
        : 0;
    return EventAttendanceReport(
      attended: counts['attended'] is int ? counts['attended'] as int : 0,
      recordedNoShows: sum(counts['recordedNoShow']),
      unreviewed: sum(counts['unresolved']),
      notExpected: sum(counts['notExpected']),
      noShowAttendeeIds: {
        for (final member in members)
          if (member is Map &&
              member['attendeeId'] is String &&
              member['classification'] is Map &&
              (member['classification'] as Map)['kind'] == 'recordedNoShow')
            member['attendeeId'] as String,
      },
    );
  }

  /// Guests checked in.
  final int attended;

  /// Booked guests recorded as not coming, by the host or by their reply.
  final int recordedNoShows;

  /// Booked guests nobody checked in and nobody recorded yet.
  final int unreviewed;

  /// Invited, waitlisted or cancelled guests, who were never expected.
  final int notExpected;

  /// The attendees recorded as not coming.
  final Set<String> noShowAttendeeIds;
}

/// What recording a no-show did.
enum EventNoShowOutcome {
  /// The no-show is recorded now.
  recorded,

  /// It was already recorded.
  alreadyRecorded,

  /// The night has not ended yet.
  notFinished,

  /// The guest is checked in.
  attended,

  /// The guest had no place, or the night was cancelled.
  notExpected,
}
