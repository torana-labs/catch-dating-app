import 'dart:async';

import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_playbooks.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_presence_reads.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_presence.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_presence_derivation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_presence_policy.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_success_presence_summary_provider.g.dart';

/// The app clock, ticking at the presence heartbeat interval so present,
/// idle and likely-departed move on screen with no new snapshot.
@riverpod
Stream<DateTime> eventSuccessPresenceClock(Ref ref) {
  final clock = ref.watch(appClockProvider);
  final controller = StreamController<DateTime>();
  final timer = clock.periodic(
    Duration(seconds: eventSuccessPresencePolicy.heartbeatIntervalSeconds),
    (_) => controller.add(clock.now()),
  );
  ref.onDispose(() {
    timer.cancel();
    unawaited(controller.close());
  });
  controller.add(clock.now());
  return controller.stream;
}

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
  final usesDrafts = switch (plan.value) {
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
  for (final source in <AsyncValue<Object?>>[
    heartbeats,
    placements,
    plan,
    drafts,
    roster,
    now,
  ]) {
    if (source case AsyncError(:final error, :final stackTrace)) {
      return AsyncError(error, stackTrace);
    }
  }
  if (!heartbeats.hasValue ||
      !placements.hasValue ||
      !plan.hasValue ||
      !drafts.hasValue ||
      !roster.hasValue ||
      !now.hasValue) {
    return const AsyncLoading();
  }
  final savedPlan = plan.requireValue;
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
        heartbeats: heartbeats.requireValue,
        roster: roster.requireValue,
        drafts: drafts.requireValue,
        placements: placements.requireValue,
        eventStartMillis: eventStartMillis,
        nowMillis: now.requireValue.millisecondsSinceEpoch,
      ),
    );
  } on FormatException catch (error, stackTrace) {
    return AsyncError(error, stackTrace);
  }
}
