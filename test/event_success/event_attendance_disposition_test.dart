import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/live/domain/event_attendance_disposition.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_attendance_disposition_fixtures.dart';

void main() {
  test(
    'unchecked attendance remains unreviewed until an explicit decision',
    () {
      final view = attendanceView();
      expect(view.disposition, isA<AttendanceUnreviewed>());
      expect(view.disposition.revision, 0);
      expect(view.attendance.status, EventAttendeeStatus.registered);
      expect(view.attendance.checkedIn, isFalse);
      expect(view.declineEvidence, isNull);
      expect(view.closure, isA<AttendanceRuntimeComplete>());
      final change = attendanceChange(view: view);
      expect(change.command, {
        'kind': 'recordNoShow',
        'context': attendanceScope().context,
        'eventId': 'event-1',
        'operationId': 'attendance:one',
        'payload': {
          'attendeeId': 'attendee-1',
          'expectedAttendanceRevision': 7,
          'expectedDispositionRevision': 0,
          'decision': {
            'kind': 'record',
            'evidence': {'kind': 'hostConfirmed'},
          },
        },
      });
      expect(view.disposition, isA<AttendanceUnreviewed>());
      expect(
        attendanceResult(change).view.disposition,
        isA<AttendanceNoShowRecorded>(),
      );
    },
  );

  test('all closure and availability states are explicit', () {
    for (final entry in [
      ({'kind': 'open'}, 'registered', false, 'eventNotFinished'),
      ({'kind': 'cancelled'}, 'registered', false, 'eventCancelled'),
      (
        {'kind': 'runtimeComplete', 'completedAt': 1000},
        'invited',
        false,
        'notAdmitted',
      ),
      (
        {'kind': 'runtimeComplete', 'completedAt': 1000},
        'waitlisted',
        false,
        'notAdmitted',
      ),
      (
        {'kind': 'runtimeComplete', 'completedAt': 1000},
        'cancelled',
        false,
        'notAdmitted',
      ),
      (
        {'kind': 'runtimeComplete', 'completedAt': 1000},
        'checkedIn',
        true,
        'alreadyAttended',
      ),
      (
        {'kind': 'runtimeComplete', 'completedAt': 1000},
        'registered',
        true,
        'alreadyAttended',
      ),
    ]) {
      final view = attendanceView(
        viewPatch: {
          'closure': entry.$1,
          'attendance': {
            'status': entry.$2,
            'checkedIn': entry.$3,
            'revision': 7,
          },
          'recordability': {'kind': 'unavailable', 'reason': entry.$4},
        },
      );
      expect(view.canRecord, isFalse);
      expect(view.recordability, isA<AttendanceCannotRecord>());
      expect(() => attendanceChange(view: view), throwsStateError);
    }
    expect(
      attendanceView(
        viewPatch: {
          'closure': {'kind': 'scheduledEnd', 'endedAt': 1999},
        },
      ).closure,
      isA<AttendanceScheduledEnd>(),
    );
  });

  test('guest evidence must match the reviewed episode and revision', () {
    final view = attendanceView(
      viewPatch: {
        'declineEvidence': {
          'kind': 'guestDeclined',
          'guestRevision': 0,
          'episodeId': 'episode:one',
        },
      },
    );
    final change = attendanceChange(
      view: view,
      decision: AttendanceDecision.record(view.declineEvidence!),
    );
    expect((change.command['payload'] as Map)['decision'], {
      'kind': 'record',
      'evidence': {
        'kind': 'guestDeclined',
        'guestRevision': 0,
        'episodeId': 'episode:one',
      },
    });
    expect(() => attendanceChange(decision: change.decision), throwsStateError);
    for (final patch in [
      {'kind': 'guestDeclined', 'guestRevision': 1, 'episodeId': 'episode:one'},
      {'kind': 'guestDeclined', 'guestRevision': 0, 'episodeId': 'episode:two'},
    ]) {
      final other = attendanceView(viewPatch: {'declineEvidence': patch});
      expect(
        () => attendanceChange(
          view: view,
          decision: AttendanceDecision.record(other.declineEvidence!),
        ),
        throwsStateError,
      );
    }
  });

  test(
    'clear reasons require actual supporting facts and preserve attendance',
    () {
      final recorded = attendanceResult(attendanceChange()).view;
      expect(recorded.canClear, isTrue);
      for (final reason in AttendanceClearReason.values) {
        final decision = AttendanceDecision.clear(reason);
        if (reason == AttendanceClearReason.recordingMistake) {
          final change = attendanceChange(view: recorded, decision: decision);
          final result = attendanceResult(change);
          expect(result.view.disposition, isA<AttendanceDecisionCleared>());
          expect(result.view.attendance.checkedIn, isFalse);
        } else {
          expect(
            () => attendanceChange(view: recorded, decision: decision),
            throwsStateError,
          );
        }
      }
      final correction = attendanceView(
        viewPatch: {
          'disposition': {
            'kind': 'superseded',
            'revision': 1,
            'reason': 'attendanceChanged',
          },
          'attendance': {
            'status': 'checkedIn',
            'checkedIn': true,
            'revision': 8,
          },
          'recordability': {'kind': 'unavailable', 'reason': 'alreadyAttended'},
          'canClear': true,
        },
      );
      expect(
        attendanceResult(
          attendanceChange(
            view: correction,
            decision: const AttendanceDecision.clear(
              AttendanceClearReason.attendanceCorrected,
            ),
          ),
        ).view.attendance.checkedIn,
        isTrue,
      );
      final cancelled = attendanceView(
        viewPatch: {
          'disposition': {
            'kind': 'superseded',
            'revision': 1,
            'reason': 'eventChanged',
          },
          'closure': {'kind': 'cancelled'},
          'recordability': {'kind': 'unavailable', 'reason': 'eventCancelled'},
          'canClear': true,
        },
      );
      expect(
        attendanceResult(
          attendanceChange(
            view: cancelled,
            decision: const AttendanceDecision.clear(
              AttendanceClearReason.noLongerApplicable,
            ),
          ),
        ).view.disposition,
        isA<AttendanceDecisionCleared>(),
      );
    },
  );

  test('source replacement and superseded decisions retain distinct types', () {
    final changed = attendanceView(
      viewPatch: {
        'disposition': {'kind': 'sourceChanged', 'revision': 5},
      },
    );
    expect(changed.disposition, isA<AttendanceDispositionSourceChanged>());
    expect(changed.canClear, isFalse);
    for (final reason in AttendanceSupersededReason.values) {
      final superseded = attendanceView(
        viewPatch: {
          'disposition': {
            'kind': 'superseded',
            'revision': 5,
            'reason': reason.name,
          },
          'canClear': true,
        },
      );
      expect(superseded.disposition, isA<AttendanceDecisionSuperseded>());
    }
  });

  test('unknown, malformed and contradictory server values are rejected', () {
    final badPatches = <Map<String, Object?>>[
      {'attendeeId': 'other'},
      {
        'context': {...attendanceScope().context, 'eventId': 'other'},
      },
      {
        'context': {...attendanceScope().context, 'organizerId': 'other'},
      },
      {
        'context': {'mode': 'rehearsal', 'rehearsalId': 'r'},
      },
      {'sourceHash': 'bad'},
      {'serverTime': 1.5},
      {'serverTime': double.infinity},
      {'serverTime': 9007199254740992},
      {'extra': true},
      {'displayName': ''},
      {'displayName': 'x' * 161},
      {
        'declineEvidence': {'kind': 'hostConfirmed'},
      },
      {
        'declineEvidence': {
          'kind': 'guestDeclined',
          'guestRevision': -1,
          'episodeId': 'e',
        },
      },
      {
        'closure': {'kind': 'runtimeComplete', 'completedAt': 2001},
      },
      {
        'closure': {'kind': 'scheduledEnd', 'endedAt': -1},
      },
      {
        'closure': {'kind': 'open', 'completedAt': 1},
      },
      {
        'closure': {'kind': 'unrecognized'},
      },
      {
        'recordability': {'kind': 'unavailable', 'reason': 'unknown'},
      },
      {
        'recordability': {'kind': 'unavailable', 'reason': 'alreadyAttended'},
      },
      {
        'attendance': {
          'status': 'checkedIn',
          'checkedIn': false,
          'revision': 7,
        },
      },
      {
        'attendance': {'status': 'unknown', 'checkedIn': false, 'revision': 7},
      },
      {
        'attendance': {
          'status': 'registered',
          'checkedIn': false,
          'revision': -1,
        },
      },
      {'canClear': true},
      {'canClear': 'yes'},
      {
        'disposition': {'kind': 'unreviewed', 'revision': 1},
      },
      {
        'disposition': {'kind': 'sourceChanged', 'revision': 0},
      },
      {
        'disposition': {
          'kind': 'sourceChanged',
          'revision': 1,
          'actorUid': 'old-owner',
        },
      },
      {
        'disposition': {
          'kind': 'superseded',
          'revision': 1,
          'reason': 'unknown',
        },
      },
      {
        'disposition': {'kind': 'guessNoShow', 'revision': 1},
      },
    ];
    for (final patch in badPatches) {
      expect(
        () => attendanceView(viewPatch: patch),
        throwsFormatException,
        reason: '$patch',
      );
    }
    final raw = attendanceResponse();
    (raw['view'] as Map).remove('declineEvidence');
    expect(
      () => EventAttendanceDispositionResult.fromCallableData(
        raw,
        expectedScope: attendanceScope(),
      ),
      throwsFormatException,
    );
  });

  test('recorded and cleared values reject unsupported current evidence', () {
    for (final disposition in [
      {
        'kind': 'recorded',
        'revision': 1,
        'actorUid': 'host-1',
        'recordedAt': 2001,
        'evidence': {'kind': 'hostConfirmed'},
      },
      {
        'kind': 'recorded',
        'revision': 1,
        'actorUid': 'host-1',
        'recordedAt': 2000,
        'evidence': {
          'kind': 'guestDeclined',
          'guestRevision': 1,
          'episodeId': 'e',
        },
      },
      {
        'kind': 'cleared',
        'revision': 1,
        'actorUid': 'host-1',
        'recordedAt': 2000,
        'reason': 'attendanceCorrected',
      },
    ]) {
      expect(
        () => attendanceView(
          viewPatch: {
            'disposition': disposition,
            'canClear': disposition['kind'] == 'recorded',
          },
        ),
        throwsFormatException,
      );
    }
  });

  test('replay receipts stay separate from later corrections', () {
    final change = attendanceChange();
    final result = attendanceResult(
      change,
      outcome: 'replayed',
      viewPatch: {
        'disposition': {
          'kind': 'cleared',
          'revision': 3,
          'reason': 'recordingMistake',
          'actorUid': 'host-2',
          'recordedAt': 2000,
        },
        'canClear': false,
      },
    );
    result.requireChange(change);
    expect(result.operationRevision, 1);
    expect(result.view.disposition.revision, 3);
    final superseded = attendanceResult(
      change,
      outcome: 'replayed',
      viewPatch: {
        'disposition': {
          'kind': 'superseded',
          'revision': 1,
          'reason': 'eventChanged',
        },
      },
    );
    superseded.requireChange(change);
    expect(superseded.view.disposition, isA<AttendanceDecisionSuperseded>());
  });

  test(
    'forged receipts and wrong applied decisions cannot acknowledge a command',
    () {
      final change = attendanceChange();
      for (final raw in [
        attendanceResultRaw(change, outcome: 'read'),
        attendanceResultRaw(change, operationRevision: 2),
        attendanceResultRaw(
          change,
          viewPatch: {
            'disposition': {
              'kind': 'superseded',
              'revision': 1,
              'reason': 'eventChanged',
            },
          },
        ),
        attendanceResultRaw(
          change,
          outcome: 'replayed',
          viewPatch: {
            'disposition': {'kind': 'sourceChanged', 'revision': 1},
            'canClear': false,
          },
        ),
      ]) {
        expect(
          () => EventAttendanceDispositionResult.fromCallableData(
            raw,
            expectedScope: attendanceScope(),
          ),
          throwsFormatException,
        );
      }
      for (final disposition in [
        {
          'kind': 'recorded',
          'revision': 1,
          'actorUid': 'host-2',
          'recordedAt': 2000,
          'evidence': {'kind': 'hostConfirmed'},
        },
        {
          'kind': 'cleared',
          'revision': 1,
          'actorUid': 'host-1',
          'recordedAt': 2000,
          'reason': 'recordingMistake',
        },
      ]) {
        final result = attendanceResult(
          change,
          viewPatch: {
            'disposition': disposition,
            'canClear': disposition['kind'] == 'recorded',
          },
        );
        expect(() => result.requireChange(change), throwsFormatException);
      }
    },
  );

  test(
    'serialized maps and mutable input cannot change a prepared decision',
    () {
      final raw = attendanceResponse();
      final view = EventAttendanceDispositionResult.fromCallableData(
        raw,
        expectedScope: attendanceScope(),
      ).view;
      final change = attendanceChange(view: view);
      (raw['view'] as Map)['sourceHash'] = 'c' * 64;
      final command = change.command;
      (command['context'] as Map)['eventId'] = 'other';
      ((command['payload'] as Map)['decision'] as Map)['kind'] = 'clear';
      expect(change.snapshot.sourceHash, 'a' * 64);
      expect(change.command['context'], attendanceScope().context);
      expect((change.command['payload'] as Map)['decision'], {
        'kind': 'record',
        'evidence': {'kind': 'hostConfirmed'},
      });
    },
  );
}
