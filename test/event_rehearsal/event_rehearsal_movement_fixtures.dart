import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_departure.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_observation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_movement.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_movement_command.dart';

// Produced and checked by the actual Functions movement projector, including
// departure visit hashes, group source identities and subsequent observations.
Map<String, Object?> movementSample(String name) =>
    (jsonDecode(
              File(
                'test/event_rehearsal/fixtures/movement_reviews.json',
              ).readAsStringSync(),
            )
            as Map<String, Object?>)[name]
        as Map<String, Object?>;
Map<String, Object?> movementBootstrap(String name) {
  final raw = movementSample(name);
  return {
    'session': raw['session'],
    'actors': raw['actors'],
    'actions': <Object?>[],
    'guestUrl': 'https://catchdates.com/rehearse/practicepublic1234567890',
    'canUseInternalFaults': false,
    'movementReview': raw['review'],
    'staffReview': (raw['review'] as Map<String, Object?>)['staffReview'],
  };
}

EventRehearsalBootstrap movementSnapshot([String name = 'ready']) =>
    EventRehearsalBootstrap.fromCallableData(movementBootstrap(name));
RehearsalMovementReview movementReview([String name = 'ready']) =>
    movementSnapshot(name).movementReview!;
RehearsalConfirmDeparture movementDeparture(RehearsalMovementReview review) =>
    RehearsalConfirmDeparture(
      snapshot: review,
      destination: review.destinations
          .firstWhere((d) => d.target is! AssistanceFixedPlace)
          .target,
      roster: EventAssistanceDepartureRosterSelection(
        review.candidates.map((m) => m.attendeeId),
      ),
      checkpoint: AssistanceDepartureCheckpointRequest(
        responsibleOperatorId: 'host-2',
        dueAt: review.serverTime + 60000,
      ),
    );

Map<String, Object?> movementResult(
  RehearsalMovementChange change, {
  bool later = false,
  String departureSample = 'departed',
}) {
  final out = movementBootstrap(
    change.command is RehearsalConfirmDeparture ? departureSample : 'partial',
  );
  final raw = out['movementReview'] as Map<String, Object?>;
  if (change.command is RehearsalConfirmDeparture) {
    for (final d in [
      movementObjectAt(raw, ['progress', 'current', 'departure']),
      movementObjectAt(raw, ['selected', 'departure']),
      movementObjectAt(raw, ['checkpoint', 'departure']),
    ]) {
      d['operationId'] = change.clientActionId;
    }
  }
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
  if (later) {
    final session = movementObjectAt(out, ['session']);
    session['runtimeRevision'] = (session['runtimeRevision'] as int) + 2;
    session['actionCount'] = (session['actionCount'] as int) + 2;
    raw['runtimeRevision'] = (raw['runtimeRevision'] as int) + 2;
  }
  return out;
}

Object? _movementAt(Object? value, List<Object> path) {
  for (final key in path) {
    value = key is String
        ? (value as Map<String, Object?>)[key]
        : (value as List<Object?>)[key as int];
  }
  return value;
}

Map<String, Object?> movementObjectAt(Object? value, List<Object> path) =>
    _movementAt(value, path) as Map<String, Object?>;
List<Object?> movementListAt(Object? value, List<Object> path) =>
    _movementAt(value, path) as List<Object?>;
