import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_runtime.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_membership_provider.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_run_state.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_sweep_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_sweep_state.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'formats_run_controller.g.dart';

/// The run console, composed from listeners only: the plan (the step on
/// now), the sweep (who is checked in and who is back) and, for each runner
/// checked in, the membership view that says which pace pod they are in.
@riverpod
HostFormatsRunState hostFormatsRunController(Ref ref, Event event) {
  final planValue = ref.watch(watchEventSuccessPlanProvider(event.id));
  final sweep = ref.watch(hostFormatsSweepControllerProvider(event));
  if (sweep.status == HostFormatsSweepStatus.error) {
    return HostFormatsRunState(
      status: HostFormatsRunStatus.error,
      error: sweep.error,
    );
  }
  final plan = planValue.value;
  if (plan == null) {
    return switch (planValue) {
      AsyncValue(hasValue: true) => const HostFormatsRunState(
        status: HostFormatsRunStatus.noPlan,
      ),
      AsyncValue(:final error?) => HostFormatsRunState(
        status: HostFormatsRunStatus.error,
        error: error,
      ),
      _ => const HostFormatsRunState.loading(),
    };
  }
  if (sweep.status == HostFormatsSweepStatus.loading) {
    return const HostFormatsRunState.loading();
  }
  final attendees =
      ref.watch(watchEventAttendeesProvider(event.id)).value ??
      const <EventAttendee>[];
  final runners = attendees.where((a) => a.isCheckedIn).toList();
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
  return hostFormatsRunState(
    event: event,
    plan: plan,
    sweep: sweep,
    runners: runners,
    memberships: memberships,
  );
}

/// The run console from the plan, the sweep, the runners checked in and
/// their memberships.
HostFormatsRunState hostFormatsRunState({
  required Event event,
  required EventSuccessPlan plan,
  required HostFormatsSweepState sweep,
  required List<EventAttendee> runners,
  required Map<String, AsyncValue<EventAssistanceMembershipSession>>
  memberships,
}) {
  final steps = EventSuccessRuntime(
    plan: plan,
    event: event,
    now: event.startTime,
  ).runOfShowSteps;
  final stepIndex = steps.isEmpty
      ? 0
      : plan.activeStepIndex.clamp(0, steps.length - 1);
  final out = {for (final person in sweep.out) person.attendeeId};

  final paceGroups = [...?event.eventFormat.routePlan?.paceGroups]
    ..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
  final labels = <String, String>{
    for (final group in paceGroups) group.id: group.label,
  };
  final paces = <String, int?>{
    for (final group in paceGroups) group.id: group.targetPaceSecondsPerKm,
  };
  final members = <String, List<String>>{};
  final unplaced = <String>[];
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
    if (accepted == null) {
      unplaced.add(runner.id);
    } else {
      members.putIfAbsent(accepted.groupId, () => []).add(runner.id);
    }
  }
  int backOf(List<String> ids) => ids.where((id) => !out.contains(id)).length;
  final order = [
    for (final group in paceGroups) group.id,
    for (final id in labels.keys)
      if (!paces.containsKey(id)) id,
  ];
  final pods = [
    for (final id in order)
      HostFormatsRunPod(
        id: id,
        label: labels[id]!,
        back: backOf(members[id] ?? const []),
        total: (members[id] ?? const []).length,
        paceSecondsPerKm: paces[id],
      ),
    // A run with pods shows the runners in none; a run without pods shows
    // only the step and the sweep.
    if (order.isNotEmpty && unplaced.isNotEmpty)
      HostFormatsRunPod(
        id: '',
        label: '',
        back: backOf(unplaced),
        total: unplaced.length,
      ),
  ];
  return HostFormatsRunState(
    status: HostFormatsRunStatus.running,
    stepTitle: steps.isEmpty ? null : steps[stepIndex].title,
    stepIndex: stepIndex,
    stepCount: steps.length,
    pods: List<HostFormatsRunPod>.unmodifiable(pods),
    sweep: sweep,
    checking: checking,
  );
}
