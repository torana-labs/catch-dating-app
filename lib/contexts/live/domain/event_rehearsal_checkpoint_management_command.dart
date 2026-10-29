part of 'event_rehearsal_movement_command.dart';

/// Shares the live decision vocabulary and the group's existing pending slot.
final class RehearsalManageCheckpoint extends RehearsalMovementCommand {
  RehearsalManageCheckpoint({
    required RehearsalMovementReview snapshot,
    required this.decision,
  }) : super(snapshot) {
    final request = snapshot.checkpoint?.request;
    final permissions = RehearsalCheckpointRequestPermissions(snapshot);
    final allowed = switch (decision) {
      ReassignCheckpointReporter(:final reporterId) =>
        permissions.canReassign &&
            snapshot.checkpoint!.reporterOptions.value!.contains(reporterId) &&
            reporterId != request!.responsibleOperatorId,
      CloseCheckpointRequest() => permissions.canClose,
      ReopenCheckpointRequest() => permissions.canReopen,
    };
    if (decision case ReassignCheckpointReporter(:final reporterId)) {
      if (snapshot.staffReview != null &&
          reporterId.startsWith('practice-staff:')) {
        final until = snapshot.staffReview!.operatorPermissionUntil(
          reporterId,
          snapshot.scope.groupId,
          AssistanceGroupPermission.recordCheckpoint,
        );
        if (until == null || request == null || until <= request.dueAt) {
          throw const FormatException(
            'The reporter needs duty beyond the original deadline.',
          );
        }
      }
    }
    if (!allowed) {
      throw const FormatException('Review a permitted checkpoint action.');
    }
  }
  final CheckpointRequestDecision decision;
  bool get isReassignment => decision is ReassignCheckpointReporter;
  @override
  String get kind =>
      isReassignment ? 'reassignCheckpointReporter' : 'setCheckpointCloseout';
  @override
  int get selectedRevision => snapshot.checkpoint!.progressRevision;
  @override
  Map<String, Object?> toJson() {
    final c = snapshot.checkpoint!;
    return {
      'kind': kind,
      'expectedSourceHash': isReassignment
          ? c.assignment.value!.sourceHash
          : c.closeout.value!.sourceHash,
      'payload': {
        'groupId': snapshot.scope.groupId,
        'expectedProgressRevision': selectedRevision,
        'checkpointId': c.checkpointId,
        'reason': decision.reason,
        ...switch (decision) {
          ReassignCheckpointReporter(:final reporterId) => {
            'expectedAssignmentRevision': c.assignment.value!.revision,
            'responsibleOperatorId': reporterId,
          },
          CloseCheckpointRequest() || ReopenCheckpointRequest() => {
            'expectedCloseoutRevision': c.closeout.value!.revision,
            'decision': decision is CloseCheckpointRequest ? 'close' : 'reopen',
          },
        },
      },
    };
  }

  void _requireResult(
    RehearsalMovementReview next,
    String operationId,
    bool immediate,
  ) {
    final old = snapshot.checkpoint!;
    final record = next.selected!;
    final checkpoint = next.checkpoint;
    if (checkpoint == null ||
        record.departure.hash != old.departure.hash ||
        (record.report?.revision ?? 0) < old.revision ||
        immediate &&
            (checkpoint.sourceHash != old.sourceHash ||
                !_sameManagement(
                  record.report?.toJson(),
                  old.report?.toJson(),
                ))) {
      throw const FormatException(
        'Checkpoint management changed arrival evidence.',
      );
    }
    switch (decision) {
      case ReassignCheckpointReporter(:final reporterId):
        final a = record.assignment;
        final expected = old.assignment.value!.revision + 1;
        if (a == null ||
            a.revision < expected ||
            immediate &&
                (a.revision != expected ||
                    !_sameManagement(
                      record.closeout?.toJson(),
                      old.record.closeout?.toJson(),
                    )) ||
            a.revision == expected &&
                (a.operationId != operationId ||
                    a.assignedBy != snapshot.actorUid ||
                    a.assignedAt != snapshot.serverTime ||
                    a.reason != decision.reason ||
                    a.responsibleOperatorId != reporterId ||
                    a.previousResponsibleOperatorId !=
                        old.request!.responsibleOperatorId)) {
          throw const FormatException(
            'Response changed the reviewed reporter decision.',
          );
        }
      case CloseCheckpointRequest() || ReopenCheckpointRequest():
        final c = record.closeout;
        final expected = old.closeout.value!.revision + 1;
        if (c == null ||
            c.revision < expected ||
            immediate &&
                (c.revision != expected ||
                    !_sameManagement(
                      record.assignment?.toJson(),
                      old.record.assignment?.toJson(),
                    )) ||
            c.revision == expected &&
                (c.operationId != operationId ||
                    c.changedBy != snapshot.actorUid ||
                    c.changedAt != snapshot.serverTime ||
                    c.reason != decision.reason ||
                    (c.decision is RehearsalCheckpointClosed) !=
                        (decision is CloseCheckpointRequest))) {
          throw const FormatException(
            'Response changed the reviewed closeout decision.',
          );
        }
        if (c.revision == expected) {
          if (c.decision case RehearsalCheckpointClosed(
            :final report,
            :final dispositions,
          )) {
            if (!_sameManagement(report.toJson(), old.report!.toJson())) {
              throw const FormatException(
                'Closeout changed the reviewed report.',
              );
            }
            final roster = old.availability as AssistanceCheckpointRoster;
            final missing = roster.members.where(
              (m) => !report.accountedFor.contains(m.attendeeId),
            );
            if (missing.length != dispositions.length ||
                missing.any((m) {
                  final proof = m.disposition;
                  final saved = dispositions[m.attendeeId];
                  return proof is! AssistanceCheckpointResolvedDisposition ||
                      saved == null ||
                      saved.sourceHash != proof.sourceHash ||
                      saved.disposition != proof.disposition ||
                      saved.revision != proof.revision ||
                      saved.resolvedAt != proof.resolvedAt ||
                      saved.resolvedBy != proof.resolvedBy;
                })) {
              throw const FormatException(
                'Closeout changed the reviewed guest evidence.',
              );
            }
          }
        }
    }
  }
}

bool _sameManagement(Object? a, Object? b) => jsonEncode(a) == jsonEncode(b);
