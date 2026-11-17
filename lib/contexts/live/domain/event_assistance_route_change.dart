import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_observation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';

/// The event lead's frozen decision to move a departed group to another
/// alternative of the event route. It mirrors the practice route change:
/// the reviewed revision and source travel with it, and a refreshed view
/// needs a new explicit decision. Reuse this object, and its operation and
/// decision IDs, after an ambiguous transport failure.
final class EventAssistanceRouteChange {
  const EventAssistanceRouteChange._({
    required this.snapshot,
    required this.operationId,
    required this.decisionId,
    required this.alternativeId,
    required this.destination,
  });

  factory EventAssistanceRouteChange.prepare({
    required EventAssistanceGroupProgressView snapshot,
    required String operationId,
    required String decisionId,
    required String alternativeId,
  }) {
    assistanceId(operationId);
    assistanceId(decisionId);
    if (!snapshot.canChangeRoute) {
      throw StateError('Route changes are unavailable.');
    }
    final choices = snapshot.destinations.where(
      (item) => item.alternativeId == alternativeId,
    );
    if (choices.length != 1 ||
        choices.single.target == snapshot.progress!.destination) {
      throw ArgumentError('Review a current route alternative.');
    }
    return EventAssistanceRouteChange._(
      snapshot: snapshot,
      operationId: operationId,
      decisionId: decisionId,
      alternativeId: alternativeId,
      destination: choices.single.target,
    );
  }

  final EventAssistanceGroupProgressView snapshot;
  final String operationId;
  final String decisionId;
  final String alternativeId;
  final AssistanceJoiningTarget destination;

  /// The receipt names this decision's revision; when the group has not
  /// moved on since, the view carries this destination and decision.
  void requireResult(EventAssistanceGroupProgressResult result) {
    if (result.view.scope != snapshot.scope ||
        result.view.actorUid != snapshot.actorUid ||
        result.view.serverTime < snapshot.serverTime ||
        result.outcome == AssistanceProgressOutcome.read ||
        result.operationRevision != snapshot.revision + 1) {
      throw const FormatException('Invalid route change receipt.');
    }
    if (result.view.revision == result.operationRevision &&
        (result.view.progress?.destination != destination ||
            result.view.progress?.routeDecisionId != decisionId ||
            result.view.progress?.confirmedBy != snapshot.actorUid)) {
      throw const FormatException(
        'Route change receipt does not match the decision.',
      );
    }
  }

  Map<String, Object?> get command => {
    'kind': 'changeRoute',
    'context': snapshot.scope.context,
    'eventId': snapshot.scope.eventId,
    'operationId': operationId,
    'payload': {
      'routeRevision': snapshot.revision,
      'groupId': snapshot.scope.groupId,
      'expectedSourceHash': snapshot.sourceHash,
      'alternativeId': alternativeId,
      'decisionId': decisionId,
    },
  };
}
