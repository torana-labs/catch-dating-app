import 'dart:convert';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:json_schema/json_schema.dart';

import '../support/contract_schemas.dart';
import 'event_assistance_membership_fixtures.dart';

void main() {
  Map<String, Object?> copy(Map<String, Object?> data) =>
      (jsonDecode(jsonEncode(data)) as Map).cast<String, Object?>();
  Map<String, Object?> body(Map<String, Object?> wire) =>
      wire['view']! as Map<String, Object?>;
  final responseSchema = JsonSchema.create(
    contractSchema('EventAssistanceMembershipCallableResponse'),
  );
  final commandSchema = JsonSchema.create(
    contractSchema('TransferEventAssistanceGroupCallablePayload'),
  );

  test(
    'the canonical actions and transfer states require complete native coverage',
    () {
      final properties =
          contractSchema(
                'EventAssistanceMembershipCallableResponse',
              )['properties']!
              as Map;
      final view = (properties['view']! as Map)['properties']! as Map;
      final actionValues =
          ((view['actions']! as Map)['items']! as Map)['enum']! as List;
      expect(
        actionValues.toSet(),
        AssistanceMembershipAction.values.map((a) => a.name).toSet(),
      );
      expect(((view['transferState']! as Map)['enum']! as List).toSet(), {
        'none',
        ...AssistancePendingTransferState.values.map((s) => s.name),
        ...AssistanceClosedTransferState.values.map((s) => s.name),
      });
      expect(
        ((properties['outcome']! as Map)['enum']! as List).toSet(),
        AssistanceMembershipOutcome.values.map((o) => o.name).toSet(),
      );
      final command =
          contractSchema(
                'TransferEventAssistanceGroupCallablePayload',
              )['properties']!
              as Map;
      final commandProperties =
          (command['command']! as Map)['properties']! as Map;
      final payload =
          (commandProperties['payload']! as Map)['properties']! as Map;
      final variants = (payload['decision']! as Map)['oneOf']! as List;
      expect(
        variants
            .map(
              (v) =>
                  (((v as Map)['properties']! as Map)['kind']! as Map)['const'],
            )
            .toSet(),
        AssistanceMembershipAction.values.map((a) => a.name).toSet(),
      );
    },
  );

  test(
    'initial handovers and cancellation of stale membership preserve their distinct sources',
    () {
      final initial = membershipChange(
        decision: const AssistanceProposeGroup(
          groupId: 'tempo',
          receivingOperatorId: 'host-2',
          expiresAt: 6000,
        ),
      );
      final proposed = membershipResult(membershipAppliedWire(initial));
      initial.requireResult(proposed);
      expect(proposed.view.accepted, isNull);
      expect(proposed.view.transfer!.proposal.from, isNull);
      final stale = membershipWire(state: 'pending');
      body(stale).addAll({
        'freshness': 'sourceChanged',
        'transferState': 'sourceChanged',
      });
      final cancelled = membershipChange(
        view: membershipResult(stale).view,
        decision: const AssistanceCancelGroup(),
      );
      final result = membershipResult(membershipAppliedWire(cancelled));
      cancelled.requireResult(result);
      expect(result.view.accepted, isNull);
      expect(
        (result.view.transfer! as AssistanceClosedTransfer).state,
        AssistanceClosedTransferState.cancelled,
      );
      final currentCancel = membershipChange(
        view: membershipView(state: 'pending'),
        decision: const AssistanceCancelGroup(),
      );
      final closed = membershipAppliedWire(currentCancel);
      body(closed)['actions'] = ['leave'];
      final leave = membershipChange(
        view: membershipResult(closed).view,
        decision: const AssistanceLeaveGroup(),
      );
      final left = membershipResult(membershipAppliedWire(leave));
      leave.requireResult(left);
      expect(left.view.transfer!.proposal, leave.snapshot.transfer!.proposal);
    },
  );

  test(
    'wire variants retain current ownership, proposals and missing enrollment separately',
    () {
      final wire = membershipWire(state: 'pending');
      expect(responseSchema.validate(wire).isValid, isTrue);
      final view = membershipResult(wire).view;
      expect(view.accepted?.groupId, 'easy');
      expect(view.accepted?.responsibleOperatorId, 'host-1');
      final transfer = view.transfer! as AssistancePendingTransfer;
      expect(transfer.proposal.to, 'tempo');
      expect(transfer.proposal.receivingOperatorId, 'host-2');
      expect(transfer.state, AssistancePendingTransferState.pending);
      body(wire)['groups'] = <Object>[];
      expect(view.groups.length, 2);
      expect(() => view.groups.clear(), throwsUnsupportedError);
      expect(() => view.actions.clear(), throwsUnsupportedError);
      final missing = membershipWire();
      body(
        missing,
      ).addAll({'episodeId': null, 'ready': false, 'actions': <Object>[]});
      final noEpisode = membershipResult(missing).view;
      expect(noEpisode.membership, isA<AssistanceUninitializedMembership>());
      expect(noEpisode.accepted, isNull);
      expect(noEpisode.episodeId, isNull);
      expect(membershipView().episodeId, 'episode-1');
      expect(membershipView().participationRevision, 0);
    },
  );

  test('stale and expired proposals never become accepted membership', () {
    final expired = membershipWire(state: 'pending');
    body(expired).addAll({'serverTime': 5000, 'transferState': 'expired'});
    final expiredView = membershipResult(expired).view;
    expect(
      (expiredView.transfer! as AssistancePendingTransfer).state,
      AssistancePendingTransferState.expired,
    );
    expect(expiredView.accepted?.groupId, 'easy');
    final changed = membershipWire(state: 'pending');
    body(changed).addAll({
      'freshness': 'sourceChanged',
      'transferState': 'sourceChanged',
      'groups': <Object>[],
      'ready': false,
    });
    final stale = membershipResult(changed).view;
    expect(stale.accepted, isNull);
    expect(
      (stale.membership as AssistanceChangedMembership)
          .previousAccepted
          ?.groupId,
      'easy',
    );
    expect(stale.actions, {
      AssistanceMembershipAction.cancel,
      AssistanceMembershipAction.leave,
    });
  });

  test(
    'all six decisions match the canonical command and confirm actual ownership',
    () {
      final decisions = <AssistanceMembershipDecision>[
        const AssistancePlaceGroup('easy'),
        const AssistanceProposeGroup(
          groupId: 'tempo',
          receivingOperatorId: 'host-2',
          expiresAt: 6000,
        ),
        const AssistanceAcceptGroup(),
        const AssistanceRejectGroup(),
        const AssistanceCancelGroup(),
        const AssistanceLeaveGroup(),
      ];
      expect(
        decisions.map((d) => d.action).toSet(),
        AssistanceMembershipAction.values.toSet(),
      );
      for (final decision in decisions) {
        final receiver =
            decision is AssistanceAcceptGroup ||
            decision is AssistanceRejectGroup;
        final actor = receiver ? 'host-2' : 'host-1';
        final state = decision is AssistancePlaceGroup
            ? 'uninitialized'
            : decision is AssistanceProposeGroup
            ? 'current'
            : 'pending';
        final change = membershipChange(
          decision: decision,
          actorUid: actor,
          view: membershipView(state: state, operatorId: actor),
        );
        final command = change.command;
        expect(
          commandSchema.validate({
            'command': command,
            'expectedSourceHash': change.snapshot.sourceHash,
          }).isValid,
          isTrue,
          reason: decision.action.name,
        );
        final payload = command['payload']! as Map;
        expect(payload['expectedMembershipRevision'], change.snapshot.revision);
        expect(payload['expectedParticipationRevision'], 0);
        expect(payload['episodeId'], 'episode-1');
        final wire = membershipAppliedWire(change);
        expect(responseSchema.validate(wire).isValid, isTrue);
        final result = membershipResult(wire);
        change.requireResult(result);
        if (decision is AssistanceProposeGroup) {
          expect(result.view.accepted?.groupId, 'easy');
          expect(result.view.accepted?.responsibleOperatorId, 'host-1');
        }
        if (decision is AssistanceAcceptGroup) {
          expect(result.view.accepted?.groupId, 'tempo');
          expect(result.view.accepted?.responsibleOperatorId, 'host-2');
        }
        if (decision is AssistanceLeaveGroup) {
          expect(result.view.accepted, isNull);
        }
      }
    },
  );

  test(
    'unoffered choices, unknown groups and the wrong receiving operator cannot form commands',
    () {
      for (final decision in <AssistanceMembershipDecision>[
        const AssistancePlaceGroup('foreign'),
        const AssistanceAcceptGroup(),
        const AssistanceProposeGroup(
          groupId: 'tempo',
          receivingOperatorId: '',
          expiresAt: 6000,
        ),
        const AssistanceProposeGroup(
          groupId: 'tempo',
          receivingOperatorId: 'host-2',
          expiresAt: 1000,
        ),
        const AssistanceProposeGroup(
          groupId: 'tempo',
          receivingOperatorId: 'host-2',
          expiresAt: 1801001,
        ),
      ]) {
        expect(
          () => membershipChange(decision: decision),
          throwsFormatException,
        );
      }
      expect(
        () => membershipChange(
          view: membershipView(state: 'current'),
          decision: const AssistanceProposeGroup(
            groupId: 'easy',
            receivingOperatorId: 'host-2',
            expiresAt: 6000,
          ),
        ),
        throwsFormatException,
      );
      expect(
        () => membershipChange(
          view: membershipView(state: 'pending', operatorId: 'host-2'),
          decision: const AssistanceAcceptGroup(),
        ),
        throwsFormatException,
      );
      final wrongAction = membershipWire(state: 'pending');
      body(wrongAction)['actions'] = ['place'];
      expect(() => membershipResult(wrongAction), throwsFormatException);
    },
  );

  test('scope, field and timeline contradictions fail closed', () {
    final patches = <Map<String, Object?>>[
      {'attendeeId': 'someone-else'},
      {
        'context': {...membershipScope.context, 'mode': 'rehearsal'},
      },
      {
        'context': {...membershipScope.context, 'organizerId': 'other'},
      },
      {
        'context': {...membershipScope.context, 'eventId': 'other'},
      },
      {'checkedIn': true},
      {'serverTime': -1},
      {'revision': 0},
      {'episodeId': null},
      {'sourceHash': 'bad'},
      {'participationRevision': 0.5},
      {'freshness': 'uninitialized'},
      {
        'groups': [
          {'groupId': 'easy', 'label': 'A'},
          {'groupId': 'easy', 'label': 'B'},
        ],
      },
      {
        'groups': [
          {'groupId': 'event:whole', 'label': 'Everyone'},
        ],
      },
      {
        'actions': ['cancel', 'cancel'],
      },
      {
        'actions': ['unknown'],
      },
      {'transferState': 'accepted'},
      {'transfer': null},
      {'accepted': acceptedGroupWire(at: 1001)},
      {
        'transfer': {...transferWire(), 'resolvedAt': 900},
      },
      {
        'transfer': {...transferWire(), 'from': 'foreign'},
      },
      {
        'transfer': {...transferWire(), 'requestedAt': 1001},
      },
      {
        'transfer': {...transferWire(), 'expiresAt': 500},
      },
      {
        'transfer': {...transferWire(), 'to': 'easy'},
      },
      {
        'transfer': {...transferWire(), 'expiresAt': 999},
      },
    ];
    for (final patch in patches) {
      final wire = membershipWire(state: 'pending');
      body(wire).addAll(patch);
      expect(
        () => membershipResult(wire),
        throwsFormatException,
        reason: '$patch',
      );
    }
  });

  test(
    'accepted results must prove the chosen effect and preserve unrelated membership evidence',
    () {
      final change = membershipChange(
        view: membershipView(state: 'pending', operatorId: 'host-2'),
        actorUid: 'host-2',
        decision: const AssistanceAcceptGroup(),
      );
      final original = membershipAppliedWire(change);
      for (final mutate in <void Function(Map<String, Object?>)>[
        (w) => w['operationRevision'] = 2,
        (w) => body(w)['participationRevision'] = 1,
        (w) => body(w)['sourceHash'] = 'f' * 64,
        (w) => body(w)['episodeId'] = 'new-episode',
        (w) => body(w)['accepted'] = acceptedGroupWire(
          operatorId: 'host-2',
          at: 2000,
        ),
        (w) =>
            body(w)['accepted'] = acceptedGroupWire(group: 'tempo', at: 2000),
        (w) => (body(w)['transfer']! as Map)['resolvedBy'] = 'host-1',
        (w) => (body(w)['accepted']! as Map)['groupSourceHash'] = 'f' * 64,
        (w) => (body(w)['transfer']! as Map)['transferId'] = 'other-transfer',
        (w) => (body(w)['transfer']! as Map)['requestedBy'] = 'other-requester',
        (w) => (body(w)['transfer']! as Map)['resolvedAt'] = 1999,
      ]) {
        final wire = copy(original);
        mutate(wire);
        expect(
          () => change.requireResult(membershipResult(wire)),
          throwsFormatException,
        );
      }
      final foreign = EventAssistanceMembershipResult.fromCallableData(
        {
          ...original,
          'view': {...body(original), 'attendeeId': 'other'},
        },
        expectedScope: EventAssistanceGuestScope(
          organizerId: 'organizer-1',
          eventId: 'event-1',
          attendeeId: 'other',
        ),
      );
      expect(() => change.requireResult(foreign), throwsFormatException);
    },
  );

  test(
    'replays retain newer membership and stale source without reapplying the original move',
    () {
      final change = membershipChange();
      final wire = membershipAppliedWire(change)..['outcome'] = 'replayed';
      body(wire).addAll({
        'revision': 5,
        'accepted': null,
        'sourceHash': 'f' * 64,
        'freshness': 'sourceChanged',
        'ready': false,
      });
      final replay = membershipResult(wire);
      change.requireResult(replay);
      expect(replay.operationRevision, 1);
      expect(replay.view.revision, 5);
      expect(replay.view.accepted, isNull);
      body(wire)['episodeId'] = 'new-episode';
      expect(
        () => change.requireResult(membershipResult(wire)),
        throwsFormatException,
      );
    },
  );
}
