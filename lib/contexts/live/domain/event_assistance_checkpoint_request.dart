import 'dart:math';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';

/// Combines checkpoint evidence with the caller's current scoped permission.
/// Runtime readiness is intentionally separate: an ended event may still owe a report.
final class EventAssistanceCheckpointRequestReview {
  EventAssistanceCheckpointRequestReview({
    required this.checkpoint,
    required this.operator,
  }) {
    if (operator.scope != checkpoint.scope.group ||
        operator.authority.validUntil <= serverTime) {
      throw const FormatException('Reload current checkpoint authority.');
    }
    final options = checkpoint.reporterOptions.value;
    if (options != null &&
        (!isManager ||
            options.actorUid != actorUid ||
            options.validUntil <= serverTime)) {
      throw const FormatException(
        'Reporter choices belong to another or expired manager review.',
      );
    }
  }

  final EventAssistanceCheckpointView checkpoint;
  final EventAssistanceGroupProgressView operator;
  EventAssistanceCheckpointScope get scope => checkpoint.scope;
  int get serverTime => max(checkpoint.serverTime, operator.serverTime);
  String get actorUid => operator.actorUid;
  bool get canAct => canReassign || canClose || canReopen;

  // The group permission projection grants anyAuthorizedOperator exclusively
  // to eventLead (organizer managers). A sweep can report but cannot depart.
  bool get isManager => switch (operator.authority) {
    AssistanceCanConfirmDeparture(
      checkpointReporter: AssistanceCheckpointReporter.anyAuthorizedOperator,
    ) =>
      true,
    _ => false,
  };
  bool get canResolve =>
      checkpoint.request != null &&
      (isManager || checkpoint.request!.responsibleOperatorId == actorUid);
  bool get canReassign =>
      isManager &&
      checkpoint.reporterOptions.value != null &&
      checkpoint.assignment.value != null &&
      checkpoint.assignment.value!.revision < 9007199254740991 &&
      checkpoint.availability is AssistanceCheckpointRoster &&
      checkpoint.request != null &&
      !{
        AssistanceCheckpointRequestState.complete,
        AssistanceCheckpointRequestState.closedOut,
      }.contains(checkpoint.request!.state);
  bool get canClose {
    final closeout = checkpoint.closeout.value;
    final roster = checkpoint.availability;
    return canResolve &&
        closeout != null &&
        closeout.revision < 9007199254740991 &&
        closeout.eligibility is AssistanceCheckpointCloseoutReady &&
        closeout.state.kind != AssistanceCheckpointCloseoutKind.closedOut &&
        roster is AssistanceCheckpointRoster &&
        roster.status == AssistanceCheckpointReportStatus.partial &&
        checkpoint.report != null &&
        roster.members
            .where((m) => !m.accountedFor)
            .every(
              (m) =>
                  m.visit is AssistanceCheckpointCurrentVisit &&
                  m.disposition is AssistanceCheckpointResolvedDisposition,
            );
  }

  bool get canReopen =>
      canResolve &&
      checkpoint.closeout.value != null &&
      checkpoint.closeout.value!.revision < 9007199254740991 &&
      checkpoint.closeout.value!.change?.decision
          is AssistanceCheckpointClosed &&
      checkpoint.request!.state != AssistanceCheckpointRequestState.complete;
}

sealed class CheckpointRequestDecision {
  CheckpointRequestDecision(String reason) : reason = reason.trim() {
    assistanceText(this.reason, 500);
  }
  final String reason;
}

final class ReassignCheckpointReporter extends CheckpointRequestDecision {
  ReassignCheckpointReporter({required this.reporterId, required String reason})
    : super(reason) {
    assistanceText(reporterId, 128);
    if (reporterId.contains('/')) {
      throw const FormatException('Choose a valid reporter account.');
    }
  }
  final String reporterId;
}

final class CloseCheckpointRequest extends CheckpointRequestDecision {
  CloseCheckpointRequest(super.reason);
}

final class ReopenCheckpointRequest extends CheckpointRequestDecision {
  ReopenCheckpointRequest(super.reason);
}

/// A reviewed action owns its independent hash/revision and immutable retry ID.
final class EventAssistanceCheckpointRequestChange {
  EventAssistanceCheckpointRequestChange({
    required this.review,
    required this.decision,
    required this.operationId,
  }) {
    assistanceId(operationId);
    final allowed = switch (decision) {
      ReassignCheckpointReporter(:final reporterId) =>
        review.canReassign &&
            review.checkpoint.reporterOptions.value!.contains(reporterId) &&
            reporterId != snapshot.request!.responsibleOperatorId,
      CloseCheckpointRequest() => review.canClose,
      ReopenCheckpointRequest() => review.canReopen,
    };
    if (!allowed) {
      throw const FormatException(
        'Review a permitted checkpoint request action.',
      );
    }
  }
  final EventAssistanceCheckpointRequestReview review;
  final CheckpointRequestDecision decision;
  final String operationId;
  EventAssistanceCheckpointView get snapshot => review.checkpoint;
  String get actorUid => review.actorUid;
  bool get isReassignment => decision is ReassignCheckpointReporter;
  int get expectedRevision => isReassignment
      ? snapshot.assignment.value!.revision
      : snapshot.closeout.value!.revision;
  String get sourceHash => isReassignment
      ? snapshot.assignment.value!.sourceHash
      : snapshot.closeout.value!.sourceHash;
  Map<String, Object?> get command => {
    'kind': isReassignment
        ? 'reassignCheckpointReporter'
        : 'setCheckpointCloseout',
    'context': snapshot.scope.group.context,
    'eventId': snapshot.scope.group.eventId,
    'operationId': operationId,
    'payload': {
      'groupId': snapshot.scope.group.groupId,
      'checkpointId': snapshot.scope.checkpointId,
      'expectedProgressRevision': snapshot.scope.progressRevision,
      'reason': decision.reason,
      if (decision case ReassignCheckpointReporter(:final reporterId)) ...{
        'expectedAssignmentRevision': expectedRevision,
        'responsibleOperatorId': reporterId,
      } else ...{
        'expectedCloseoutRevision': expectedRevision,
        'decision': decision is CloseCheckpointRequest ? 'close' : 'reopen',
      },
    },
  };

  void requireResult(EventAssistanceCheckpointResult result) {
    final next = result.view;
    final priorReport = snapshot.report;
    final currentReport = next.report;
    final revision = isReassignment
        ? next.assignment.value?.revision
        : next.closeout.value?.revision;
    if (next.scope != snapshot.scope ||
        next.serverTime < review.serverTime ||
        result.outcome == AssistanceCheckpointOutcome.read ||
        result.operationRevision != expectedRevision + 1 ||
        revision == null ||
        revision < result.operationRevision! ||
        next.request == null ||
        next.request!.dueAt != snapshot.request!.dueAt ||
        priorReport != null &&
            (currentReport == null ||
                currentReport.reportId != priorReport.reportId ||
                currentReport.rosterId != priorReport.rosterId ||
                currentReport.rosterHash != priorReport.rosterHash ||
                currentReport.createdAt != priorReport.createdAt ||
                currentReport.revision < priorReport.revision)) {
      throw const FormatException(
        'Checkpoint receipt does not confirm this request.',
      );
    }
    final originalRoster = snapshot.availability;
    final currentRoster = next.availability;
    if (originalRoster is AssistanceCheckpointRoster &&
        currentRoster is AssistanceCheckpointRoster &&
        originalRoster.rosterId != currentRoster.rosterId) {
      throw const FormatException(
        'Checkpoint retry changed the original departure roster.',
      );
    }
    // A replay returns the current report, reporter and closeout, including later changes.
    if (result.outcome == AssistanceCheckpointOutcome.replayed) return;
    if (revision != result.operationRevision ||
        next.sourceHash != snapshot.sourceHash ||
        next.revision != snapshot.revision ||
        !_sameReport(next.report, snapshot.report)) {
      throw const FormatException('Request action changed arrival evidence.');
    }
    if (decision case ReassignCheckpointReporter(:final reporterId)) {
      final saved = next.assignment.value!.change;
      if (saved == null ||
          saved.assignedBy != actorUid ||
          saved.assignedAt < review.serverTime ||
          saved.reason != decision.reason ||
          saved.responsibleOperatorId != reporterId ||
          saved.previousResponsibleOperatorId !=
              snapshot.request!.responsibleOperatorId ||
          next.request!.responsibleOperatorId != reporterId ||
          next.request!.ownerAvailability !=
              AssistanceCheckpointOwnerAvailability.current) {
        throw const FormatException(
          'Checkpoint reporter confirmation changed.',
        );
      }
    } else {
      final saved = next.closeout.value!.change;
      if (saved == null ||
          saved.changedBy != actorUid ||
          saved.changedAt < review.serverTime ||
          saved.previousRevision != expectedRevision ||
          saved.reason != decision.reason ||
          next.request!.responsibleOperatorId !=
              snapshot.request!.responsibleOperatorId ||
          next.assignment.value?.revision !=
              snapshot.assignment.value?.revision ||
          next.assignment.value?.sourceHash !=
              snapshot.assignment.value?.sourceHash) {
        throw const FormatException(
          'Checkpoint closeout confirmation changed.',
        );
      }
      if (decision is CloseCheckpointRequest) {
        final proof = saved.decision;
        if (proof is! AssistanceCheckpointClosed ||
            next.closeout.value!.state.kind !=
                AssistanceCheckpointCloseoutKind.closedOut ||
            !_sameReport(proof.report, snapshot.report)) {
          throw const FormatException('Checkpoint closeout proof changed.');
        }
        final members = (snapshot.availability as AssistanceCheckpointRoster)
            .members
            .where((m) => !m.accountedFor)
            .toList();
        if (proof.dispositions.length != members.length ||
            members.any(
              (m) => !_sameDisposition(
                proof.dispositions[m.attendeeId],
                m.disposition as AssistanceCheckpointResolvedDisposition,
              ),
            )) {
          throw const FormatException(
            'Checkpoint closeout replaced reviewed visit evidence.',
          );
        }
      } else if (saved.decision is! AssistanceCheckpointReopened ||
          next.closeout.value!.state.kind !=
              AssistanceCheckpointCloseoutKind.reopened) {
        throw const FormatException('Checkpoint request was not reopened.');
      }
    }
  }
}

bool _sameReport(
  AssistanceCheckpointReport? a,
  AssistanceCheckpointReport? b,
) => a == null || b == null
    ? a == b
    : a.scope == b.scope &&
          a.reportId == b.reportId &&
          a.rosterId == b.rosterId &&
          a.rosterHash == b.rosterHash &&
          a.revision == b.revision &&
          a.createdAt == b.createdAt &&
          a.reportedAt == b.reportedAt &&
          a.reportedBy == b.reportedBy &&
          a.correctionReason == b.correctionReason &&
          a.accountedFor.length == b.accountedFor.length &&
          Iterable<int>.generate(
            a.accountedFor.length,
          ).every((i) => a.accountedFor[i] == b.accountedFor[i]);

bool _sameDisposition(
  AssistanceCheckpointResolvedDisposition? a,
  AssistanceCheckpointResolvedDisposition b,
) =>
    a != null &&
    a.disposition == b.disposition &&
    a.revision == b.revision &&
    a.resolvedAt == b.resolvedAt &&
    a.resolvedBy == b.resolvedBy &&
    a.sourceHash == b.sourceHash;
