import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';

sealed class AssistanceMembershipDecision {
  const AssistanceMembershipDecision();
  AssistanceMembershipAction get action => switch (this) {
    AssistancePlaceGroup() => AssistanceMembershipAction.place,
    AssistanceProposeGroup() => AssistanceMembershipAction.propose,
    AssistanceAcceptGroup() => AssistanceMembershipAction.accept,
    AssistanceRejectGroup() => AssistanceMembershipAction.reject,
    AssistanceCancelGroup() => AssistanceMembershipAction.cancel,
    AssistanceLeaveGroup() => AssistanceMembershipAction.leave,
  };
}

final class AssistancePlaceGroup extends AssistanceMembershipDecision {
  const AssistancePlaceGroup(this.groupId);
  final String groupId;
}

final class AssistanceProposeGroup extends AssistanceMembershipDecision {
  const AssistanceProposeGroup({
    required this.groupId,
    required this.receivingOperatorId,
    required this.expiresAt,
  });
  final String groupId, receivingOperatorId;
  final int expiresAt;
}

final class AssistanceAcceptGroup extends AssistanceMembershipDecision {
  const AssistanceAcceptGroup();
}

final class AssistanceRejectGroup extends AssistanceMembershipDecision {
  const AssistanceRejectGroup();
}

final class AssistanceCancelGroup extends AssistanceMembershipDecision {
  const AssistanceCancelGroup();
}

final class AssistanceLeaveGroup extends AssistanceMembershipDecision {
  const AssistanceLeaveGroup();
}

/// The reviewed episode, both revisions and one operation id survive retries.
final class EventAssistanceMembershipChange {
  EventAssistanceMembershipChange({
    required this.snapshot,
    required this.decision,
    required this.actorUid,
    required this.operationId,
  }) {
    assistanceId(operationId);
    validateAssistanceMembershipDecision(snapshot.facts, decision, actorUid);
    if (decision case AssistanceProposeGroup(
      :final groupId,
      :final receivingOperatorId,
      :final expiresAt,
    )) {
      snapshot.handoverReview?.requireChoice(
        operatorId: receivingOperatorId,
        groupId: groupId,
        expiresAt: expiresAt,
      );
    }
  }
  final EventAssistanceMembershipView snapshot;
  final AssistanceMembershipDecision decision;
  final String actorUid, operationId;

  Map<String, Object?> get command => {
    'kind': 'transferGroup',
    'context': snapshot.scope.context,
    'eventId': snapshot.scope.eventId,
    'operationId': operationId,
    'payload': {
      'attendeeId': snapshot.scope.attendeeId,
      ...assistanceMembershipDecisionPayload(snapshot.facts, decision),
    },
  };

  void requireResult(EventAssistanceMembershipResult result) {
    final next = result.view;
    if (next.scope != snapshot.scope ||
        result.outcome == AssistanceMembershipOutcome.read ||
        result.operationRevision != snapshot.revision + 1 ||
        next.revision < result.operationRevision! ||
        next.episodeId != snapshot.episodeId ||
        next.serverTime < snapshot.serverTime) {
      throw const FormatException(
        'Membership receipt does not confirm this command.',
      );
    }
    // Replays carry today's membership, not a reconstruction of the old action.
    if (result.outcome == AssistanceMembershipOutcome.replayed) return;
    requireAssistanceMembershipDecisionResult(
      snapshot.facts,
      next.facts,
      decision,
      actorUid,
    );
  }
}

void validateAssistanceMembershipDecision(
  AssistanceMembershipFacts snapshot,
  AssistanceMembershipDecision decision,
  String actorUid,
) {
  void requireGroup(String id) {
    assistanceId(id);
    if (!snapshot.groups.any((g) => g.groupId == id)) {
      throw const FormatException('Choose a group from this event review.');
    }
  }

  assistanceText(actorUid, 180);
  assistanceInteger(snapshot.revision + 1);
  if (snapshot.episodeId == null ||
      !snapshot.actions.contains(decision.action)) {
    throw const FormatException('Review an available group membership action.');
  }
  switch (decision) {
    case AssistancePlaceGroup(:final groupId):
      requireGroup(groupId);
    case AssistanceProposeGroup(
      :final groupId,
      :final receivingOperatorId,
      :final expiresAt,
    ):
      requireGroup(groupId);
      assistanceText(receivingOperatorId, 180);
      assistanceInteger(expiresAt);
      if (groupId == snapshot.accepted?.groupId ||
          expiresAt <= snapshot.serverTime ||
          expiresAt - snapshot.serverTime > 1800000) {
        throw const FormatException(
          'Choose a different group and a handover deadline within 30 minutes.',
        );
      }
    case AssistanceAcceptGroup() || AssistanceRejectGroup():
      if (snapshot.transfer?.proposal.receivingOperatorId != actorUid) {
        throw const FormatException(
          'Only the named receiving operator can answer this handover.',
        );
      }
    case AssistanceCancelGroup() || AssistanceLeaveGroup():
      break;
  }
}

Map<String, Object?> assistanceMembershipDecisionPayload(
  AssistanceMembershipFacts snapshot,
  AssistanceMembershipDecision decision,
) => {
  'episodeId': snapshot.episodeId,
  'expectedParticipationRevision': snapshot.participationRevision,
  'expectedMembershipRevision': snapshot.revision,
  'decision': switch (decision) {
    AssistancePlaceGroup(:final groupId) => {
      'kind': 'place',
      'groupId': groupId,
    },
    AssistanceProposeGroup(
      :final groupId,
      :final receivingOperatorId,
      :final expiresAt,
    ) =>
      {
        'kind': 'propose',
        'from': snapshot.accepted?.groupId,
        'to': groupId,
        'receivingOperatorId': receivingOperatorId,
        'expiresAtMillis': expiresAt,
      },
    AssistanceAcceptGroup() ||
    AssistanceRejectGroup() ||
    AssistanceCancelGroup() => {
      'kind': decision.action.name,
      'transferId': snapshot.transfer!.proposal.transferId,
    },
    AssistanceLeaveGroup() => {'kind': 'leave'},
  },
};

void requireAssistanceMembershipDecisionResult(
  AssistanceMembershipFacts snapshot,
  AssistanceMembershipFacts next,
  AssistanceMembershipDecision decision,
  String actorUid,
) {
  if (next.revision != snapshot.revision + 1 ||
      next.episodeId != snapshot.episodeId ||
      next.serverTime < snapshot.serverTime ||
      next.sourceHash != snapshot.sourceHash ||
      next.participationRevision != snapshot.participationRevision) {
    throw const FormatException(
      'Membership confirmation changed its reviewed source.',
    );
  }
  final recorded = switch (next.membership) {
    AssistanceCurrentMembership(:final accepted) => accepted,
    AssistanceChangedMembership(:final previousAccepted) => previousAccepted,
    AssistanceUninitializedMembership() => throw const FormatException(
      'Missing committed membership.',
    ),
  };
  bool acceptedByMe(String groupId) =>
      recorded != null &&
      next.membership is AssistanceCurrentMembership &&
      recorded.groupId == groupId &&
      recorded.responsibleOperatorId == actorUid &&
      recorded.acceptedAt == next.serverTime;
  bool resolved(AssistanceClosedTransferState outcome) {
    final transfer = next.transfer;
    return transfer is AssistanceClosedTransfer &&
        transfer.state == outcome &&
        transfer.proposal == snapshot.transfer?.proposal &&
        transfer.resolvedBy == actorUid &&
        transfer.resolvedAt == next.serverTime;
  }

  final valid = switch (decision) {
    AssistancePlaceGroup(:final groupId) =>
      acceptedByMe(groupId) && next.transfer == null,
    AssistanceProposeGroup(
      :final groupId,
      :final receivingOperatorId,
      :final expiresAt,
    ) =>
      next.membership is AssistanceCurrentMembership &&
          recorded == snapshot.accepted &&
          next.transfer is AssistancePendingTransfer &&
          (next.transfer! as AssistancePendingTransfer).state ==
              AssistancePendingTransferState.pending &&
          next.transfer!.proposal.from == snapshot.accepted?.groupId &&
          next.transfer!.proposal.to == groupId &&
          next.transfer!.proposal.receivingOperatorId == receivingOperatorId &&
          next.transfer!.proposal.expiresAt == expiresAt &&
          next.transfer!.proposal.requestedBy == actorUid &&
          next.transfer!.proposal.requestedAt == next.serverTime,
    AssistanceAcceptGroup() =>
      resolved(AssistanceClosedTransferState.accepted) &&
          acceptedByMe(snapshot.transfer!.proposal.to) &&
          recorded?.groupSourceHash ==
              snapshot.transfer!.proposal.targetSourceHash,
    AssistanceRejectGroup() =>
      resolved(AssistanceClosedTransferState.rejected) &&
          recorded == snapshot.accepted,
    AssistanceCancelGroup() =>
      resolved(AssistanceClosedTransferState.cancelled) &&
          recorded == snapshot.accepted,
    AssistanceLeaveGroup() =>
      recorded == null &&
          (snapshot.membership is AssistanceChangedMembership
              ? next.transfer == null
              : snapshot.transfer is AssistancePendingTransfer
              ? resolved(AssistanceClosedTransferState.cancelled)
              : _sameTransfer(next.transfer, snapshot.transfer)),
  };
  if (!valid) {
    throw const FormatException(
      'Membership confirmation changed the intended handover.',
    );
  }
}

bool _sameTransfer(
  AssistanceMembershipTransfer? a,
  AssistanceMembershipTransfer? b,
) {
  if (a == null || b == null) return a == null && b == null;
  if (a.proposal != b.proposal) return false;
  return switch ((a, b)) {
    (AssistanceClosedTransfer a, AssistanceClosedTransfer b) =>
      a.state == b.state &&
          a.resolvedBy == b.resolvedBy &&
          a.resolvedAt == b.resolvedAt,
    (AssistancePendingTransfer a, AssistancePendingTransfer b) =>
      a.state == b.state,
    _ => false,
  };
}
