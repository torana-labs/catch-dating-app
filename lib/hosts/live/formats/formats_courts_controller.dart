import 'dart:math' as math;

import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_structure.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_courts_setup_state.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_courts_state.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'formats_courts_controller.g.dart';

/// The court board, composed from listeners only: the plan (the round
/// playing now and its fence), the rotation assignments, the rounds made
/// but not sent yet, and the guest list for names.
@riverpod
HostFormatsCourtsState hostFormatsCourtsController(Ref ref, Event event) {
  final planValue = ref.watch(watchEventSuccessPlanProvider(event.id));
  final assignmentsValue = ref.watch(
    watchEventSuccessRotationAssignmentsProvider(event.id),
  );
  final draftsValue = ref.watch(
    watchEventSuccessRotationDraftsProvider(event.id),
  );
  final attendeesValue = ref.watch(watchEventAttendeesProvider(event.id));
  for (final value in <AsyncValue<Object?>>[
    planValue,
    assignmentsValue,
    draftsValue,
    attendeesValue,
  ]) {
    if (value case AsyncValue(:final error?, hasValue: false)) {
      return HostFormatsCourtsState(
        status: HostFormatsCourtsStatus.error,
        error: error,
      );
    }
  }
  if ([
    planValue,
    assignmentsValue,
    draftsValue,
  ].any((value) => catchAsyncStateFromAsyncValue(value).isLoading)) {
    return const HostFormatsCourtsState.loading();
  }
  final plan = planValue.value;
  if (plan == null) {
    return const HostFormatsCourtsState(status: HostFormatsCourtsStatus.noPlan);
  }
  return hostFormatsCourtsState(
    plan: plan,
    assignments: assignmentsValue.value ?? const [],
    drafts: draftsValue.value ?? const [],
    attendees: attendeesValue.value ?? const [],
  );
}

/// The court board from the plan, the rotations and the guest list.
HostFormatsCourtsState hostFormatsCourtsState({
  required EventSuccessPlan plan,
  required List<EventSuccessAssignment> assignments,
  required List<EventSuccessAssignmentDraft> drafts,
  required List<EventAttendee> attendees,
}) {
  final names = hostFormatsNames(attendees);
  String name(String uid) => names[uid] ?? uid;
  final players = assignments.map((a) => a.uid).toSet();
  if (players.isEmpty) {
    return HostFormatsCourtsState(
      status: HostFormatsCourtsStatus.noRotations,
      intervalMinutes: plan.structureConfig.rotationIntervalMinutes ?? 15,
      liveControlRevision: plan.liveControlRevision,
    );
  }
  final round = plan.publishedRotationRoundIndex;
  final draftRounds = drafts
      .where((d) => d.baseAssignmentRevision == plan.assignmentDraftRevision)
      .map((d) => d.roundIndex)
      .toSet();
  var rounds = 0;
  for (final assignment in assignments) {
    for (final slot in assignment.rotationSlots) {
      rounds = math.max(rounds, slot.roundIndex + 1);
    }
    for (final slot in assignment.sitOutSlots) {
      rounds = math.max(rounds, slot.roundIndex + 1);
    }
  }
  for (final draftRound in draftRounds) {
    rounds = math.max(rounds, draftRound + 1);
  }

  // The round on court now, or the first round before it is sent.
  final shown = round < 0 ? 0 : round;
  final courts = <int, HostFormatsCourt>{};
  final onCourt = <String>{};
  for (final assignment in assignments) {
    for (final slot in assignment.rotationSlots) {
      if (slot.roundIndex != shown) continue;
      onCourt.add(assignment.uid);
      final index = slot.unitIndex ?? courts.length;
      final court = courts[index];
      if (court != null) continue;
      courts[index] = HostFormatsCourt(
        index: index,
        players: [name(assignment.uid), name(slot.peerUid)],
        endsAt: slot.endsAt,
      );
    }
  }
  bool playsIn(EventSuccessAssignment a, int index) =>
      a.rotationSlots.any((slot) => slot.roundIndex == index);
  final sitters = <HostFormatsSitter>[];
  final comingOn = <String>[];
  final goingOff = <String>[];
  for (final assignment in assignments) {
    final playsNext = playsIn(assignment, shown + 1);
    if (!onCourt.contains(assignment.uid)) {
      sitters.add(
        HostFormatsSitter(
          name: name(assignment.uid),
          satOut: assignment.sitOutSlots
              .where((slot) => slot.roundIndex <= shown)
              .length,
          played: assignment.rotationSlots
              .where((slot) => slot.roundIndex < shown)
              .length,
          next: playsNext || shown + 1 >= rounds
              ? HostFormatsSitOutNext.plays
              : HostFormatsSitOutNext.outAgain,
        ),
      );
      if (playsNext) comingOn.add(name(assignment.uid));
    } else if (shown + 1 < rounds && !playsNext) {
      goingOff.add(name(assignment.uid));
    }
  }
  sitters.sort((a, b) => a.name.compareTo(b.name));

  // Fair so far: partners met, partners met again and sit-outs, up to the
  // round on court now.
  var partnerTotal = 0;
  var repeats = 0;
  var mostSatOut = 0;
  for (final assignment in assignments) {
    final met = <String, int>{};
    for (final slot in assignment.rotationSlots) {
      if (slot.roundIndex > shown) continue;
      met[slot.peerUid] = (met[slot.peerUid] ?? 0) + 1;
    }
    partnerTotal += met.length;
    repeats += met.values.fold(0, (sum, n) => sum + math.max(0, n - 1));
    mostSatOut = math.max(
      mostSatOut,
      assignment.sitOutSlots.where((slot) => slot.roundIndex <= shown).length,
    );
  }

  final ordered = courts.values.toList()
    ..sort((a, b) => a.index.compareTo(b.index));
  return HostFormatsCourtsState(
    status: HostFormatsCourtsStatus.running,
    roundIndex: round,
    rounds: rounds,
    intervalMinutes: plan.structureConfig.rotationIntervalMinutes ?? 15,
    courts: List.unmodifiable(ordered),
    sitters: List.unmodifiable(sitters),
    players: players.length,
    newPartners: (partnerTotal / players.length).round(),
    // Each repeat is counted once by each of the two partners.
    repeatPartners: repeats ~/ 2,
    mostSatOut: mostSatOut,
    comingOn: List.unmodifiable(comingOn..sort()),
    goingOff: List.unmodifiable(goingOff..sort()),
    nextReady:
        round + 1 < rounds &&
        (draftRounds.contains(round + 1) ||
            assignments.any((a) => playsIn(a, round + 1))),
    liveControlRevision: plan.liveControlRevision,
  );
}

/// The court setup, composed from the plan, the rotations already made
/// (for the preview) and the roster (for how many play).
@riverpod
HostFormatsCourtsSetupState hostFormatsCourtsSetupController(
  Ref ref,
  Event event,
) {
  final planValue = ref.watch(watchEventSuccessPlanProvider(event.id));
  final assignmentsValue = ref.watch(
    watchEventSuccessRotationAssignmentsProvider(event.id),
  );
  if (planValue case AsyncValue(:final error?, hasValue: false)) {
    return HostFormatsCourtsSetupState(
      status: HostFormatsCourtsSetupStatus.error,
      error: error,
    );
  }
  if (catchAsyncStateFromAsyncValue(planValue).isLoading) {
    return const HostFormatsCourtsSetupState.loading();
  }
  final plan = planValue.value;
  if (plan == null) {
    return const HostFormatsCourtsSetupState(
      status: HostFormatsCourtsSetupStatus.noPlan,
    );
  }
  final roster = ref
      .watch(watchEventParticipationRosterProvider(event.id))
      .value;
  return hostFormatsCourtsSetupState(
    plan: plan,
    eventMinutes: event.endTime.difference(event.startTime).inMinutes,
    players: roster == null || roster.bookedCount == 0
        ? event.signedUpCount
        : roster.bookedCount,
    assignments: assignmentsValue.value ?? const [],
  );
}

/// The court setup from the plan, the event length, who is booked and the
/// rotations already made.
HostFormatsCourtsSetupState hostFormatsCourtsSetupState({
  required EventSuccessPlan plan,
  required int eventMinutes,
  required int players,
  required List<EventSuccessAssignment> assignments,
}) {
  final structure = plan.structureConfig;
  var partnerTotal = 0;
  var played = 0;
  var repeats = 0;
  for (final assignment in assignments) {
    final fairness = assignment.rotationFairness;
    if (fairness == null) continue;
    partnerTotal += fairness.uniquePeerCount;
    played += fairness.assignedRoundCount;
    repeats += fairness.repeatPeerCount;
  }
  final count = assignments.length;
  return HostFormatsCourtsSetupState(
    status: HostFormatsCourtsSetupStatus.ready,
    plan: plan,
    saved: hostFormatsCourtsDraftFor(structure),
    eventMinutes: eventMinutes,
    players: players,
    previewed: count > 0,
    newPartners: count == 0 ? 0 : (partnerTotal / count).round(),
    roundsPlayed: count == 0 ? 0 : (played / count).round(),
    repeatPartners: repeats ~/ 2,
    editable: plan.status != EventSuccessPlanStatus.complete,
  );
}

/// The draft a saved structure reads as.
HostFormatsCourtsDraft hostFormatsCourtsDraftFor(
  EventSuccessStructureConfig structure,
) => HostFormatsCourtsDraft(
  courts: structure.resourceCapacity?.concurrentUnits ?? 1,
  minutes: structure.rotationIntervalMinutes ?? 15,
  aim:
      structure.clusterActivityAttributes.contains(
        EventSuccessActivityAssignmentAttribute.skillBand,
      )
      ? HostFormatsCourtsAim.closeGames
      : HostFormatsCourtsAim.meetMany,
);

/// The structure a draft saves as: courts are the court resource, the
/// minutes the rotation interval, and close games keep similar levels
/// together while meeting many keeps partners from repeating.
EventSuccessStructureConfig hostFormatsCourtsStructure(
  EventSuccessStructureConfig structure,
  HostFormatsCourtsDraft draft,
) {
  final capacity = structure.resourceCapacity;
  final cluster = [
    for (final attribute in structure.clusterActivityAttributes)
      if (attribute != EventSuccessActivityAssignmentAttribute.skillBand)
        attribute,
    if (draft.aim == HostFormatsCourtsAim.closeGames)
      EventSuccessActivityAssignmentAttribute.skillBand,
  ];
  return structure.copyWith(
    rotationIntervalMinutes: draft.minutes,
    resourceCapacity: EventSuccessResourceCapacity(
      concurrentUnits: draft.courts,
      resourceLabelId:
          capacity?.resourceLabelId ?? EventSuccessResourceLabelId.court,
      seatsPerUnit: capacity?.seatsPerUnit,
    ),
    rotationRepeatStrategy: draft.aim == HostFormatsCourtsAim.meetMany
        ? EventSuccessRotationRepeatStrategy.avoid
        : structure.rotationRepeatStrategy,
    clusterActivityAttributes: cluster,
  );
}

/// Guest names by their account, from the guest list.
Map<String, String> hostFormatsNames(List<EventAttendee> attendees) => {
  for (final attendee in attendees) ?attendee.linkedUid: attendee.displayName,
};
