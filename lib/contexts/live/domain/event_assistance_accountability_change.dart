import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';

/// One explicit visit result, including an explicit correction to unresolved.
/// The source hash fences the exact physical check-in, even without assistance.
final class EventAssistanceAccountabilityChange {
  EventAssistanceAccountabilityChange({
    required this.snapshot,
    required this.disposition,
    required this.operationId,
  }) {
    assistanceId(operationId);
    assistanceInteger(snapshot.revision + 1);
    if (!snapshot.canResolve) {
      throw const FormatException(
        'This visit cannot be resolved from this review.',
      );
    }
  }
  final EventAssistanceAccountabilityView snapshot;
  final AssistanceVisitDisposition disposition;
  final String operationId;
  Map<String, Object?> get command => {
    'kind': 'resolveAccountability',
    'context': snapshot.scope.group.context,
    'eventId': snapshot.scope.group.eventId,
    'operationId': operationId,
    'payload': {
      'attendeeId': snapshot.scope.attendeeId,
      'episodeId': snapshot.episodeId,
      'disposition': disposition.name,
    },
  };

  void requireResult(EventAssistanceAccountabilityResult result) {
    final next = result.view;
    if (next.scope != snapshot.scope ||
        next.serverTime < snapshot.serverTime ||
        next.episodeId != snapshot.episodeId ||
        result.outcome == AssistanceAccountabilityOutcome.read ||
        result.operationRevision != snapshot.revision + 1 ||
        next.revision < result.operationRevision!) {
      throw const FormatException(
        'Accountability receipt does not confirm this visit decision.',
      );
    }
    // Replays preserve a later correction. The server also verifies the original
    // check-in, registration, event generation and recorded departure evidence.
    if (result.outcome == AssistanceAccountabilityOutcome.replayed) return;
    if (next.revision != result.operationRevision ||
        !next.canResolve ||
        next.disposition != disposition) {
      throw const FormatException(
        'Accountability confirmation changed the intended result.',
      );
    }
  }
}
