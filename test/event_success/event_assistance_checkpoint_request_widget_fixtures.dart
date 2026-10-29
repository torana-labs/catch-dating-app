import 'dart:async';

import 'package:catch_dating_app/contexts/live/data/event_assistance_checkpoint_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_departure_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint_request.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_movement.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_movement_command.dart';
import 'package:flutter_test/flutter_test.dart';

import '../event_rehearsal/event_rehearsal_checkpoint_management_fixtures.dart';
import 'event_assistance_checkpoint_fixtures.dart';
import 'event_assistance_checkpoint_request_fixtures.dart';

const checkpointRequestReason = 'Reviewed every outstanding guest.';

class CheckpointRequestUiLive extends Fake
    implements EventAssistanceCheckpointRepository {
  Map<String, Object?> wire = requestReadyWire();
  final writes =
      <
        ({
          EventAssistanceCheckpointRequestChange change,
          Completer<EventAssistanceCheckpointResult> result,
        })
      >[];
  @override
  Future<EventAssistanceCheckpointView> fetch(
    EventAssistanceCheckpointScope scope,
  ) async => checkpointResult(wire, scope: scope).view;
  @override
  Future<EventAssistanceCheckpointResult> manageRequest(
    EventAssistanceCheckpointRequestChange change,
  ) {
    final result = Completer<EventAssistanceCheckpointResult>();
    writes.add((change: change, result: result));
    return result.future;
  }

  void confirm() {
    final write = writes.last;
    wire = requestAppliedWire(write.change, before: wire);
    write.result.complete(checkpointResult(wire));
  }
}

class CheckpointRequestUiPermissions extends Fake
    implements EventAssistanceDepartureRepository {
  bool observerOnly = false;
  @override
  Future<EventAssistanceGroupProgressView> fetch(
    EventAssistanceGroupScope scope, {
    required String actorUid,
  }) async => checkpointOperator(
    scope: scope,
    actorUid: actorUid,
    authority: observerOnly ? 'readOnly' : 'canConfirm',
  );
}

class CheckpointRequestUiPractice extends Fake
    implements EventRehearsalRepository {
  Map<String, Object?> wire = managementBootstrap('resolved');
  EventRehearsalBootstrap get snapshot =>
      EventRehearsalBootstrap.fromCallableData(wire);
  final writes =
      <
        ({
          RehearsalMovementChange change,
          Completer<EventRehearsalBootstrap> result,
        })
      >[];
  @override
  Future<EventRehearsalBootstrap> fetch(String sessionId) async => snapshot;
  @override
  Future<RehearsalMovementReview> fetchMovement({
    required EventRehearsalBootstrap snapshot,
    required RehearsalMovementSelection selection,
    required String actorUid,
  }) async => RehearsalMovementReview.fromJson(
    wire['movementReview'],
    session: snapshot.session,
    actors: snapshot.actors,
    selection: selection,
    expectedActorUid: actorUid,
  );
  @override
  Future<EventRehearsalBootstrap> applyMovement(
    RehearsalMovementChange change,
  ) {
    final result = Completer<EventRehearsalBootstrap>();
    writes.add((change: change, result: result));
    return result.future;
  }

  void confirm(String sample) {
    final write = writes.last;
    wire = managementResult(write.change, sample);
    write.result.complete(snapshot);
  }
}
