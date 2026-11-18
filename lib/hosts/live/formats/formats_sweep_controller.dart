import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/hosts/events/event_close_out_controller.dart';
import 'package:catch_dating_app/hosts/events/event_close_out_state.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_sweep_state.dart';
import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'formats_sweep_controller.g.dart';

/// The sweep, composed from listeners only: the guest list (who is checked
/// in and who is accounted for), the plan (its revision and whether it is
/// complete) and close-out (its switches).
@riverpod
HostFormatsSweepState hostFormatsSweepController(Ref ref, Event event) {
  final attendeesValue = ref.watch(watchEventAttendeesProvider(event.id));
  if (attendeesValue case AsyncValue(:final error?, hasValue: false)) {
    return HostFormatsSweepState(
      status: HostFormatsSweepStatus.error,
      error: error,
    );
  }
  final attendees = attendeesValue.value;
  if (attendees == null) return const HostFormatsSweepState.loading();
  final plan = ref.watch(watchEventSuccessPlanProvider(event.id)).value;
  final closeOut = ref.watch(
    hostEventCloseOutControllerProvider(
      HostEventRequest(organizerId: event.organizerId, eventId: event.id),
    ),
  );
  return hostFormatsSweepState(
    event: event,
    attendees: attendees,
    plan: plan,
    closeOut: closeOut,
  );
}

/// The sweep from the guest list, the plan and close-out.
HostFormatsSweepState hostFormatsSweepState({
  required Event event,
  required List<EventAttendee> attendees,
  EventSuccessPlan? plan,
  HostEventCloseOutState? closeOut,
}) {
  final checkedIn = attendees.where((a) => a.isCheckedIn).toList();
  final out =
      checkedIn
          .where((a) => a.currentAccountabilityResolution == null)
          .map(
            (a) => HostFormatsOut(
              attendee: a,
              group: switch (a.arrivalGroup?.trim()) {
                final group? when group.isNotEmpty => group,
                _ => null,
              },
            ),
          )
          .toList()
        ..sort(
          (a, b) => a.attendee.searchName.compareTo(b.attendee.searchName),
        );
  return HostFormatsSweepState(
    status: HostFormatsSweepStatus.ready,
    kind: hostFormatsSweepKind(event),
    checkedIn: checkedIn.length,
    out: List<HostFormatsOut>.unmodifiable(out),
    liveControlRevision: plan?.liveControlRevision,
    finished: plan?.status == EventSuccessPlanStatus.complete,
    closeOut: closeOut?.status == HostEventCloseOutStatus.ready
        ? closeOut
        : null,
  );
}

/// A crawl's guests go home; everyone else comes back to the start.
HostFormatsSweepKind hostFormatsSweepKind(Event event) =>
    event.eventFormat.interactionModel == EventInteractionModel.routeStops
    ? HostFormatsSweepKind.crawl
    : HostFormatsSweepKind.run;
