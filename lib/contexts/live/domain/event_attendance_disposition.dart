import 'package:catch_dating_app/contexts/bookings/bookings.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';

part 'event_attendance_disposition_wire.dart';

enum AttendanceClearReason {
  recordingMistake,
  attendanceCorrected,
  noLongerApplicable,
}

enum AttendanceSupersededReason {
  attendanceChanged,
  eventChanged,
  guestIntentionChanged,
}

enum AttendanceRecordUnavailableReason {
  eventNotFinished,
  eventCancelled,
  notAdmitted,
  alreadyAttended,
}

enum AttendanceDispositionOutcome { read, applied, replayed }

sealed class AttendanceNoShowEvidence {
  const AttendanceNoShowEvidence();
  const factory AttendanceNoShowEvidence.hostConfirmed() =
      AttendanceHostConfirmed;

  Map<String, Object?> toJson() => switch (this) {
    AttendanceHostConfirmed() => {'kind': 'hostConfirmed'},
    AttendanceGuestDeclined(:final guestRevision, :final episodeId) => {
      'kind': 'guestDeclined',
      'guestRevision': guestRevision,
      'episodeId': episodeId,
    },
  };
}

final class AttendanceHostConfirmed extends AttendanceNoShowEvidence {
  const AttendanceHostConfirmed();
}

/// Only a parsed server view can supply a guest's decline evidence.
final class AttendanceGuestDeclined extends AttendanceNoShowEvidence {
  const AttendanceGuestDeclined._(this.guestRevision, this.episodeId);
  final int guestRevision;
  final String episodeId;
}

sealed class AttendanceDecision {
  const AttendanceDecision();
  const factory AttendanceDecision.record(AttendanceNoShowEvidence evidence) =
      AttendanceRecordNoShow;
  const factory AttendanceDecision.clear(AttendanceClearReason reason) =
      AttendanceClearNoShow;

  Map<String, Object?> toJson() => switch (this) {
    AttendanceRecordNoShow(:final evidence) => {
      'kind': 'record',
      'evidence': evidence.toJson(),
    },
    AttendanceClearNoShow(:final reason) => {
      'kind': 'clear',
      'reason': reason.name,
    },
  };
}

final class AttendanceRecordNoShow extends AttendanceDecision {
  const AttendanceRecordNoShow(this.evidence);
  final AttendanceNoShowEvidence evidence;
}

final class AttendanceClearNoShow extends AttendanceDecision {
  const AttendanceClearNoShow(this.reason);
  final AttendanceClearReason reason;
}

sealed class AttendanceClosure {
  const AttendanceClosure();

  factory AttendanceClosure.fromJson(Object? data, {required int serverTime}) =>
      _attendanceClosure(data, _attendanceInteger(serverTime));
}

final class AttendanceStillOpen extends AttendanceClosure {
  const AttendanceStillOpen._();
}

final class AttendanceEventCancelled extends AttendanceClosure {
  const AttendanceEventCancelled._();
}

final class AttendanceRuntimeComplete extends AttendanceClosure {
  const AttendanceRuntimeComplete._(this.completedAt);
  final int completedAt;
}

final class AttendanceScheduledEnd extends AttendanceClosure {
  const AttendanceScheduledEnd._(this.endedAt);
  final int endedAt;
}

sealed class AttendanceRecordability {
  const AttendanceRecordability();
}

final class AttendanceCanRecord extends AttendanceRecordability {
  const AttendanceCanRecord._();
}

final class AttendanceCannotRecord extends AttendanceRecordability {
  const AttendanceCannotRecord._(this.reason);
  final AttendanceRecordUnavailableReason reason;
}

sealed class AttendanceDisposition {
  const AttendanceDisposition(this.revision);
  final int revision;
}

final class AttendanceUnreviewed extends AttendanceDisposition {
  const AttendanceUnreviewed._() : super(0);
}

final class AttendanceNoShowRecorded extends AttendanceDisposition {
  const AttendanceNoShowRecorded._(
    super.revision,
    this.evidence,
    this.actorUid,
    this.recordedAt,
  );
  final AttendanceNoShowEvidence evidence;
  final String actorUid;
  final int recordedAt;
}

final class AttendanceDecisionCleared extends AttendanceDisposition {
  const AttendanceDecisionCleared._(
    super.revision,
    this.reason,
    this.actorUid,
    this.recordedAt,
  );
  final AttendanceClearReason reason;
  final String actorUid;
  final int recordedAt;
}

final class AttendanceDispositionSourceChanged extends AttendanceDisposition {
  const AttendanceDispositionSourceChanged._(super.revision);
}

final class AttendanceDecisionSuperseded extends AttendanceDisposition {
  const AttendanceDecisionSuperseded._(super.revision, this.reason);
  final AttendanceSupersededReason reason;
}

typedef AttendancePhysicalState = ({
  EventAttendeeStatus status,
  bool checkedIn,
  int revision,
});

/// A server review, not an inferred attendance state or editable map.
final class EventAttendanceDispositionView {
  const EventAttendanceDispositionView._({
    required this.scope,
    required this.displayName,
    required this.serverTime,
    required this.sourceHash,
    required this.attendance,
    required this.closure,
    required this.declineEvidence,
    required this.disposition,
    required this.recordability,
    required this.canClear,
  });
  final EventAssistanceGuestScope scope;
  final String displayName;
  final int serverTime;
  final String sourceHash;
  final AttendancePhysicalState attendance;
  final AttendanceClosure closure;
  final AttendanceGuestDeclined? declineEvidence;
  final AttendanceDisposition disposition;
  final AttendanceRecordability recordability;
  final bool canClear;

  bool get canRecord => recordability is AttendanceCanRecord;

  bool permits(AttendanceDecision decision) => switch (decision) {
    AttendanceRecordNoShow(evidence: AttendanceHostConfirmed()) => canRecord,
    AttendanceRecordNoShow(evidence: final AttendanceGuestDeclined evidence) =>
      canRecord && _sameEvidence(evidence, declineEvidence),
    AttendanceClearNoShow(:final reason) =>
      canClear && _canExplainClear(this, reason),
  };

  EventAttendanceDispositionChange prepareChange({
    required String operationId,
    required String actorUid,
    required AttendanceDecision decision,
  }) {
    _attendanceId(operationId);
    _attendanceId(actorUid);
    if (!permits(decision) || disposition.revision >= 9007199254740991) {
      throw StateError('Review the current guest before changing closeout.');
    }
    return EventAttendanceDispositionChange._(
      snapshot: this,
      operationId: operationId,
      actorUid: actorUid,
      decision: decision,
    );
  }
}

/// The exact reviewed payload survives uncertainty, reloads and corrections.
final class EventAttendanceDispositionChange {
  const EventAttendanceDispositionChange._({
    required this.snapshot,
    required this.operationId,
    required this.actorUid,
    required this.decision,
  });
  final EventAttendanceDispositionView snapshot;
  final String operationId;
  final String actorUid;
  final AttendanceDecision decision;

  Map<String, Object?> get command => {
    'kind': 'recordNoShow',
    'context': snapshot.scope.context,
    'eventId': snapshot.scope.eventId,
    'operationId': operationId,
    'payload': {
      'attendeeId': snapshot.scope.attendeeId,
      'expectedAttendanceRevision': snapshot.attendance.revision,
      'expectedDispositionRevision': snapshot.disposition.revision,
      'decision': decision.toJson(),
    },
  };
}

final class EventAttendanceDispositionResult {
  const EventAttendanceDispositionResult._({
    required this.outcome,
    required this.operationRevision,
    required this.view,
  });
  factory EventAttendanceDispositionResult.fromCallableData(
    Object? data, {
    required EventAssistanceGuestScope expectedScope,
  }) => _attendanceResult(data, expectedScope);

  final AttendanceDispositionOutcome outcome;
  final int? operationRevision;
  final EventAttendanceDispositionView view;

  void requireChange(EventAttendanceDispositionChange change) {
    if (outcome == AttendanceDispositionOutcome.read ||
        view.scope != change.snapshot.scope ||
        operationRevision != change.snapshot.disposition.revision + 1) {
      throw const FormatException('Closeout operation receipt mismatch.');
    }
    // A replay may carry a later correction or superseded decision. It must
    // never be replaced with the caller's original requested state.
    if (view.disposition.revision == operationRevision) {
      final matches = switch ((view.disposition, change.decision)) {
        (
          AttendanceNoShowRecorded(:final evidence, :final actorUid),
          AttendanceRecordNoShow(evidence: final requested),
        ) =>
          _sameEvidence(evidence, requested) && actorUid == change.actorUid,
        (
          AttendanceDecisionCleared(:final reason, :final actorUid),
          AttendanceClearNoShow(reason: final requested),
        ) =>
          reason == requested && actorUid == change.actorUid,
        (AttendanceDecisionSuperseded(), _) =>
          outcome == AttendanceDispositionOutcome.replayed,
        _ => false,
      };
      if (!matches) {
        throw const FormatException('Closeout decision result mismatch.');
      }
    }
  }
}
