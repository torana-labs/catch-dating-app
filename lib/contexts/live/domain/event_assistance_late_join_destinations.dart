import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_destination.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_setup.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_observation.dart';

/// Defaults within a selected family include all verified joining points.
/// Choosing a family is explicit; it never replaces a stale saved destination.
List<LateJoinDestination> lateJoinDestinationPresets(
  LateJoinSettingSetup setup,
) {
  final itineraries = <String, List<String>>{};
  final checkpoints = <({String routeId, String groupId}), List<String>>{};
  final fixed = <LateJoinFixedPlace>[];
  for (final option in setup.destinations) {
    switch (option.target) {
      case AssistanceFixedPlace(:final placeId, :final lateEntry):
        fixed.add(
          LateJoinFixedPlace(
            placeId: placeId,
            lateEntry: switch (lateEntry) {
              AssistanceLateEntry.allowed => LateEntryRule.allowed,
              AssistanceLateEntry.hostDecision => LateEntryRule.hostDecision,
              AssistanceLateEntry.closed => LateEntryRule.closed,
            },
          ),
        );
      case AssistanceItineraryStop(:final itineraryId, :final stopId):
        (itineraries[itineraryId] ??= []).add(stopId);
      case AssistanceGroupCheckpoint(
        :final routeId,
        :final groupId,
        :final checkpointId,
      ):
        (checkpoints[(routeId: routeId, groupId: groupId)] ??= []).add(
          checkpointId,
        );
    }
  }
  return List.unmodifiable([
    const LateJoinConfirmedProgress(),
    ...fixed,
    for (final e in itineraries.entries)
      LateJoinItinerary(itineraryId: e.key, permittedStopIds: e.value),
    for (final e in checkpoints.entries)
      LateJoinGroupCheckpoints(
        routeId: e.key.routeId,
        groupId: e.key.groupId,
        permittedCheckpointIds: e.value,
      ),
  ]);
}

bool sameLateJoinDestinationFamily(
  LateJoinDestination a,
  LateJoinDestination b,
) => switch ((a, b)) {
  (LateJoinConfirmedProgress(), LateJoinConfirmedProgress()) => true,
  (
    LateJoinFixedPlace(placeId: final first),
    LateJoinFixedPlace(placeId: final second),
  ) =>
    first == second,
  (
    LateJoinItinerary(itineraryId: final first),
    LateJoinItinerary(itineraryId: final second),
  ) =>
    first == second,
  (
    LateJoinGroupCheckpoints(routeId: final routeA, groupId: final groupA),
    LateJoinGroupCheckpoints(routeId: final routeB, groupId: final groupB),
  ) =>
    routeA == routeB && groupA == groupB,
  _ => false,
};
