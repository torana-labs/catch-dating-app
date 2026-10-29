import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_movement_command.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_rehearsal_checkpoint_visit_fixtures.dart';
import 'event_rehearsal_movement_fixtures.dart';

void main() {
  test(
    'checkpoint visit uses the generated group command with the original departure',
    () async {
      final f = _Functions();
      final repo = EventRehearsalRepository(f);
      final view = checkpointVisitReview('initial');
      final change = RehearsalMovementChange(
        command: RehearsalResolveCheckpointVisit(
          snapshot: view,
          visit: view.checkpoint!.accountabilityReviews.value!.last,
          disposition: AssistanceVisitDisposition.departed,
        ),
        clientActionId: 'checkpoint_visit_fixture',
      );
      f.response = checkpointVisitResult(change, 'resolved');
      final result = await repo.applyMovement(change);
      expect(f.calls.single.name, 'controlEventRehearsal');
      expect(f.calls.single.input, change.toJson());
      expect(result.movementReview!.checkpoint!.progressRevision, 1);
    },
  );
  test(
    'movement getter uses only the reviewed generation and selected history',
    () async {
      final f = _Functions();
      final repo = EventRehearsalRepository(f);
      final s = movementSnapshot('oldFixed');
      f.response = movementBootstrap('oldFixed')['movementReview'];
      final r = await repo.fetchMovement(
        snapshot: s,
        selection: s.movementReview!.selection,
        actorUid: 'host-1',
      );
      expect(r.selected!.revision, 5);
      expect(r.revision, 6);
      expect(f.calls.single.name, 'getEventRehearsalMovement');
      expect(f.calls.single.input, {
        'sessionId': 'session-1',
        'expectedSetupRevision': 0,
        'scope': {'groupId': 'event:whole', 'progressRevision': 5},
      });
      await expectLater(
        repo.fetchMovement(
          snapshot: s,
          selection: s.movementReview!.selection,
          actorUid: 'host-2',
        ),
        throwsA(isA<BackendOperationException>()),
      );
    },
  );
  test(
    'uncertain control retries preserve the exact group envelope and receipt checks',
    () async {
      final f = _Functions();
      final repo = EventRehearsalRepository(f);
      final change = RehearsalMovementChange(
        command: movementDeparture(movementReview()),
        clientActionId: 'departure_0001',
      );
      f.error = FirebaseFunctionsException(
        code: 'unavailable',
        message: 'Offline',
      );
      await expectLater(
        repo.applyMovement(change),
        throwsA(isA<NetworkException>()),
      );
      f.error = null;
      f.response = movementResult(change);
      (f.response as Map)['actions'] = [];
      await expectLater(
        repo.applyMovement(change),
        throwsA(isA<BackendOperationException>()),
      );
      f.response = movementResult(change, later: true);
      expect(
        (await repo.applyMovement(change)).movementReview!.selected!.revision,
        1,
      );
      expect(f.calls.length, 3);
      expect(f.calls.every((c) => c.name == 'controlEventRehearsal'), isTrue);
      for (final call in f.calls) {
        expect(call.input, change.toJson());
      }
    },
  );
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
