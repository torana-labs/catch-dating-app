// copy:allow-file(Widgetbook and capture-only deterministic fixture data)
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_compatibility_response.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_playbooks.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_arrival_mission.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_wingman_request.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/design_fixtures/utility_surface_fixtures.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';

/// Shared deterministic fixtures for Event Success attendee companion review.
///
/// These fixtures are direct-screen data, not provider fakes. Route-provider
/// loading/access/error states still need separate coverage once the companion
/// route adapter exists.
final class EventSuccessCompanionFixtures {
  const EventSuccessCompanionFixtures._();

  static const viewerUid = 'design-event-success-viewer';
  static const peerUid = 'design-event-success-peer';
  static const secondPeerUid = 'design-event-success-peer-2';
  static const thirdPeerUid = 'design-event-success-peer-3';
  static const fourthPeerUid = 'design-event-success-peer-4';

  static final now = DateTime(2026, 6, 22, 8);
  static final socialStart = DateTime(2026, 6, 22, 9);
  static final racketStart = DateTime(2026, 6, 22, 18);

  static final viewer = UtilitySurfaceFixtures.viewer.copyWith(
    uid: viewerUid,
    name: 'Isha Menon',
    firstName: 'Isha',
    lastName: 'Menon',
    displayName: 'Isha',
    city: 'Mumbai',
    interestedInGenders: const [Gender.man],
  );

  static const peer = PublicProfile(
    uid: peerUid,
    name: 'Arjun',
    age: 31,
    gender: Gender.man,
    city: 'Mumbai',
  );

  static const secondPeer = PublicProfile(
    uid: secondPeerUid,
    name: 'Rhea',
    age: 29,
    gender: Gender.woman,
    city: 'Mumbai',
  );

  static const thirdPeer = PublicProfile(
    uid: thirdPeerUid,
    name: 'Kabir',
    age: 33,
    gender: Gender.man,
    city: 'Mumbai',
  );

  static const fourthPeer = PublicProfile(
    uid: fourthPeerUid,
    name: 'Dev',
    age: 34,
    gender: Gender.man,
    city: 'Mumbai',
  );

  static const peers = <PublicProfile>[peer, secondPeer, thirdPeer, fourthPeer];

  static final socialEvent = _event(
    id: 'design-event-success-social',
    start: socialStart,
    end: socialStart.add(const Duration(hours: 1, minutes: 30)),
    meetingPoint: 'Bandra Fort gate',
    description:
        'A live event guide for arrivals, prompts, introductions, and afterglow.',
    activityKind: ActivityKind.socialRun,
    distanceKm: 5,
    bookedCount: 18,
    checkedInCount: 11,
  );

  static final racketEvent = _event(
    id: 'design-event-success-racket',
    start: racketStart,
    end: racketStart.add(const Duration(hours: 1, minutes: 30)),
    meetingPoint: 'Court 2 by the clubhouse',
    description: 'Partner rotations with a synchronized reveal between games.',
    activityKind: ActivityKind.pickleball,
    distanceKm: 0,
    bookedCount: 16,
    checkedInCount: 12,
  );

  static final basePlan = EventSuccessPlan.defaultForEvent(
    socialEvent,
    now: now,
  );

  static final firstHelloPlan = basePlan.copyWith(
    selectedModuleIds: [
      EventSuccessModuleCatalog.checkIn.id,
      EventSuccessModuleCatalog.firstHelloCheckIn.id,
      EventSuccessModuleCatalog.compatibilityQuestionnaire.id,
    ],
  );

  static final questionnairePlan = basePlan.copyWith(
    selectedModuleIds: [
      EventSuccessModuleCatalog.compatibilityQuestionnaire.id,
    ],
    compatibilityAffectsRanking: true,
  );

  static final wingmanPlan = basePlan.copyWith(activeStepIndex: 4);

  static final socialPromptPlan = basePlan.copyWith(activeStepIndex: 1);

  static final conversationCuesPlan = basePlan.copyWith(activeStepIndex: 3);

  static final racketPlan =
      EventSuccessPlan.defaultForEvent(racketEvent, now: now).copyWith(
        playbookId: EventSuccessPlaybookLibrary.pickleball.id,
        selectedModuleIds:
            EventSuccessPlaybookLibrary.pickleball.moduleIds.toList()..sort(),
      );

  static final rotationSchedulePlan = racketPlan.copyWith(
    selectedModuleIds: racketPlan.selectedModuleIds
        .where((id) => id != EventSuccessModuleCatalog.liveReveal.id)
        .toList(growable: false),
    activeStepIndex: 1,
  );

  static final liveStepContextPlan = racketPlan.copyWith(
    activeStepIndex: 2,
    revealStatus: EventSuccessRevealStatus.idle,
    activeRevealRoundIndex: 0,
    revealStartedAt: null,
  );

  static final revealCountingDownPlan = racketPlan.copyWith(
    activeStepIndex: 1,
    revealStatus: EventSuccessRevealStatus.countingDown,
    activeRevealRoundIndex: 0,
    revealStartedAt: racketStart.subtract(const Duration(seconds: 2)),
  );

  static final revealUnlockedPlan = racketPlan.copyWith(
    activeStepIndex: 1,
    revealStatus: EventSuccessRevealStatus.revealed,
    activeRevealRoundIndex: 0,
  );

  static final arrivalMission = EventSuccessArrivalMission(
    id: eventSuccessArrivalMissionId(eventId: socialEvent.id, uid: viewerUid),
    eventId: socialEvent.id,
    organizerId: socialEvent.organizerId,
    observerUid: viewerUid,
    targetUid: peerUid,
    targetDisplayName: peer.name,
    targetContext: 'Look for Arjun near the host table.',
    question: 'Ask what kind of partner makes an event feel easy to join.',
    answerOptions: const [
      EventSuccessArrivalMissionAnswerOption(
        id: 'warm_intro',
        label: 'Warm intro',
      ),
      EventSuccessArrivalMissionAnswerOption(
        id: 'playful_energy',
        label: 'Playful energy',
      ),
    ],
    status: EventSuccessArrivalMissionStatus.active,
    createdAt: socialStart.subtract(const Duration(minutes: 2)),
    updatedAt: socialStart.subtract(const Duration(minutes: 2)),
  );

  static final compatibilityResponse = EventSuccessCompatibilityResponse(
    id: '${socialEvent.id}_$viewerUid',
    eventId: socialEvent.id,
    organizerId: socialEvent.organizerId,
    uid: viewerUid,
    answerIds: const ['event_energy_playful_competition'],
    createdAt: now,
    updatedAt: now,
  );

  static final microPodAssignment = EventSuccessAssignment(
    id: eventSuccessAssignmentId(
      eventId: socialEvent.id,
      moduleId: EventSuccessModuleCatalog.microPods.id,
      uid: viewerUid,
    ),
    eventId: socialEvent.id,
    organizerId: socialEvent.organizerId,
    uid: viewerUid,
    moduleId: EventSuccessModuleCatalog.microPods.id,
    label: 'Pod A',
    displayTitle: 'Pod A',
    displaySubtitle: '4 people in this event pod.',
    peerUids: const [peerUid, secondPeerUid, thirdPeerUid],
    source: 'fixture',
    createdAt: now,
    updatedAt: now,
  );

  static final tableAssignment = EventSuccessAssignment(
    id: eventSuccessAssignmentId(
      eventId: socialEvent.id,
      moduleId: EventSuccessModuleCatalog.microPods.id,
      uid: viewerUid,
    ),
    eventId: socialEvent.id,
    organizerId: socialEvent.organizerId,
    uid: viewerUid,
    moduleId: EventSuccessModuleCatalog.microPods.id,
    label: 'Table rotations',
    displayTitle: '2 table rotations',
    displaySubtitle: '20-minute tables across the event.',
    peerUids: const [peerUid, secondPeerUid, thirdPeerUid, fourthPeerUid],
    groupRotationSlots: [
      EventSuccessGroupRotationSlot(
        roundIndex: 0,
        label: 'Round 1',
        unitLabel: 'Table A',
        startsAt: socialStart,
        endsAt: socialStart.add(const Duration(minutes: 20)),
        peerUids: const [peerUid, secondPeerUid],
        compatibility: 'mixed',
      ),
      EventSuccessGroupRotationSlot(
        roundIndex: 1,
        label: 'Round 2',
        unitLabel: 'Table B',
        startsAt: socialStart.add(const Duration(minutes: 20)),
        endsAt: socialStart.add(const Duration(minutes: 40)),
        peerUids: const [thirdPeerUid, fourthPeerUid],
        compatibility: 'social',
      ),
    ],
    source: 'fixture',
    createdAt: now,
    updatedAt: now,
  );

  static final rotationAssignment = EventSuccessAssignment(
    id: eventSuccessAssignmentId(
      eventId: racketEvent.id,
      moduleId: EventSuccessModuleCatalog.guidedRotations.id,
      uid: viewerUid,
    ),
    eventId: racketEvent.id,
    organizerId: racketEvent.organizerId,
    uid: viewerUid,
    moduleId: EventSuccessModuleCatalog.guidedRotations.id,
    label: 'Guided rotations',
    displayTitle: '1 guided rotation',
    displaySubtitle: '15-minute pairings during the event.',
    peerUids: const [peerUid],
    rotationSlots: [
      EventSuccessRotationSlot(
        roundIndex: 0,
        label: 'Round 1',
        startsAt: racketStart,
        endsAt: racketStart.add(const Duration(minutes: 15)),
        peerUid: peerUid,
        compatibility: 'stronger_interest',
        whySummary: 'You both picked playful competition.',
      ),
    ],
    source: 'fixture',
    createdAt: now,
    updatedAt: now,
  );

  static final wingmanRequest = EventSuccessWingmanRequest(
    id: eventSuccessWingmanRequestId(eventId: socialEvent.id, uid: viewerUid),
    eventId: socialEvent.id,
    organizerId: socialEvent.organizerId,
    requesterUid: viewerUid,
    targetUid: peerUid,
    status: EventSuccessWingmanRequestStatus.active,
    hostVisibleConsent: true,
    note: 'Could you help us find a natural moment after the cooldown?',
    createdAt: now,
    updatedAt: now,
  );

  static final feedback = EventSuccessFeedback(
    id: eventSuccessFeedbackId(eventId: socialEvent.id, uid: viewerUid),
    eventId: socialEvent.id,
    organizerId: socialEvent.organizerId,
    uid: viewerUid,
    welcomeRating: 5,
    structureRating: 4,
    metNewPeopleCount: 3,
    privateNote: 'The First Hello mission made arriving much easier.',
    createdAt: now,
    updatedAt: now,
  );

  static EventParticipation signedUpParticipation({Event? event}) =>
      _participation(
        event: event ?? socialEvent,
        status: EventParticipationStatus.signedUp,
      );

  static EventParticipation attendedParticipation({Event? event}) =>
      _participation(
        event: event ?? socialEvent,
        status: EventParticipationStatus.attended,
      );

  static EventParticipation _participation({
    required Event event,
    required EventParticipationStatus status,
  }) {
    final createdAt = event.startTime.subtract(const Duration(days: 2));
    return EventParticipation(
      id: eventParticipationId(eventId: event.id, uid: viewerUid),
      eventId: event.id,
      organizerId: event.organizerId,
      uid: viewerUid,
      status: status,
      createdAt: createdAt,
      updatedAt: now,
      signedUpAt: createdAt,
      attendedAt: status == EventParticipationStatus.attended
          ? event.startTime.subtract(const Duration(minutes: 4))
          : null,
      genderAtSignup: viewer.gender,
    );
  }

  static Event _event({
    required String id,
    required DateTime start,
    required DateTime end,
    required String meetingPoint,
    required String description,
    required ActivityKind activityKind,
    required double distanceKm,
    required int bookedCount,
    required int checkedInCount,
  }) {
    return UtilitySurfaceFixtures.eventFixture(
      id: id,
      meetingPoint: meetingPoint,
      notes: 'Host table is visible from the entrance.',
      latitude: 19.0676,
      longitude: 72.8227,
    ).copyWith(
      startTime: start,
      endTime: end,
      eventFormat: EventFormatSnapshot.fromActivityKind(activityKind),
      distanceKm: distanceKm,
      description: description,
      bookedCount: bookedCount,
      checkedInCount: checkedInCount,
      capacityLimit: 24,
    );
  }
}
