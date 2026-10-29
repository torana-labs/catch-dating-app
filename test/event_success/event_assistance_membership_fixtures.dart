import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';

final membershipScope = EventAssistanceGuestScope(
  organizerId: 'organizer-1',
  eventId: 'event-1',
  attendeeId: 'guest-1',
);

Map<String, Object?> acceptedGroupWire({
  String group = 'easy',
  String operatorId = 'host-1',
  int at = 500,
}) => {
  'groupId': group,
  'groupSourceHash': 'b' * 64,
  'responsibleOperatorId': operatorId,
  'acceptedAt': at,
};
Map<String, Object?> transferWire() => {
  'transferId': 'transfer-1',
  'from': 'easy',
  'to': 'tempo',
  'targetSourceHash': 'c' * 64,
  'receivingOperatorId': 'host-2',
  'requestedBy': 'host-1',
  'requestedAt': 500,
  'expiresAt': 5000,
  'status': 'pending',
  'resolvedAt': null,
  'resolvedBy': null,
};

Map<String, Object?> membershipWire({
  String state = 'uninitialized',
  String operatorId = 'host-1',
}) => {
  'outcome': 'read',
  'operationRevision': null,
  'view': {
    'context': membershipScope.context,
    'attendeeId': membershipScope.attendeeId,
    'sourceHash': 'a' * 64,
    'serverTime': 1000,
    'revision': state == 'uninitialized'
        ? 0
        : state == 'pending'
        ? 2
        : 1,
    'episodeId': 'episode-1',
    'participationRevision': 0,
    'freshness': state == 'uninitialized' ? 'uninitialized' : 'current',
    'ready': true,
    'accepted': state == 'uninitialized' ? null : acceptedGroupWire(),
    'transfer': state == 'pending' ? transferWire() : null,
    'transferState': state == 'pending' ? 'pending' : 'none',
    'groups': [
      {'groupId': 'easy', 'label': 'Easy pace'},
      {'groupId': 'tempo', 'label': 'Tempo pace'},
    ],
    'actions': state == 'uninitialized'
        ? ['place', 'propose']
        : state == 'pending'
        ? [
            if (operatorId == 'host-2') ...['accept', 'reject'],
            'cancel',
            'leave',
          ]
        : ['propose', 'leave'],
  },
};

EventAssistanceMembershipResult membershipResult(Map<String, Object?> data) =>
    EventAssistanceMembershipResult.fromCallableData(
      data,
      expectedScope: membershipScope,
    );
EventAssistanceMembershipView membershipView({
  String state = 'uninitialized',
  String operatorId = 'host-1',
}) =>
    membershipResult(membershipWire(state: state, operatorId: operatorId)).view;

EventAssistanceMembershipChange membershipChange({
  EventAssistanceMembershipView? view,
  AssistanceMembershipDecision decision = const AssistancePlaceGroup('easy'),
  String actorUid = 'host-1',
  String operationId = 'membership-once',
}) => EventAssistanceMembershipChange(
  snapshot: view ?? membershipView(),
  decision: decision,
  actorUid: actorUid,
  operationId: operationId,
);

/// Independent wire outcomes used by transport/controller fakes.
Map<String, Object?> membershipAppliedWire(
  EventAssistanceMembershipChange change,
) {
  final wire = membershipWire();
  final view = wire['view']! as Map<String, Object?>;
  final old = change.snapshot;
  final accepted = old.accepted;
  final proposal = old.transfer?.proposal;
  Map<String, Object?>? saved = accepted == null
      ? null
      : {
          'groupId': accepted.groupId,
          'groupSourceHash': accepted.groupSourceHash,
          'responsibleOperatorId': accepted.responsibleOperatorId,
          'acceptedAt': accepted.acceptedAt,
        };
  Map<String, Object?>? transfer = proposal == null
      ? null
      : {
          'transferId': proposal.transferId,
          'from': proposal.from,
          'to': proposal.to,
          'targetSourceHash': proposal.targetSourceHash,
          'receivingOperatorId': proposal.receivingOperatorId,
          'requestedBy': proposal.requestedBy,
          'requestedAt': proposal.requestedAt,
          'expiresAt': proposal.expiresAt,
          'status': 'pending',
          'resolvedBy': null,
          'resolvedAt': null,
        };
  const now = 2000;
  if (old.transfer case AssistanceClosedTransfer(
    :final state,
    :final resolvedAt,
    :final resolvedBy,
  )) {
    transfer!.addAll({
      'status': state.name,
      'resolvedAt': resolvedAt,
      'resolvedBy': resolvedBy,
    });
  }
  switch (change.decision) {
    case AssistancePlaceGroup(:final groupId):
      saved = acceptedGroupWire(
        group: groupId,
        operatorId: change.actorUid,
        at: now,
      );
      transfer = null;
    case AssistanceProposeGroup(
      :final groupId,
      :final receivingOperatorId,
      :final expiresAt,
    ):
      transfer = {
        ...transferWire(),
        'from': accepted?.groupId,
        'to': groupId,
        'receivingOperatorId': receivingOperatorId,
        'requestedBy': change.actorUid,
        'requestedAt': now,
        'expiresAt': expiresAt,
      };
    case AssistanceAcceptGroup():
      saved = acceptedGroupWire(
        group: proposal!.to,
        operatorId: change.actorUid,
        at: now,
      );
      saved['groupSourceHash'] = proposal.targetSourceHash;
      transfer!.addAll({
        'status': 'accepted',
        'resolvedBy': change.actorUid,
        'resolvedAt': now,
      });
    case AssistanceRejectGroup() || AssistanceCancelGroup():
      transfer!.addAll({
        'status': change.decision is AssistanceRejectGroup
            ? 'rejected'
            : 'cancelled',
        'resolvedBy': change.actorUid,
        'resolvedAt': now,
      });
    case AssistanceLeaveGroup():
      saved = null;
      if (old.membership is AssistanceChangedMembership) {
        transfer = null;
      } else if (old.transfer is AssistancePendingTransfer) {
        transfer!.addAll({
          'status': 'cancelled',
          'resolvedBy': change.actorUid,
          'resolvedAt': now,
        });
      }
  }
  view.addAll({
    'serverTime': now,
    'revision': old.revision + 1,
    'freshness': 'current',
    'sourceHash': old.sourceHash,
    'episodeId': old.episodeId,
    'participationRevision': old.participationRevision,
    'accepted': saved,
    'transfer': transfer,
    'transferState': transfer?['status'] ?? 'none',
    'actions': <String>[],
  });
  wire['outcome'] = 'applied';
  wire['operationRevision'] = old.revision + 1;
  return wire;
}
