import 'package:catch_dating_app/contexts/live/data/event_attendance_disposition_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_attendance_disposition.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_participation_fixtures.dart';
import 'event_attendance_disposition_fixtures.dart';

void main() {
  late ParticipationTestFunctions functions;
  late EventAttendanceDispositionRepository repository;
  setUp(() {
    functions = ParticipationTestFunctions();
    repository = EventAttendanceDispositionRepository(functions);
  });

  test('reads use the exact generated live guest scope', () async {
    functions.response = attendanceResponse();
    final view = await repository.fetch(attendanceScope());
    expect(view.disposition, isA<AttendanceUnreviewed>());
    expect(functions.calls.single.name, 'getEventAttendanceDisposition');
    expect(functions.calls.single.input, {
      'context': attendanceScope().context,
      'attendeeId': 'attendee-1',
    });
  });

  test(
    'record and clear carry the exact reviewed command through retries',
    () async {
      final recorded = attendanceResult(attendanceChange()).view;
      for (final change in [
        attendanceChange(),
        attendanceChange(
          view: recorded,
          decision: const AttendanceDecision.clear(
            AttendanceClearReason.recordingMistake,
          ),
        ),
      ]) {
        functions.response = attendanceResultRaw(change);
        final result = await repository.apply(change);
        expect(
          result.operationRevision,
          change.snapshot.disposition.revision + 1,
        );
        expect(functions.calls.last.name, 'recordEventNoShow');
        expect(functions.calls.last.input, {
          'command': change.command,
          'expectedSourceHash': change.snapshot.sourceHash,
        });
        functions.response = attendanceResultRaw(change, outcome: 'replayed');
        expect(
          (await repository.apply(change)).outcome,
          AttendanceDispositionOutcome.replayed,
        );
        expect(
          functions.calls[functions.calls.length - 2].input,
          functions.calls.last.input,
        );
      }
      expect(functions.calls, hasLength(4));
    },
  );

  test('later replay corrections stay authoritative', () async {
    final change = attendanceChange();
    functions.response = attendanceResultRaw(
      change,
      outcome: 'replayed',
      viewPatch: {
        'disposition': {
          'kind': 'cleared',
          'revision': 2,
          'reason': 'recordingMistake',
          'actorUid': 'host-2',
          'recordedAt': 2000,
        },
        'canClear': false,
      },
    );
    final result = await repository.apply(change);
    expect(result.operationRevision, 1);
    expect(result.view.disposition, isA<AttendanceDecisionCleared>());
    expect(result.view.disposition.revision, 2);
  });

  test(
    'backend and deployment failures never become unreviewed attendance',
    () async {
      for (final entry in [
        (
          FirebaseFunctionsException(code: 'not-found', message: 'NOT_FOUND'),
          isA<BackendOperationException>().having(
            (e) => e.code,
            'code',
            'callable-unavailable',
          ),
        ),
        (
          FirebaseFunctionsException(
            code: 'permission-denied',
            message: 'Denied',
          ),
          isA<PermissionException>(),
        ),
        (
          FirebaseFunctionsException(code: 'unavailable', message: 'Offline'),
          isA<NetworkException>(),
        ),
      ]) {
        functions.error = entry.$1;
        await expectLater(
          repository.fetch(attendanceScope()),
          throwsA(entry.$2),
        );
        await expectLater(
          repository.apply(attendanceChange()),
          throwsA(entry.$2),
        );
      }
      expect(functions.calls, hasLength(6));
    },
  );

  test(
    'malformed reads and wrong operation results remain visible failures',
    () async {
      final change = attendanceChange();
      for (final raw in [
        null,
        {},
        attendanceResultRaw(change),
        attendanceResponse(viewPatch: {'attendeeId': 'foreign'}),
      ]) {
        functions.response = raw;
        await expectLater(
          repository.fetch(attendanceScope()),
          throwsA(isA<BackendOperationException>()),
        );
      }
      for (final raw in [
        null,
        {},
        attendanceResponse(),
        attendanceResultRaw(change, operationRevision: 2),
        attendanceResultRaw(
          change,
          viewPatch: {
            'disposition': {
              'kind': 'recorded',
              'revision': 1,
              'actorUid': 'another-host',
              'recordedAt': 2000,
              'evidence': {'kind': 'hostConfirmed'},
            },
          },
        ),
      ]) {
        functions.response = raw;
        await expectLater(
          repository.apply(change),
          throwsA(isA<BackendOperationException>()),
        );
      }
      expect(functions.calls, hasLength(9));
    },
  );
}
