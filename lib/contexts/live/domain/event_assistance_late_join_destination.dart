import 'package:catch_dating_app/contexts/live/domain/event_assistance_observation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';

enum LateEntryRule { allowed, hostDecision, closed }

/// A policy permits joining places; it never claims a group's live position.
sealed class LateJoinDestination {
  const LateJoinDestination();

  factory LateJoinDestination.fromJson(Object? value) {
    final map = assistanceObject(value);
    return switch (map['kind']) {
      'confirmedGroupProgress' => _confirmed(map),
      'fixedPlace' => _fixed(map),
      'itineraryStop' => _itinerary(map),
      'groupCheckpoint' => _checkpoint(map),
      _ => throw const FormatException('Unknown joining destination.'),
    };
  }

  Map<String, Object?> toJson();

  /// Scope compatibility only; this does not authorize entry or dispatch.
  bool permits(AssistanceJoiningTarget candidate) => switch (this) {
    LateJoinConfirmedProgress() => false,
    LateJoinFixedPlace(:final placeId, :final lateEntry) =>
      candidate is AssistanceFixedPlace &&
          candidate.placeId == placeId &&
          candidate.lateEntry.name == lateEntry.name,
    LateJoinItinerary(:final itineraryId, :final permittedStopIds) =>
      candidate is AssistanceItineraryStop &&
          candidate.itineraryId == itineraryId &&
          permittedStopIds.contains(candidate.stopId),
    LateJoinGroupCheckpoints(
      :final routeId,
      :final groupId,
      :final permittedCheckpointIds,
    ) =>
      candidate is AssistanceGroupCheckpoint &&
          candidate.routeId == routeId &&
          candidate.groupId == groupId &&
          permittedCheckpointIds.contains(candidate.checkpointId),
  };
}

final class LateJoinConfirmedProgress extends LateJoinDestination {
  const LateJoinConfirmedProgress();
  @override
  Map<String, Object?> toJson() => {'kind': 'confirmedGroupProgress'};
}

final class LateJoinFixedPlace extends LateJoinDestination {
  LateJoinFixedPlace({required this.placeId, required this.lateEntry}) {
    assistanceId(placeId);
  }
  final String placeId;
  final LateEntryRule lateEntry;
  @override
  Map<String, Object?> toJson() => {
    'kind': 'fixedPlace',
    'placeId': placeId,
    'lateEntry': lateEntry.name,
  };
}

final class LateJoinItinerary extends LateJoinDestination {
  LateJoinItinerary({
    required this.itineraryId,
    required List<String> permittedStopIds,
  }) : permittedStopIds = _places(permittedStopIds) {
    assistanceText(itineraryId);
  }
  final String itineraryId;
  final List<String> permittedStopIds;
  @override
  Map<String, Object?> toJson() => {
    'kind': 'itineraryStop',
    'itineraryId': itineraryId,
    'permittedStopIds': [...permittedStopIds],
  };
}

final class LateJoinGroupCheckpoints extends LateJoinDestination {
  LateJoinGroupCheckpoints({
    required this.routeId,
    required this.groupId,
    required List<String> permittedCheckpointIds,
  }) : permittedCheckpointIds = _places(permittedCheckpointIds) {
    assistanceText(routeId);
    assistanceId(groupId);
  }
  final String routeId;
  final String groupId;
  final List<String> permittedCheckpointIds;
  @override
  Map<String, Object?> toJson() => {
    'kind': 'groupCheckpoint',
    'routeId': routeId,
    'groupId': groupId,
    'permittedCheckpointIds': [...permittedCheckpointIds],
  };
}

LateJoinDestination _confirmed(Map<Object?, Object?> map) {
  assistanceObject(map, {'kind'});
  return const LateJoinConfirmedProgress();
}

LateJoinDestination _fixed(Map<Object?, Object?> map) {
  assistanceObject(map, {'kind', 'placeId', 'lateEntry'});
  return LateJoinFixedPlace(
    placeId: assistanceId(map['placeId']),
    lateEntry: assistanceEnum(LateEntryRule.values, map['lateEntry']),
  );
}

LateJoinDestination _itinerary(Map<Object?, Object?> map) {
  assistanceObject(map, {'kind', 'itineraryId', 'permittedStopIds'});
  return LateJoinItinerary(
    itineraryId: assistanceText(map['itineraryId']),
    permittedStopIds: _places(map['permittedStopIds']),
  );
}

LateJoinDestination _checkpoint(Map<Object?, Object?> map) {
  assistanceObject(map, {
    'kind',
    'routeId',
    'groupId',
    'permittedCheckpointIds',
  });
  return LateJoinGroupCheckpoints(
    routeId: assistanceText(map['routeId']),
    groupId: assistanceId(map['groupId']),
    permittedCheckpointIds: _places(map['permittedCheckpointIds']),
  );
}

List<String> _places(Object? value) {
  if (value is! List || value.isEmpty || value.length > 1000) {
    throw const FormatException('Choose between one and 1000 joining points.');
  }
  final result = value.map(assistanceText).toList(growable: false);
  if (result.toSet().length != result.length) {
    throw const FormatException('Duplicate joining point.');
  }
  return List.unmodifiable(result);
}
