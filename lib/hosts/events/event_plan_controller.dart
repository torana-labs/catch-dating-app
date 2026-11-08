import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/parts/event_catch_format.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_runtime.dart';
import 'package:catch_dating_app/hosts/events/event_plan_state.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_controller.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_plan_controller.g.dart';

/// The plan screen, composed from the event and its plan listeners.
@riverpod
HostEventPlanState hostEventPlanController(Ref ref, HostEventRequest request) {
  final eventValue = catchAsyncStateFromAsyncValue(
    ref.watch(watchEventProvider(request.eventId)),
  );
  final planValue = catchAsyncStateFromAsyncValue(
    ref.watch(watchEventSuccessPlanProvider(request.eventId)),
  );
  final event = eventValue.value;
  final plan = planValue.value;
  final error = eventValue.error ?? planValue.error;
  if (error != null && (event == null || !planValue.hasData)) {
    return HostEventPlanState(status: HostEventPlanStatus.error, error: error);
  }
  if (event == null || !planValue.hasData) {
    return const HostEventPlanState.loading();
  }
  if (plan == null) {
    return HostEventPlanState(
      status: HostEventPlanStatus.noPlan,
      eventTitle: event.title,
    );
  }
  final runOfShow = EventSuccessRuntime(
    plan: plan,
    event: event,
    now: event.startTime,
  ).runOfShowSteps;
  final steps = <HostEventPlanStep>[];
  var startsAt = event.startTime;
  for (final step in runOfShow) {
    steps.add(HostEventPlanStep(step: step, startsAt: startsAt));
    startsAt = startsAt.add(Duration(minutes: step.durationMinutes));
  }
  final format = event.eventFormat;
  final structure = plan.structureConfig;
  return HostEventPlanState(
    status: HostEventPlanStatus.ready,
    eventTitle: event.title,
    plan: plan,
    format: catchFormatForActivity(format.activityKind),
    formatLabel: format.customActivityLabel ?? format.activityKind.label,
    playbookTitle: plan.playbook.title,
    steps: List<HostEventPlanStep>.unmodifiable(steps),
    unitKind: structure.unitKind,
    unitSize: structure.unitSize,
    unitCount: structure.unitCount,
    options: Map.unmodifiable(hostEventPlanOptions(plan)),
    editable:
        plan.status == EventSuccessPlanStatus.setup && plan.frozenAt == null,
  );
}

/// The night's options as the plan holds them.
Map<HostEventPlanOption, bool> hostEventPlanOptions(EventSuccessPlan plan) => {
  HostEventPlanOption.introductions: plan.wingmanRequestsEnabled,
  HostEventPlanOption.openers: plan.contextualOpenersEnabled,
  HostEventPlanOption.answersPair: plan.compatibilityAffectsRanking,
};
