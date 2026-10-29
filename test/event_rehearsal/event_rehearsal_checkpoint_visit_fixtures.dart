import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_movement.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_movement_command.dart';

import 'event_rehearsal_movement_fixtures.dart';

Map<String, Object?> checkpointVisitBootstrap(String name) {
  final samples =
      jsonDecode(
            File(
              'test/event_rehearsal/fixtures/checkpoint_visits.json',
            ).readAsStringSync(),
          )
          as Map<String, Object?>;
  final sample = samples[name] as Map<String, Object?>;
  return {
    ...movementBootstrap('departed'),
    'session': sample['session'],
    'actors': sample['actors'],
    'movementReview': sample['review'],
  };
}

RehearsalMovementReview checkpointVisitReview(String name) =>
    EventRehearsalBootstrap.fromCallableData(
      checkpointVisitBootstrap(name),
    ).movementReview!;
Map<String, Object?> checkpointVisitResult(
  RehearsalMovementChange change,
  String sample,
) {
  final out = checkpointVisitBootstrap(sample);
  out['actions'] = [
    {
      'clientActionId': change.clientActionId,
      'actorId': null,
      'kind': 'control',
      'name': 'movement:${change.command.kind}',
      'runtimeRevision': change.snapshot.session.runtimeRevision + 1,
      'virtualNowMillis': change.snapshot.serverTime,
    },
  ];
  return out;
}
