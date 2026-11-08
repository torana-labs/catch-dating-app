import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_membership_provider.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_pods_state.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'formats_pods_controller.g.dart';

/// Pace pods, composed from listeners only: the guest list, and for each
/// runner booked the membership view that says which pod they are in
/// (`event_assistance_membership_repository.watch`). The pods themselves
/// are the route's pace groups.
@riverpod
HostFormatsPodsState hostFormatsPodsController(Ref ref, Event event) {
  final attendeesValue = ref.watch(watchEventAttendeesProvider(event.id));
  if (attendeesValue case AsyncValue(:final error?, hasValue: false)) {
    return HostFormatsPodsState(
      status: HostFormatsPodsStatus.error,
      error: error,
    );
  }
  final attendees = attendeesValue.value;
  if (attendees == null) return const HostFormatsPodsState.loading();
  final runners = attendees
      .where(
        (a) =>
            a.status == EventAttendeeStatus.registered ||
            a.status == EventAttendeeStatus.checkedIn,
      )
      .toList();
  final memberships = <String, AsyncValue<EventAssistanceMembershipSession>>{
    for (final runner in runners)
      runner.id: ref.watch(
        eventAssistanceMembershipProvider(
          EventAssistanceGuestScope(
            organizerId: event.organizerId,
            eventId: event.id,
            attendeeId: runner.id,
          ),
        ),
      ),
  };
  return hostFormatsPodsState(
    event: event,
    runners: runners,
    memberships: memberships,
  );
}

/// Pace pods from the route, the runners and their memberships.
HostFormatsPodsState hostFormatsPodsState({
  required Event event,
  required List<EventAttendee> runners,
  required Map<String, AsyncValue<EventAssistanceMembershipSession>>
  memberships,
}) {
  final paceGroups = [...?event.eventFormat.routePlan?.paceGroups]
    ..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
  final labels = <String, String>{
    for (final group in paceGroups) group.id: group.label,
  };
  final members = <String, List<String>>{};
  final unplaced = <HostFormatsUnplaced>[];
  var checking = false;
  for (final runner in runners) {
    final session = memberships[runner.id]?.value;
    if (session == null) {
      checking = true;
      continue;
    }
    final facts = session.view.facts;
    for (final group in facts.groups) {
      labels.putIfAbsent(group.groupId, () => group.label);
    }
    final accepted = switch (facts.membership) {
      AssistanceCurrentMembership(:final accepted) => accepted,
      _ => null,
    };
    if (accepted != null) {
      members.putIfAbsent(accepted.groupId, () => []).add(runner.displayName);
    } else {
      unplaced.add(
        HostFormatsUnplaced(
          attendeeId: runner.id,
          name: runner.displayName,
          movable: facts.actions.contains(AssistanceMembershipAction.place),
          review: session,
        ),
      );
    }
  }
  if (labels.isEmpty) {
    return const HostFormatsPodsState(status: HostFormatsPodsStatus.noPods);
  }
  final paces = <String, int?>{
    for (final group in paceGroups) group.id: group.targetPaceSecondsPerKm,
  };
  final order = [
    for (final group in paceGroups) group.id,
    for (final id in labels.keys)
      if (!paces.containsKey(id)) id,
  ];
  return HostFormatsPodsState(
    status: HostFormatsPodsStatus.ready,
    pods: List.unmodifiable([
      for (final id in order)
        HostFormatsPod(
          id: id,
          label: labels[id]!,
          runners: List.unmodifiable((members[id] ?? <String>[])..sort()),
          paceSecondsPerKm: paces[id],
        ),
    ]),
    unplaced: List.unmodifiable(
      unplaced..sort((a, b) => a.name.compareTo(b.name)),
    ),
    runners: runners.length,
    checking: checking,
  );
}
