part of 'event_rehearsal_assistance_command.dart';

/// A current review is required; callers cannot supply a different visit hash.
final class RehearsalResolveAccountability extends RehearsalAssistanceCommand {
  RehearsalResolveAccountability({
    required this.snapshot,
    required this.disposition,
  }) : super(snapshot.actorId) {
    assistanceInteger(snapshot.evidence.revision + 1);
  }
  final RehearsalActionableAccountability snapshot;
  final AssistanceVisitDisposition disposition;
  @override
  String get kind => 'resolveAccountability';
  @override
  Map<String, Object?> toJson() => {
    'kind': kind,
    'actorId': actorId,
    if (snapshot.staffReview?.practiceOperatorId != null)
      'groupId': snapshot.groupId,
    'expectedSourceHash': snapshot.evidence.sourceHash,
    'payload': {
      'attendeeId': actorId,
      'episodeId': snapshot.scope.episodeId,
      'disposition': disposition.name,
    },
  };

  void _requireResult(
    EventRehearsalSession before,
    EventRehearsalBootstrap result,
  ) {
    final rows = result.accountabilityReviews;
    final next = rows?.rows.where((r) => r.scope == snapshot.scope).firstOrNull;
    final old = snapshot.evidence;
    final current = next?.evidence;
    final immediate =
        result.session.runtimeRevision == before.runtimeRevision + 1;
    final receipts = result.actions.where(
      (a) => a.runtimeRevision == before.runtimeRevision + 1,
    );
    if (rows?.clockId != snapshot.scope.clockId ||
        current == null ||
        current.revision < old.revision + 1 ||
        current.visitRevision == null ||
        current.visitRevision! < old.visitRevision! ||
        current.sourceHash == old.sourceHash ||
        result.session.virtualNow.isBefore(before.virtualNow) ||
        result.session.actionCount < before.actionCount + 1 ||
        receipts.length != 1 ||
        receipts.single.virtualNow != before.virtualNow ||
        current.visitRevision == old.visitRevision &&
            current.checkedInAtMillis != old.checkedInAtMillis) {
      throw const FormatException('Practice response lost its visit decision.');
    }
    if (immediate &&
        (current.revision != old.revision + 1 ||
            current.visitRevision != old.visitRevision ||
            current.checkedInAtMillis != old.checkedInAtMillis ||
            current.disposition != disposition ||
            current.availability is! RehearsalVisitReady ||
            result.session.status != before.status ||
            result.session.virtualNow != before.virtualNow)) {
      throw const FormatException(
        'Practice confirmation changed the decision.',
      );
    }
    // Later receipts preserve subsequent visits and corrections. The parent
    // action proves the original operation without restoring its older result.
  }
}
