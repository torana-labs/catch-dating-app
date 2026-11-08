import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/contexts/events/parts/event_catch_format.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_activity_profile.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_structure.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_runtime.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_standings.dart';
import 'package:catch_dating_app/contexts/live/parts/live_plan_step_row.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_cases_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_deliveries_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_presence_summary_provider.dart';
import 'package:catch_dating_app/event_success/presentation/host_live/event_success_outcome_units_state.dart';
import 'package:catch_dating_app/hosts/live/live_scores_state.dart';
import 'package:catch_dating_app/hosts/live/live_state.dart';
import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'live_controller.g.dart';

/// Whether tonight runs on this console: a night in one room. A night that
/// moves (stops on a route, pace groups, live tracking or a sweep at the
/// end) keeps the movement console, whose checkpoints and sweep this one
/// does not show, and so does a plan with a saved room layout, whose seat
/// moves the room map still owns. A plan not read yet does not decide.
bool hostLiveConsoleFits(Event event, {EventSuccessPlan? plan}) {
  final profile = EventSuccessActivityProfile.forFormat(event.eventFormat);
  final route = event.eventFormat.routePlan;
  final seatsByLayout =
      plan?.layoutId != null &&
      plan?.structureConfig.unitKind != EventSuccessUnitKind.wholeGroup;
  return profile.accountability != EventSuccessAccountability.sweep &&
      !event.itinerary.any((stop) => stop.location != null) &&
      !(route?.groupStrategy == RouteGroupStrategy.paceGroups &&
          (route?.paceGroups.isNotEmpty ?? false)) &&
      route?.liveTrackingPolicy.enabled != true &&
      !seatsByLayout;
}

/// The live console, composed from listeners only: the plan, the roster,
/// presence and late arrivals, open help requests, deliveries waiting on the
/// host, the teams and the scoreboard. Nothing polls, and no command
/// invalidates a read; each listener delivers the result.
@riverpod
HostLiveState hostLiveController(Ref ref, Event event) {
  final planValue = ref.watch(watchEventSuccessPlanProvider(event.id));
  final plan = planValue.value;
  if (plan == null) {
    return switch (planValue) {
      AsyncValue(:final error?) => HostLiveState(
        status: HostLiveStatus.error,
        error: error,
      ),
      AsyncValue(hasValue: true) => const HostLiveState(
        status: HostLiveStatus.noPlan,
      ),
      _ => const HostLiveState.loading(),
    };
  }
  final format = catchFormatForActivity(event.activityKind);
  final runtime = EventSuccessRuntime(
    plan: plan,
    event: event,
    now: event.startTime,
  );
  final runOfShow = runtime.runOfShowSteps;
  final activeIndex = runOfShow.isEmpty
      ? 0
      : plan.activeStepIndex.clamp(0, runOfShow.length - 1);
  final finished = plan.status == EventSuccessPlanStatus.complete;
  final steps = <HostLivePlanStep>[];
  var startsAt = event.startTime;
  for (final (index, step) in runOfShow.indexed) {
    steps.add(
      HostLivePlanStep(
        step: step,
        startsAt: startsAt,
        status: finished || index < activeIndex
            ? LivePlanStepStatus.done
            : index == activeIndex
            ? LivePlanStepStatus.now
            : LivePlanStepStatus.next,
      ),
    );
    startsAt = startsAt.add(Duration(minutes: step.durationMinutes));
  }

  final roster = ref
      .watch(watchEventParticipationRosterProvider(event.id))
      .value;
  final profile = EventSuccessActivityProfile.forFormat(event.eventFormat);
  final scores = profile.unitOutcome == EventSuccessUnitOutcome.score;
  final standings = scores
      ? ref.watch(watchEventSuccessStandingsProvider(event.id)).value
      : null;
  final units = _units(
    plan,
    ref.watch(watchEventSuccessAssignmentsProvider(event.id)).value ??
        const <EventSuccessAssignment>[],
  );
  final presence = ref.watch(
    eventSuccessPresenceSummaryProvider(
      organizerId: event.organizerId,
      eventId: event.id,
      eventStartMillis: event.startTime.millisecondsSinceEpoch,
    ),
  );
  final cases = ref.watch(
    eventAssistanceCasesProvider(
      EventAssistanceCaseQuery(
        organizerId: event.organizerId,
        eventId: event.id,
      ),
    ),
  );
  final deliveries = ref.watch(
    eventAssistanceDeliveriesProvider(
      EventAssistanceDeliveryQuery(
        organizerId: event.organizerId,
        eventId: event.id,
      ),
    ),
  );
  final summary = presence.value;
  final ranked = [...?standings?.entries]
    ..sort((a, b) => a.position.compareTo(b.position));

  return HostLiveState(
    status: finished ? HostLiveStatus.finished : HostLiveStatus.running,
    format: format,
    steps: List<HostLivePlanStep>.unmodifiable(steps),
    activeIndex: activeIndex,
    liveControlRevision: plan.liveControlRevision,
    checkedIn: roster == null || roster.checkedInCount == 0
        ? event.attendedCount
        : roster.checkedInCount,
    booked: roster == null || roster.bookedCount == 0
        ? event.signedUpCount
        : roster.bookedCount,
    places: event.capacityLimit,
    teams: ranked.isNotEmpty ? ranked.length : units.length,
    leader: ranked.firstOrNull?.unitLabel,
    needs: List<HostLiveNeed>.unmodifiable([
      // Most urgent first: a guest asking, a guest waiting for a place,
      // then a message that did not arrive; oldest first within each.
      ...((cases.value?.page.cases ?? const <AssistanceHostCase>[])
              .whereType<AssistanceOpenHostCase>()
              .toList()
            ..sort((a, b) => a.receivedAt.compareTo(b.receivedAt)))
          .map(HostLiveHelpNeed.new),
      ...((summary?.lateArrivals ?? const []).toList()..sort(
            (a, b) => a.checkedInAtMillis.compareTo(b.checkedInAtMillis),
          ))
          .map(HostLiveArrivalNeed.new),
      ...((deliveries.value?.page.deliveries ??
                  const <AssistanceHostDelivery>[])
              .whereType<AssistanceActionableDelivery>()
              .toList()
            ..sort((a, b) => a.createdAt.compareTo(b.createdAt)))
          .map(HostLiveDeliveryNeed.new),
    ]),
    needsChecking: [
      cases,
      deliveries,
      presence,
    ].any((value) => catchAsyncStateFromAsyncValue(value).value == null),
    standings: List.unmodifiable(ranked),
    scoredRounds: standings == null ? 0 : standings.latestRoundIndex + 1,
    scores: scores,
    units: units,
    presenceRevision: summary?.liveControlRevision ?? plan.liveControlRevision,
    formatView: hostLiveFormatView(event),
    stepStartedAt: _millis(plan.stepStartedAtMs),
    pausedAt: finished ? null : _millis(plan.pausedAtMs),
  );
}

/// The formats board a night runs on: court rotations get the court
/// board, team nights get team mixing, a route with stops gets the crawl
/// board, and pace pods get the pods board.
HostLiveFormatView? hostLiveFormatView(Event event) =>
    switch (event.eventFormat.interactionModel) {
      EventInteractionModel.pairedRotations => HostLiveFormatView.courts,
      EventInteractionModel.teamRotations => HostLiveFormatView.mix,
      EventInteractionModel.routeStops => HostLiveFormatView.crawl,
      EventInteractionModel.pacePods => HostLiveFormatView.pods,
      _ => null,
    };

/// The scores screen, composed from the plan, the scoreboard, the teams and
/// the checked-in guests (whose arrival groups are teams too).
@riverpod
HostLiveScoresState hostLiveScoresController(Ref ref, Event event) {
  final planValue = ref.watch(watchEventSuccessPlanProvider(event.id));
  final standingsValue = ref.watch(
    watchEventSuccessStandingsProvider(event.id),
  );
  final assignmentsValue = ref.watch(
    watchEventSuccessAssignmentsProvider(event.id),
  );
  final attendeesValue = ref.watch(watchEventAttendeesProvider(event.id));
  for (final value in <AsyncValue<Object?>>[
    planValue,
    standingsValue,
    assignmentsValue,
    attendeesValue,
  ]) {
    if (value case AsyncValue(:final error?, hasValue: false)) {
      return HostLiveScoresState(
        status: HostLiveScoresStatus.error,
        error: error,
      );
    }
  }
  final plan = planValue.value;
  final assignments = assignmentsValue.value;
  final attendees = attendeesValue.value;
  final standingsState = catchAsyncStateFromAsyncValue(standingsValue);
  if (plan == null ||
      standingsState.isLoading ||
      assignments == null ||
      attendees == null) {
    return const HostLiveScoresState.loading();
  }
  final standings = standingsState.value;
  final totals = <String, num>{
    for (final entry
        in standings?.entries ?? const <EventSuccessStandingEntry>[])
      entry.unitId: entry.value,
  };
  final positions = <String, int>{
    for (final entry
        in standings?.entries ?? const <EventSuccessStandingEntry>[])
      entry.unitId: entry.position,
  };
  final units = <String, HostLiveScoreUnit>{
    for (final entry
        in standings?.entries ?? const <EventSuccessStandingEntry>[])
      entry.unitId: HostLiveScoreUnit(
        id: entry.unitId,
        label: entry.unitLabel,
        total: entry.value,
      ),
  };
  for (final unit in eventSuccessHostOutcomeUnits(
    event: event,
    plan: plan,
    assignments: assignments,
    rotationAssignments: const [],
    operationalAttendees: attendees,
    profiles: const [],
  )) {
    units.putIfAbsent(
      unit.id,
      () => HostLiveScoreUnit(
        id: unit.id,
        label: unit.label,
        total: totals[unit.id] ?? 0,
      ),
    );
  }
  final ordered = units.values.toList()
    ..sort((a, b) {
      final byPlace = (positions[a.id] ?? 1 << 20).compareTo(
        positions[b.id] ?? 1 << 20,
      );
      return byPlace != 0 ? byPlace : a.label.compareTo(b.label);
    });
  final latest = standings?.latestRoundIndex ?? -1;
  final revealNext = plan.publishedRevealRoundIndex + 1;
  return HostLiveScoresState(
    status: HostLiveScoresStatus.ready,
    units: List.unmodifiable(ordered),
    roundIndex: latest + 1,
    standingsRevision: standings?.revision ?? 0,
    liveControlRevision: plan.liveControlRevision,
    revealRoundIndex: revealNext <= latest ? revealNext : null,
    countingDown: plan.revealStatus == EventSuccessRevealStatus.countingDown,
    countdownSeconds: plan.structureConfig.revealCountdownSeconds,
    standings: List.unmodifiable(
      <EventSuccessStandingEntry>[...?standings?.entries]
        ..sort((a, b) => a.position.compareTo(b.position)),
    ),
  );
}

/// Starts again the reads behind the console after one failed.
void retryHostLiveReads(WidgetRef ref, Event event) {
  ref.invalidate(watchEventSuccessPlanProvider(event.id));
  final cases = eventAssistanceCasesProvider(
    EventAssistanceCaseQuery(organizerId: event.organizerId, eventId: event.id),
  );
  if (ref.exists(cases)) ref.read(cases.notifier).reload();
  final deliveries = eventAssistanceDeliveriesProvider(
    EventAssistanceDeliveryQuery(
      organizerId: event.organizerId,
      eventId: event.id,
    ),
  );
  if (ref.exists(deliveries)) ref.read(deliveries.notifier).reload();
}

/// The plan's teams or tables, each with the guests placed in it.
List<HostLiveUnit> _units(
  EventSuccessPlan plan,
  List<EventSuccessAssignment> assignments,
) {
  final kind = plan.structureConfig.unitKind;
  if (kind == EventSuccessUnitKind.wholeGroup ||
      kind == EventSuccessUnitKind.pairs) {
    return const <HostLiveUnit>[];
  }
  final seated = <String, int>{};
  for (final assignment in assignments) {
    final label = assignment.unitLabel ?? assignment.label;
    if (label.trim().isEmpty) continue;
    seated[label] = (seated[label] ?? 0) + 1;
  }
  final labels = seated.keys.toList()..sort();
  return List<HostLiveUnit>.unmodifiable([
    for (final label in labels)
      HostLiveUnit(
        label: label,
        seated: seated[label]!,
        size: plan.structureConfig.unitSize,
      ),
  ]);
}

DateTime? _millis(int? value) =>
    value == null ? null : DateTime.fromMillisecondsSinceEpoch(value);
