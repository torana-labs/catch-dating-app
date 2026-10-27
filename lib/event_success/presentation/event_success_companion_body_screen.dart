part of 'event_success_companion_screen.dart';

class EventSuccessCompanionScreen extends StatefulWidget {
  const EventSuccessCompanionScreen({
    super.key,
    required this.event,
    required this.plan,
    this.spatialLayout,
    required this.userProfile,
    required this.participation,
    required this.wingmanRequestCandidates,
    this.wingmanRequest,
    this.compatibilityResponse,
    this.existingFeedback,
    this.assignment,
    this.assignmentPeerProfiles = const [],
    this.assignmentPeersLoading = false,
    this.microPodsOptedOut = false,
    this.rotationAssignment,
    this.standings,
    this.rotationPeerProfiles = const [],
    this.rotationPeersLoading = false,
    this.guidedRotationsOptedOut = false,
    this.lateArrivalResolution,
    this.arrivalMission,
    this.now,
    this.compatibilityActionState =
        const CompatibilityQuestionnaireActionState(),
    this.firstHelloActionState = const FirstHelloActionState(),
    this.selfCheckInActionState = const SelfCheckInActionState(),
    this.isSavingMicroPodsOptOut = false,
    this.isSavingGuidedRotationsOptOut = false,
    this.wingmanActionState = const WingmanRequestActionState(),
    this.feedbackActionState = const EventSuccessFeedbackActionState(),
    this.onSaveCompatibilityAnswers,
    this.onStartArrivalMission,
    this.onCompleteArrivalMission,
    this.onSkipArrivalMission,
    this.onSetMicroPodsIncluded,
    this.onSetGuidedRotationsIncluded,
    this.onSaveWingmanRequest,
    this.onWithdrawWingmanRequest,
    this.onSubmitFeedback,
    this.onSelfCheckIn,
    this.onPlayLiveEffect,
    this.onPlayAmbientBed,
  });

  final Event event;
  final EventSuccessPlan plan;
  final EventSuccessLayout? spatialLayout;
  final UserProfile userProfile;
  final EventParticipation participation;
  final List<PublicProfile> wingmanRequestCandidates;
  final EventSuccessWingmanRequest? wingmanRequest;
  final EventSuccessCompatibilityResponse? compatibilityResponse;
  final EventSuccessFeedback? existingFeedback;
  final EventSuccessAssignment? assignment;
  final List<PublicProfile> assignmentPeerProfiles;
  final bool assignmentPeersLoading;
  final bool microPodsOptedOut;
  final EventSuccessAssignment? rotationAssignment;
  final EventSuccessStandings? standings;
  final List<PublicProfile> rotationPeerProfiles;
  final bool rotationPeersLoading;
  final bool guidedRotationsOptedOut;
  final EventSuccessLateArrivalResolution? lateArrivalResolution;
  final EventSuccessArrivalMission? arrivalMission;
  final DateTime? now;
  final CompatibilityQuestionnaireActionState compatibilityActionState;
  final FirstHelloActionState firstHelloActionState;
  final SelfCheckInActionState selfCheckInActionState;
  final bool isSavingMicroPodsOptOut;
  final bool isSavingGuidedRotationsOptOut;
  final WingmanRequestActionState wingmanActionState;
  final EventSuccessFeedbackActionState feedbackActionState;
  final Future<void> Function(List<String> answerIds)?
  onSaveCompatibilityAnswers;
  final Future<void> Function()? onStartArrivalMission;
  final Future<void> Function(
    EventSuccessArrivalMission mission,
    String answerId,
  )?
  onCompleteArrivalMission;
  final VoidCallback? onSkipArrivalMission;
  final ValueChanged<bool>? onSetMicroPodsIncluded;
  final ValueChanged<bool>? onSetGuidedRotationsIncluded;
  final Future<void> Function(PublicProfile target, String note)?
  onSaveWingmanRequest;
  final Future<void> Function()? onWithdrawWingmanRequest;
  final Future<void> Function(EventSuccessFeedback feedback)? onSubmitFeedback;
  final Future<void> Function(String venueSessionToken)? onSelfCheckIn;
  final Future<void> Function(EventSuccessLiveEffectKind kind)?
  onPlayLiveEffect;
  final Future<void> Function(EventSuccessAmbientBed bed)? onPlayAmbientBed;

  @override
  State<EventSuccessCompanionScreen> createState() =>
      _EventSuccessCompanionScreenState();
}

class _EventSuccessCompanionScreenState
    extends State<EventSuccessCompanionScreen> {
  String? _lastEffectKey;

  @override
  Widget build(BuildContext context) {
    final event = widget.event;
    final plan = widget.plan;
    final referenceNow = widget.now ?? DateTime.now();
    final screenState = EventSuccessCompanionScreenState.from(
      l10n: context.l10n,
      event: event,
      plan: plan,
      userProfile: widget.userProfile,
      participation: widget.participation,
      wingmanRequestCandidates: widget.wingmanRequestCandidates,
      compatibilityResponse: widget.compatibilityResponse,
      arrivalMission: widget.arrivalMission,
      arrivalMissionStartAvailable: widget.onStartArrivalMission != null,
      now: referenceNow,
    );
    final runtime = screenState.runtime;
    final attendeeMoment = screenState.attendeeMoment;
    final momentPresentation = screenState.presentation;
    final compatibilityActionState = widget.compatibilityActionState;
    final firstHelloActionState = widget.firstHelloActionState;
    final selfCheckInActionState = widget.selfCheckInActionState;
    final microPodsActionState = AssignmentOptOutActionState(
      optedOut: widget.microPodsOptedOut,
      isSaving: widget.isSavingMicroPodsOptOut,
    );
    final guidedRotationsActionState = AssignmentOptOutActionState(
      optedOut: widget.guidedRotationsOptedOut,
      isSaving: widget.isSavingGuidedRotationsOptOut,
    );
    final wingmanActionState = widget.wingmanActionState;
    final feedbackActionState = widget.feedbackActionState;
    void setMicroPodsIncluded(bool include) {
      (widget.onSetMicroPodsIncluded ?? _noopIncludeChange)(include);
    }

    void setGuidedRotationsIncluded(bool include) {
      (widget.onSetGuidedRotationsIncluded ?? _noopIncludeChange)(include);
    }

    _playMomentEffectOnce(screenState);

    final stageTheme = _CompanionStageTheme.forMoment(
      context,
      presentation: momentPresentation,
      plan: plan,
    );
    final momentContents = <Widget>[];

    void addMomentContent(Widget content, {String? momentKey}) {
      momentContents.add(
        momentKey == null
            ? content
            : CompanionStageTransitionViewport(
                momentKey: momentKey,
                child: content,
              ),
      );
    }

    final lateArrivalResolution = widget.lateArrivalResolution;
    if (lateArrivalResolution != null &&
        lateArrivalResolution.targetRoundIndex >
            plan.publishedRotationRoundIndex) {
      addMomentContent(
        CatchBanner(
          icon: CatchIcons.time,
          title: context
              .l10n
              .eventSuccessEventSuccessCompanionBodyScreenTitleLateArrival,
          message: lateArrivalResolution.reason,
        ),
        momentKey: screenState.transitionKey('late-arrival'),
      );
    }

    if (attendeeMoment.showSelfCheckIn) {
      addMomentContent(
        SelfCheckInCard(
          event: event,
          actionState: selfCheckInActionState,
          onSelfCheckIn: widget.onSelfCheckIn ?? _noopVenueCheckIn,
        ),
        momentKey: screenState.transitionKey(
          context
              .l10n
              .eventSuccessEventSuccessCompanionBodyScreenVisiblecopySelfCheckIn,
        ),
      );
    }
    if (attendeeMoment.showFirstHelloCheckIn) {
      addMomentContent(
        FirstHelloCheckInCard(
          mission: widget.arrivalMission,
          actionState: firstHelloActionState,
          onStart: widget.onStartArrivalMission,
          onComplete: widget.onCompleteArrivalMission,
          onSkip: widget.onSkipArrivalMission,
          onPlayCompleteEffect: _playCompleteGuideEffect,
        ),
        momentKey: screenState.transitionKey(
          context
              .l10n
              .eventSuccessEventSuccessCompanionBodyScreenVisiblecopyFirstHello,
        ),
      );
    }
    if (attendeeMoment.showPreCheckInPlanning) {
      addMomentContent(
        PreCheckInPlanningCard(
          microPodsEnabled: runtime.microPodsEnabled,
          guidedRotationsEnabled: runtime.guidedRotationsEnabled,
          liveRevealEnabled: runtime.liveRevealEnabled,
          socialMissionsEnabled: runtime.socialMissionsEnabled,
          wingmanRequestsEnabled: runtime.wingmanRequestsEnabled,
        ),
        momentKey: screenState.transitionKey(
          context
              .l10n
              .eventSuccessEventSuccessCompanionBodyScreenVisiblecopyPreArrival,
        ),
      );
    }
    if (attendeeMoment.showCompatibilityQuestionnaire) {
      addMomentContent(
        CompatibilityQuestionnaireSection(
          event: event,
          plan: plan,
          response: widget.compatibilityResponse,
          actionState: compatibilityActionState,
          onSaveAnswers:
              widget.onSaveCompatibilityAnswers ??
              _noopSaveCompatibilityAnswers,
        ),
        momentKey: screenState.transitionKey(
          context
              .l10n
              .eventSuccessEventSuccessCompanionBodyScreenVisiblecopyQuestionnaire,
        ),
      );
    }
    if (attendeeMoment.showPrompt) {
      addMomentContent(
        StagePromptCard(
          title: context
              .l10n
              .eventSuccessEventSuccessCompanionBodyScreenTitleSocialPrompt,
          prompt: plan.attendeePromptFor(event),
        ),
        momentKey: screenState.transitionKey(
          context
              .l10n
              .eventSuccessEventSuccessCompanionBodyScreenVisiblecopyPrompt,
        ),
      );
    }
    if (attendeeMoment.kind == EventSuccessAttendeeMomentKind.postEvent) {
      addMomentContent(
        PrivateAfterglowRecapCard(
          event: event,
          openersEnabled: attendeeMoment.showPostEventOpeners,
          feedbackEnabled: attendeeMoment.showFeedback,
          feedback: widget.existingFeedback,
        ),
        momentKey: screenState.transitionKey(
          context
              .l10n
              .eventSuccessEventSuccessCompanionBodyScreenVisiblecopyAfterglowRecap,
        ),
      );
    }
    if (attendeeMoment.showConversationCues) {
      final isPostEvent = attendeeMoment.showPostEventOpeners;
      addMomentContent(
        StageConversationCueCard(
          title: isPostEvent
              ? context
                    .l10n
                    .eventSuccessEventSuccessCompanionBodyScreenTitleSuggestedFirstMessageOpeners
              : context
                    .l10n
                    .eventSuccessEventSuccessCompanionBodyScreenTitleConversationCues,
          subtitle: isPostEvent
              ? context
                    .l10n
                    .eventSuccessEventSuccessCompanionBodyScreenSubtitleUseOneAfterA
              : context
                    .l10n
                    .eventSuccessEventSuccessCompanionBodyScreenSubtitlePickOneWhenThe,
          cues: isPostEvent
              ? EventSuccessConversationCueLibrary.postEventOpenersFor(
                  event,
                  l10n: context.l10n,
                )
              : EventSuccessConversationCueLibrary.liveCuesFor(
                  event: event,
                  plan: plan,
                  l10n: context.l10n,
                  activeStep: attendeeMoment.activeStep,
                ),
        ),
        momentKey: screenState.transitionKey(
          isPostEvent
              ? context
                    .l10n
                    .eventSuccessEventSuccessCompanionBodyScreenVisiblecopyPostOpeners
              : context
                    .l10n
                    .eventSuccessEventSuccessCompanionBodyScreenVisiblecopyLiveCues,
        ),
      );
    }
    if (attendeeMoment.showLiveStepContext) {
      addMomentContent(
        LiveStepContextCard(step: attendeeMoment.activeStep),
        momentKey: screenState.transitionKey(
          context
              .l10n
              .eventSuccessEventSuccessCompanionBodyScreenVisiblecopyLiveStep,
        ),
      );
    }
    // `showPodAssignment` and `showRotationSchedule` are mutually exclusive
    // with `showLiveReveal` at runtime (different `EventSuccessAttendeeMoment`
    // kinds), so we render the non-reveal cards here directly and let the
    // dedicated reveal branch below handle the reveal case.
    if (attendeeMoment.showPodAssignment) {
      final assignment = widget.microPodsOptedOut ? null : widget.assignment;
      addMomentContent(
        MicroPodCard(
          event: event,
          assignment: assignment,
          peerProfiles: widget.assignmentPeerProfiles,
          peersLoading: widget.assignmentPeersLoading,
          actionState: microPodsActionState,
          onIncludeChanged: setMicroPodsIncluded,
        ),
        momentKey: screenState.transitionKey(
          context
              .l10n
              .eventSuccessEventSuccessCompanionBodyScreenVisiblecopyMicroPod,
        ),
      );
      if (widget.spatialLayout != null && assignment?.layoutUnitId != null) {
        addMomentContent(
          EventSuccessRoomMap(
            layout: widget.spatialLayout!,
            assignments: [assignment!],
          ),
          momentKey: screenState.transitionKey('micro-pod-room-map'),
        );
      }
    }
    if (attendeeMoment.showRotationSchedule) {
      final assignment = widget.guidedRotationsOptedOut
          ? null
          : widget.rotationAssignment;
      addMomentContent(
        RotationScheduleCard(
          event: event,
          assignment: assignment,
          peerProfiles: widget.rotationPeerProfiles,
          peersLoading: widget.rotationPeersLoading,
          actionState: guidedRotationsActionState,
          onIncludeChanged: setGuidedRotationsIncluded,
        ),
        momentKey: screenState.transitionKey(
          context
              .l10n
              .eventSuccessEventSuccessCompanionBodyScreenVisiblecopyRotationSchedule,
        ),
      );
      if (widget.spatialLayout != null && assignment?.layoutUnitId != null) {
        addMomentContent(
          EventSuccessRoomMap(
            layout: widget.spatialLayout!,
            assignments: [assignment!],
          ),
          momentKey: screenState.transitionKey('rotation-room-map'),
        );
      }
    }
    if (attendeeMoment.showLiveReveal && screenState.revealKind != null) {
      final isStandings =
          screenState.revealKind == EventSuccessRevealAssignmentKind.standings;
      final isRotations =
          screenState.revealKind == EventSuccessRevealAssignmentKind.rotations;
      addMomentContent(
        EventSuccessAttendeeRevealSurface(
          event: event,
          plan: plan,
          kind: screenState.revealKind!,
          assignment: isStandings
              ? null
              : isRotations
              ? (widget.guidedRotationsOptedOut
                    ? null
                    : widget.rotationAssignment)
              : (widget.microPodsOptedOut ? null : widget.assignment),
          standings: isStandings ? widget.standings : null,
          peerProfiles: isRotations
              ? widget.rotationPeerProfiles
              : widget.assignmentPeerProfiles,
          peersLoading: isRotations
              ? widget.rotationPeersLoading
              : widget.assignmentPeersLoading,
          optedOut: isStandings
              ? false
              : isRotations
              ? widget.guidedRotationsOptedOut
              : widget.microPodsOptedOut,
          isSavingOptOut: isRotations
              ? guidedRotationsActionState.isSaving
              : microPodsActionState.isSaving,
          onIncludeChanged: isStandings
              ? null
              : isRotations
              ? setGuidedRotationsIncluded
              : setMicroPodsIncluded,
          now: widget.now,
        ),
        momentKey: screenState.transitionKey(
          context
              .l10n
              .eventSuccessEventSuccessCompanionBodyScreenVisiblecopyLiveReveal,
        ),
      );
      final assignment = isStandings
          ? null
          : isRotations
          ? (widget.guidedRotationsOptedOut ? null : widget.rotationAssignment)
          : (widget.microPodsOptedOut ? null : widget.assignment);
      if (widget.spatialLayout != null && assignment?.layoutUnitId != null) {
        addMomentContent(
          EventSuccessRoomMap(
            layout: widget.spatialLayout!,
            assignments: [assignment!],
          ),
          momentKey: screenState.transitionKey('reveal-room-map'),
        );
      }
    }
    if (attendeeMoment.showWingmanRequest) {
      addMomentContent(
        WingmanRequestSection(
          event: event,
          candidates: screenState.wingmanCandidates,
          existingRequest: widget.wingmanRequest,
          actionState: wingmanActionState,
          onSaveRequest: widget.onSaveWingmanRequest ?? _noopSaveWingmanRequest,
          onWithdrawRequest: widget.onWithdrawWingmanRequest ?? _noopFuture,
        ),
        momentKey: screenState.transitionKey(
          context
              .l10n
              .eventSuccessEventSuccessCompanionBodyScreenVisiblecopyWingman,
        ),
      );
    }
    if (attendeeMoment.showFeedback) {
      addMomentContent(
        EventSuccessFeedbackForm(
          event: event,
          userProfile: widget.userProfile,
          existingFeedback: widget.existingFeedback,
          actionState: feedbackActionState,
          onSubmitFeedback: widget.onSubmitFeedback ?? _noopSubmitFeedback,
        ),
        momentKey: screenState.transitionKey(
          context
              .l10n
              .eventSuccessEventSuccessCompanionBodyScreenVisiblecopyFeedback,
        ),
      );
    }
    if (!attendeeMoment.hasVisibleModule) {
      addMomentContent(
        const CompanionActionsEmptyState(),
        momentKey: screenState.transitionKey(
          context
              .l10n
              .eventSuccessEventSuccessCompanionBodyScreenVisiblecopyEmpty,
        ),
      );
    }

    if (screenState.usePaperShell) {
      return CompanionPaperScaffold(
        event: event,
        plan: plan,
        presentation: momentPresentation,
        showSelfCheckIn: attendeeMoment.showSelfCheckIn,
        eventEnded: screenState.eventEnded,
        selfCheckInActionState: selfCheckInActionState,
        onSelfCheckIn: widget.onSelfCheckIn ?? _noopVenueCheckIn,
      );
    }

    return CompanionStageScaffold._(
      event: event,
      plan: plan,
      presentation: momentPresentation,
      stageTheme: stageTheme,
      attended: screenState.attended,
      showSelfCheckIn: attendeeMoment.showSelfCheckIn,
      eventEnded: screenState.eventEnded,
      momentKey: screenState.transitionKey(
        context
            .l10n
            .eventSuccessEventSuccessCompanionBodyScreenVisiblecopyStage,
      ),
      momentKind: attendeeMoment.kind,
      referenceNow: referenceNow,
      content: CompanionMomentPageBody(children: momentContents),
    );
  }

  Future<void> Function()? get _playCompleteGuideEffect {
    final onPlayLiveEffect = widget.onPlayLiveEffect;
    if (onPlayLiveEffect == null) return null;
    return () => onPlayLiveEffect(EventSuccessLiveEffectKind.guideComplete);
  }

  void _playMomentEffectOnce(EventSuccessCompanionScreenState screenState) {
    if (_lastEffectKey == screenState.effectKey) return;
    _lastEffectKey = screenState.effectKey;
    final effect = screenState.presentation.effectKind;
    final bed = screenState.presentation.ambientBed;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      // Switch the ambient bed first so the one-shot lands over the new
      // soundscape, not the previous moment's bed.
      final onPlayAmbientBed = widget.onPlayAmbientBed;
      if (onPlayAmbientBed != null) {
        unawaited(onPlayAmbientBed(bed));
      }
      if (effect != null) {
        final onPlayLiveEffect = widget.onPlayLiveEffect;
        if (onPlayLiveEffect != null) {
          unawaited(onPlayLiveEffect(effect));
        }
      }
    });
  }
}
