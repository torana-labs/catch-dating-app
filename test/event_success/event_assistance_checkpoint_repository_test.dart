import 'package:catch_dating_app/contexts/live/data/event_assistance_checkpoint_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_movement_views.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_view_identity.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_checkpoint_fixtures.dart';
import 'event_assistance_movement_view_fixtures.dart';

void main() {
  late _Functions functions;
  late FakeFirebaseFirestore firestore;
  late EventAssistanceCheckpointRepository repository;
  var now = 1000;
  setUp(() {
    now = 1000;
    functions = _Functions();
    firestore = FakeFirebaseFirestore();
    repository = EventAssistanceCheckpointRepository(
      functions,
      firestore,
      clock: AppClock.custom(() => DateTime.fromMillisecondsSinceEpoch(now)),
    );
  });
  Future<void> seed(
    Map<String, Object?> wire, {
    int evaluatedAt = 900,
    int ownerValidUntil = 9007199254740991,
  }) => firestore
      .collection(EventAssistanceMovementViews.checkpoints)
      .doc(checkpointViewId(checkpointScope))
      .set(
        checkpointViewDoc(
          wire,
          scope: checkpointScope,
          evaluatedAt: evaluatedAt,
          ownerValidUntil: ownerValidUntil,
        ),
      );
  Future<EventAssistanceCheckpointView> first() =>
      repository.watch(checkpointScope, actorUid: 'host-1').first;

  test('reads listen to the checkpoint view and call nothing', () async {
    await seed(checkpointWire());
    final view = await first();
    expect(view.report, isNull);
    expect(view.serverTime, 1000);
    expect(view.availability, isA<AssistanceCheckpointRoster>());
    expect(functions.calls, isEmpty);
  });

  test(
    'the request falls due and its reporter loses access by the clock',
    () async {
      await seed(
        checkpointWire(requestState: 'awaitingReport'),
        ownerValidUntil: 2000,
      );
      expect(
        (await first()).request!.state,
        AssistanceCheckpointRequestState.awaitingReport,
      );
      now = 1600;
      final due = await first();
      expect(due.request!.state, AssistanceCheckpointRequestState.overdue);
      expect(
        due.request!.ownerAvailability,
        AssistanceCheckpointOwnerAvailability.current,
      );
      now = 2100;
      expect(
        (await first()).request!.ownerAvailability,
        AssistanceCheckpointOwnerAvailability.needsReassignment,
      );
    },
  );

  test(
    'a device clock behind the server reads at the evaluation time',
    () async {
      await seed(checkpointWire(), evaluatedAt: 5000);
      now = 10;
      expect((await first()).serverTime, 5000);
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
        .collection(EventAssistanceMovementViews.checkpoints)
        .doc(checkpointViewId(checkpointScope));
    await seed(checkpointWire());
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
    await seed(checkpointWire());
    await ref.update({'organizerId': 'another-organizer'});
    await expectLater(first(), throwsA(isA<BackendOperationException>()));
  });

  test(
    'uncertain retries retain all reviewed fences and the exact original decision',
    () async {
      final change = checkpointChange();
      functions.error = FirebaseFunctionsException(
        code: 'unavailable',
        message: 'Offline',
      );
      await expectLater(
        repository.apply(change),
        throwsA(isA<NetworkException>()),
      );
      functions.error = null;
      functions.response = checkpointAppliedWire(change);
      final result = await repository.apply(change);
      expect(result.view.report?.accountedFor, ['a']);
      expect(functions.calls.map((c) => c.name).toSet(), {
        'recordEventAssistanceCheckpoint',
      });
      expect(functions.calls.first.input, {
        'command': change.command,
        'expectedSourceHash': change.snapshot.sourceHash,
      });
      expect(functions.calls.last.input, functions.calls.first.input);
    },
  );

  test('unconfirmed mutation responses are visible backend errors', () async {
    final change = checkpointChange();
    final wire = checkpointAppliedWire(change);
    ((wire['view']! as Map)['report']! as Map)['reportedBy'] = 'other-observer';
    functions.response = wire;
    await expectLater(
      repository.apply(change),
      throwsA(isA<BackendOperationException>()),
    );
  });

  for (final code in ['not-found', 'permission-denied', 'unavailable']) {
    test('$code never becomes a recorded checkpoint report', () async {
      functions.error = FirebaseFunctionsException(
        code: code,
        message: 'Unavailable',
      );
      await expectLater(
        repository.apply(checkpointChange()),
        throwsA(isA<AppException>()),
      );
      expect(functions.calls.length, 1);
    });
  }
}

class _Functions extends Fake implements FirebaseFunctions {
  Object? response, error;
  final calls = <({String name, Object? input})>[];
  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) =>
      _Callable(this, name);
}

class _Callable extends Fake implements HttpsCallable {
  _Callable(this.owner, this.name);
  final _Functions owner;
  final String name;
  @override
  Future<HttpsCallableResult<T>> call<T>([Object? parameters]) async {
    owner.calls.add((name: name, input: parameters));
    if (owner.error case final error?) throw error;
    return _Result<T>(owner.response as T);
  }
}

class _Result<T> extends Fake implements HttpsCallableResult<T> {
  _Result(this.data);
  @override
  final T data;
}
