import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';

/// Explicit complete observation set; an empty set is an intentional report.
final class AssistanceCheckpointObservation {
  AssistanceCheckpointObservation(
    Iterable<String> accountedFor, {
    String? correctionReason,
  }) : accountedFor = List.unmodifiable(accountedFor.toList()..sort()),
       correctionReason = correctionReason?.trim() {
    if (this.accountedFor.length > 1000 ||
        this.accountedFor.toSet().length != this.accountedFor.length) {
      throw const FormatException(
        'Select at most 1,000 distinct departure members.',
      );
    }
    for (final id in this.accountedFor) {
      assistanceId(id);
    }
    if (this.correctionReason case final reason?) {
      if (reason.isEmpty || reason.length > 500) {
        throw const FormatException(
          'Explain the correction in at most 500 characters.',
        );
      }
    }
  }
  final List<String> accountedFor;
  final String? correctionReason;
}

final class EventAssistanceCheckpointChange {
  EventAssistanceCheckpointChange({
    required this.snapshot,
    required this.decision,
    required this.actorUid,
    required this.operationId,
  }) {
    assistanceText(actorUid);
    assistanceId(operationId);
    assistanceInteger(snapshot.revision + 1);
    requireCheckpointObservation(
      availability: snapshot.availability,
      previouslyAccountedFor: snapshot.report?.accountedFor ?? const [],
      decision: decision,
    );
  }
  final EventAssistanceCheckpointView snapshot;
  final AssistanceCheckpointObservation decision;
  final String actorUid, operationId;
  Map<String, Object?> get command => {
    'kind': 'recordCheckpoint',
    'context': snapshot.scope.group.context,
    'eventId': snapshot.scope.group.eventId,
    'operationId': operationId,
    'payload': {
      'groupId': snapshot.scope.group.groupId,
      'checkpointId': snapshot.scope.checkpointId,
      'expectedProgressRevision': snapshot.scope.progressRevision,
      'expectedCheckpointRevision': snapshot.revision,
      'accountedFor': decision.accountedFor.toList(),
      'correctionReason': decision.correctionReason,
    },
  };
  void requireResult(EventAssistanceCheckpointResult result) {
    final next = result.view;
    final report = next.report;
    final prior = snapshot.report;
    if (next.scope != snapshot.scope ||
        next.serverTime < snapshot.serverTime ||
        result.outcome == AssistanceCheckpointOutcome.read ||
        result.operationRevision != snapshot.revision + 1 ||
        report == null ||
        report.revision < result.operationRevision! ||
        report.rosterId !=
            (snapshot.availability as AssistanceCheckpointRoster).rosterId ||
        prior != null &&
            (report.rosterHash != prior.rosterHash ||
                report.reportId != prior.reportId ||
                report.createdAt != prior.createdAt)) {
      throw const FormatException(
        'Checkpoint receipt does not confirm this departure report.',
      );
    }
    // A retry returns current observations, including later corrections.
    if (result.outcome == AssistanceCheckpointOutcome.replayed) return;
    if (report.revision != result.operationRevision ||
        !next.canReport ||
        report.reportedBy != actorUid ||
        report.reportedAt != next.serverTime ||
        prior == null && report.createdAt != next.serverTime ||
        report.correctionReason != decision.correctionReason ||
        report.accountedFor.length != decision.accountedFor.length ||
        Iterable<int>.generate(
          report.accountedFor.length,
        ).any((i) => report.accountedFor[i] != decision.accountedFor[i])) {
      throw const FormatException(
        'Checkpoint confirmation changed the intended observations.',
      );
    }
  }
}

/// The same visit and correction rules apply to live and synthetic reports.
void requireCheckpointObservation({
  required AssistanceCheckpointAvailability availability,
  required List<String> previouslyAccountedFor,
  required AssistanceCheckpointObservation decision,
}) {
  if (availability is! AssistanceCheckpointRoster) {
    throw const FormatException(
      'Review the recorded checkpoint roster before reporting.',
    );
  }
  final prior = previouslyAccountedFor.toSet();
  final members = {for (final m in availability.members) m.attendeeId: m};
  for (final id in decision.accountedFor) {
    final member = members[id];
    if (member == null || !prior.contains(id) && !member.canAddObservation) {
      throw const FormatException(
        'New observations must match the original departure visit.',
      );
    }
  }
  if (prior.any((id) => !decision.accountedFor.contains(id)) &&
      decision.correctionReason == null) {
    throw const FormatException(
      'Explain why an earlier observation is being removed.',
    );
  }
}
