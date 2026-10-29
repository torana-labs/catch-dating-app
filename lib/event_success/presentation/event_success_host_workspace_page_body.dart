import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation_roster.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_activity_profile.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_models.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_exclusion_ledger.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_layout.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_preference.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_presence.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_standings.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_wingman_request.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_host_screen_state.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_live_effects_controller.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_live_reveal_card_state.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_room_map.dart';
import 'package:catch_dating_app/event_success/presentation/host_components/event_success_host_tab_bar.dart';
import 'package:catch_dating_app/event_success/presentation/host_components/event_success_live_workspace_tab_bar.dart';
import 'package:catch_dating_app/event_success/presentation/host_live/event_success_host_live_page_body.dart';
import 'package:catch_dating_app/event_success/presentation/host_report/event_success_host_report_page_body.dart';
import 'package:catch_dating_app/event_success/presentation/host_setup/event_success_host_setup_page_body.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessHostWorkspacePageBody extends StatefulWidget {
  const EventSuccessHostWorkspacePageBody({
    super.key,
    required this.event,
    required this.plan,
    required this.planIsPersisted,
    this.spatialLayout,
    this.spatialLayoutState =
        const EventSuccessSpatialLayoutState.notApplicable(),
    this.organizerLayoutsState = const CatchAsyncState.data([]),
    this.layoutSavePending = false,
    this.layoutSaveError,
    this.onSaveLayout,
    required this.roster,
    this.scorecard,
    this.assignments = const [],
    this.assignmentParticipantProfiles = const [],
    this.rotationAssignments = const [],
    this.rotationDraftAssignments = const [],
    this.rotationParticipantProfiles = const [],
    this.preferences = const [],
    this.standings,
    this.outcomeUnits,
    this.presenceSummary,
    this.presenceError,
    this.accountabilityAttendees = const [],
    this.accountabilitySection,
    this.membershipSection,
    this.helpSection,
    this.deliverySection,
    this.assistanceSettingsSection,
    this.assignmentFeaturesSection,
    this.movementSection,
    this.accountabilityMode,
    this.accountabilityError,
    this.loadingAccountability = false,
    this.resolvingAccountability = false,
    this.resolvingLateArrival = false,
    this.lateArrivalError,
    this.wingmanRequests = const [],
    this.wingmanProfiles = const [],
    this.liveResourcesLoaded = true,
    this.resourceFailures = const [],
    this.onRetryResource,
    this.initialTab = EventSuccessHostTab.setup,
    this.showTabs = true,
    this.embedded = false,
    this.compactLiveControls = false,
    this.initialLiveWorkspace = EventSuccessLiveWorkspace.now,
    this.initialSpatialSelectionUid,
    this.operationalRosterSummary,
    this.onOpenGuests,
    this.guestsWorkspaceSemanticLabel,
    this.setupActionState = const EventSuccessSetupActionState(),
    this.onSaveSetup,
    this.liveActionState = const EventSuccessLiveActionState(),
    this.onSetLiveStep,
    this.onCompleteLiveGuide,
    this.onResolveAccountability,
    this.onPlayLiveEffect,
    this.microPodsGenerationState =
        const EventSuccessAssignmentGenerationActionState(),
    this.rotationsGenerationState =
        const EventSuccessAssignmentGenerationActionState(),
    this.onGenerateMicroPods,
    this.onGenerateGuidedRotations,
    this.onResolveLateArrival,
    this.onPublishGuidedRotationRound,
    this.onOverrideGroupAssignments,
    this.onOverrideGuidedRotations,
    this.onPreviewSpatial,
    this.onReassignSpatial,
    this.onConfirmSpatial,
    this.onReleaseSpatial,
    this.revealActionState = const EventSuccessRevealActionState(),
    this.onStartRevealCountdown,
    this.onRevealRound,
    this.onResetReveal,
    this.outcomeActionState = const EventSuccessOutcomeActionState(),
    this.onRecordOutcomes,
    this.exclusionAlertThreshold = defaultEventSuccessExclusionAlertThreshold,
    this.exclusionReferenceNow,
    this.referenceNow,
  }) : assert(exclusionAlertThreshold > Duration.zero);

  final Event event;
  final EventSuccessPlan plan;
  final bool planIsPersisted;
  final EventSuccessLayout? spatialLayout;
  final EventSuccessSpatialLayoutState spatialLayoutState;
  final CatchAsyncState<List<EventSuccessLayout>> organizerLayoutsState;
  final bool layoutSavePending;
  final Object? layoutSaveError;
  final Future<EventSuccessLayout> Function(EventSuccessLayout layout)?
  onSaveLayout;
  final EventParticipationRoster roster;
  final EventSuccessScorecard? scorecard;
  final List<EventSuccessAssignment> assignments;
  final List<PublicProfile> assignmentParticipantProfiles;
  final List<EventSuccessAssignment> rotationAssignments;
  final List<EventSuccessAssignment> rotationDraftAssignments;
  final List<PublicProfile> rotationParticipantProfiles;
  final List<EventSuccessPreference> preferences;
  final EventSuccessStandings? standings;
  final List<EventSuccessOutcomeUnit>? outcomeUnits;
  final EventSuccessPresenceSummary? presenceSummary;
  final Object? presenceError;
  final List<EventAttendee> accountabilityAttendees;
  final Widget? accountabilitySection;
  final Widget? membershipSection;
  final Widget? helpSection;
  final Widget? deliverySection;
  final Widget? assistanceSettingsSection;
  final Widget? assignmentFeaturesSection;
  final Widget? movementSection;
  final EventSuccessAccountability? accountabilityMode;
  final Object? accountabilityError;
  final bool loadingAccountability;
  final bool resolvingAccountability;
  final bool resolvingLateArrival;
  final Object? lateArrivalError;
  final List<EventSuccessWingmanRequest> wingmanRequests;
  final List<PublicProfile> wingmanProfiles;
  final bool liveResourcesLoaded;
  final List<EventSuccessHostResourceFailure> resourceFailures;
  final ValueChanged<EventSuccessHostRetryIntent>? onRetryResource;
  final EventSuccessHostTab initialTab;
  final bool showTabs;
  final bool embedded;
  final bool compactLiveControls;
  final EventSuccessLiveWorkspace initialLiveWorkspace;
  final String? initialSpatialSelectionUid;
  final EventSuccessOperationalRosterSummary? operationalRosterSummary;
  final VoidCallback? onOpenGuests;
  final String? guestsWorkspaceSemanticLabel;
  final EventSuccessSetupActionState setupActionState;
  final Future<void> Function(EventSuccessSetupSaveRequest request)?
  onSaveSetup;
  final EventSuccessLiveActionState liveActionState;
  final Future<void> Function(int stepIndex)? onSetLiveStep;
  final Future<void> Function(bool accountabilityAcknowledged)?
  onCompleteLiveGuide;
  final Future<void> Function(
    String attendeeId,
    EventSuccessAccountabilityResolution? resolution,
  )?
  onResolveAccountability;
  final Future<void> Function(EventSuccessLiveEffectKind kind)?
  onPlayLiveEffect;
  final EventSuccessAssignmentGenerationActionState microPodsGenerationState;
  final EventSuccessAssignmentGenerationActionState rotationsGenerationState;
  final Future<void> Function()? onGenerateMicroPods;
  final Future<void> Function()? onGenerateGuidedRotations;
  final Future<void> Function(String uid)? onResolveLateArrival;
  final Future<void> Function(int roundIndex)? onPublishGuidedRotationRound;
  final Future<void> Function(List<EventSuccessGroupOverrideRound> rounds)?
  onOverrideGroupAssignments;
  final Future<void> Function(List<EventSuccessRotationOverrideRound> rounds)?
  onOverrideGuidedRotations;
  final EventSuccessSpatialPreview? onPreviewSpatial;
  final EventSuccessSpatialReassign? onReassignSpatial;
  final Future<void> Function(EventSuccessAssignment assignment)?
  onConfirmSpatial;
  final Future<void> Function(EventSuccessAssignment assignment)?
  onReleaseSpatial;
  final EventSuccessRevealActionState revealActionState;
  final Future<void> Function(int roundIndex, int countdownSeconds)?
  onStartRevealCountdown;
  final Future<void> Function(int roundIndex)? onRevealRound;
  final Future<void> Function()? onResetReveal;
  final EventSuccessOutcomeActionState outcomeActionState;
  final Future<void> Function({
    required int expectedRevision,
    required int roundIndex,
    required List<EventSuccessUnitOutcomeEntryInput> entries,
  })?
  onRecordOutcomes;
  final Duration exclusionAlertThreshold;
  final DateTime? exclusionReferenceNow;
  final DateTime? referenceNow;

  @override
  State<EventSuccessHostWorkspacePageBody> createState() =>
      _EventSuccessHostWorkspacePageBodyState();
}

class _EventSuccessHostWorkspacePageBodyState
    extends State<EventSuccessHostWorkspacePageBody> {
  static const _liveActionDebounce = CatchMotion.eventSuccessActionDebounce;

  late EventSuccessHostTab _selectedTab = widget.initialTab;
  late EventSuccessLiveWorkspace _liveWorkspace = widget.initialLiveWorkspace;
  var _liveActionPending = false;
  String? _lastLiveActionKey;
  DateTime? _lastLiveActionAt;

  @override
  void didUpdateWidget(covariant EventSuccessHostWorkspacePageBody oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialTab != widget.initialTab) {
      _selectedTab = widget.initialTab;
    }
    if (oldWidget.initialLiveWorkspace != widget.initialLiveWorkspace) {
      _liveWorkspace = widget.initialLiveWorkspace;
    }
  }

  @override
  Widget build(BuildContext context) {
    final body = switch (_selectedTab) {
      EventSuccessHostTab.setup => EventSuccessHostSetupPageBody(
        assistanceSettingsSection: widget.assistanceSettingsSection,
        assignmentFeaturesSection: widget.assignmentFeaturesSection,
        event: widget.event,
        plan: widget.plan,
        planIsPersisted: widget.planIsPersisted,
        organizerLayoutsState: widget.organizerLayoutsState,
        layoutSavePending: widget.layoutSavePending,
        layoutSaveError: widget.layoutSaveError,
        onSaveLayout: widget.onSaveLayout,
        actionState: widget.setupActionState,
        onSaveSetup: widget.onSaveSetup,
        referenceNow: widget.referenceNow,
        embedded: widget.embedded,
      ),
      EventSuccessHostTab.live => EventSuccessHostLivePageBody(
        event: widget.event,
        plan: widget.plan,
        planIsPersisted: widget.planIsPersisted,
        spatialLayout: widget.spatialLayout,
        spatialLayoutState: widget.spatialLayoutState,
        showRoomWorkspace: _liveWorkspace == EventSuccessLiveWorkspace.room,
        initialSpatialSelectionUid: widget.initialSpatialSelectionUid,
        roster: widget.roster,
        assignments: widget.assignments,
        assignmentParticipantProfiles: widget.assignmentParticipantProfiles,
        rotationAssignments: widget.rotationAssignments,
        rotationDraftAssignments: widget.rotationDraftAssignments,
        rotationParticipantProfiles: widget.rotationParticipantProfiles,
        preferences: widget.preferences,
        standings: widget.standings,
        outcomeUnits: widget.outcomeUnits,
        presenceSummary: widget.presenceSummary,
        presenceError: widget.presenceError,
        accountabilityAttendees: widget.accountabilityAttendees,
        accountabilitySection: widget.accountabilitySection,
        membershipSection: widget.membershipSection,
        helpSection: widget.helpSection,
        deliverySection: widget.deliverySection,
        movementSection: widget.movementSection,
        accountabilityMode: widget.accountabilityMode,
        accountabilityError: widget.accountabilityError,
        loadingAccountability: widget.loadingAccountability,
        resolvingAccountability: widget.resolvingAccountability,
        resolvingLateArrival: widget.resolvingLateArrival,
        lateArrivalError: widget.lateArrivalError,
        wingmanRequests: widget.wingmanRequests,
        wingmanProfiles: widget.wingmanProfiles,
        resourceFailures: widget.resourceFailures,
        onRetryResource: widget.onRetryResource,
        compactLiveControls: widget.compactLiveControls,
        operationalRosterSummary: widget.operationalRosterSummary,
        onOpenGuests: widget.onOpenGuests,
        actionState: EventSuccessLiveActionState(
          isChangingStep:
              widget.liveActionState.isChangingStep || _liveActionPending,
          isCompleting:
              widget.liveActionState.isCompleting || _liveActionPending,
          stepError: widget.liveActionState.stepError,
          completeError: widget.liveActionState.completeError,
        ),
        onPreviousStep: _liveStepCallback(),
        onNextStep: _liveStepCallback(),
        onCompleteGuide: _liveCompleteCallback(),
        onResolveAccountability: widget.onResolveAccountability,
        microPodsGenerationState: widget.microPodsGenerationState,
        rotationsGenerationState: widget.rotationsGenerationState,
        onGenerateMicroPods: widget.onGenerateMicroPods,
        onGenerateGuidedRotations: widget.onGenerateGuidedRotations,
        onResolveLateArrival: widget.onResolveLateArrival,
        onPublishGuidedRotationRound: widget.onPublishGuidedRotationRound,
        onOverrideGroupAssignments: widget.onOverrideGroupAssignments,
        onOverrideGuidedRotations: widget.onOverrideGuidedRotations,
        onPreviewSpatial: widget.onPreviewSpatial,
        onReassignSpatial: widget.onReassignSpatial,
        onConfirmSpatial: widget.onConfirmSpatial,
        onReleaseSpatial: widget.onReleaseSpatial,
        revealActionState: widget.revealActionState,
        onStartRevealCountdown: _startRevealCountdownCallback(),
        onRevealRound: _revealRoundCallback(),
        onResetReveal: _resetRevealCallback(),
        outcomeActionState: widget.outcomeActionState,
        onRecordOutcomes: widget.onRecordOutcomes,
        exclusionAlertThreshold: widget.exclusionAlertThreshold,
        exclusionReferenceNow: widget.exclusionReferenceNow,
        referenceNow: widget.referenceNow,
        embedded: widget.embedded,
      ),
      EventSuccessHostTab.report => EventSuccessHostReportPageBody(
        helpSection: widget.helpSection,
        deliverySection: widget.deliverySection,
        event: widget.event,
        plan: widget.plan,
        planIsPersisted: widget.planIsPersisted,
        scorecard: widget.scorecard,
        assignments: widget.liveResourcesLoaded ? widget.assignments : null,
        rotationAssignments: widget.liveResourcesLoaded
            ? widget.rotationAssignments
            : null,
        preferences: widget.liveResourcesLoaded ? widget.preferences : null,
        wingmanRequests: widget.liveResourcesLoaded
            ? widget.wingmanRequests
            : null,
        resourceFailures: widget.resourceFailures,
        onRetryResource: widget.onRetryResource,
        embedded: widget.embedded,
      ),
    };
    final workspaceBody =
        widget.compactLiveControls && _selectedTab == EventSuccessHostTab.live
        ? Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: CatchInsets.pageHorizontal.copyWith(
                  top: CatchSpacing.s3,
                  bottom: CatchSpacing.s2,
                ),
                child: EventSuccessLiveWorkspaceTabBar(
                  selected: _liveWorkspace,
                  guestsSemanticLabel: widget.guestsWorkspaceSemanticLabel,
                  onChanged: (workspace) {
                    if (workspace == EventSuccessLiveWorkspace.guests) {
                      widget.onOpenGuests?.call();
                      return;
                    }
                    setState(() => _liveWorkspace = workspace);
                  },
                ),
              ),
              Expanded(child: body),
            ],
          )
        : body;
    if (!widget.showTabs) return workspaceBody;

    final tabs = EventSuccessHostTabBar(
      selectedTab: _selectedTab,
      onChanged: (tab) => setState(() => _selectedTab = tab),
    );

    if (widget.embedded) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [tabs, gapH16, workspaceBody],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        tabs,
        Expanded(child: workspaceBody),
      ],
    );
  }

  Future<void> Function(int stepIndex)? _liveStepCallback() {
    final action = widget.onSetLiveStep;
    if (action == null) return null;
    return (stepIndex) =>
        _runLiveAction(key: 'step:$stepIndex', action: () => action(stepIndex));
  }

  Future<void> Function(bool accountabilityAcknowledged)?
  _liveCompleteCallback() {
    final action = widget.onCompleteLiveGuide;
    if (action == null) return null;
    return (accountabilityAcknowledged) => _runLiveAction(
      key: 'complete',
      action: () => action(accountabilityAcknowledged),
    );
  }

  Future<void> _runLiveAction({
    required String key,
    required Future<void> Function() action,
  }) async {
    final now = DateTime.now();
    final lastAt = _lastLiveActionAt;
    if (_lastLiveActionKey == key &&
        lastAt != null &&
        now.difference(lastAt) < _liveActionDebounce) {
      return;
    }
    if (_liveActionPending) return;
    _lastLiveActionKey = key;
    _lastLiveActionAt = now;
    setState(() => _liveActionPending = true);
    try {
      await action();
    } finally {
      if (mounted) setState(() => _liveActionPending = false);
    }
  }

  Future<void> Function(int roundIndex, int countdownSeconds)?
  _startRevealCountdownCallback() {
    final action = widget.onStartRevealCountdown;
    if (action == null) return null;
    return (roundIndex, countdownSeconds) async {
      await widget.onPlayLiveEffect?.call(
        EventSuccessLiveEffectKind.countdownStart,
      );
      await action(roundIndex, countdownSeconds);
    };
  }

  Future<void> Function(int roundIndex)? _revealRoundCallback() {
    final action = widget.onRevealRound;
    if (action == null) return null;
    return (roundIndex) async {
      await widget.onPlayLiveEffect?.call(
        EventSuccessLiveEffectKind.assignmentRevealed,
      );
      await action(roundIndex);
    };
  }

  Future<void> Function()? _resetRevealCallback() {
    final action = widget.onResetReveal;
    if (action == null) return null;
    return () async {
      await widget.onPlayLiveEffect?.call(
        EventSuccessLiveEffectKind.revealReset,
      );
      await action();
    };
  }
}
