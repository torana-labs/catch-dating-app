import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/schemas/event_assistance_participation_callable_response.g.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/schemas/set_event_assistance_participation_callable_payload.g.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:json_schema/json_schema.dart';

import 'event_assistance_participation_fixtures.dart';

void main() {
  test(
    'applied results confirm the reviewed decision; replays retain later state',
    () {
      final change = participationView().prepareChange(
        operationId: 'confirmed-departure',
        participation: const EventAssistanceParticipation.departed(),
      );
      Map<String, Object?> applied() => participationResponse(
        outcome: 'applied',
        operationRevision: 3,
        revision: 3,
        participation: const {'state': 'departed', 'resumeAtUnit': null},
      );
      EventAssistanceParticipationResult parse(Map<String, Object?> raw) =>
          EventAssistanceParticipationResult.fromCallableData(
            raw,
            expectedScope: participationScope(),
          );
      expect(() => parse(applied()).requireChange(change), returnsNormally);
      for (final field in [
        'decision',
        'source',
        'clock',
        'attendance',
        'revision',
        'receipt',
      ]) {
        final raw = applied();
        final view = raw['view']! as Map<String, Object?>;
        switch (field) {
          case 'decision':
            view['participation'] = {'state': 'active', 'resumeAtUnit': null};
          case 'source':
            view['sourceHash'] = 'b' * 64;
          case 'clock':
            view['serverTime'] = change.snapshot.serverTime - 1;
          case 'attendance':
            view['checkedIn'] = true;
          case 'revision':
            view['revision'] = 4;
          case 'receipt':
            raw['operationRevision'] = 2;
        }
        expect(
          () => parse(raw).requireChange(change),
          throwsFormatException,
          reason: field,
        );
      }
      final replay = parse(
        participationResponse(
          outcome: 'replayed',
          operationRevision: 3,
          revision: 5,
        ),
      );
      expect(() => replay.requireChange(change), returnsNormally);
      expect(replay.view.participation, isA<EventParticipationActive>());
    },
  );

  test('all typed participation commands match the shared wire contract', () {
    final schema = JsonSchema.create(
      schemaSetEventAssistanceParticipationCallablePayloadSchema,
    );
    final view = participationView();
    for (final participation in [
      const EventAssistanceParticipation.active(),
      const EventAssistanceParticipation.onBreak(),
      const EventAssistanceParticipation.onBreak(
        resumeAtUnit: 'itinerary:second',
      ),
      const EventAssistanceParticipation.departed(),
    ]) {
      final change = view.prepareChange(
        operationId: 'operation-1',
        participation: participation,
      );
      final wire = {
        'command': change.command,
        'expectedSourceHash': view.sourceHash,
      };
      final result = schema.validate(wire);
      expect(result.isValid, isTrue, reason: result.errors.toString());
      final command = change.command;
      expect(command['context'], view.scope.context);
      expect(command['payload'], {
        'attendeeId': 'attendee-1',
        ...participation.toJson(),
        'episodeId': 'episode:one',
        'expectedParticipationRevision': 2,
      });
      expect(command['payload'], isNot(contains('checkedIn')));
    }
  });

  test('attendance never implies a participation state', () {
    final raw = participationResponse(
      revision: 0,
      episodeId: null,
      freshness: 'uninitialized',
      participation: null,
      checkedIn: true,
    );
    expect(
      JsonSchema.create(
        schemaEventAssistanceParticipationCallableResponseSchema,
      ).validate(raw).isValid,
      isTrue,
    );
    final view = EventAssistanceParticipationResult.fromCallableData(
      raw,
      expectedScope: participationScope(),
    ).view;
    expect(view.checkedIn, isTrue);
    expect(view.participation, isNull);
    expect(view.freshness, EventParticipationFreshness.uninitialized);
  });

  test(
    'automatically enrolled revision-zero guests retain reviewed commands',
    () {
      for (final freshness in ['current', 'sourceChanged']) {
        final raw = participationResponse(
          revision: 0,
          freshness: freshness,
          participation: freshness == 'current'
              ? const {'state': 'active', 'resumeAtUnit': null}
              : null,
        );
        expect(
          JsonSchema.create(
            schemaEventAssistanceParticipationCallableResponseSchema,
          ).validate(raw).isValid,
          isTrue,
        );
        final view = EventAssistanceParticipationResult.fromCallableData(
          raw,
          expectedScope: participationScope(),
        ).view;
        expect(view.revision, 0);
        expect(view.episodeId, 'episode:one');
        final change = view.prepareChange(
          operationId: 'first-host-change',
          participation: const EventAssistanceParticipation.departed(),
        );
        expect(
          change.command['payload'],
          containsPair('expectedParticipationRevision', 0),
        );
        expect(
          JsonSchema.create(
            schemaSetEventAssistanceParticipationCallablePayloadSchema,
          ).validate({
            'command': change.command,
            'expectedSourceHash': view.sourceHash,
          }).isValid,
          isTrue,
        );
      }
    },
  );

  test(
    'unknown and changed source remain distinct from active participation',
    () {
      final view = EventAssistanceParticipationResult.fromCallableData(
        participationResponse(freshness: 'sourceChanged', participation: null),
        expectedScope: participationScope(),
      ).view;
      expect(view.freshness, EventParticipationFreshness.sourceChanged);
      expect(view.participation, isNull);
      expect(
        view
            .prepareChange(
              operationId: 'fresh-episode',
              participation: const EventAssistanceParticipation.active(),
            )
            .command['payload'],
        containsPair('episodeId', 'episode:one'),
      );
    },
  );

  test('a return point must belong to the reviewed snapshot', () {
    expect(
      () => participationView().prepareChange(
        operationId: 'op-1',
        participation: const EventAssistanceParticipation.onBreak(
          resumeAtUnit: 'itinerary:removed',
        ),
      ),
      throwsArgumentError,
    );
    expect(
      () => participationView(canChange: false).prepareChange(
        operationId: 'op-1',
        participation: const EventAssistanceParticipation.departed(),
      ),
      throwsStateError,
    );
  });

  test('scope, mode, state and numeric corruption fail closed', () {
    final patches = <Map<String, Object?>>[
      {
        'context': {...participationScope().context, 'mode': 'rehearsal'},
      },
      {'attendeeId': 'another-attendee'},
      {
        'context': {
          ...participationScope().context,
          'eventId': 'another-event',
        },
      },
      {
        'context': {
          ...participationScope().context,
          'organizerId': 'another-organizer',
        },
      },
      {'freshness': 'futureState'},
      {'revision': 1.5},
      {'serverTime': double.nan},
      {'revision': -1},
      {'revision': 9007199254740992},
      {'sourceHash': 'invalid'},
      {
        'participation': {
          'state': 'departed',
          'resumeAtUnit': 'itinerary:second',
        },
      },
      {
        'participation': {
          'state': 'active',
          'resumeAtUnit': null,
          'checkedIn': true,
        },
      },
      {'participation': null},
      {'canChange': 'true'},
      {'episodeId': null},
      {
        'resumeUnits': [
          {'unitId': 'same', 'label': 'A'},
          {'unitId': 'same', 'label': 'B'},
        ],
      },
    ];
    for (final patch in patches) {
      final raw = participationResponse();
      (raw['view']! as Map<String, Object?>).addAll(patch);
      expect(
        () => EventAssistanceParticipationResult.fromCallableData(
          raw,
          expectedScope: participationScope(),
        ),
        throwsFormatException,
        reason: '$patch',
      );
    }
  });

  test('replayed receipt does not replace the current participation view', () {
    final result = EventAssistanceParticipationResult.fromCallableData(
      participationResponse(
        outcome: 'replayed',
        operationRevision: 3,
        revision: 7,
        participation: const {'state': 'departed', 'resumeAtUnit': null},
      ),
      expectedScope: participationScope(),
    );
    expect(result.operationRevision, 3);
    expect(result.view.revision, 7);
    expect(result.view.participation, isA<EventParticipationDeparted>());
  });

  test('snapshots and commands do not retain mutable transport containers', () {
    final raw = participationResponse();
    final view = EventAssistanceParticipationResult.fromCallableData(
      raw,
      expectedScope: participationScope(),
    ).view;
    (raw['view']! as Map<String, Object?>)['revision'] = 99;
    final change = view.prepareChange(
      operationId: 'same-operation',
      participation: const EventAssistanceParticipation.departed(),
    );
    (change.command['payload']!
            as Map<String, Object?>)['expectedParticipationRevision'] =
        99;
    expect(
      change.command['payload'],
      containsPair('expectedParticipationRevision', 2),
    );
    expect(() => view.returnPoints.clear(), throwsUnsupportedError);
    expect(participationScope(), participationScope());
    expect(participationScope().hashCode, participationScope().hashCode);
    expect(
      participationScope(),
      isNot(participationScope(attendeeId: 'attendee-2')),
    );
  });
}
