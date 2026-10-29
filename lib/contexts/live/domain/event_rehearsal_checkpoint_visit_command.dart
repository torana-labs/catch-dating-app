part of 'event_rehearsal_movement_command.dart';

/// Records a visit outcome against the exact departure being reviewed.
final class RehearsalResolveCheckpointVisit extends RehearsalMovementCommand {
  RehearsalResolveCheckpointVisit({
    required RehearsalMovementReview snapshot,
    required this.visit,
    required this.disposition,
  }) : super(snapshot) {
    final rows = snapshot.checkpoint?.accountabilityReviews.value;
    if (!visit.canResolve ||
        rows == null ||
        !rows.any((r) => identical(r, visit))) {
      throw const FormatException('Review a current original departure visit.');
    }
  }
  final RehearsalCheckpointVisitReview visit;
  final AssistanceVisitDisposition disposition;
  @override
  String get kind => 'resolveAccountability';
  @override
  int get selectedRevision => snapshot.checkpoint!.progressRevision;
  @override
  Map<String, Object?> toJson() => {
    'kind': kind,
    'expectedSourceHash': visit.sourceHash,
    'payload': {
      'groupId': snapshot.scope.groupId,
      'checkpointId': snapshot.checkpoint!.checkpointId,
      'expectedProgressRevision': selectedRevision,
      'attendeeId': visit.attendeeId,
      'expectedAccountabilityRevision': visit.revision,
      'disposition': disposition.name,
    },
  };

  void _requireResult(RehearsalMovementReview next, bool immediate) {
    final checkpoint = next.checkpoint;
    final row = checkpoint?.accountabilityReviews.value
        ?.where((r) => r.attendeeId == visit.attendeeId)
        .firstOrNull;
    if (checkpoint == null ||
        row == null ||
        row.visitHash != visit.visitHash ||
        checkpoint.departure.hash != snapshot.checkpoint!.departure.hash ||
        immediate &&
            (jsonEncode(next.selected!.toJson()) !=
                    jsonEncode(snapshot.selected!.toJson()) ||
                row.revision != visit.revision + 1 ||
                row.disposition != disposition ||
                row.availability is! AssistanceAccountabilityReady) ||
        !immediate &&
            row.availability is AssistanceAccountabilityReady &&
            row.revision < visit.revision + 1) {
      throw const FormatException(
        'Checkpoint response does not confirm this visit decision.',
      );
    }
  }
}
