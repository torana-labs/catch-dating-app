import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/live/data/event_assistance_checkpoint_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_departure_history_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_departure_history.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_movement.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_movement_command.dart';
import 'package:flutter_test/flutter_test.dart';

import '../event_rehearsal/event_rehearsal_movement_fixtures.dart';

Map<String, Object?> checkpointUiSample(String name) =>
    ((jsonDecode(
                  File(
                    'test/event_success/fixtures/checkpoint_reviews.json',
                  ).readAsStringSync(),
                )
                as Map)[name]
            as Map)
        .cast<String, Object?>();

final checkpointUiScope = EventAssistanceCheckpointScope(
  group: EventAssistanceGroupScope(
    organizerId: 'o-checkpoint-native',
    eventId: 'e-checkpoint-native',
    groupId: 'event:whole',
  ),
  checkpoint: AssistanceAccountabilityCheckpoint(
    checkpointId: 'one',
    progressRevision: 2,
  ),
);

EventAssistanceCheckpointResult checkpointUiResult(String name) =>
    EventAssistanceCheckpointResult.fromCallableData(
      checkpointUiSample(name),
      expectedScope: checkpointUiScope,
    );

class CheckpointUiLive extends Fake
    implements EventAssistanceCheckpointRepository {
  String sample = 'initial';
  final writes =
      <
        ({
          EventAssistanceCheckpointChange change,
          Completer<EventAssistanceCheckpointResult> result,
        })
      >[];
  @override
  Future<EventAssistanceCheckpointView> fetch(
    EventAssistanceCheckpointScope scope,
  ) async {
    expect(scope, checkpointUiScope);
    return checkpointUiResult(sample).view;
  }

  @override
  Future<EventAssistanceCheckpointResult> apply(
    EventAssistanceCheckpointChange change,
  ) {
    final result = Completer<EventAssistanceCheckpointResult>();
    writes.add((change: change, result: result));
    return result.future;
  }

  void confirm() {
    sample = 'partial';
    writes.last.result.complete(checkpointUiResult(sample));
  }
}

class CheckpointUiHistory extends Fake
    implements EventAssistanceDepartureHistoryRepository {
  CheckpointUiHistory(this.live);
  final CheckpointUiLive live;
  @override
  Future<EventAssistanceDepartureHistoryPage> fetch(
    EventAssistanceDepartureHistoryQuery query, {
    required String actorUid,
  }) async => EventAssistanceDepartureHistoryPage.fromCallableData(
    checkpointUiSample(
      live.sample == 'initial' ? 'historyInitial' : 'historyPartial',
    ),
    expectedQuery: query,
    expectedActorUid: actorUid,
  );
}

class CheckpointUiPractice extends Fake implements EventRehearsalRepository {
  EventRehearsalBootstrap snapshot = movementSnapshot('departed');
  String sample = 'departed';
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
    movementSample(sample)['review'],
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

  void confirm() {
    sample = 'partial';
    snapshot = EventRehearsalBootstrap.fromCallableData(
      movementResult(writes.last.change),
    );
    writes.last.result.complete(snapshot);
  }
}
