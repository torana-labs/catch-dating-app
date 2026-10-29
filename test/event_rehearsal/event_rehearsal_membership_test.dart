import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/schema_contracts.g.dart'
    as schemas;
import 'package:flutter_test/flutter_test.dart';
import 'package:json_schema/json_schema.dart';

import 'event_rehearsal_membership_fixtures.dart';

void main() {
  test('every handover decision uses the canonical rehearsal command', () {
    final validator = JsonSchema.create(
      schemas.schemaContractsByName['ControlEventRehearsalCallablePayload']!,
    );
    final variants = [
      ('uninitialized', 'host-1', const AssistancePlaceGroup('easy')),
      (
        'current',
        'host-1',
        const AssistanceProposeGroup(
          groupId: 'tempo',
          receivingOperatorId: 'host-2',
          expiresAt: 2000,
        ),
      ),
      ('pending', 'host-2', const AssistanceAcceptGroup()),
      ('pending', 'host-2', const AssistanceRejectGroup()),
      ('pending', 'host-1', const AssistanceCancelGroup()),
      ('current', 'host-1', const AssistanceLeaveGroup()),
    ];
    for (final (state, uid, decision) in variants) {
      final change = practiceMembershipChange(
        snapshot: practiceMembershipSnapshot(state: state, uid: uid),
        decision: decision,
      );
      final wire = change.toJson();
      expect(validator.validate(wire).isValid, isTrue);
      final command = wire['assistance']! as Map;
      expect(command.containsKey('context'), isFalse);
      expect(
        (command['payload'] as Map)['decision'],
        containsPair('kind', decision.action.name),
      );
    }
  });

  test('membership coverage, generation and actor identity are complete', () {
    final snapshot = practiceMembershipSnapshot();
    expect(snapshot.membershipReviews!.rows.length, 2);
    expect(
      () => snapshot.membershipReviews!.rows.clear(),
      throwsUnsupportedError,
    );
    expect(
      () => snapshot.membershipReviews!.rows.first.receivingOperatorIds.clear(),
      throwsUnsupportedError,
    );
    for (final damage in <void Function(Map)>[
      (m) => m['clockId'] = 'clock:${'f' * 64}',
      (m) => (m['rows'] as List).removeLast(),
      (m) => (m['rows'] as List)[1] = (m['rows'] as List)[0],
      (m) => m['receivingOperatorIds'] = ['host-2'],
      (m) => ((m['rows'] as List)[0] as Map)['revision'] = 0.5,
      (m) => ((m['rows'] as List)[0] as Map)['availability'] = 'assumed',
      (m) => ((m['rows'] as List)[0] as Map)['context'] = {'mode': 'live'},
    ]) {
      final wire = practiceMembershipWire();
      damage(wire['membershipReviews']! as Map);
      expect(
        () => EventRehearsalBootstrap.fromCallableData(wire),
        throwsFormatException,
      );
    }
  });

  test('historical or unavailable sources cannot submit group changes', () {
    final wire = practiceMembershipWire(
      row: {
        ...practiceMembershipRow(),
        'availability': 'participationNotRecorded',
        'episodeId': null,
        'ready': false,
        'actions': <String>[],
      },
    );
    final snapshot = EventRehearsalBootstrap.fromCallableData(wire);
    expect(
      () => practiceMembershipChange(snapshot: snapshot),
      throwsFormatException,
    );
    final original = practiceMembershipChange();
    expect(
      () => RehearsalAssistanceChange(
        snapshot: practiceMembershipSnapshot(),
        command: original.command,
        clientActionId: 'membership-once',
      ),
      throwsFormatException,
    );
  });

  test(
    'only the named receiver can accept and new targets must be current',
    () {
      expect(
        () => practiceMembershipChange(
          snapshot: practiceMembershipSnapshot(state: 'pending'),
          decision: const AssistanceAcceptGroup(),
        ),
        throwsFormatException,
      );
      expect(
        () =>
            practiceMembershipChange(decision: const AssistancePlaceGroup('x')),
        throwsFormatException,
      );
      expect(
        () => practiceMembershipChange(
          decision: const AssistanceProposeGroup(
            groupId: 'tempo',
            receivingOperatorId: 'stranger',
            expiresAt: 2000,
          ),
        ),
        throwsFormatException,
      );
    },
  );

  test(
    'an exact receipt confirms placement without changing the event clock',
    () {
      final change = practiceMembershipChange();
      final wire = practicePlacementResult(change);
      change.requireResult(EventRehearsalBootstrap.fromCallableData(wire));
      for (final damage in <void Function(Map)>[
        (m) => (m['actions'] as List).clear(),
        (m) => (m['actions'] as List).add((m['actions'] as List).first),
        (m) => (m['session'] as Map)['setupRevision'] = 2,
        (m) =>
            (((m['membershipReviews'] as Map)['rows'] as List).first
                as Map)['accepted'] = {
              'groupId': 'tempo',
              'groupSourceHash': 'b' * 64,
              'responsibleOperatorId': 'host-1',
              'acceptedAt': 1000,
            },
      ]) {
        final bad = practicePlacementResult(change);
        damage(bad);
        expect(
          () => change.requireResult(
            EventRehearsalBootstrap.fromCallableData(bad),
          ),
          throwsFormatException,
        );
      }
    },
  );

  test(
    'replays preserve later group moves and later participation episodes',
    () {
      final change = practiceMembershipChange();
      final wire = practicePlacementResult(change);
      final row =
          (((wire['membershipReviews']! as Map)['rows'] as List).first as Map);
      row['revision'] = 4;
      row['episodeId'] = 'episode:${'f' * 64}';
      row['participationRevision'] = 2;
      row['sourceHash'] = 'c' * 64;
      (row['accepted'] as Map)['groupId'] = 'tempo';
      (wire['session'] as Map)['runtimeRevision'] = 10;
      (wire['session'] as Map)['actionCount'] = 7;
      change.requireResult(EventRehearsalBootstrap.fromCallableData(wire));
    },
  );
}
