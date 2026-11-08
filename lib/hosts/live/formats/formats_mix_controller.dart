import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_runtime.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_courts_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_mix_state.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'formats_mix_controller.g.dart';

/// Team mixing, composed from listeners only: the plan (the step, the
/// reveal and its fence, the first-hello switch), the new tables and the
/// guest list for names.
@riverpod
HostFormatsMixState hostFormatsMixController(Ref ref, Event event) {
  final planValue = ref.watch(watchEventSuccessPlanProvider(event.id));
  final assignmentsValue = ref.watch(
    watchEventSuccessAssignmentsProvider(event.id),
  );
  final attendeesValue = ref.watch(watchEventAttendeesProvider(event.id));
  for (final value in <AsyncValue<Object?>>[planValue, assignmentsValue]) {
    if (value case AsyncValue(:final error?, hasValue: false)) {
      return HostFormatsMixState(
        status: HostFormatsMixStatus.error,
        error: error,
      );
    }
  }
  if (catchAsyncStateFromAsyncValue(planValue).isLoading ||
      catchAsyncStateFromAsyncValue(assignmentsValue).isLoading) {
    return const HostFormatsMixState.loading();
  }
  final plan = planValue.value;
  if (plan == null) {
    return const HostFormatsMixState(status: HostFormatsMixStatus.noPlan);
  }
  return hostFormatsMixState(
    event: event,
    plan: plan,
    assignments: assignmentsValue.value ?? const [],
    attendees: attendeesValue.value ?? const [],
  );
}

/// Team mixing from the plan, the new tables and the guest list.
HostFormatsMixState hostFormatsMixState({
  required Event event,
  required EventSuccessPlan plan,
  required List<EventSuccessAssignment> assignments,
  required List<EventAttendee> attendees,
}) {
  final names = hostFormatsNames(attendees);
  final steps = EventSuccessRuntime(
    plan: plan,
    event: event,
    now: event.startTime,
  ).runOfShowSteps;
  final active = steps.isEmpty
      ? 0
      : plan.activeStepIndex.clamp(0, steps.length - 1);
  var startsAt = event.startTime;
  for (final step in steps.take(active)) {
    startsAt = startsAt.add(Duration(minutes: step.durationMinutes));
  }
  final byTable = <String, List<String>>{};
  for (final assignment in assignments) {
    final label = (assignment.unitLabel ?? assignment.label).trim();
    if (label.isEmpty) continue;
    byTable
        .putIfAbsent(label, () => <String>[])
        .add(names[assignment.uid] ?? assignment.displayTitle);
  }
  final labels = byTable.keys.toList()..sort();
  var rounds = 1;
  for (final assignment in assignments) {
    if (assignment.groupRotationSlots.length > rounds) {
      rounds = assignment.groupRotationSlots.length;
    }
  }
  final next = plan.publishedRevealRoundIndex + 1;
  return HostFormatsMixState(
    status: HostFormatsMixStatus.running,
    plan: plan,
    stepIndex: active,
    steps: steps.length,
    stepStartsAt: startsAt,
    tables: List.unmodifiable([
      for (final label in labels)
        HostFormatsTable(
          label: label,
          people: List.unmodifiable(byTable[label]!..sort()),
        ),
    ]),
    revealRoundIndex: next,
    countingDown: plan.revealStatus == EventSuccessRevealStatus.countingDown,
    revealed: next >= rounds,
    countdownSeconds: plan.structureConfig.revealCountdownSeconds,
    openers: plan.contextualOpenersEnabled,
  );
}
