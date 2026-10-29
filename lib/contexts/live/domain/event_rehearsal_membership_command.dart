part of 'event_rehearsal_assistance_command.dart';

final class RehearsalTransferGroup extends RehearsalAssistanceCommand {
  RehearsalTransferGroup({required this.snapshot, required this.decision})
    : super(snapshot.scope.actorId) {
    if (snapshot.availability != RehearsalMembershipAvailability.ready) {
      throw const FormatException('Review a current practice membership.');
    }
    validateAssistanceMembershipDecision(
      snapshot.facts,
      decision,
      snapshot.actorUid,
    );
    if (decision case AssistanceProposeGroup(
      :final receivingOperatorId,
      groupId: final to,
    )) {
      if (!snapshot.receivingOperatorIds.contains(receivingOperatorId) ||
          snapshot.staffReview != null &&
              receivingOperatorId.startsWith('practice-staff:') &&
              snapshot.staffReview!.operatorPermissionUntil(
                    receivingOperatorId,
                    to,
                    AssistanceGroupPermission.transferGroup,
                  ) ==
                  null) {
        throw const FormatException('Choose a current rehearsal Host.');
      }
    }
  }
  final RehearsalMembershipRow snapshot;
  final AssistanceMembershipDecision decision;
  @override
  String get kind => 'transferGroup';
  @override
  Map<String, Object?> toJson() => {
    'kind': kind,
    'actorId': actorId,
    'expectedSourceHash': snapshot.facts.sourceHash,
    'payload': {
      'attendeeId': actorId,
      ...assistanceMembershipDecisionPayload(snapshot.facts, decision),
    },
  };

  void _requireResult(
    EventRehearsalSession before,
    EventRehearsalBootstrap result,
  ) {
    final reviews = result.membershipReviews;
    final next = reviews?.rows
        .where((r) => r.scope == snapshot.scope)
        .firstOrNull;
    final receipts = result.actions.where(
      (a) => a.runtimeRevision == before.runtimeRevision + 1,
    );
    if (reviews?.actorUid != snapshot.actorUid ||
        next == null ||
        next.facts.revision < snapshot.facts.revision + 1 ||
        result.session.virtualNow.isBefore(before.virtualNow) ||
        result.session.actionCount < before.actionCount + 1 ||
        receipts.length != 1 ||
        receipts.single.virtualNow != before.virtualNow) {
      throw const FormatException(
        'Practice response lost its membership decision.',
      );
    }
    if (result.session.runtimeRevision == before.runtimeRevision + 1) {
      if (result.session.status != before.status ||
          result.session.virtualNow != before.virtualNow) {
        throw const FormatException(
          'Practice confirmation changed the runtime.',
        );
      }
      requireAssistanceMembershipDecisionResult(
        snapshot.facts,
        next.facts,
        decision,
        snapshot.actorUid,
      );
    }
    // Exact parent receipts preserve later moves and new participation episodes.
  }
}
