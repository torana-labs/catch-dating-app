import 'package:catch_dating_app/contexts/bookings/domain/event_arrival_action.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_activity_profile.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_compatibility_response.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_playbooks.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_arrival_mission.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_preference.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_runtime.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_standings.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_wingman_request.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_moment_presentation_state.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_assignment_kind.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:flutter/widgets.dart';

enum EventSuccessCompanionRouteStatus { loading, message, error, ready }

enum EventSuccessCompanionRetryIntent {
  event,
  uid,
  profile,
  participation,
  plan,
  arrivalMission,
  compatibility,
  feedback,
  assignment,
  rotationAssignment,
  standings,
  preference,
  wingmanRequest,
  wingmanCandidates,
}

@immutable
class EventSuccessCompanionRouteMessage {
  const EventSuccessCompanionRouteMessage({
    required this.title,
    required this.message,
  });

  final String title;
  final String message;
}

@immutable
class EventSuccessCompanionRouteState {
  const EventSuccessCompanionRouteState._({
    required this.status,
    required this.message,
    required this.error,
    required this.errorContext,
    required this.retryIntent,
    required this.event,
    required this.uid,
    required this.profile,
    required this.participation,
    required this.plan,
    required this.referenceNow,
    required this.runtime,
    required this.eventEnded,
    required this.checkInOpen,
    required this.firstHelloAvailable,
    required this.activeArrivalMission,
    required this.compatibilityResponse,
    required this.attendeeMoment,
    required this.shouldLoadFeedback,
    required this.shouldLoadWingmanRequest,
    required this.shouldLoadAssignment,
    required this.shouldLoadRotations,
    required this.shouldLoadStandings,
    required this.feedback,
    required this.wingmanRequestCandidates,
    required this.wingmanRequest,
    required this.assignment,
    required this.rotationAssignment,
    required this.standings,
    required this.microPodsOptedOut,
    required this.guidedRotationsOptedOut,
  });

  factory EventSuccessCompanionRouteState.resolveCore({
    required AppLocalizations l10n,
    required CatchAsyncState<Event?> eventState,
    required Event? initialEvent,
    required CatchAsyncState<String?> uidState,
    required CatchAsyncState<UserProfile?>? profileState,
    required CatchAsyncState<EventParticipation?>? participationState,
    required CatchAsyncState<EventSuccessPlan?> planState,
    required DateTime referenceNow,
  }) {
    final event = eventState.value ?? initialEvent;
    if (eventState.status == CatchAsyncStatus.loading && event == null) {
      return EventSuccessCompanionRouteState.loading();
    }
    if (eventState.status == CatchAsyncStatus.error &&
        eventState.error != null) {
      return EventSuccessCompanionRouteState.error(
        error: eventState.error!,
        errorContext: AppErrorContext.event,
        retryIntent: EventSuccessCompanionRetryIntent.event,
      );
    }
    if (event == null) {
      return EventSuccessCompanionRouteState.message(
        title:
            l10n.eventSuccessEventSuccessCompanionScreenStateTitleEventNotFound,
        message: l10n
            .eventSuccessEventSuccessCompanionScreenStateMessageThisEventIsNo,
      );
    }

    if (uidState.status == CatchAsyncStatus.loading) {
      return EventSuccessCompanionRouteState.loading(event: event);
    }
    if (uidState.status == CatchAsyncStatus.error && uidState.error != null) {
      return EventSuccessCompanionRouteState.error(
        error: uidState.error!,
        errorContext: AppErrorContext.auth,
        retryIntent: EventSuccessCompanionRetryIntent.uid,
        event: event,
      );
    }
    final uid = uidState.value;
    if (uid == null) {
      return EventSuccessCompanionRouteState.message(
        title: l10n
            .eventSuccessEventSuccessCompanionScreenStateTitleSignInRequired,
        message: l10n
            .eventSuccessEventSuccessCompanionScreenStateMessageSignInToOpen,
        event: event,
      );
    }

    final profile = profileState;
    final participation = participationState;
    if (profile == null ||
        participation == null ||
        profile.status == CatchAsyncStatus.loading ||
        participation.status == CatchAsyncStatus.loading ||
        planState.status == CatchAsyncStatus.loading) {
      return EventSuccessCompanionRouteState.loading(event: event, uid: uid);
    }
    if (profile.status == CatchAsyncStatus.error && profile.error != null) {
      return EventSuccessCompanionRouteState.error(
        error: profile.error!,
        errorContext: AppErrorContext.profile,
        retryIntent: EventSuccessCompanionRetryIntent.profile,
        event: event,
        uid: uid,
      );
    }
    if (participation.status == CatchAsyncStatus.error &&
        participation.error != null) {
      return EventSuccessCompanionRouteState.error(
        error: participation.error!,
        errorContext: AppErrorContext.event,
        retryIntent: EventSuccessCompanionRetryIntent.participation,
        event: event,
        uid: uid,
      );
    }
    if (planState.status == CatchAsyncStatus.error && planState.error != null) {
      return EventSuccessCompanionRouteState.error(
        error: planState.error!,
        errorContext: AppErrorContext.event,
        retryIntent: EventSuccessCompanionRetryIntent.plan,
        event: event,
        uid: uid,
      );
    }

    final userProfile = profile.value;
    final eventParticipation = participation.value;
    if (userProfile == null || eventParticipation == null) {
      return EventSuccessCompanionRouteState.message(
        title: l10n
            .eventSuccessEventSuccessCompanionScreenStateTitleNoBookingFound,
        message: l10n
            .eventSuccessEventSuccessCompanionScreenStateMessageBookThisEventBefore,
        event: event,
        uid: uid,
      );
    }

    final plan = planState.value;
    if (plan == null) {
      return EventSuccessCompanionRouteState.message(
        title: l10n
            .eventSuccessEventSuccessCompanionScreenStateTitleCompanionNotAvailable,
        message: l10n
            .eventSuccessEventSuccessCompanionScreenStateMessageTheHostHasNot,
        event: event,
        uid: uid,
        profile: userProfile,
        participation: eventParticipation,
      );
    }

    final runtime = EventSuccessRuntime(
      plan: plan,
      event: event,
      now: referenceNow,
    );
    final eventEnded = !event.endTime.isAfter(referenceNow);
    final checkInOpen = isSelfCheckInOpenForParticipationStatus(
      event: event,
      status: eventParticipation.status,
      now: referenceNow,
    );
    final firstHelloAvailable = runtime.canShowFirstHelloCheckIn(
      participationStatus: eventParticipation.status,
      checkInOpen: checkInOpen,
      eventEnded: eventEnded,
      arrivalMissionAssigned: false,
      arrivalMissionStartAvailable: true,
    );

    return EventSuccessCompanionRouteState._(
      status: EventSuccessCompanionRouteStatus.ready,
      message: null,
      error: null,
      errorContext: null,
      retryIntent: null,
      event: event,
      uid: uid,
      profile: userProfile,
      participation: eventParticipation,
      plan: plan,
      referenceNow: referenceNow,
      runtime: runtime,
      eventEnded: eventEnded,
      checkInOpen: checkInOpen,
      firstHelloAvailable: firstHelloAvailable,
      activeArrivalMission: null,
      compatibilityResponse: null,
      attendeeMoment: null,
      shouldLoadFeedback: false,
      shouldLoadWingmanRequest: false,
      shouldLoadAssignment: false,
      shouldLoadRotations: false,
      shouldLoadStandings: false,
      feedback: null,
      wingmanRequestCandidates: const <PublicProfile>[],
      wingmanRequest: null,
      assignment: null,
      rotationAssignment: null,
      standings: null,
      microPodsOptedOut: false,
      guidedRotationsOptedOut: false,
    );
  }

  factory EventSuccessCompanionRouteState.loading({Event? event, String? uid}) {
    return EventSuccessCompanionRouteState._empty(
      status: EventSuccessCompanionRouteStatus.loading,
      event: event,
      uid: uid,
    );
  }

  factory EventSuccessCompanionRouteState.message({
    required String title,
    required String message,
    Event? event,
    String? uid,
    UserProfile? profile,
    EventParticipation? participation,
  }) {
    return EventSuccessCompanionRouteState._empty(
      status: EventSuccessCompanionRouteStatus.message,
      message: EventSuccessCompanionRouteMessage(
        title: title,
        message: message,
      ),
      event: event,
      uid: uid,
      profile: profile,
      participation: participation,
    );
  }

  factory EventSuccessCompanionRouteState.error({
    required Object error,
    required AppErrorContext errorContext,
    required EventSuccessCompanionRetryIntent retryIntent,
    Event? event,
    String? uid,
  }) {
    return EventSuccessCompanionRouteState._empty(
      status: EventSuccessCompanionRouteStatus.error,
      error: error,
      errorContext: errorContext,
      retryIntent: retryIntent,
      event: event,
      uid: uid,
    );
  }

  factory EventSuccessCompanionRouteState._empty({
    required EventSuccessCompanionRouteStatus status,
    EventSuccessCompanionRouteMessage? message,
    Object? error,
    AppErrorContext? errorContext,
    EventSuccessCompanionRetryIntent? retryIntent,
    Event? event,
    String? uid,
    UserProfile? profile,
    EventParticipation? participation,
  }) {
    return EventSuccessCompanionRouteState._(
      status: status,
      message: message,
      error: error,
      errorContext: errorContext,
      retryIntent: retryIntent,
      event: event,
      uid: uid,
      profile: profile,
      participation: participation,
      plan: null,
      referenceNow: null,
      runtime: null,
      eventEnded: false,
      checkInOpen: false,
      firstHelloAvailable: false,
      activeArrivalMission: null,
      compatibilityResponse: null,
      attendeeMoment: null,
      shouldLoadFeedback: false,
      shouldLoadWingmanRequest: false,
      shouldLoadAssignment: false,
      shouldLoadRotations: false,
      shouldLoadStandings: false,
      feedback: null,
      wingmanRequestCandidates: const <PublicProfile>[],
      wingmanRequest: null,
      assignment: null,
      rotationAssignment: null,
      standings: null,
      microPodsOptedOut: false,
      guidedRotationsOptedOut: false,
    );
  }

  final EventSuccessCompanionRouteStatus status;
  final EventSuccessCompanionRouteMessage? message;
  final Object? error;
  final AppErrorContext? errorContext;
  final EventSuccessCompanionRetryIntent? retryIntent;
  final Event? event;
  final String? uid;
  final UserProfile? profile;
  final EventParticipation? participation;
  final EventSuccessPlan? plan;
  final DateTime? referenceNow;
  final EventSuccessRuntime? runtime;
  final bool eventEnded;
  final bool checkInOpen;
  final bool firstHelloAvailable;
  final EventSuccessArrivalMission? activeArrivalMission;
  final EventSuccessCompatibilityResponse? compatibilityResponse;
  final EventSuccessAttendeeMoment? attendeeMoment;
  final bool shouldLoadFeedback;
  final bool shouldLoadWingmanRequest;
  final bool shouldLoadAssignment;
  final bool shouldLoadRotations;
  final bool shouldLoadStandings;
  final EventSuccessFeedback? feedback;
  final List<PublicProfile> wingmanRequestCandidates;
  final EventSuccessWingmanRequest? wingmanRequest;
  final EventSuccessAssignment? assignment;
  final EventSuccessAssignment? rotationAssignment;
  final EventSuccessStandings? standings;
  final bool microPodsOptedOut;
  final bool guidedRotationsOptedOut;

  bool get isReady => status == EventSuccessCompanionRouteStatus.ready;

  EventSuccessCompanionRouteState withArrivalMission(
    CatchAsyncState<EventSuccessArrivalMission?> arrivalMissionState,
  ) {
    if (!isReady) return this;
    if (arrivalMissionState.status == CatchAsyncStatus.loading) {
      return _withRouteStatus(EventSuccessCompanionRouteStatus.loading);
    }
    if (arrivalMissionState.status == CatchAsyncStatus.error &&
        arrivalMissionState.error != null) {
      return _withRouteStatus(
        EventSuccessCompanionRouteStatus.error,
        error: arrivalMissionState.error,
        errorContext: AppErrorContext.event,
        retryIntent: EventSuccessCompanionRetryIntent.arrivalMission,
      );
    }
    final arrivalMission = arrivalMissionState.value;
    return _copyWith(
      activeArrivalMission: arrivalMission?.isActive == true
          ? arrivalMission
          : null,
    );
  }

  EventSuccessCompanionRouteState withCompatibilityResponse(
    CatchAsyncState<EventSuccessCompatibilityResponse?> compatibilityState,
  ) {
    if (!isReady) return this;
    if (compatibilityState.status == CatchAsyncStatus.loading) {
      return _withRouteStatus(EventSuccessCompanionRouteStatus.loading);
    }
    if (compatibilityState.status == CatchAsyncStatus.error &&
        compatibilityState.error != null) {
      return _withRouteStatus(
        EventSuccessCompanionRouteStatus.error,
        error: compatibilityState.error,
        errorContext: AppErrorContext.event,
        retryIntent: EventSuccessCompanionRetryIntent.compatibility,
      );
    }

    final moment = runtime!.attendeeMoment(
      participationStatus: participation!.status,
      checkInOpen: checkInOpen,
      eventEnded: eventEnded,
      compatibilityResponseSaved: compatibilityState.value != null,
      arrivalMissionAssigned: activeArrivalMission != null,
      arrivalMissionStartAvailable: firstHelloAvailable,
    );

    return _copyWith(
      compatibilityResponse: compatibilityState.value,
      attendeeMoment: moment,
      shouldLoadFeedback: moment.showFeedback,
      shouldLoadWingmanRequest: moment.showWingmanRequest,
      shouldLoadAssignment:
          moment.showPodAssignment ||
          (moment.showLiveReveal &&
              moment.assignmentModuleId ==
                  EventSuccessModuleCatalog.microPods.id),
      shouldLoadRotations:
          moment.showRotationSchedule ||
          (moment.showLiveReveal &&
              moment.assignmentModuleId ==
                  EventSuccessModuleCatalog.guidedRotations.id),
      shouldLoadStandings:
          moment.showLiveReveal &&
          _unitOutcomeHasStandings(
            EventSuccessActivityProfile.forFormat(
              event!.eventFormat,
            ).unitOutcome,
          ),
    );
  }

  EventSuccessCompanionRouteState withMomentData({
    required CatchAsyncState<EventSuccessFeedback?> feedbackState,
    required CatchAsyncState<EventSuccessPreference?> preferenceState,
    required CatchAsyncState<List<PublicProfile>> wingmanCandidatesState,
    required CatchAsyncState<EventSuccessWingmanRequest?> wingmanRequestState,
    required CatchAsyncState<EventSuccessAssignment?> assignmentState,
    required CatchAsyncState<EventSuccessAssignment?> rotationState,
    required CatchAsyncState<EventSuccessStandings?> standingsState,
  }) {
    if (!isReady) return this;
    if (feedbackState.status == CatchAsyncStatus.loading ||
        preferenceState.status == CatchAsyncStatus.loading ||
        wingmanRequestState.status == CatchAsyncStatus.loading ||
        assignmentState.status == CatchAsyncStatus.loading ||
        rotationState.status == CatchAsyncStatus.loading ||
        standingsState.status == CatchAsyncStatus.loading) {
      return _withRouteStatus(EventSuccessCompanionRouteStatus.loading);
    }

    final error = _firstCompanionRouteError([
      (feedbackState, EventSuccessCompanionRetryIntent.feedback),
      (assignmentState, EventSuccessCompanionRetryIntent.assignment),
      (rotationState, EventSuccessCompanionRetryIntent.rotationAssignment),
      (standingsState, EventSuccessCompanionRetryIntent.standings),
      (preferenceState, EventSuccessCompanionRetryIntent.preference),
      (wingmanRequestState, EventSuccessCompanionRetryIntent.wingmanRequest),
      (
        wingmanCandidatesState,
        EventSuccessCompanionRetryIntent.wingmanCandidates,
      ),
    ]);
    if (error != null) {
      return _withRouteStatus(
        EventSuccessCompanionRouteStatus.error,
        error: error.$1,
        errorContext: AppErrorContext.event,
        retryIntent: error.$2,
      );
    }

    final preference = preferenceState.value;
    return _copyWith(
      feedback: feedbackState.value,
      wingmanRequestCandidates:
          wingmanCandidatesState.value ?? const <PublicProfile>[],
      wingmanRequest: wingmanRequestState.value,
      assignment: assignmentState.value,
      rotationAssignment: rotationState.value,
      standings: standingsState.value,
      microPodsOptedOut: preference?.microPodsOptedOut ?? false,
      guidedRotationsOptedOut: preference?.guidedRotationsOptedOut ?? false,
    );
  }

  EventSuccessCompanionRouteState _withRouteStatus(
    EventSuccessCompanionRouteStatus status, {
    Object? error,
    AppErrorContext? errorContext,
    EventSuccessCompanionRetryIntent? retryIntent,
  }) {
    return EventSuccessCompanionRouteState._(
      status: status,
      message: null,
      error: error,
      errorContext: errorContext,
      retryIntent: retryIntent,
      event: event,
      uid: uid,
      profile: profile,
      participation: participation,
      plan: plan,
      referenceNow: referenceNow,
      runtime: runtime,
      eventEnded: eventEnded,
      checkInOpen: checkInOpen,
      firstHelloAvailable: firstHelloAvailable,
      activeArrivalMission: activeArrivalMission,
      compatibilityResponse: compatibilityResponse,
      attendeeMoment: attendeeMoment,
      shouldLoadFeedback: shouldLoadFeedback,
      shouldLoadWingmanRequest: shouldLoadWingmanRequest,
      shouldLoadAssignment: shouldLoadAssignment,
      shouldLoadRotations: shouldLoadRotations,
      shouldLoadStandings: shouldLoadStandings,
      feedback: feedback,
      wingmanRequestCandidates: wingmanRequestCandidates,
      wingmanRequest: wingmanRequest,
      assignment: assignment,
      rotationAssignment: rotationAssignment,
      standings: standings,
      microPodsOptedOut: microPodsOptedOut,
      guidedRotationsOptedOut: guidedRotationsOptedOut,
    );
  }

  EventSuccessCompanionRouteState _copyWith({
    EventSuccessArrivalMission? activeArrivalMission,
    EventSuccessCompatibilityResponse? compatibilityResponse,
    EventSuccessAttendeeMoment? attendeeMoment,
    bool? shouldLoadFeedback,
    bool? shouldLoadWingmanRequest,
    bool? shouldLoadAssignment,
    bool? shouldLoadRotations,
    bool? shouldLoadStandings,
    EventSuccessFeedback? feedback,
    List<PublicProfile>? wingmanRequestCandidates,
    EventSuccessWingmanRequest? wingmanRequest,
    EventSuccessAssignment? assignment,
    EventSuccessAssignment? rotationAssignment,
    EventSuccessStandings? standings,
    bool? microPodsOptedOut,
    bool? guidedRotationsOptedOut,
  }) {
    return EventSuccessCompanionRouteState._(
      status: EventSuccessCompanionRouteStatus.ready,
      message: null,
      error: null,
      errorContext: null,
      retryIntent: null,
      event: event,
      uid: uid,
      profile: profile,
      participation: participation,
      plan: plan,
      referenceNow: referenceNow,
      runtime: runtime,
      eventEnded: eventEnded,
      checkInOpen: checkInOpen,
      firstHelloAvailable: firstHelloAvailable,
      activeArrivalMission: activeArrivalMission ?? this.activeArrivalMission,
      compatibilityResponse:
          compatibilityResponse ?? this.compatibilityResponse,
      attendeeMoment: attendeeMoment ?? this.attendeeMoment,
      shouldLoadFeedback: shouldLoadFeedback ?? this.shouldLoadFeedback,
      shouldLoadWingmanRequest:
          shouldLoadWingmanRequest ?? this.shouldLoadWingmanRequest,
      shouldLoadAssignment: shouldLoadAssignment ?? this.shouldLoadAssignment,
      shouldLoadRotations: shouldLoadRotations ?? this.shouldLoadRotations,
      shouldLoadStandings: shouldLoadStandings ?? this.shouldLoadStandings,
      feedback: feedback ?? this.feedback,
      wingmanRequestCandidates:
          wingmanRequestCandidates ?? this.wingmanRequestCandidates,
      wingmanRequest: wingmanRequest ?? this.wingmanRequest,
      assignment: assignment ?? this.assignment,
      rotationAssignment: rotationAssignment ?? this.rotationAssignment,
      standings: standings ?? this.standings,
      microPodsOptedOut: microPodsOptedOut ?? this.microPodsOptedOut,
      guidedRotationsOptedOut:
          guidedRotationsOptedOut ?? this.guidedRotationsOptedOut,
    );
  }
}

(Object, EventSuccessCompanionRetryIntent)? _firstCompanionRouteError(
  Iterable<(CatchAsyncState<dynamic>, EventSuccessCompanionRetryIntent)> values,
) {
  for (final (value, intent) in values) {
    if (value.status == CatchAsyncStatus.error && value.error != null) {
      return (value.error!, intent);
    }
  }
  return null;
}

@immutable
class EventSuccessCompanionScreenState {
  const EventSuccessCompanionScreenState({
    required this.runtime,
    required this.attendeeMoment,
    required this.presentation,
    required this.attended,
    required this.eventEnded,
    required this.checkInOpen,
    required this.wingmanCandidates,
    required this.revealKind,
    required this.effectKey,
    required this.usePaperShell,
  });

  factory EventSuccessCompanionScreenState.from({
    required AppLocalizations l10n,
    required Event event,
    required EventSuccessPlan plan,
    required UserProfile userProfile,
    required EventParticipation participation,
    required List<PublicProfile> wingmanRequestCandidates,
    required EventSuccessCompatibilityResponse? compatibilityResponse,
    required EventSuccessArrivalMission? arrivalMission,
    required bool arrivalMissionStartAvailable,
    required DateTime now,
  }) {
    final runtime = EventSuccessRuntime(plan: plan, event: event, now: now);
    final attended = participation.status == EventParticipationStatus.attended;
    final eventEnded = !event.endTime.isAfter(now);
    final checkInOpen = isSelfCheckInOpenForParticipationStatus(
      event: event,
      status: participation.status,
      now: now,
    );
    final attendeeMoment = runtime.attendeeMoment(
      participationStatus: participation.status,
      checkInOpen: checkInOpen,
      eventEnded: eventEnded,
      compatibilityResponseSaved: compatibilityResponse != null,
      arrivalMissionAssigned: arrivalMission != null,
      arrivalMissionStartAvailable: arrivalMissionStartAvailable,
    );
    final presentation = EventSuccessMomentPresentation.forMoment(
      l10n: l10n,
      event: event,
      plan: plan,
      moment: attendeeMoment,
      attended: attended,
      showSelfCheckIn: attendeeMoment.showSelfCheckIn,
      eventEnded: eventEnded,
    );
    final effectKey = [
      event.id,
      attendeeMoment.kind.name,
      plan.activeStepIndex,
      plan.revealStatus.name,
      plan.activeRevealRoundIndex,
      attendeeMoment.activeStep?.stage.name ??
          l10n.eventSuccessEventSuccessCompanionScreenStateVisiblecopyNoStage,
      attendeeMoment.activeStep?.title ??
          l10n.eventSuccessEventSuccessCompanionScreenStateVisiblecopyNoStep,
    ].join(':');

    return EventSuccessCompanionScreenState(
      runtime: runtime,
      attendeeMoment: attendeeMoment,
      presentation: presentation,
      attended: attended,
      eventEnded: eventEnded,
      checkInOpen: checkInOpen,
      wingmanCandidates: _wingmanCandidatesForViewer(
        viewer: userProfile,
        candidates: wingmanRequestCandidates,
      ),
      revealKind: _revealKindForAttendeeMoment(
        attendeeMoment,
        EventSuccessActivityProfile.forFormat(event.eventFormat).unitOutcome,
      ),
      effectKey: effectKey,
      usePaperShell: _shouldUsePaperCompanionShell(attendeeMoment.kind),
    );
  }

  final EventSuccessRuntime runtime;
  final EventSuccessAttendeeMoment attendeeMoment;
  final EventSuccessMomentPresentation presentation;
  final bool attended;
  final bool eventEnded;
  final bool checkInOpen;
  final List<PublicProfile> wingmanCandidates;
  final EventSuccessRevealAssignmentKind? revealKind;
  final String effectKey;
  final bool usePaperShell;

  String transitionKey(String suffix) =>
      '${attendeeMoment.kind.name}:$suffix:${runtime.plan.activeStepIndex}:'
      '${runtime.plan.revealStatus.name}:'
      '${runtime.plan.activeRevealRoundIndex}';
}

List<PublicProfile> _wingmanCandidatesForViewer({
  required UserProfile viewer,
  required List<PublicProfile> candidates,
}) {
  final interestedIn = viewer.interestedInGenders.toSet();
  if (interestedIn.isEmpty) return const [];
  return [
    for (final candidate in candidates)
      if (candidate.uid != viewer.uid &&
          interestedIn.contains(candidate.gender))
        candidate,
  ];
}

EventSuccessRevealAssignmentKind? _revealKindForAttendeeMoment(
  EventSuccessAttendeeMoment moment,
  EventSuccessUnitOutcome unitOutcome,
) {
  if (moment.showLiveReveal && _unitOutcomeHasStandings(unitOutcome)) {
    return EventSuccessRevealAssignmentKind.standings;
  }
  if (moment.assignmentModuleId ==
      EventSuccessModuleCatalog.guidedRotations.id) {
    return EventSuccessRevealAssignmentKind.rotations;
  }
  if (moment.assignmentModuleId == EventSuccessModuleCatalog.microPods.id) {
    return EventSuccessRevealAssignmentKind.microPods;
  }
  return null;
}

bool _unitOutcomeHasStandings(EventSuccessUnitOutcome unitOutcome) =>
    unitOutcome == EventSuccessUnitOutcome.score ||
    unitOutcome == EventSuccessUnitOutcome.rank;

bool _shouldUsePaperCompanionShell(EventSuccessAttendeeMomentKind kind) {
  return switch (kind) {
    EventSuccessAttendeeMomentKind.preArrival ||
    EventSuccessAttendeeMomentKind.selfCheckIn => true,
    _ => false,
  };
}
