import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';

import '../event_success/event_assistance_membership_fixtures.dart';
import 'event_rehearsal_assistance_fixtures.dart';
import 'event_rehearsal_membership_fixtures.dart';
import 'event_rehearsal_movement_fixtures.dart';

/// Independent server-result wire for each decision; the controller consumes,
/// but never creates, these state transitions.
Map<String, Object?> practiceMembershipApplied(
  RehearsalAssistanceChange change, {
  bool later = false,
}) {
  final command = change.command as RehearsalTransferGroup;
  final before = command.snapshot.facts;
  final uid = command.snapshot.actorUid;
  final now = change.session.virtualNow.millisecondsSinceEpoch;
  final accepted = before.accepted;
  final proposal = before.transfer?.proposal;
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
  switch (command.decision) {
    case AssistancePlaceGroup(:final groupId):
      saved = acceptedGroupWire(group: groupId, operatorId: uid, at: now);
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
        'requestedBy': uid,
        'requestedAt': now,
        'expiresAt': expiresAt,
      };
    case AssistanceAcceptGroup():
      saved = acceptedGroupWire(group: proposal!.to, operatorId: uid, at: now)
        ..['groupSourceHash'] = proposal.targetSourceHash;
      transfer!.addAll({
        'status': 'accepted',
        'resolvedBy': uid,
        'resolvedAt': now,
      });
    case AssistanceRejectGroup() || AssistanceCancelGroup():
      transfer!.addAll({
        'status': command.decision is AssistanceRejectGroup
            ? 'rejected'
            : 'cancelled',
        'resolvedBy': uid,
        'resolvedAt': now,
      });
    case AssistanceLeaveGroup():
      saved = null;
      if (transfer != null) {
        transfer.addAll({
          'status': 'cancelled',
          'resolvedBy': uid,
          'resolvedAt': now,
        });
      }
  }
  final row = {
    ...practiceMembershipRow(),
    'attendeeId': command.actorId,
    'revision': before.revision + 1,
    'sourceHash': before.sourceHash,
    'episodeId': before.episodeId,
    'participationRevision': before.participationRevision,
    'freshness': 'current',
    'ready': before.ready,
    'serverTime': now,
    'accepted': saved,
    'transfer': transfer,
    'transferState': transfer?['status'] ?? 'none',
    'actions': <String>[],
  };
  if (later) {
    row.addAll({
      'revision': before.revision + 3,
      'episodeId': 'episode:${'f' * 64}',
      'participationRevision': before.participationRevision + 2,
      'sourceHash': 'c' * 64,
      'accepted': acceptedGroupWire(
        group: 'tempo',
        operatorId: 'host-2',
        at: now,
      ),
      'transfer': null,
      'transferState': 'none',
    });
  }
  final out = practiceMembershipWire(
    uid: uid,
    runtimeRevision: change.session.runtimeRevision + (later ? 3 : 1),
    actionCount: change.session.actionCount + (later ? 3 : 1),
    actions: [practiceReceipt(change)],
  );
  movementObjectAt(out, ['session']).addAll({
    'id': change.session.id,
    'organizerId': change.session.organizerId,
    'setupRevision': change.session.setupRevision,
    'virtualNowMillis': now,
    'virtualStartedAtMillis':
        change.session.virtualStartedAt!.millisecondsSinceEpoch,
    'status': change.session.status.name,
  });
  movementObjectAt(out, ['membershipReviews'])['clockId'] =
      command.snapshot.scope.clockId;
  final rows = movementListAt(out, ['membershipReviews', 'rows']);
  final index = rows.indexWhere(
    (r) => (r as Map<String, Object?>)['attendeeId'] == command.actorId,
  );
  rows[index] = row;
  if (change.session.status.name == 'complete') {
    for (final item in rows) {
      (item as Map<String, Object?>).addAll({
        'ready': false,
        'actions': <String>[],
      });
    }
  }
  return out;
}
