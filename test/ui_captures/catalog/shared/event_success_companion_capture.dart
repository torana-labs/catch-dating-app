// Capture// Capture// Capture f// Capture fi// Capture fixtur// Capture fixtures shared by more than one catalog entry. Only the entries
// that import this file depend on it.

import 'dart:async';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_compatibility_response.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_arrival_mission.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_wingman_request.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/design_fixtures/event_success_companion_fixtures.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_companion_screen.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_controller.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_live_effects_controller.dart';
import 'package:catch_dating_app/events/presentation/event_booking_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart'
    show AsyncData, ConsumerState, ConsumerStatefulWidget;

class NoopEventSuccessLiveEffectsController
    extends EventSuccessLiveEffectsController {
  @override
  Future<void> play(EventSuccessLiveEffectKind kind) async {}

  @override
  Future<void> playAmbientBed(EventSuccessAmbientBed bed) async {}

  @override
  Future<void> stopAmbientBed() async {}

  @override
  Future<void> dispose() async {}
}

List<Object> eventSuccessCompanionProviderOverrides() => [
  uidProvider.overrideWithValue(
    const AsyncData<String?>(EventSuccessCompanionFixtures.viewerUid),
  ),
  eventSuccessLiveEffectsControllerProvider.overrideWith(
    (ref) => NoopEventSuccessLiveEffectsController(),
  ),
];

enum EventSuccessCompanionMutationCaptureMode {
  selfCheckInPending,
  firstHelloStartPending,
  firstHelloCompletePending,
  compatibilityPending,
  microPodsOptOutPending,
  guidedRotationsOptOutPending,
  wingmanRequestPending,
  feedbackPending,
}

Widget eventSuccessCompanionCapture({
  Event? event,
  EventSuccessPlan? plan,
  EventParticipation? participation,
  List<PublicProfile> wingmanRequestCandidates = const [],
  EventSuccessWingmanRequest? wingmanRequest,
  EventSuccessCompatibilityResponse? compatibilityResponse,
  EventSuccessFeedback? existingFeedback,
  EventSuccessAssignment? assignment,
  List<PublicProfile> assignmentPeerProfiles = const [],
  bool assignmentPeersLoading = false,
  bool microPodsOptedOut = false,
  EventSuccessAssignment? rotationAssignment,
  List<PublicProfile> rotationPeerProfiles = const [],
  bool rotationPeersLoading = false,
  bool guidedRotationsOptedOut = false,
  EventSuccessArrivalMission? arrivalMission,
  DateTime? now,
  Future<void> Function(List<String> answerIds)? onSaveCompatibilityAnswers,
  Future<void> Function()? onStartArrivalMission,
  Future<void> Function(EventSuccessArrivalMission mission, String answerId)?
  onCompleteArrivalMission,
  VoidCallback? onSkipArrivalMission,
  EventSuccessCompanionMutationCaptureMode? mutationMode,
}) {
  final resolvedEvent = event ?? EventSuccessCompanionFixtures.socialEvent;
  final screen = EventSuccessCompanionScreen(
    event: resolvedEvent,
    plan: plan ?? EventSuccessCompanionFixtures.basePlan,
    userProfile: EventSuccessCompanionFixtures.viewer,
    participation:
        participation ??
        EventSuccessCompanionFixtures.signedUpParticipation(
          event: resolvedEvent,
        ),
    wingmanRequestCandidates: wingmanRequestCandidates,
    wingmanRequest: wingmanRequest,
    compatibilityResponse: compatibilityResponse,
    existingFeedback: existingFeedback,
    assignment: assignment,
    assignmentPeerProfiles: assignmentPeerProfiles,
    assignmentPeersLoading: assignmentPeersLoading,
    microPodsOptedOut: microPodsOptedOut,
    rotationAssignment: rotationAssignment,
    rotationPeerProfiles: rotationPeerProfiles,
    rotationPeersLoading: rotationPeersLoading,
    guidedRotationsOptedOut: guidedRotationsOptedOut,
    arrivalMission: arrivalMission,
    now: now,
    onSaveCompatibilityAnswers: onSaveCompatibilityAnswers,
    onStartArrivalMission: onStartArrivalMission,
    onCompleteArrivalMission: onCompleteArrivalMission,
    onSkipArrivalMission: onSkipArrivalMission,
  );
  if (mutationMode == null) return screen;
  return EventSuccessCompanionMutationCapture(
    mode: mutationMode,
    child: screen,
  );
}

class EventSuccessCompanionMutationCapture extends ConsumerStatefulWidget {
  const EventSuccessCompanionMutationCapture({
    super.key,
    required this.mode,
    required this.child,
  });

  final EventSuccessCompanionMutationCaptureMode mode;
  final Widget child;

  @override
  ConsumerState<EventSuccessCompanionMutationCapture> createState() =>
      EventSuccessCompanionMutationCaptureState();
}

class EventSuccessCompanionMutationCaptureState
    extends ConsumerState<EventSuccessCompanionMutationCapture> {
  @override
  void initState() {
    super.initState();
    _resetMutations();
    _seed();
  }

  @override
  void dispose() {
    _resetMutations();
    super.dispose();
  }

  void _resetMutations() {
    EventBookingController.selfCheckInMutation.reset(ref);
    EventSuccessController.firstHelloStartMutation.reset(ref);
    EventSuccessController.firstHelloCompleteMutation.reset(ref);
    EventSuccessController.compatibilityResponseMutation.reset(ref);
    EventSuccessController.microPodsOptOutMutation.reset(ref);
    EventSuccessController.guidedRotationsOptOutMutation.reset(ref);
    EventSuccessController.wingmanRequestMutation.reset(ref);
    EventSuccessController.feedbackMutation.reset(ref);
  }

  void _seed() {
    switch (widget.mode) {
      case EventSuccessCompanionMutationCaptureMode.selfCheckInPending:
        _runPending(EventBookingController.selfCheckInMutation);
        break;
      case EventSuccessCompanionMutationCaptureMode.firstHelloStartPending:
        _runPending(EventSuccessController.firstHelloStartMutation);
        break;
      case EventSuccessCompanionMutationCaptureMode.firstHelloCompletePending:
        _runPending(EventSuccessController.firstHelloCompleteMutation);
        break;
      case EventSuccessCompanionMutationCaptureMode.compatibilityPending:
        _runPending(EventSuccessController.compatibilityResponseMutation);
        break;
      case EventSuccessCompanionMutationCaptureMode.microPodsOptOutPending:
        _runPending(EventSuccessController.microPodsOptOutMutation);
        break;
      case EventSuccessCompanionMutationCaptureMode
          .guidedRotationsOptOutPending:
        _runPending(EventSuccessController.guidedRotationsOptOutMutation);
        break;
      case EventSuccessCompanionMutationCaptureMode.wingmanRequestPending:
        _runPending(EventSuccessController.wingmanRequestMutation);
        break;
      case EventSuccessCompanionMutationCaptureMode.feedbackPending:
        _runPending(EventSuccessController.feedbackMutation);
        break;
    }
  }

  void _runPending<T>(Mutation<T> mutation) {
    final completer = Completer<T>();
    unawaited(mutation.run(ref, (_) => completer.future));
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
