import 'package:catch_dating_app/contexts/live/domain/event_assistance_departure.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_observation.dart';

/// A host's selections before the transport-specific, source-bound review.
final class EventAssistanceDepartureDraft {
  const EventAssistanceDepartureDraft({
    required this.destination,
    this.roster,
    this.checkpoint,
  });
  final AssistanceJoiningTarget destination;
  final EventAssistanceDepartureRosterSelection? roster;
  final AssistanceDepartureCheckpointRequest? checkpoint;
}

typedef EventAssistanceDepartureOption = ({
  AssistanceJoiningTarget target,
  String label,
  String detail,
});
typedef EventAssistanceDepartureGuest = ({String id, String name});
