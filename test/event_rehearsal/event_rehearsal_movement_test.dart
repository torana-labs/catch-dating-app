import 'dart:convert';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_departure.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_observation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_movement_command.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:json_schema/json_schema.dart';

import '../support/contract_schemas.dart';
import 'event_rehearsal_checkpoint_visit_fixtures.dart';
import 'event_rehearsal_movement_fixtures.dart';

void main() {
  test(
    'native decodes actual backend snapshots across the complete movement lifecycle',
    () {
      for (final name in [
        'initial',
        'ready',
        'departed',
        'rerouted',
        'partial',
        'reentered',
        'reported',
        'omitted',
        'empty',
        'fixed',
        'oldFixed',
        'complete',
        'groupReady',
        'groupDeparted',
      ]) {
        final r = movementReview(name);
        expect(r.scope.sessionId, 'session-1', reason: name);
        expect(r.candidates.length + r.unavailable.length, 2, reason: name);
        if (name == 'groupReady') {
          expect(r.scope.groupId, 'easy');
          expect(r.candidates.single.membershipHash, isNotNull);
          expect(
            r.destinations.every((d) => d.target is AssistanceGroupCheckpoint),
            isTrue,
          );
        }
      }
    },
  );
  test(
    'a missing roster, an empty roster and a complete report are distinct',
    () {
      expect(movementReview('omitted').canReport, isFalse);
      expect(movementReview('omitted').selected!.departure.roster, isNull);
      final empty = movementReview('empty');
      expect(empty.canReport, isTrue);
      expect(empty.selected!.departure.roster!.members, isEmpty);
      expect(
        (empty.checkpoint!.availability as AssistanceCheckpointRoster).status,
        AssistanceCheckpointReportStatus.unreported,
      );
      expect(
        movementReview('reported').checkpoint!.request!.state,
        AssistanceCheckpointRequestState.complete,
      );
      expect(movementReview('complete').canReport, isTrue);
      expect(movementReview('complete').canConfirm, isFalse);
    },
  );
  test(
    'history selection does not replace current progress or invent a fixed-place checkpoint',
    () {
      final r = movementReview('oldFixed');
      expect(r.revision, 6);
      expect(r.selected!.revision, 5);
      expect(r.selected!.departure.destination, isA<AssistanceFixedPlace>());
      expect(r.checkpoint, isNull);
      expect(r.guidance!.destination, r.current!.departure.destination);
    },
  );
  test(
    'route changes bind the reviewed alternative and immutable decision',
    () {
      final before = movementReview('departed');
      final destination = before.destinations.firstWhere(
        (item) => item.target != before.activeDestination,
      );
      final change = RehearsalMovementChange(
        command: RehearsalChangeRoute(
          snapshot: before,
          alternativeId: destination.alternativeId,
          decisionId: 'route-choice-0001',
        ),
        clientActionId: 'route_action_0001',
      );
      expect(change.command.toJson(), {
        'kind': 'changeRoute',
        'payload': {
          'routeRevision': 1,
          'groupId': 'event:whole',
          'expectedSourceHash': before.sourceHash,
          'alternativeId': destination.alternativeId,
          'decisionId': 'route-choice-0001',
        },
      });
      expect(
        JsonSchema.create(
          contractSchema('ControlEventRehearsalCallablePayload'),
        ).validate(change.toJson()).isValid,
        isTrue,
      );
      expect(
        () => RehearsalChangeRoute(
          snapshot: before,
          alternativeId: before.destinations
              .singleWhere((item) => item.target == before.activeDestination)
              .alternativeId,
          decisionId: 'same-route-1',
        ),
        throwsFormatException,
      );
      final wire = movementBootstrap('rerouted');
      wire['actions'] = [
        {
          'clientActionId': change.clientActionId,
          'actorId': null,
          'kind': 'control',
          'name': 'movement:changeRoute',
          'runtimeRevision': 3,
          'virtualNowMillis': before.serverTime,
        },
      ];
      final result = EventRehearsalBootstrap.fromCallableData(wire);
      expect(result.movementReview!.activeDestination, destination.target);
      expect(
        result.movementReview!.routeDecision!.decisionId,
        'route-choice-0001',
      );
      expect(() => change.requireResult(result), returnsNormally);
    },
  );
  test('a later route decision can return to the departure destination', () {
    final wire = movementBootstrap('rerouted');
    final session = movementObjectAt(wire, ['session']);
    final review = movementObjectAt(wire, ['movementReview']);
    final progress = movementObjectAt(review, ['progress']);
    final current = movementObjectAt(progress, ['current']);
    final departure = movementObjectAt(current, ['departure']);
    final route = movementObjectAt(progress, ['routeDecision']);
    final original = (progress['destinations']! as List<Object?>)
        .cast<Map<String, Object?>>()
        .singleWhere(
          (item) =>
              jsonEncode(item['target']) ==
              jsonEncode(departure['destination']),
        );
    final originalGuidance = movementObjectAt(movementBootstrap('departed'), [
      'movementReview',
      'progress',
      'guidance',
    ]);
    session['runtimeRevision'] = 4;
    session['actionCount'] = 3;
    review['runtimeRevision'] = 4;
    progress['revision'] = 3;
    progress['guidance'] = {...originalGuidance, 'revision': 3};
    route
      ..['progressRevision'] = 3
      ..['previousRevision'] = 2
      ..['alternativeId'] = original['alternativeId']
      ..['destination'] = original['target']
      ..['decisionId'] = 'route-choice-0002'
      ..['operationId'] = 'route_action_0002';

    final result = EventRehearsalBootstrap.fromCallableData(wire);
    expect(
      result.movementReview!.activeDestination,
      result.movementReview!.current!.departure.destination,
    );
    expect(result.movementReview!.routeDecision!.previousRevision, 2);
  });
  test(
    're-entry preserves prior observations and removing one requires a reason',
    () {
      final r = movementReview('reentered');
      final first = (r.checkpoint!.availability as AssistanceCheckpointRoster)
          .members
          .first;
      expect(first.canAddObservation, isFalse);
      expect(first.accountedFor, isTrue);
      final command = RehearsalRecordCheckpoint(
        snapshot: r,
        observation: AssistanceCheckpointObservation(['actor-01', 'actor-02']),
      );
      expect(
        command.toJson()['payload'],
        containsPair('expectedCheckpointRevision', 1),
      );
      expect(
        () => RehearsalRecordCheckpoint(
          snapshot: r,
          observation: AssistanceCheckpointObservation([]),
        ),
        throwsFormatException,
      );
      expect(
        () => RehearsalRecordCheckpoint(
          snapshot: r,
          observation: AssistanceCheckpointObservation(
            [],
            correctionReason: 'Wrong count',
          ),
        ),
        returnsNormally,
      );
    },
  );
  test(
    'new observations cannot use a guest who has re-entered after departure',
    () {
      final r = checkpointVisitReview('newVisit');
      expect(
        () => RehearsalRecordCheckpoint(
          snapshot: r,
          observation: AssistanceCheckpointObservation([
            'actor-01',
            'actor-02',
          ]),
        ),
        throwsFormatException,
      );
    },
  );
  test(
    'departure selection is explicit, bounded, frozen and has no actor target',
    () {
      final r = movementReview();
      final selected = <String>['actor-02', 'actor-01'];
      final command = RehearsalConfirmDeparture(
        snapshot: r,
        destination: r.destinations[1].target,
        roster: EventAssistanceDepartureRosterSelection(selected),
      );
      selected.clear();
      final change = RehearsalMovementChange(
        command: command,
        clientActionId: 'departure_0001',
      );
      final wire = change.toJson();
      expect(jsonEncode(wire), isNot(contains('actorId')));
      expect(wire['action'], 'movement');
      expect((command.toJson()['payload'] as Map)['departureRoster'], {
        'attendeeIds': ['actor-01', 'actor-02'],
        'expectedSourceHash': r.rosterSourceHash,
      });
      (wire['movement'] as Map).clear();
      expect(change.toJson()['movement'], isNotEmpty);
      expect(
        () => RehearsalConfirmDeparture(
          snapshot: movementReview('initial'),
          destination: r.destinations[1].target,
          roster: EventAssistanceDepartureRosterSelection(['actor-01']),
        ),
        throwsFormatException,
      );
    },
  );
  test(
    'checkpoint deadlines and fixed-place requests obey the real rehearsal rules',
    () {
      final r = movementReview();
      for (final due in [r.serverTime - 1, r.endAt + 14400001]) {
        expect(
          () => RehearsalConfirmDeparture(
            snapshot: r,
            destination: r.destinations[1].target,
            roster: EventAssistanceDepartureRosterSelection([]),
            checkpoint: AssistanceDepartureCheckpointRequest(
              responsibleOperatorId: 'host-2',
              dueAt: due,
            ),
          ),
          throwsFormatException,
        );
      }
      expect(
        () => RehearsalConfirmDeparture(
          snapshot: r,
          destination: r.destinations.first.target,
          roster: EventAssistanceDepartureRosterSelection([]),
          checkpoint: AssistanceDepartureCheckpointRequest(
            responsibleOperatorId: 'host-2',
            dueAt: r.serverTime,
          ),
        ),
        throwsFormatException,
      );
    },
  );
  test(
    'exact confirmations and later replay receipts preserve departure evidence',
    () {
      final change = RehearsalMovementChange(
        command: movementDeparture(movementReview()),
        clientActionId: 'departure_0001',
      );
      for (final later in [false, true]) {
        final result = EventRehearsalBootstrap.fromCallableData(
          movementResult(change, later: later),
        );
        expect(() => change.requireResult(result), returnsNormally);
      }
      final reported = RehearsalMovementChange(
        command: RehearsalRecordCheckpoint(
          snapshot: movementReview('departed'),
          observation: AssistanceCheckpointObservation(['actor-01']),
        ),
        clientActionId: 'report_0001',
      );
      expect(
        () => reported.requireResult(
          EventRehearsalBootstrap.fromCallableData(movementResult(reported)),
        ),
        returnsNormally,
      );
    },
  );
  test('malformed or cross-generation responses fail closed', () {
    final changes = <void Function(Map<String, Object?>)>[
      (m) => movementObjectAt(m, ['movementReview'])['setupRevision'] = 1,
      (m) => movementObjectAt(m, ['movementReview'])['runtimeRevision'] = 99,
      (m) => movementObjectAt(m, ['movementReview'])['groupId'] = 'other',
      (m) => movementObjectAt(m, ['movementReview'])['clockId'] =
          'clock:${'f' * 64}',
      (m) => movementObjectAt(m, ['movementReview'])['selected'] = null,
      (m) => movementObjectAt(m, [
        'movementReview',
        'checkpoint',
      ])['progressRevision'] = 99,
      (m) => movementObjectAt(m, [
        'movementReview',
        'checkpoint',
        'availability',
      ])['label'] = 'x' * 241,
      (m) => movementListAt(m, [
        'movementReview',
        'checkpoint',
        'availability',
        'members',
      ]).removeLast(),
      (m) => movementObjectAt(m, [
        'movementReview',
        'progress',
        'guidance',
      ])['text'] = 'Invented directions',
      (m) => movementListAt(m, [
        'movementReview',
        'roster',
        'members',
      ]).removeLast(),
      (m) => movementObjectAt(m, ['movementReview'])['nextBeforeRevision'] = 1,
      (m) => movementObjectAt(m, ['movementReview'])['surprise'] = true,
    ];
    for (var i = 0; i < changes.length; i++) {
      final raw = movementBootstrap('departed');
      changes[i](raw);
      expect(
        () => EventRehearsalBootstrap.fromCallableData(raw),
        throwsFormatException,
        reason: 'mutation $i',
      );
    }
  });
  test(
    'receipt cannot confirm a different group action, visit or decision',
    () {
      final change = RehearsalMovementChange(
        command: movementDeparture(movementReview()),
        clientActionId: 'departure_0001',
      );
      for (final field in ['actorId', 'name', 'clientActionId']) {
        final raw = movementResult(change);
        movementObjectAt(raw, ['actions', 0])[field] = 'different';
        expect(
          () => change.requireResult(
            EventRehearsalBootstrap.fromCallableData(raw),
          ),
          throwsFormatException,
        );
      }
      final raw = movementResult(change);
      for (final d in [
        movementObjectAt(raw, ['movementReview', 'selected', 'departure']),
        movementObjectAt(raw, [
          'movementReview',
          'progress',
          'current',
          'departure',
        ]),
        movementObjectAt(raw, ['movementReview', 'checkpoint', 'departure']),
      ]) {
        movementObjectAt(d, ['roster', 'members', 0])['visitHash'] = 'f' * 64;
      }
      expect(
        () =>
            change.requireResult(EventRehearsalBootstrap.fromCallableData(raw)),
        throwsFormatException,
      );
    },
  );
}
