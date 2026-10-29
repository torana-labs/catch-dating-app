import 'dart:math' as math;

import 'package:catch_dating_app/contexts/bookings/bookings.dart';
import 'package:catch_dating_app/contexts/events/events.dart';
import 'package:catch_dating_app/contexts/formats/formats.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';

enum EventSuccessAttendeeMomentKind {
  none,
  preArrival,
  selfCheckIn,
  firstHelloCheckIn,
  compatibilityQuestionnaire,
  liveStepContext,
  socialPrompt,
  conversationCues,
  assignment,
  liveReveal,
  wingmanRequest,
  postEvent,
}

enum EventSuccessAttendeeLifecycle {
  unavailable,
  booked,
  checkedIn,
  postEvent;

  bool get canUsePreEventInputs =>
      this == EventSuccessAttendeeLifecycle.booked ||
      this == EventSuccessAttendeeLifecycle.checkedIn;
}

class EventSuccessAttendeeMoment {
  const EventSuccessAttendeeMoment({
    required this.kind,
    this.activeStep,
    this.assignmentModuleId,
    this.showPostEventOpeners = false,
    this.showFeedback = false,
  });

  const EventSuccessAttendeeMoment.none()
    : this(kind: EventSuccessAttendeeMomentKind.none);

  final EventSuccessAttendeeMomentKind kind;
  final EventRunOfShowStep? activeStep;
  final String? assignmentModuleId;
  final bool showPostEventOpeners;
  final bool showFeedback;

  bool get hasVisibleModule => kind != EventSuccessAttendeeMomentKind.none;

  bool get showSelfCheckIn =>
      kind == EventSuccessAttendeeMomentKind.selfCheckIn;

  bool get showFirstHelloCheckIn =>
      kind == EventSuccessAttendeeMomentKind.firstHelloCheckIn;

  bool get showPreCheckInPlanning =>
      kind == EventSuccessAttendeeMomentKind.preArrival ||
      kind == EventSuccessAttendeeMomentKind.selfCheckIn;

  bool get showCompatibilityQuestionnaire =>
      kind == EventSuccessAttendeeMomentKind.compatibilityQuestionnaire;

  bool get showLiveStepContext =>
      kind == EventSuccessAttendeeMomentKind.liveStepContext;

  bool get showPrompt => kind == EventSuccessAttendeeMomentKind.socialPrompt;

  bool get showConversationCues =>
      kind == EventSuccessAttendeeMomentKind.conversationCues ||
      showPostEventOpeners;

  bool get showPodAssignment =>
      kind == EventSuccessAttendeeMomentKind.assignment &&
      assignmentModuleId == EventSuccessModuleCatalog.microPods.id;

  bool get showRotationSchedule =>
      kind == EventSuccessAttendeeMomentKind.assignment &&
      assignmentModuleId == EventSuccessModuleCatalog.guidedRotations.id;

  bool get showLiveReveal => kind == EventSuccessAttendeeMomentKind.liveReveal;

  bool get showWingmanRequest =>
      kind == EventSuccessAttendeeMomentKind.wingmanRequest;
}

class EventSuccessRuntime {
  const EventSuccessRuntime({
    required this.plan,
    required this.event,
    required this.now,
  });

  final EventSuccessPlan plan;
  final Event event;
  final DateTime now;

  bool moduleEnabled(String moduleId) => plan.hasModule(moduleId);

  /// Attendance check-in is an event-platform primitive, not an optional
  /// Event Success module. Old plans may still carry the legacy module id.
  bool get checkInEnabled => true;

  bool get firstHelloCheckInEnabled =>
      moduleEnabled(EventSuccessModuleCatalog.firstHelloCheckIn.id);

  bool get hostScriptEnabled =>
      moduleEnabled(EventSuccessModuleCatalog.hostScript.id);

  bool get microPodsEnabled =>
      moduleEnabled(EventSuccessModuleCatalog.microPods.id);

  bool get socialMissionsEnabled =>
      moduleEnabled(EventSuccessModuleCatalog.socialMissions.id);

  bool get guidedRotationsEnabled =>
      moduleEnabled(EventSuccessModuleCatalog.guidedRotations.id);

  bool get liveRevealEnabled =>
      moduleEnabled(EventSuccessModuleCatalog.liveReveal.id);

  bool get compatibilityQuestionnaireEnabled =>
      moduleEnabled(EventSuccessModuleCatalog.compatibilityQuestionnaire.id);

  bool get compatibilityCanAffectRanking =>
      compatibilityQuestionnaireEnabled && plan.compatibilityAffectsRanking;

  bool get wingmanRequestsEnabled =>
      moduleEnabled(EventSuccessModuleCatalog.wingmanRequests.id);

  bool get contextualOpenersConfigured =>
      moduleEnabled(EventSuccessModuleCatalog.contextualOpeners.id);

  bool get conversationCuesEnabled =>
      socialMissionsEnabled || contextualOpenersConfigured;

  bool get decomposedFeedbackEnabled =>
      moduleEnabled(EventSuccessModuleCatalog.decomposedFeedback.id);

  bool get hostAnalyticsEnabled =>
      moduleEnabled(EventSuccessModuleCatalog.hostAnalytics.id);

  bool get hostReportEnabled => hostAnalyticsEnabled;

  bool get attendeePromptEnabled => hostScriptEnabled || socialMissionsEnabled;

  bool get hasParticipantPostEventSurface =>
      contextualOpenersConfigured || decomposedFeedbackEnabled;

  List<EventRunOfShowStep> get runOfShowSteps => plan.playbook.runOfShow
      .where(_runOfShowStepEnabled)
      .toList(growable: false);

  EventRunOfShowStep? get activeRunOfShowStep {
    final steps = runOfShowSteps;
    if (steps.isEmpty) return null;
    final index = plan.activeStepIndex;
    if (index <= 0) return steps.first;
    if (index >= steps.length) return steps.last;
    return steps[index];
  }

  bool canShowSelfCheckIn({required bool checkInOpen}) => checkInOpen;

  bool canShowFirstHelloCheckIn({
    required EventParticipationStatus? participationStatus,
    required bool checkInOpen,
    required bool eventEnded,
    required bool arrivalMissionAssigned,
    bool arrivalMissionStartAvailable = false,
  }) {
    return firstHelloCheckInEnabled &&
        checkInOpen &&
        !eventEnded &&
        (arrivalMissionAssigned || arrivalMissionStartAvailable) &&
        participationStatus == EventParticipationStatus.signedUp;
  }

  bool canShowWingmanRequest({
    required bool attended,
    required bool eventEnded,
  }) => wingmanRequestsEnabled && attended && !eventEnded;

  bool canUseCompatibilityQuestionnaire({
    required EventParticipationStatus? participationStatus,
    required bool eventEnded,
  }) {
    final lifecycle = _attendeeLifecycle(
      participationStatus: participationStatus,
      eventEnded: eventEnded,
    );
    return compatibilityQuestionnaireEnabled &&
        lifecycle.canUsePreEventInputs &&
        !eventEnded;
  }

  bool canShowFeedback({required bool attended, required bool eventEnded}) =>
      decomposedFeedbackEnabled && attended && eventEnded;

  bool canShowPreCheckInPlanning({
    required bool isBooked,
    required bool eventEnded,
  }) => isBooked && !eventEnded && (microPodsEnabled || guidedRotationsEnabled);

  bool canShowAttendeePrompt({
    required bool attended,
    required bool eventEnded,
  }) => attendeePromptEnabled && attended && !eventEnded;

  bool canShowLiveConversationCues({
    required bool attended,
    required bool eventEnded,
  }) => socialMissionsEnabled && attended && !eventEnded;

  bool canShowPostEventOpeners({
    required bool attended,
    required bool eventEnded,
  }) => contextualOpenersConfigured && attended && eventEnded;

  bool canShowPodAssignment({required bool attended}) =>
      microPodsEnabled && attended;

  bool canShowGuidedRotations({required bool attended}) =>
      guidedRotationsEnabled && attended;

  bool canShowLiveReveal({required bool attended}) =>
      liveRevealEnabled &&
      attended &&
      (_usesStandingsReveal || guidedRotationsEnabled || microPodsEnabled);

  EventSuccessAttendeeMoment attendeeMoment({
    required EventParticipationStatus? participationStatus,
    required bool checkInOpen,
    required bool eventEnded,
    bool compatibilityResponseSaved = false,
    bool arrivalMissionAssigned = false,
    bool arrivalMissionStartAvailable = false,
  }) {
    final lifecycle = _attendeeLifecycle(
      participationStatus: participationStatus,
      eventEnded: eventEnded,
    );
    final attended =
        lifecycle == EventSuccessAttendeeLifecycle.checkedIn ||
        lifecycle == EventSuccessAttendeeLifecycle.postEvent;
    final isBooked = lifecycle == EventSuccessAttendeeLifecycle.booked;

    if (lifecycle == EventSuccessAttendeeLifecycle.postEvent) {
      final hasPostEventSurface =
          canShowPostEventOpeners(attended: attended, eventEnded: eventEnded) ||
          canShowFeedback(attended: attended, eventEnded: eventEnded);
      if (!hasPostEventSurface) return const EventSuccessAttendeeMoment.none();
      return EventSuccessAttendeeMoment(
        kind: EventSuccessAttendeeMomentKind.postEvent,
        showPostEventOpeners: canShowPostEventOpeners(
          attended: attended,
          eventEnded: eventEnded,
        ),
        showFeedback: canShowFeedback(
          attended: attended,
          eventEnded: eventEnded,
        ),
      );
    }

    final step = activeRunOfShowStep;
    if (canShowFirstHelloCheckIn(
      participationStatus: participationStatus,
      checkInOpen: checkInOpen,
      eventEnded: eventEnded,
      arrivalMissionAssigned: arrivalMissionAssigned,
      arrivalMissionStartAvailable: arrivalMissionStartAvailable,
    )) {
      return EventSuccessAttendeeMoment(
        kind: EventSuccessAttendeeMomentKind.firstHelloCheckIn,
        activeStep: step,
      );
    }
    if (!compatibilityResponseSaved &&
        canUseCompatibilityQuestionnaire(
          participationStatus: participationStatus,
          eventEnded: eventEnded,
        ) &&
        _canPrioritizeCompatibilityQuestionnaire(lifecycle, step)) {
      return EventSuccessAttendeeMoment(
        kind: EventSuccessAttendeeMomentKind.compatibilityQuestionnaire,
        activeStep: step,
      );
    }

    if (isBooked) {
      if (canShowSelfCheckIn(checkInOpen: checkInOpen)) {
        return EventSuccessAttendeeMoment(
          kind: EventSuccessAttendeeMomentKind.selfCheckIn,
          activeStep: activeRunOfShowStep,
        );
      }
      if (canShowPreCheckInPlanning(
        isBooked: isBooked,
        eventEnded: eventEnded,
      )) {
        return EventSuccessAttendeeMoment(
          kind: EventSuccessAttendeeMomentKind.preArrival,
          activeStep: activeRunOfShowStep,
        );
      }
      return const EventSuccessAttendeeMoment.none();
    }

    if (lifecycle != EventSuccessAttendeeLifecycle.checkedIn) {
      return const EventSuccessAttendeeMoment.none();
    }

    if (step == null) return const EventSuccessAttendeeMoment.none();
    if (_stepHasModule(step, EventSuccessModuleCatalog.liveReveal.id) &&
        liveRevealEnabled &&
        (plan.revealStatus == EventSuccessRevealStatus.countingDown ||
            plan.revealStatus == EventSuccessRevealStatus.revealed)) {
      return EventSuccessAttendeeMoment(
        kind: EventSuccessAttendeeMomentKind.liveReveal,
        activeStep: step,
        assignmentModuleId: _assignmentModuleIdForStep(step),
      );
    }
    if (_stepHasModule(step, EventSuccessModuleCatalog.socialMissions.id) &&
        canShowLiveConversationCues(
          attended: attended,
          eventEnded: eventEnded,
        )) {
      return EventSuccessAttendeeMoment(
        kind: EventSuccessAttendeeMomentKind.conversationCues,
        activeStep: step,
      );
    }
    if (_stepHasModule(step, EventSuccessModuleCatalog.hostScript.id) &&
        canShowAttendeePrompt(attended: attended, eventEnded: eventEnded)) {
      return EventSuccessAttendeeMoment(
        kind: EventSuccessAttendeeMomentKind.socialPrompt,
        activeStep: step,
      );
    }
    if (_stepHasModule(step, EventSuccessModuleCatalog.guidedRotations.id) &&
        guidedRotationsEnabled) {
      return EventSuccessAttendeeMoment(
        kind: liveRevealEnabled
            ? EventSuccessAttendeeMomentKind.liveStepContext
            : EventSuccessAttendeeMomentKind.assignment,
        activeStep: step,
        assignmentModuleId: EventSuccessModuleCatalog.guidedRotations.id,
      );
    }
    if (_stepHasModule(step, EventSuccessModuleCatalog.microPods.id) &&
        microPodsEnabled) {
      return EventSuccessAttendeeMoment(
        kind: liveRevealEnabled
            ? EventSuccessAttendeeMomentKind.liveStepContext
            : EventSuccessAttendeeMomentKind.assignment,
        activeStep: step,
        assignmentModuleId: EventSuccessModuleCatalog.microPods.id,
      );
    }
    if (_stepHasModule(step, EventSuccessModuleCatalog.wingmanRequests.id) &&
        canShowWingmanRequest(attended: attended, eventEnded: eventEnded)) {
      return EventSuccessAttendeeMoment(
        kind: EventSuccessAttendeeMomentKind.wingmanRequest,
        activeStep: step,
      );
    }
    return EventSuccessAttendeeMoment(
      kind: EventSuccessAttendeeMomentKind.liveStepContext,
      activeStep: step,
    );
  }

  EventSuccessLivePlan? livePlan({
    required int bookedCount,
    required int checkedInCount,
  }) {
    final steps = runOfShowSteps;
    if (steps.isEmpty) return null;
    return EventSuccessLivePlan(
      playbook: plan.playbook,
      durationShape: EventSuccessActivityProfile.forFormat(
        event.eventFormat,
      ).durationShape,
      steps: steps,
      activeStepIndex: math.min(
        math.max(plan.activeStepIndex, 0),
        steps.length - 1,
      ),
      checkedInCount: checkedInCount,
      bookedCount: bookedCount,
    );
  }

  bool _runOfShowStepEnabled(EventRunOfShowStep step) {
    if (step.moduleIds.isEmpty) return true;
    return step.moduleIds.every(_moduleIdEnabledForLiveStep);
  }

  bool _moduleIdEnabledForLiveStep(String moduleId) {
    if (moduleId == EventSuccessModuleCatalog.wingmanRequests.id) {
      return wingmanRequestsEnabled;
    }
    if (moduleId == EventSuccessModuleCatalog.contextualOpeners.id) {
      return contextualOpenersConfigured;
    }
    if (moduleId == EventSuccessModuleCatalog.liveReveal.id) {
      return liveRevealEnabled &&
          (_usesStandingsReveal || guidedRotationsEnabled || microPodsEnabled);
    }
    return moduleEnabled(moduleId);
  }

  bool _stepHasModule(EventRunOfShowStep step, String moduleId) =>
      step.moduleIds.contains(moduleId);

  bool get _usesStandingsReveal {
    final profile = EventSuccessActivityProfile.forFormat(event.eventFormat);
    return profile.unitOutcome == EventSuccessUnitOutcome.score ||
        (profile.unitOutcome == EventSuccessUnitOutcome.rank &&
            profile.assignmentResolution.supported);
  }

  bool _canPrioritizeCompatibilityQuestionnaire(
    EventSuccessAttendeeLifecycle lifecycle,
    EventRunOfShowStep? step,
  ) {
    if (lifecycle == EventSuccessAttendeeLifecycle.booked) return true;
    if (lifecycle != EventSuccessAttendeeLifecycle.checkedIn) return false;
    if (plan.revealStatus != EventSuccessRevealStatus.idle) return false;
    if (step == null) return true;
    if (step.moduleIds.every(plan.playbook.nonConfigurableModuleIds.contains)) {
      return true;
    }
    return switch (step.stage) {
      EventSuccessStage.before || EventSuccessStage.arrival => true,
      EventSuccessStage.opening ||
      EventSuccessStage.activity ||
      EventSuccessStage.mixing ||
      EventSuccessStage.closing ||
      EventSuccessStage.after ||
      EventSuccessStage.hostDebrief => false,
    };
  }

  String? _assignmentModuleIdForStep(EventRunOfShowStep step) {
    if (_stepHasModule(step, EventSuccessModuleCatalog.guidedRotations.id) &&
        guidedRotationsEnabled) {
      return EventSuccessModuleCatalog.guidedRotations.id;
    }
    if (_stepHasModule(step, EventSuccessModuleCatalog.microPods.id) &&
        microPodsEnabled) {
      return EventSuccessModuleCatalog.microPods.id;
    }
    if (guidedRotationsEnabled) {
      return EventSuccessModuleCatalog.guidedRotations.id;
    }
    if (microPodsEnabled) return EventSuccessModuleCatalog.microPods.id;
    return null;
  }
}

EventSuccessAttendeeLifecycle _attendeeLifecycle({
  required EventParticipationStatus? participationStatus,
  required bool eventEnded,
}) {
  if (participationStatus == EventParticipationStatus.attended) {
    return eventEnded
        ? EventSuccessAttendeeLifecycle.postEvent
        : EventSuccessAttendeeLifecycle.checkedIn;
  }
  if (participationStatus == EventParticipationStatus.signedUp && !eventEnded) {
    return EventSuccessAttendeeLifecycle.booked;
  }
  return EventSuccessAttendeeLifecycle.unavailable;
}
