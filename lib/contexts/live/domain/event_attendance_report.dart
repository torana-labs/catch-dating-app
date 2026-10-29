import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_attendance_disposition.dart';

part 'event_attendance_report_wire.dart';

enum AttendanceReportCoverage { emptyRoster, completeRoster }

/// A report label, not the episode/revision evidence needed to submit a decision.
enum AttendanceReportEvidence { hostConfirmed, guestDeclined }

enum AttendanceReportUnresolvedReason {
  unreviewed,
  cleared,
  sourceChanged,
  superseded,
}

enum AttendanceReportNotExpectedReason {
  invited,
  waitlisted,
  cancelled,
  eventCancelled,
}

sealed class AttendanceReportClassification {
  const AttendanceReportClassification();
}

final class AttendanceReportAttended extends AttendanceReportClassification {
  const AttendanceReportAttended._();
}

final class AttendanceReportRecordedNoShow
    extends AttendanceReportClassification {
  const AttendanceReportRecordedNoShow._(this.evidence);
  final AttendanceReportEvidence evidence;
}

final class AttendanceReportUnresolved extends AttendanceReportClassification {
  const AttendanceReportUnresolved._(this.reason);
  final AttendanceReportUnresolvedReason reason;
}

final class AttendanceReportNotExpected extends AttendanceReportClassification {
  const AttendanceReportNotExpected._(this.reason);
  final AttendanceReportNotExpectedReason reason;
}

typedef AttendanceReportRecordedCounts = ({
  int hostConfirmed,
  int guestDeclined,
});
typedef AttendanceReportUnresolvedCounts = ({
  int unreviewed,
  int cleared,
  int sourceChanged,
  int superseded,
});
typedef AttendanceReportNotExpectedCounts = ({
  int invited,
  int waitlisted,
  int cancelled,
  int eventCancelled,
});

final class AttendanceReportCounts {
  const AttendanceReportCounts._({
    required this.attended,
    required this.recordedNoShow,
    required this.unresolved,
    required this.notExpected,
  });
  final int attended;
  final AttendanceReportRecordedCounts recordedNoShow;
  final AttendanceReportUnresolvedCounts unresolved;
  final AttendanceReportNotExpectedCounts notExpected;

  int get recordedNoShowTotal =>
      recordedNoShow.hostConfirmed + recordedNoShow.guestDeclined;
  int get unresolvedTotal =>
      unresolved.unreviewed +
      unresolved.cleared +
      unresolved.sourceChanged +
      unresolved.superseded;
  int get notExpectedTotal =>
      notExpected.invited +
      notExpected.waitlisted +
      notExpected.cancelled +
      notExpected.eventCancelled;
  int get total =>
      attended + recordedNoShowTotal + unresolvedTotal + notExpectedTotal;
}

/// Opens the existing per-guest review; this compact row cannot form a mutation.
final class EventAttendanceReportMember {
  const EventAttendanceReportMember._(this.scope, this.classification);
  final EventAssistanceGuestScope scope;
  final AttendanceReportClassification classification;
}

/// Complete canonical roster evidence at one server snapshot. Completeness is
/// about read coverage; unresolved guests and empty rosters remain explicit.
final class EventAttendanceReportView {
  const EventAttendanceReportView._({
    required this.scope,
    required this.serverTime,
    required this.sourceHash,
    required this.closure,
    required this.coverage,
    required this.rosterCount,
    required this.counts,
    required this.members,
  });

  factory EventAttendanceReportView.fromCallableData(
    Object? data, {
    required EventAssistanceRuntimeScope expectedScope,
  }) => _attendanceReport(data, expectedScope);

  final EventAssistanceRuntimeScope scope;
  final int serverTime;
  final String sourceHash;
  final AttendanceClosure closure;
  final AttendanceReportCoverage coverage;
  final int rosterCount;
  final AttendanceReportCounts counts;
  final List<EventAttendanceReportMember> members;
}
