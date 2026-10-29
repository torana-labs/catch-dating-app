import 'package:catch_dating_app/contexts/live/data/event_assistance_departure_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_departure.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_departure_fixtures.dart';
import 'event_assistance_participation_fixtures.dart';

void main() {
  late ParticipationTestFunctions functions;
  late EventAssistanceDepartureRepository repository;
  setUp(() {
    functions = ParticipationTestFunctions()..response = departureResponse();
    repository = EventAssistanceDepartureRepository(functions);
  });

  test(
    'read and roster review use exact bounded live callable requests',
    () async {
      final scope = departureScope();
      final view = await repository.fetch(scope, actorUid: departureActor);
      expect(view.actorUid, departureActor);
      functions.response = departureRosterResponse(attendeeIds: ['a', 'b']);
      final roster = await repository.reviewRoster(
        view,
        EventAssistanceDepartureRosterSelection(['b', 'a']),
      );
      expect(roster.attendeeIds, ['a', 'b']);
      expect(functions.calls.map((call) => call.name), [
        'getEventAssistanceGroupProgress',
        'getEventAssistanceDepartureRoster',
      ]);
      expect(functions.calls.first.input, {
        'context': scope.context,
        'groupId': scope.groupId,
      });
      expect(functions.calls.last.input, {
        'context': scope.context,
        'groupId': scope.groupId,
        'attendeeIds': ['a', 'b'],
      });
    },
  );

  test(
    'ambiguous send retains exact command and replay preserves latest view',
    () async {
      final view = departureView();
      final change = EventAssistanceDepartureChange.prepare(
        snapshot: view,
        operationId: 'departure:retry-once',
        destination: departureStop,
      );
      functions.error = FirebaseFunctionsException(
        code: 'unavailable',
        message: 'Offline',
      );
      await expectLater(
        repository.confirm(change),
        throwsA(isA<NetworkException>()),
      );
      expect(
        functions.calls,
        hasLength(1),
        reason: 'repository cannot retry implicitly',
      );
      functions.error = null;
      functions.response = departureResponse(
        outcome: 'replayed',
        operationRevision: 1,
        revision: 3,
        freshness: 'current',
      );
      final result = await repository.confirm(change);
      expect(functions.calls[0].name, functions.calls[1].name);
      expect(functions.calls[0].input, functions.calls[1].input);
      expect(functions.calls[0].name, 'confirmEventAssistanceDeparture');
      expect(functions.calls[0].input, {
        'command': change.command,
        'expectedSourceHash': view.sourceHash,
      });
      expect(result.operationRevision, 1);
      expect(result.view.revision, 3);
    },
  );

  test(
    'roster and reporter choices are frozen into one confirmation',
    () async {
      final view = departureView();
      functions.response = departureRosterResponse(attendeeIds: []);
      final roster = await repository.reviewRoster(
        view,
        EventAssistanceDepartureRosterSelection([]),
      );
      final change = EventAssistanceDepartureChange.prepare(
        snapshot: view,
        operationId: 'departure:checkpoint',
        destination: departureStop,
        roster: roster,
        checkpoint: AssistanceDepartureCheckpointRequest(
          responsibleOperatorId: departureActor,
          dueAt: departureNow + 1000,
        ),
      );
      functions.response = departureResponse(
        outcome: 'applied',
        operationRevision: 1,
        revision: 1,
        freshness: 'current',
      );
      await repository.confirm(change);
      final input = functions.calls.last.input! as Map;
      final command = input['command']! as Map;
      final payload = command['payload']! as Map;
      expect(payload['departureRoster'], {
        'attendeeIds': <String>[],
        'expectedSourceHash': 'f' * 64,
      });
      expect(payload['checkpointRequest'], {
        'responsibleOperatorId': departureActor,
        'dueAt': departureNow + 1000,
      });
      expect(functions.calls.map((c) => c.name), [
        'getEventAssistanceDepartureRoster',
        'confirmEventAssistanceDeparture',
      ]);
    },
  );

  test(
    'wrong account, read outcome or receipt cannot report success',
    () async {
      functions.response = departureResponse(actorUid: 'other');
      await expectLater(
        repository.fetch(departureScope(), actorUid: departureActor),
        throwsA(isA<BackendOperationException>()),
      );
      functions.response = departureResponse(
        outcome: 'applied',
        operationRevision: 1,
        revision: 1,
        freshness: 'current',
      );
      await expectLater(
        repository.fetch(departureScope(), actorUid: departureActor),
        throwsA(isA<BackendOperationException>()),
      );
      final change = EventAssistanceDepartureChange.prepare(
        snapshot: departureView(),
        operationId: 'departure:one',
        destination: departureStop,
      );
      for (final raw in [
        departureResponse(),
        departureResponse(
          outcome: 'applied',
          operationRevision: 2,
          revision: 2,
          freshness: 'current',
        ),
        departureResponse(
          outcome: 'applied',
          operationRevision: 1,
          revision: 1,
          freshness: 'current',
          actorUid: 'other',
        ),
      ]) {
        functions.response = raw;
        await expectLater(
          repository.confirm(change),
          throwsA(isA<BackendOperationException>()),
        );
      }
    },
  );

  test(
    'missing deployment, denied permission and source conflicts stay visible',
    () async {
      for (final (code, message, matcher) in [
        (
          'not-found',
          'NOT_FOUND',
          isA<BackendOperationException>().having(
            (e) => e.code,
            'code',
            'callable-unavailable',
          ),
        ),
        ('permission-denied', 'Denied', isA<PermissionException>()),
        (
          'failed-precondition',
          'Source changed',
          isA<BackendOperationException>(),
        ),
      ]) {
        functions.error = FirebaseFunctionsException(
          code: code,
          message: message,
        );
        await expectLater(
          repository.fetch(departureScope(), actorUid: departureActor),
          throwsA(matcher),
        );
      }
      expect(functions.calls, hasLength(3));
    },
  );
}
