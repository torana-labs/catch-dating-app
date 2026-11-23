import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_layout.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_controller.dart';
import 'package:catch_dating_app/hosts/live/live_controller.dart';
import 'package:catch_dating_app/hosts/live/live_room_body.dart';
import 'package:catch_dating_app/hosts/live/live_room_map_controller.dart';
import 'package:catch_dating_app/hosts/live/live_screen.dart';
import 'package:catch_dating_app/pages/live_room/event_success_room_map.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The room on a tablet, on the night theme, from the console's own
/// controller: who is seated where and who still needs a place.
class HostLiveRoomScreen extends ConsumerWidget {
  const HostLiveRoomScreen({
    super.key,
    required this.organizer,
    required this.event,
    required this.onOpenGuests,
    this.now,
  });

  final Organizer organizer;
  final Event event;
  final VoidCallback onOpenGuests;

  /// A fixed clock for previews and tests; null reads the app clock.
  final DateTime? now;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(hostLiveControllerProvider(event));
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [EventSuccessController.spatialControlMutation],
      errorContext: AppErrorContext.event,
    );
    final actions = HostLiveActions(
      context: context,
      ref: ref,
      organizer: organizer,
      event: event,
      onOpenGuests: onOpenGuests,
      now: now,
    );
    return CatchRoot(
      theme: CatchThemeMode.night,
      child: CatchScreen(
        key: const ValueKey<String>('host-live-room-screen'),
        topBar: hostLiveTopBar(
          context,
          event: event,
          now: now ?? ref.read(appClockProvider).now(),
        ),
        body: HostLiveRoomBody(
          state: state,
          onView: actions.openView,
          seatMap: switch (ref.watch(hostLiveRoomMapProvider(event))) {
            final map? when map.assignments.isNotEmpty => EventSuccessRoomMap(
              key: const ValueKey<String>('host-live-room-map'),
              layout: map.layout,
              assignments: map.assignments,
              profiles: map.profiles,
              activityKind: event.activityKind,
              onPreview: (assignment) => _move(
                ref,
                map,
                EventSuccessSpatialAction.previewReassignment,
                assignment,
              ).then((result) => result.destinations),
              onReassign: (assignment, unitId, scope) => _move(
                ref,
                map,
                EventSuccessSpatialAction.reassign,
                assignment,
                destinationUnitId: unitId,
                scope: scope,
              ),
              onConfirmPosition: (assignment) => _move(
                ref,
                map,
                EventSuccessSpatialAction.confirmPosition,
                assignment,
              ),
              onReleasePinned: (assignment) => _move(
                ref,
                map,
                EventSuccessSpatialAction.releasePinned,
                assignment,
              ),
            ),
            _ => null,
          },
        ),
      ),
    );
  }

  /// One seat move through the existing spatial control, fenced on the
  /// plan's live-control revision.
  Future<EventSuccessSpatialActionResult> _move(
    WidgetRef ref,
    HostLiveRoomMap map,
    EventSuccessSpatialAction action,
    EventSuccessAssignment assignment, {
    String? destinationUnitId,
    EventSuccessSpatialScope? scope,
  }) => EventSuccessController.spatialControlMutation.run(
    ref,
    (tx) => tx
        .get(eventSuccessControllerProvider.notifier)
        .controlSpatialPlacement(
          eventId: event.id,
          expectedRevision: map.revision,
          action: action,
          moduleId: assignment.moduleId,
          uid: assignment.uid,
          destinationUnitId: destinationUnitId,
          scope: scope,
        ),
  );
}
