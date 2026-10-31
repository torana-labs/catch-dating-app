import 'dart:math' as math;

import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation_roster.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_activity_profile.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_playbooks.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_structure.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_accountability.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_configuration.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_operations.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_layout.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_presence.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_standings.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';

/// A read-only projection of one rehearsal session into the canonical Event
/// Success host runtime. Mutations remain owned by [EventRehearsalController].
final class EventRehearsalRuntimeProjection {
  const EventRehearsalRuntimeProjection({
    required this.event,
    required this.plan,
    required this.roster,
    required this.profiles,
    required this.presence,
    required this.layout,
    required this.assignments,
    required this.outcomeUnits,
    this.standings,
    this.accountabilityAttendees = const [],
  });

  final Event event;
  final EventSuccessPlan plan;
  final EventParticipationRoster roster;
  final List<PublicProfile> profiles;
  final EventSuccessPresenceSummary presence;
  final EventSuccessLayout layout;
  final List<EventSuccessAssignment> assignments;
  final List<EventSuccessOutcomeUnit> outcomeUnits;
  final EventSuccessStandings? standings;
  final List<EventAttendee> accountabilityAttendees;
}

EventRehearsalRuntimeProjection buildEventRehearsalRuntimeProjection(
  EventRehearsalBootstrap rehearsal, {
  required String practiceGuestLabel,
  required String latePracticeGuestLabel,
}) {
  final session = rehearsal.session;
  final eventId = 'rehearsal_${session.id}';
  final virtualNow = session.virtualNow;
  final eventStart = virtualNow.subtract(
    Duration(minutes: math.max(10, session.activeStepIndex * 12)),
  );
  final movementSimulation = session.setup.movementSimulation;
  final structure = session.setup.successDefaults?.structureConfig;
  final unitKind = structure?.unitKind ?? EventSuccessUnitKind.tables;
  final unitSize = unitKind == EventSuccessUnitKind.wholeGroup
      ? math.max(1, session.actorCount)
      : math.max(1, structure?.unitSize ?? 4);
  final tableCount = math.max(
    structure?.unitCount ?? 1,
    (session.actorCount / unitSize).ceil(),
  );
  final selectedModuleIds = session.setup.modules
      .map(eventRehearsalSuccessModuleId)
      .toSet()
      .toList(growable: false);
  final outcomeKind =
      rehearsal.outcomeReview?.kind ?? session.setup.effectiveUnitOutcome;
  final event = Event(
    id: eventId,
    synthetic: true,
    seedPrefix: session.seed.toString(),
    organizerId: session.organizerId,
    name: session.setup.title,
    startTime: eventStart,
    endTime: eventStart.add(Duration(minutes: session.setup.durationMinutes)),
    meetingPoint: session.setup.locationName,
    eventFormat: EventFormatSnapshot(
      activityKind:
          session.setup.eventFormat?.activityKind ?? ActivityKind.singlesMixer,
      interactionModel:
          session.setup.eventFormat?.interactionModel ??
          EventInteractionModel.seatedTable,
      customActivityLabel: session.setup.eventFormat?.customActivityLabel,
      defaultPlaybookId:
          session.setup.eventFormat?.defaultPlaybookId ??
          'algorithmic_mixer_reveal',
      defaultModuleIds:
          session.setup.eventFormat?.defaultModuleIds ?? selectedModuleIds,
      eventSuccessPrimitives: {
        ...?session.setup.eventFormat?.eventSuccessPrimitives,
        'unitOutcome': outcomeKind.name,
      },
      activityDetails: {
        if (movementSimulation?.routePlan != null)
          'routePlan': movementSimulation!.routePlan!.toJson(),
      },
    ),
    itinerary: movementSimulation?.itinerary ?? const [],
    distanceKm: 0,
    pace: PaceLevel.easy,
    capacityLimit: math.max(1, session.actorCount),
    description: session.setup.hostGoal,
    priceInPaise: 0,
    bookedCount: rehearsal.actors.length,
    checkedInCount: rehearsal.actors.where(_isCheckedIn).length,
  );
  final defaults = session.setup.successDefaults;
  final basePlan = defaults == null
      ? EventSuccessPlan.defaultForEvent(event, now: virtualNow)
      : EventSuccessPlan.fromDraft(
          id: eventId,
          eventId: eventId,
          organizerId: session.organizerId,
          draft: defaults.toDraft(targetAttendeeCount: session.actorCount),
          createdAt: virtualNow,
          updatedAt: virtualNow,
        );
  final reveal = rehearsal.revealReview;
  final plan = basePlan.copyWith(
    selectedModuleIds: defaults?.selectedModuleIds ?? selectedModuleIds,
    targetAttendeeCount: math.max(1, session.actorCount),
    structureConfig:
        (structure ??
                basePlan.structureConfig.copyWith(
                  unitKind: EventSuccessUnitKind.tables,
                  unitSize: 4,
                  unitCount: tableCount,
                  rotationIntervalMinutes: 12,
                ))
            .copyWith(
              revealCountdownSeconds:
                  reveal?.countdownSeconds ??
                  basePlan.structureConfig.revealCountdownSeconds,
            ),
    hostGoal: session.setup.hostGoal,
    attendeePrompt: session.setup.attendeePrompt,
    activeStepIndex: session.activeStepIndex,
    liveControlRevision: session.runtimeRevision,
    publishedRevealRoundIndex: reveal?.publishedRound ?? -1,
    activeRevealRoundIndex:
        reveal?.pendingRound ?? math.max(0, reveal?.publishedRound ?? 0),
    revealStatus: switch (reveal?.status) {
      RehearsalRevealStatus.countingDown =>
        EventSuccessRevealStatus.countingDown,
      RehearsalRevealStatus.revealed => EventSuccessRevealStatus.revealed,
      RehearsalRevealStatus.idle || null => EventSuccessRevealStatus.idle,
    },
    revealStartedAt: reveal?.startedAt,
    status: switch (session.status) {
      EventRehearsalStatus.draft ||
      EventRehearsalStatus.ready => EventSuccessPlanStatus.setup,
      EventRehearsalStatus.running ||
      EventRehearsalStatus.paused => EventSuccessPlanStatus.live,
      EventRehearsalStatus.complete ||
      EventRehearsalStatus.expired => EventSuccessPlanStatus.complete,
    },
    frozenAt: session.hasStarted ? eventStart : null,
    completedAt: session.status == EventRehearsalStatus.complete
        ? virtualNow
        : null,
    updatedAt: virtualNow,
  );
  final layout = EventSuccessLayout(
    layoutId: 'rehearsal-room-${session.id}',
    label: session.setup.locationName,
    units: [
      for (var index = 0; index < tableCount; index++)
        EventSuccessLayoutUnit(
          id: 'table-${index + 1}',
          label: _unitLabelForIndex(index, unitKind),
          shape: EventSuccessLayoutShape.round,
          capacity: unitSize,
          gridX: index % 2,
          gridY: index ~/ 2,
          order: index + 1,
        ),
    ],
  );
  final placedActors = rehearsal.actors.where(_isPlaceable).toList();
  final assignments = <EventSuccessAssignment>[
    for (final indexed in placedActors.indexed)
      _assignmentFor(
        actor: indexed.$2,
        index: indexed.$1,
        tableCount: tableCount,
        unitKind: unitKind,
        eventId: eventId,
        organizerId: session.organizerId,
        now: virtualNow,
        practiceGuestLabel: practiceGuestLabel,
        latePracticeGuestLabel: latePracticeGuestLabel,
      ),
  ];
  final checkedInActors = rehearsal.actors.where(_isCheckedIn).toList();
  final roster = EventParticipationRoster(
    bookedIds: [for (final actor in rehearsal.actors) actor.actorId],
    checkedInIds: [for (final actor in checkedInActors) actor.actorId],
    waitlistedIds: const [],
    checkedInAtByUid: {
      for (final indexed in checkedInActors.indexed)
        indexed.$2.actorId: virtualNow.subtract(
          Duration(minutes: indexed.$1 + 1),
        ),
    },
  );
  final profiles = <PublicProfile>[
    for (final indexed
        in (session.guestSource == 'event'
                ? <EventRehearsalActor>[]
                : rehearsal.actors)
            .indexed)
      PublicProfile(
        uid: indexed.$2.actorId,
        name: indexed.$2.displayName,
        age: 26 + (indexed.$1 % 9),
        gender: Gender.values[indexed.$1 % Gender.values.length],
      ),
  ];
  final virtualNowMillis = virtualNow.millisecondsSinceEpoch;
  final presence = EventSuccessPresenceSummary(
    serverTimeMillis: virtualNowMillis,
    liveControlRevision: session.runtimeRevision,
    nextRoundIndex: session.activeStepIndex + 1,
    policy: const EventSuccessPresencePolicy(
      heartbeatIntervalSeconds: 30,
      presentWindowSeconds: 90,
      likelyDepartedAfterSeconds: 180,
    ),
    entries: [
      for (final actor in rehearsal.actors)
        if (actor.connectionState == EventRehearsalConnectionState.connected)
          EventSuccessPresenceEntry(
            uid: actor.actorId,
            displayName: actor.displayName,
            state: _presenceState(actor.status),
            heartbeatAtMillis: virtualNowMillis,
          ),
    ],
    lateArrivals: [
      for (final actor in rehearsal.actors)
        if (actor.status == EventRehearsalActorStatus.late)
          EventSuccessLateArrivalCandidate(
            uid: actor.actorId,
            displayName: actor.displayName,
            checkedInAtMillis: virtualNowMillis,
          ),
    ],
  );
  final outcomeUnitLabels = {
    for (final unit in layout.units) unit.id: unit.label,
  };
  final outcomeUnits = switch (outcomeKind) {
    RehearsalOutcomeKind.score || RehearsalOutcomeKind.rank => [
      for (final unitId in rehearsal.outcomeReview?.unitIds ?? const <String>[])
        EventSuccessOutcomeUnit(
          id: unitId,
          label: outcomeUnitLabels[unitId] ?? unitId,
        ),
    ],
    RehearsalOutcomeKind.none ||
    RehearsalOutcomeKind.completion => const <EventSuccessOutcomeUnit>[],
  };
  final standings = _standingsFor(
    review: rehearsal.outcomeReview,
    eventId: eventId,
    organizerId: session.organizerId,
    unitLabels: outcomeUnitLabels,
    now: virtualNow,
  );

  return EventRehearsalRuntimeProjection(
    event: event,
    plan: plan,
    roster: roster,
    profiles: profiles,
    presence: presence,
    layout: layout,
    assignments: assignments,
    outcomeUnits: outcomeUnits,
    standings: standings,
    accountabilityAttendees: [
      for (final row
          in rehearsal.accountabilityReviews?.rows ??
              const <RehearsalAccountabilityRow>[])
        if (row.evidence.checkedInAtMillis case final int checkedIn)
          EventAttendee(
            id: row.actorId,
            eventId: eventId,
            organizerId: session.organizerId,
            organizerId: session.organizerId,
            displayName: rehearsal.actors
                .firstWhere((actor) => actor.actorId == row.actorId)
                .displayName,
            searchName: rehearsal.actors
                .firstWhere((actor) => actor.actorId == row.actorId)
                .displayName
                .toLowerCase(),
            source: EventAttendeeSource.hostManual,
            status: EventAttendeeStatus.checkedIn,
            createdAt: DateTime.fromMillisecondsSinceEpoch(checkedIn),
            updatedAt: virtualNow,
            checkedInAt: DateTime.fromMillisecondsSinceEpoch(checkedIn),
            accountabilityResolution: switch (row.evidence.disposition) {
              AssistanceVisitDisposition.returned =>
                EventSuccessAccountabilityResolution.returned,
              AssistanceVisitDisposition.departed =>
                EventSuccessAccountabilityResolution.departed,
              AssistanceVisitDisposition.unresolved => null,
            },
            accountabilityResolvedForCheckInAt:
                DateTime.fromMillisecondsSinceEpoch(checkedIn),
          ),
    ],
  );
}

EventSuccessStandings? _standingsFor({
  required RehearsalOutcomeReview? review,
  required String eventId,
  required String organizerId,
  required Map<String, String> unitLabels,
  required DateTime now,
}) {
  if (review == null ||
      review.kind != RehearsalOutcomeKind.score &&
          review.kind != RehearsalOutcomeKind.rank) {
    return null;
  }
  final recordsByRound = <int, Map<String, RehearsalOutcomeRecord>>{};
  for (final record in review.records) {
    recordsByRound.putIfAbsent(record.round, () => {})[record.unitId] = record;
  }
  final cumulativeScores = <String, num>{};
  final roundsRecorded = <String, int>{};
  final rounds = <EventSuccessStandingRound>[];
  for (var roundIndex = 0; roundIndex <= 10000; roundIndex++) {
    final records = recordsByRound[roundIndex];
    if (records == null ||
        review.unitIds.any((unitId) => !records.containsKey(unitId))) {
      break;
    }
    final entries = <EventSuccessStandingEntry>[];
    for (final unitId in review.unitIds) {
      final record = records[unitId]!;
      roundsRecorded[unitId] = (roundsRecorded[unitId] ?? 0) + 1;
      final value = switch (record.outcome) {
        RehearsalScoreOutcome(:final score) =>
          cumulativeScores[unitId] = (cumulativeScores[unitId] ?? 0) + score,
        RehearsalRankOutcome(:final rank) => rank,
        _ => throw const FormatException(
          'Practice standings contain an incompatible outcome.',
        ),
      };
      entries.add(
        EventSuccessStandingEntry(
          unitId: unitId,
          unitLabel: unitLabels[unitId] ?? unitId,
          position: 0,
          value: value,
          roundsRecorded: roundsRecorded[unitId]!,
        ),
      );
    }
    entries.sort((left, right) {
      final valueOrder = review.kind == RehearsalOutcomeKind.score
          ? right.value.compareTo(left.value)
          : left.value.compareTo(right.value);
      return valueOrder != 0 ? valueOrder : left.unitId.compareTo(right.unitId);
    });
    rounds.add(
      EventSuccessStandingRound(
        roundIndex: roundIndex,
        entries: [
          for (final indexed in entries.indexed)
            EventSuccessStandingEntry(
              unitId: indexed.$2.unitId,
              unitLabel: indexed.$2.unitLabel,
              position: indexed.$1 + 1,
              value: indexed.$2.value,
              roundsRecorded: indexed.$2.roundsRecorded,
            ),
        ],
      ),
    );
  }
  final recordedTimes = review.records.map((record) => record.recordedAt);
  final createdAt = recordedTimes.isEmpty
      ? now
      : recordedTimes.reduce(
          (left, right) => left.isBefore(right) ? left : right,
        );
  final updatedAt = recordedTimes.isEmpty
      ? now
      : recordedTimes.reduce(
          (left, right) => left.isAfter(right) ? left : right,
        );
  return EventSuccessStandings(
    id: 'rehearsal-standings-$eventId',
    eventId: eventId,
    organizerId: organizerId,
    unitOutcome: review.kind == RehearsalOutcomeKind.score
        ? EventSuccessUnitOutcome.score
        : EventSuccessUnitOutcome.rank,
    revision: review.revision,
    latestRoundIndex: rounds.isEmpty ? -1 : rounds.last.roundIndex,
    rounds: List.unmodifiable(rounds),
    entries: rounds.isEmpty ? const [] : rounds.last.entries,
    createdAt: createdAt,
    updatedAt: updatedAt,
  );
}

bool _isCheckedIn(EventRehearsalActor actor) => switch (actor.status) {
  EventRehearsalActorStatus.present ||
  EventRehearsalActorStatus.late ||
  EventRehearsalActorStatus.returned ||
  EventRehearsalActorStatus.walkIn => true,
  _ => false,
};

bool _isPlaceable(EventRehearsalActor actor) => switch (actor.status) {
  EventRehearsalActorStatus.noShow ||
  EventRehearsalActorStatus.departed ||
  EventRehearsalActorStatus.disconnected => false,
  _ => true,
};

EventSuccessPresenceState _presenceState(EventRehearsalActorStatus status) =>
    switch (status) {
      EventRehearsalActorStatus.departed =>
        EventSuccessPresenceState.likelyDeparted,
      EventRehearsalActorStatus.present ||
      EventRehearsalActorStatus.late ||
      EventRehearsalActorStatus.returned ||
      EventRehearsalActorStatus.walkIn => EventSuccessPresenceState.present,
      _ => EventSuccessPresenceState.idle,
    };

EventSuccessAssignment _assignmentFor({
  required EventRehearsalActor actor,
  required int index,
  required int tableCount,
  required EventSuccessUnitKind unitKind,
  required String eventId,
  required String organizerId,
  required DateTime now,
  required String practiceGuestLabel,
  required String latePracticeGuestLabel,
}) {
  final fallbackLayoutUnitId = 'table-${(index % tableCount) + 1}';
  final layoutUnitId = actor.layoutUnitId ?? fallbackLayoutUnitId;
  final parsedTableIndex = int.tryParse(layoutUnitId.split('-').last);
  final tableIndex = parsedTableIndex == null
      ? index % tableCount
      : (parsedTableIndex - 1).clamp(0, tableCount - 1);
  final tableLabel = _unitLabelForIndex(tableIndex, unitKind);
  final legacyConfirmed =
      actor.layoutUnitId == null &&
      (actor.status == EventRehearsalActorStatus.present ||
          actor.status == EventRehearsalActorStatus.returned);
  return EventSuccessAssignment(
    id: 'rehearsal-assignment-${actor.actorId}',
    eventId: eventId,
    organizerId: organizerId,
    uid: actor.actorId,
    moduleId: EventSuccessModuleCatalog.microPods.id,
    label: tableLabel,
    displayTitle: actor.displayName,
    displaySubtitle: actor.status == EventRehearsalActorStatus.late
        ? latePracticeGuestLabel
        : practiceGuestLabel,
    peerUids: const [],
    unitKind: unitKind.singularLabel.toLowerCase(),
    unitIndex: tableIndex,
    unitLabel: tableLabel,
    layoutUnitId: layoutUnitId,
    confirmedLayoutUnitId:
        actor.confirmedLayoutUnitId ?? (legacyConfirmed ? layoutUnitId : null),
    source: 'rehearsal',
    createdAt: now,
    updatedAt: now,
  );
}

String _unitLabelForIndex(int index, EventSuccessUnitKind kind) {
  final noun = kind.singularLabel;
  final titleNoun = noun.isEmpty
      ? noun
      : '${noun[0].toUpperCase()}${noun.substring(1)}';
  return '$titleNoun ${index + 1}';
}
