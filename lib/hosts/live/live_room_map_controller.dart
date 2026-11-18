import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_models.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_playbooks/modules.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_structure.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_layout.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_runtime.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:flutter/foundation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'live_room_map_controller.g.dart';

/// Tonight's room as the seat map draws it: the saved layout, who sits
/// where in the step on now, their names, and the plan's fence for a move.
@immutable
class HostLiveRoomMap {
  const HostLiveRoomMap({
    required this.layout,
    required this.assignments,
    required this.revision,
    this.profiles = const <PublicProfile>[],
  });

  final EventSuccessLayout layout;

  /// Rotation seats while a rotation step is on, table seats otherwise.
  final List<EventSuccessAssignment> assignments;
  final List<PublicProfile> profiles;

  /// The plan's live-control revision every move is fenced on.
  final int revision;
}

/// Whether [plan] seats guests by a saved room layout: a layout and units
/// smaller than the whole group.
bool hostLiveSeatsByLayout(EventSuccessPlan? plan) =>
    plan?.layoutId != null &&
    plan?.structureConfig.unitKind != EventSuccessUnitKind.wholeGroup;

/// The seat map for [event], or null when the night has no saved layout or
/// it is still read. It reads the plan, the selected layout, the group and
/// rotation assignments and the seated guests' names through the listeners
/// and profile read the old console used.
@riverpod
HostLiveRoomMap? hostLiveRoomMap(Ref ref, Event event) {
  final plan = ref.watch(watchEventSuccessPlanProvider(event.id)).value;
  final layoutId = plan?.layoutId;
  if (plan == null || layoutId == null || !hostLiveSeatsByLayout(plan)) {
    return null;
  }
  final layout = ref
      .watch(
        watchEventSuccessSelectedLayoutProvider(
          organizerId: event.organizerId,
          layoutId: layoutId,
        ),
      )
      .value;
  if (layout == null) return null;
  final groups =
      ref.watch(watchEventSuccessAssignmentsProvider(event.id)).value ??
      const <EventSuccessAssignment>[];
  final rotations =
      ref.watch(watchEventSuccessRotationAssignmentsProvider(event.id)).value ??
      const <EventSuccessAssignment>[];
  final assignments = hostLiveRoomSeats(
    steps: EventSuccessRuntime(
      plan: plan,
      event: event,
      now: event.startTime,
    ).runOfShowSteps,
    activeStepIndex: plan.activeStepIndex,
    groups: groups,
    rotations: rotations,
  );
  final uids = <String>{
    for (final assignment in assignments) ...[
      assignment.uid,
      ...assignment.allPeerUids,
    ],
  }.toList();
  final key = eventSuccessPeerUidsKey(uids);
  final profiles = key.isEmpty
      ? const <PublicProfile>[]
      : ref.watch(eventSuccessAssignmentPeerProfilesProvider(key)).value ??
            const <PublicProfile>[];
  return HostLiveRoomMap(
    layout: layout,
    assignments: assignments,
    profiles: profiles,
    revision: plan.liveControlRevision,
  );
}

/// The seats the map shows: rotation seats while the step on now runs
/// guided rotations and they exist, table seats otherwise.
List<EventSuccessAssignment> hostLiveRoomSeats({
  required List<EventRunOfShowStep> steps,
  required int activeStepIndex,
  required List<EventSuccessAssignment> groups,
  required List<EventSuccessAssignment> rotations,
}) {
  final rotating =
      steps.isNotEmpty &&
      steps[activeStepIndex.clamp(0, steps.length - 1)].moduleIds.contains(
        EventSuccessModuleCatalog.guidedRotations.id,
      );
  return rotating && rotations.isNotEmpty ? rotations : groups;
}
