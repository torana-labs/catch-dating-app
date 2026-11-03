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

/// Listeners deliver the current wire at once. Assigning a new [wire] stands
/// in for the triggers: once the current synchronous edit finishes, every
/// open listener receives it.
class CheckpointRequestUiLive extends Fake
    implements EventAssistanceCheckpointRepository {
  Map<String, Object?> _wire = requestReadyWire();
  Map<String, Object?> get wire => _wire;
  set wire(Map<String, Object?> value) {
    _wire = value;
    scheduleMicrotask(_deliver);
  }

  void _deliver() {
    for (final view in _views) {
      if (view.controller.isClosed) continue;
      view.controller.add(checkpointResult(_wire, scope: view.scope).view);
    }
  }

  final _views =
      <
        ({
          EventAssistanceCheckpointScope scope,
          StreamController<EventAssistanceCheckpointView> controller,
        })
      >[];
  final writes =
      <
        ({
          EventAssistanceCheckpointRequestChange change,
          Completer<EventAssistanceCheckpointResult> result,
        })
      >[];
  @override
  Stream<EventAssistanceCheckpointView> watch(
    EventAssistanceCheckpointScope scope, {
    required String actorUid,
  }) {
    late final StreamController<EventAssistanceCheckpointView> controller;
    controller = StreamController(onCancel: () => controller.close())
      ..add(checkpointResult(wire, scope: scope).view);
    _views.add((scope: scope, controller: controller));
    return controller.stream;
  }

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
  Stream<EventAssistanceGroupProgressView> watch(
    EventAssistanceGroupScope scope, {
    required String actorUid,
  }) => Stream.value(
    checkpointOperator(
      scope: scope,
      actorUid: actorUid,
      authority: observerOnly ? 'readOnly' : 'canConfirm',
    ),
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
