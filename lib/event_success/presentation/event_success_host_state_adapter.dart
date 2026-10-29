import 'package:catch_dating_app/contexts/formats/domain/event_success_structure.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_layout.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_host_screen_state.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

EventSuccessSpatialLayoutState eventSuccessHostSpatialLayoutState({
  required EventSuccessPlan? plan,
  required AsyncValue<EventSuccessLayout?> value,
}) {
  if (plan == null ||
      plan.structureConfig.unitKind == EventSuccessUnitKind.wholeGroup) {
    return const EventSuccessSpatialLayoutState.notApplicable();
  }
  if (plan.layoutId == null) {
    return const EventSuccessSpatialLayoutState.unconfigured();
  }
  if (value.isLoading) {
    return const EventSuccessSpatialLayoutState.loading();
  }
  if (value.hasError) {
    return EventSuccessSpatialLayoutState.error(value.error!);
  }
  final layout = value.asData?.value;
  if (layout == null) {
    return const EventSuccessSpatialLayoutState.unconfigured();
  }
  return EventSuccessSpatialLayoutState.ready(layout);
}
