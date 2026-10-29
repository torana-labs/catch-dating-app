import 'dart:convert';
import 'dart:io';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_movement.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_movement_command.dart';
import 'event_rehearsal_movement_fixtures.dart';

Map<String, Object?> managementBootstrap(String name) {
  final samples =
      jsonDecode(
            File(
              'test/event_rehearsal/fixtures/checkpoint_management.json',
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

RehearsalMovementReview managementReview(String name) =>
    EventRehearsalBootstrap.fromCallableData(
      managementBootstrap(name),
    ).movementReview!;

Map<String, Object?> managementResult(
  RehearsalMovementChange change,
  String sample,
) {
  final out = managementBootstrap(sample);
  final command = change.command as RehearsalManageCheckpoint;
  final field = command.isReassignment ? 'assignment' : 'closeout';
  final expected =
      (command.isReassignment
          ? command.snapshot.checkpoint!.assignment.value!.revision
          : command.snapshot.checkpoint!.closeout.value!.revision) +
      1;
  for (final record in [
    movementObjectAt(out, ['movementReview', 'selected', field]),
    movementObjectAt(out, ['movementReview', 'progress', 'current', field]),
    movementObjectAt(out, ['movementReview', 'checkpoint', field, 'change']),
  ]) {
    if (record['revision'] == expected) {
      record['operationId'] = change.clientActionId;
    }
  }
  out['actions'] = [
    {
      'clientActionId': change.clientActionId,
      'actorId': null,
      'kind': 'control',
      'name': 'movement:${command.kind}',
      'runtimeRevision': command.snapshot.session.runtimeRevision + 1,
      'virtualNowMillis': command.snapshot.serverTime,
    },
  ];
  return out;
}
