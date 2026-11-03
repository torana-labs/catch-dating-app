import 'package:catch_dating_app/contexts/live/data/event_assistance_departure_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_movement_views.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_view_identity.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_departure.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_departure_fixtures.dart';
import 'event_assistance_movement_view_fixtures.dart';
import 'event_assistance_participation_fixtures.dart';

const _end = departureNow + 3600000;

void main() {
  late ParticipationTestFunctions functions;
  late FakeFirebaseFirestore firestore;
  late EventAssistanceDepartureRepository repository;
  var now = departureNow;
  setUp(() {
    now = departureNow;
    functions = ParticipationTestFunctions()..response = departureResponse();
    firestore = FakeFirebaseFirestore();
    repository = EventAssistanceDepartureRepository(
      functions,
      firestore,
      clock: AppClock.custom(() => DateTime.fromMillisecondsSinceEpoch(now)),
    );
  });
  Future<void> seed(
    Map<String, Object?> response, {
    EventAssistanceGroupScope? scope,
    int evaluatedAt = departureNow - 100,
  }) {
    final selected = scope ?? departureScope();
    return firestore
        .collection(EventAssistanceMovementViews.groupProgress)
        .doc(groupProgressViewId(selected))
        .set(
          groupProgressViewDoc(
            response,
            scope: selected,
            evaluatedAt: evaluatedAt,
            endAt: _end,
          ),
        );
  }

  Future<EventAssistanceGroupProgressView> first({String? actorUid}) =>
      repository
          .watch(departureScope(), actorUid: actorUid ?? departureActor)
          .first;

  test(
    'the group view is a manager listener; roster review stays a command',
    () async {
      await seed(departureResponse());
      final view = await first();
      expect(view.actorUid, departureActor);
      expect(view.serverTime, departureNow);
      expect(view.authority, isA<AssistanceCanConfirmDeparture>());
      expect(
        (view.authority as AssistanceCanConfirmDeparture).checkpointReporter,
        AssistanceCheckpointReporter.anyAuthorizedOperator,
      );
      expect(view.authority.validUntil, assistanceNoExpiry);
      expect(view.canConfirm, isTrue);
      expect(functions.calls, isEmpty);
      functions.response = departureRosterResponse(attendeeIds: ['a', 'b']);
      final roster = await repository.reviewRoster(
        view,
        EventAssistanceDepartureRosterSelection(['b', 'a']),
      );
      expect(roster.attendeeIds, ['a', 'b']);
      expect(functions.calls.map((call) => call.name), [
        'getEventAssistanceDepartureRoster',
      ]);
      expect(functions.calls.last.input, {
        'context': departureScope().context,
        'groupId': departureScope().groupId,
        'attendeeIds': ['a', 'b'],
      });
    },
  );

  test('openness and guidance end with the event by the app clock', () async {
    await seed(departureResponse(revision: 1, freshness: 'current'));
    final open = await first();
    expect(open.eventOpen, isTrue);
    expect(open.guidance, isNotNull);
    now = _end;
    final ended = await first();
    expect(ended.eventOpen, isFalse);
    expect(ended.guidance, isNull);
    expect(ended.canConfirm, isFalse);
  });

  test(
    'a device clock behind the server reads at the evaluation time',
    () async {
      await seed(departureResponse(), evaluatedAt: departureNow + 500);
      now = departureNow - 60000;
      expect((await first()).serverTime, departureNow + 500);
    },
  );

  test('missing, invalid and foreign views are visible errors', () async {
    await expectLater(
      first(),
      throwsA(
        isA<BackendOperationException>().having(
          (e) => e.code,
          'code',
          'live-view-missing',
        ),
      ),
    );
    final ref = firestore
        .collection(EventAssistanceMovementViews.groupProgress)
        .doc(groupProgressViewId(departureScope()));
    await seed(departureResponse());
    await ref.update({'sourceCoverage': 'invalidSource'});
    await expectLater(
      first(),
      throwsA(
        isA<BackendOperationException>().having(
          (e) => e.code,
          'code',
          'live-view-invalid-source',
        ),
      ),
    );
    await seed(departureResponse());
    await ref.update({'groupId': 'another-group'});
    await expectLater(first(), throwsA(isA<BackendOperationException>()));
  });

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

  test('wrong account or receipt cannot report success', () async {
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
  });

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
          repository.confirm(
            EventAssistanceDepartureChange.prepare(
              snapshot: departureView(),
              operationId: 'departure:$code',
              destination: departureStop,
            ),
          ),
          throwsA(matcher),
        );
      }
      expect(functions.calls, hasLength(3));
    },
  );
}
