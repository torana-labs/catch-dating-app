import 'dart:async';

import 'package:catch_dating_app/contexts/live/data/event_attendance_disposition_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_attendance_disposition.dart';
import 'package:flutter_test/flutter_test.dart';

EventAssistanceGuestScope attendanceScope() => EventAssistanceGuestScope(
  organizerId: 'organizer-1',
  eventId: 'event-1',
  attendeeId: 'attendee-1',
);

Map<String, Object?> attendanceResponse({
  Map<String, Object?> viewPatch = const {},
  String outcome = 'read',
  int? operationRevision,
}) => {
  'outcome': outcome,
  'operationRevision': operationRevision,
  'view': {
    'context': attendanceScope().context,
    'attendeeId': 'attendee-1',
    'displayName': 'Avery',
    'serverTime': 2000,
    'sourceHash': 'a' * 64,
    'attendance': {'status': 'registered', 'checkedIn': false, 'revision': 7},
    'closure': {'kind': 'runtimeComplete', 'completedAt': 1000},
    'declineEvidence': null,
    'disposition': {'kind': 'unreviewed', 'revision': 0},
    'recordability': {'kind': 'allowed'},
    'canClear': false,
    ...viewPatch,
  },
};

EventAttendanceDispositionView attendanceView({
  Map<String, Object?> viewPatch = const {},
}) => EventAttendanceDispositionResult.fromCallableData(
  attendanceResponse(viewPatch: viewPatch),
  expectedScope: attendanceScope(),
).view;

EventAttendanceDispositionChange attendanceChange({
  EventAttendanceDispositionView? view,
  AttendanceDecision? decision,
}) => (view ?? attendanceView()).prepareChange(
  actorUid: 'host-1',
  operationId: 'attendance:one',
  decision:
      decision ??
      const AttendanceDecision.record(AttendanceNoShowEvidence.hostConfirmed()),
);

Map<String, Object?> attendanceResultRaw(
  EventAttendanceDispositionChange change, {
  String outcome = 'applied',
  Map<String, Object?> viewPatch = const {},
  int? operationRevision,
}) {
  final snapshot = change.snapshot;
  final revision = snapshot.disposition.revision + 1;
  final disposition = <String, Object?>{
    'revision': revision,
    'recordedAt': snapshot.serverTime,
    'actorUid': change.actorUid,
    ...switch (change.decision) {
      AttendanceRecordNoShow(:final evidence) => {
        'kind': 'recorded',
        'evidence': evidence.toJson(),
      },
      AttendanceClearNoShow(:final reason) => {
        'kind': 'cleared',
        'reason': reason.name,
      },
    },
  };
  return attendanceResponse(
    outcome: outcome,
    operationRevision: operationRevision ?? revision,
    viewPatch: {
      'context': snapshot.scope.context,
      'attendeeId': snapshot.scope.attendeeId,
      'displayName': snapshot.displayName,
      'serverTime': snapshot.serverTime,
      'sourceHash': 'b' * 64,
      'attendance': {
        'status': snapshot.attendance.status.name,
        'checkedIn': snapshot.attendance.checkedIn,
        'revision': snapshot.attendance.revision,
      },
      'closure': switch (snapshot.closure) {
        AttendanceStillOpen() => {'kind': 'open'},
        AttendanceEventCancelled() => {'kind': 'cancelled'},
        AttendanceRuntimeComplete(:final completedAt) => {
          'kind': 'runtimeComplete',
          'completedAt': completedAt,
        },
        AttendanceScheduledEnd(:final endedAt) => {
          'kind': 'scheduledEnd',
          'endedAt': endedAt,
        },
      },
      'declineEvidence': snapshot.declineEvidence?.toJson(),
      'disposition': disposition,
      'recordability': switch (snapshot.recordability) {
        AttendanceCanRecord() => {'kind': 'allowed'},
        AttendanceCannotRecord(:final reason) => {
          'kind': 'unavailable',
          'reason': reason.name,
        },
      },
      'canClear': change.decision is AttendanceRecordNoShow,
      ...viewPatch,
    },
  );
}

EventAttendanceDispositionResult attendanceResult(
  EventAttendanceDispositionChange change, {
  String outcome = 'applied',
  Map<String, Object?> viewPatch = const {},
}) => EventAttendanceDispositionResult.fromCallableData(
  attendanceResultRaw(change, outcome: outcome, viewPatch: viewPatch),
  expectedScope: change.snapshot.scope,
);

class AttendanceTestRepository extends Fake
    implements EventAttendanceDispositionRepository {
  Completer<void> _changed = Completer<void>();
  final reads =
      <
        ({
          EventAssistanceGuestScope scope,
          Completer<EventAttendanceDispositionView> result,
        })
      >[];
  final writes =
      <
        ({
          EventAttendanceDispositionChange change,
          Completer<EventAttendanceDispositionResult> result,
        })
      >[];

  @override
  Future<EventAttendanceDispositionView> fetch(
    EventAssistanceGuestScope scope,
  ) {
    final result = Completer<EventAttendanceDispositionView>();
    reads.add((scope: scope, result: result));
    _notify();
    return result.future;
  }

  @override
  Future<EventAttendanceDispositionResult> apply(
    EventAttendanceDispositionChange change,
  ) {
    final result = Completer<EventAttendanceDispositionResult>();
    writes.add((change: change, result: result));
    _notify();
    return result.future;
  }

  Future<void> waitForReads(int count) async {
    while (reads.length < count) {
      await _changed.future.timeout(const Duration(seconds: 10));
    }
  }

  void _notify() {
    final previous = _changed;
    _changed = Completer<void>();
    previous.complete();
  }
}
