import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_playbooks.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_presence_reads.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_presence.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_presence_derivation.dart';
import 'package:catch_platform/catch_async_state.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_success_presence_summary_provider.g.dart';

/// The live console's presence and late arrivals, derived on the phone from
/// listeners: heartbeats and late-arrival placements, plus the plan, the next
/// round's drafts (for guided rotations only) and the operational roster the
/// console already watches.
/// It reads nothing itself and recomputes on each tick of
/// [eventSuccessPresenceClockProvider] without touching the listeners. The
/// first error among its sources is its error.
@riverpod
AsyncValue<EventSuccessPresenceSummary> eventSuccessPresenceSummary(
  Ref ref, {
  required String organizerId,
  required String eventId,
  required int eventStartMillis,
}) {
  final heartbeats = ref.watch(
    eventSuccessPresenceHeartbeatsProvider(
      organizerId: organizerId,
      eventId: eventId,
    ),
  );
  final placements = ref.watch(
    eventSuccessLateArrivalPlacementsProvider(
      organizerId: organizerId,
      eventId: eventId,
    ),
  );
  final plan = ref.watch(watchEventSuccessPlanProvider(eventId));
  // Only guided rotations prepare drafts; other plans never open the listener.
  final usesDrafts = switch (catchAsyncStateFromAsyncValue(plan).value) {
    final saved? =>
      saved.hasModule(EventSuccessModuleCatalog.guidedRotations.id) &&
          saved.structureConfig.rotates,
    null => false,
  };
  final drafts = usesDrafts
      ? ref.watch(watchEventSuccessRotationDraftsProvider(eventId))
      : const AsyncData(<EventSuccessAssignmentDraft>[]);
  final roster = ref.watch(watchEventAttendeesProvider(eventId));
  final now = ref.watch(eventSuccessPresenceClockProvider);
  final heartbeatState = catchAsyncStateFromAsyncValue(heartbeats);
  final placementState = catchAsyncStateFromAsyncValue(placements);
  final planState = catchAsyncStateFromAsyncValue(plan);
  final draftState = catchAsyncStateFromAsyncValue(drafts);
  final rosterState = catchAsyncStateFromAsyncValue(roster);
  final nowState = catchAsyncStateFromAsyncValue(now);
  for (final state in <CatchAsyncState<Object?>>[
    heartbeatState,
    placementState,
    planState,
    draftState,
    rosterState,
    nowState,
  ]) {
    final error = state.error;
    if (error != null) {
      return AsyncError(error, state.stackTrace ?? StackTrace.current);
    }
  }
  final heartbeatRows = heartbeatState.value;
  final placementRows = placementState.value;
  final draftRows = draftState.value;
  final rosterRows = rosterState.value;
  final clockNow = nowState.value;
  if (!planState.hasData ||
      heartbeatRows == null ||
      placementRows == null ||
      draftRows == null ||
      rosterRows == null ||
      clockNow == null) {
    return const AsyncLoading();
  }
  final savedPlan = planState.value;
  if (savedPlan == null) {
    return AsyncError(
      StateError('Event-success setup has not been saved.'),
      StackTrace.current,
    );
  }
  try {
    return AsyncData(
      deriveEventSuccessPresenceSummary(
        plan: (
          liveControlRevision: savedPlan.liveControlRevision,
          publishedRotationRoundIndex: savedPlan.publishedRotationRoundIndex,
          assignmentDraftRevision: savedPlan.assignmentDraftRevision,
        ),
        heartbeats: heartbeatRows,
        roster: rosterRows,
        drafts: draftRows,
        placements: placementRows,
        eventStartMillis: eventStartMillis,
        nowMillis: clockNow.millisecondsSinceEpoch,
      ),
    );
  } on FormatException catch (error, stackTrace) {
    return AsyncError(error, stackTrace);
  }
}
