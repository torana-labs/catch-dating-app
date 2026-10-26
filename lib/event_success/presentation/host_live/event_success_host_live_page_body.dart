import 'dart:async';

import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/event_success/domain/event_success_activity_profile.dart';
import 'package:catch_dating_app/event_success/domain/event_success_assignment.dart';
import 'package:catch_dating_app/event_success/domain/event_success_exclusion_ledger.dart';
import 'package:catch_dating_app/event_success/domain/event_success_layout.dart';
import 'package:catch_dating_app/event_success/domain/event_success_models.dart';
import 'package:catch_dating_app/event_success/domain/event_success_plan.dart';
import 'package:catch_dating_app/event_success/domain/event_success_playbooks.dart';
import 'package:catch_dating_app/event_success/domain/event_success_preference.dart';
import 'package:catch_dating_app/event_success/domain/event_success_presence.dart';
import 'package:catch_dating_app/event_success/domain/event_success_runtime.dart';
import 'package:catch_dating_app/event_success/domain/event_success_standings.dart';
import 'package:catch_dating_app/event_success/domain/event_success_structure.dart';
import 'package:catch_dating_app/event_success/domain/event_success_wingman_request.dart';
import 'package:catch_dating_app/event_success/presentation/assignments/event_success_host_pod_section.dart';
import 'package:catch_dating_app/event_success/presentation/assignments/event_success_host_rotation_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_control_room_state.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_conversation_cue_card.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_conversation_cue_copy.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_host_screen_state.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_live_reveal_card_state.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_room_map.dart';
import 'package:catch_dating_app/event_success/presentation/host_components/event_success_compatibility_section.dart';
import 'package:catch_dating_app/event_success/presentation/host_components/event_success_host_help_section.dart';
import 'package:catch_dating_app/event_success/presentation/host_components/event_success_host_resource_error_state.dart';
import 'package:catch_dating_app/event_success/presentation/host_components/event_success_host_tab_page_body.dart';
import 'package:catch_dating_app/event_success/presentation/host_live/event_success_accountability_section.dart';
import 'package:catch_dating_app/event_success/presentation/host_live/event_success_control_room_page_body.dart';
import 'package:catch_dating_app/event_success/presentation/host_live/event_success_exclusion_alert_banner.dart';
import 'package:catch_dating_app/event_success/presentation/host_live/event_success_outcome_units_state.dart';
import 'package:catch_dating_app/event_success/presentation/host_live/event_success_presence_section.dart';
import 'package:catch_dating_app/event_success/presentation/host_live/event_success_room_summary_section.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_host_reveal_surface.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/events/domain/event_attendee.dart';
import 'package:catch_dating_app/events/domain/event_participation_roster.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/public_profile/domain/public_profile.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessHostLivePageBody extends StatelessWidget {
  const EventSuccessHostLivePageBody({
    super.key,
    required this.event,
    required this.plan,
    required this.planIsPersisted,
    required this.spatialLayout,
    required this.spatialLayoutState,
    required this.showRoomWorkspace,
    this.initialSpatialSelectionUid,
    required this.roster,
    required this.assignments,
    required this.assignmentParticipantProfiles,
    required this.rotationAssignments,
    required this.rotationDraftAssignments,
    required this.rotationParticipantProfiles,
    required this.preferences,
    this.standings,
    this.outcomeUnits,
    this.presenceSummary,
    this.presenceError,
    this.accountabilityAttendees = const [],
    this.accountabilitySection,
    this.membershipSection,
    this.helpSection,
    this.deliverySection,
    this.movementSection,
    this.accountabilityMode,
    this.accountabilityError,
    this.loadingAccountability = false,
    this.resolvingAccountability = false,
    this.resolvingLateArrival = false,
    this.lateArrivalError,
    required this.wingmanRequests,
    required this.wingmanProfiles,
    required this.resourceFailures,
    required this.onRetryResource,
    required this.compactLiveControls,
    required this.operationalRosterSummary,
    required this.onOpenGuests,
    required this.actionState,
    required this.onPreviousStep,
    required this.onNextStep,
    required this.onCompleteGuide,
    this.onResolveAccountability,
    required this.microPodsGenerationState,
    required this.rotationsGenerationState,
    required this.onGenerateMicroPods,
    required this.onGenerateGuidedRotations,
    this.onResolveLateArrival,
    required this.onPublishGuidedRotationRound,
    required this.onOverrideGroupAssignments,
    required this.onOverrideGuidedRotations,
    required this.onPreviewSpatial,
    required this.onReassignSpatial,
    required this.onConfirmSpatial,
    required this.onReleaseSpatial,
    required this.revealActionState,
    required this.onStartRevealCountdown,
    required this.onRevealRound,
    required this.onResetReveal,
    required this.outcomeActionState,
    required this.onRecordOutcomes,
    required this.exclusionAlertThreshold,
    this.exclusionReferenceNow,
    required this.embedded,
    this.referenceNow,
  });

  final Event event;
  final EventSuccessPlan plan;
  final bool planIsPersisted;
  final EventSuccessLayout? spatialLayout;
  final EventSuccessSpatialLayoutState spatialLayoutState;
  final bool showRoomWorkspace;
  final String? initialSpatialSelectionUid;
  final EventParticipationRoster roster;
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
  final Widget? movementSection;
  final EventSuccessAccountability? accountabilityMode;
  final Object? accountabilityError;
  final bool loadingAccountability;
  final bool resolvingAccountability;
  final bool resolvingLateArrival;
  final Object? lateArrivalError;
  final List<EventSuccessWingmanRequest> wingmanRequests;
  final List<PublicProfile> wingmanProfiles;
  final List<EventSuccessHostResourceFailure> resourceFailures;
  final ValueChanged<EventSuccessHostRetryIntent>? onRetryResource;
  final bool compactLiveControls;
  final EventSuccessOperationalRosterSummary? operationalRosterSummary;
  final VoidCallback? onOpenGuests;
  final EventSuccessLiveActionState actionState;
  final Future<void> Function(int stepIndex)? onPreviousStep;
  final Future<void> Function(int stepIndex)? onNextStep;
  final Future<void> Function(bool accountabilityAcknowledged)? onCompleteGuide;
  final Future<void> Function(
    String attendeeId,
    EventSuccessAccountabilityResolution? resolution,
  )?
  onResolveAccountability;
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
  final bool embedded;
  final DateTime? referenceNow;

  @override
  Widget build(BuildContext context) {
    if (!planIsPersisted) {
      final isPreEvent = event.startTime.isAfter(
        referenceNow ?? DateTime.now(),
      );
      final body = EventSuccessHostTabPageBody(
        embedded: embedded,
        children: [
          CatchBanner(
            icon: isPreEvent ? CatchIcons.upload : CatchIcons.lockedUntil,
            title: isPreEvent
                ? context
                      .l10n
                      .eventSuccessEventSuccessHostLiveTitleLiveModeNeedsSaved
                : context
                      .l10n
                      .eventSuccessEventSuccessHostLiveTitleLiveModeWasNot,
            message: isPreEvent
                ? context
                      .l10n
                      .eventSuccessEventSuccessHostLiveBodySaveTheLiveGuide
                : context
                      .l10n
                      .eventSuccessEventSuccessHostLiveBodyThisEventDidNot,
          ),
        ],
      );
      return compactLiveControls
          ? SingleChildScrollView(padding: CatchInsets.pageBody, child: body)
          : body;
    }

    final runtime = EventSuccessRuntime(
      plan: plan,
      event: event,
      now: referenceNow ?? DateTime.now(),
    );
    final eventSuccessProfile = EventSuccessActivityProfile.forFormat(
      event.eventFormat,
    );
    final accountability =
        accountabilityMode ?? eventSuccessProfile.accountability;
    final checkedInAccountabilityAttendees = accountabilityAttendees
        .where((attendee) => attendee.isCheckedIn)
        .toList(growable: false);
    final unresolvedAccountabilityAttendees = checkedInAccountabilityAttendees
        .where((attendee) => attendee.currentAccountabilityResolution == null)
        .toList(growable: false);
    final livePlan = runtime.livePlan(
      bookedCount: roster.bookedCount == 0
          ? event.signedUpCount
          : roster.bookedCount,
      checkedInCount: roster.checkedInCount == 0
          ? event.attendedCount
          : roster.checkedInCount,
    );
    if (livePlan == null) {
      final body = EventSuccessHostTabPageBody(
        embedded: embedded,
        children: [
          CatchBanner(
            icon: CatchIcons.rules,
            title: context
                .l10n
                .eventSuccessEventSuccessHostLiveTitleNoLiveStepsSelected,
            message: context
                .l10n
                .eventSuccessEventSuccessHostLiveBodyThisSavedSetupDoes,
          ),
        ],
      );
      return compactLiveControls
          ? SingleChildScrollView(padding: CatchInsets.pageBody, child: body)
          : body;
    }
    final activeStepIndex = livePlan.activeStepIndex;
    final previousIndex = (activeStepIndex - 1)
        .clamp(0, livePlan.steps.length - 1)
        .toInt();
    final nextIndex = (activeStepIndex + 1)
        .clamp(0, livePlan.steps.length - 1)
        .toInt();
    final activeModuleIds = livePlan.activeStep.moduleIds.toSet();
    bool activeStepHas(String moduleId) => activeModuleIds.contains(moduleId);
    final conversationCueActive =
        activeStepHas(EventSuccessModuleCatalog.socialMissions.id) ||
        activeStepHas(EventSuccessModuleCatalog.contextualOpeners.id);

    late final Widget wingmanCard = EventSuccessHostHelpSection(
      requests: wingmanRequests,
      profiles: wingmanProfiles,
      rotationsEnabled: runtime.guidedRotationsEnabled,
    );

    late final Widget conversationCueCard = EventSuccessConversationCueCard(
      title: context.l10n.eventSuccessEventSuccessHostLiveTitleConversationCues,
      subtitle: runtime.socialMissionsEnabled
          ? context.l10n.eventSuccessEventSuccessHostLiveSubtitleUseOneWhenThe
          : context
                .l10n
                .eventSuccessEventSuccessHostLiveSubtitleCloseWithOneSuggested,
      cues: runtime.socialMissionsEnabled
          ? EventSuccessConversationCueLibrary.liveCuesFor(
              event: event,
              plan: plan,
              l10n: context.l10n,
              activeStep: _activeRunOfShowStep(runtime),
            )
          : EventSuccessConversationCueLibrary.postEventOpenersFor(
              event,
              l10n: context.l10n,
            ),
    );

    late final Widget microPodsCard = EventSuccessHostPodSection(
      event: event,
      assignments: assignments,
      participantProfiles: assignmentParticipantProfiles,
      preferences: preferences,
      actionState: microPodsGenerationState,
      onGenerate: onGenerateMicroPods,
      onOverride: onOverrideGroupAssignments,
    );

    late final Widget rotationsCard = EventSuccessHostRotationSection(
      event: event,
      rotationIntervalMinutes:
          plan.structureConfig.rotationIntervalMinutes ?? 15,
      assignments: rotationDraftAssignments.isNotEmpty
          ? rotationDraftAssignments
          : rotationAssignments,
      participantProfiles: rotationParticipantProfiles,
      preferences: preferences,
      actionState: rotationsGenerationState,
      onGenerate: onGenerateGuidedRotations,
      nextRoundIndex: plan.publishedRotationRoundIndex + 1,
      onPublish: onPublishGuidedRotationRound,
      onOverride: onOverrideGuidedRotations,
    );

    late final presenceSnapshot = presenceSummary;
    late final Widget? presenceCard =
        ((presenceSnapshot == null &&
                presenceError == null &&
                lateArrivalError == null) ||
            (presenceSnapshot != null &&
                presenceSnapshot.likelyDeparted.isEmpty &&
                presenceSnapshot.lateArrivals.isEmpty &&
                presenceError == null &&
                lateArrivalError == null))
        ? null
        : EventSuccessPresenceSection(
            summary: presenceSnapshot,
            presenceError: presenceError,
            lateArrivalError: lateArrivalError,
            resolvingLateArrival: resolvingLateArrival,
            onRegenerate: onGenerateGuidedRotations,
            onResolveLateArrival: onResolveLateArrival,
          );

    late final Widget? accountabilityCard =
        accountability != EventSuccessAccountability.sweep
        ? null
        : accountabilitySection ??
              EventSuccessAccountabilitySection(
                attendees: checkedInAccountabilityAttendees,
                isLoading: loadingAccountability,
                isResolving: resolvingAccountability,
                error: accountabilityError,
                onResolve: onResolveAccountability,
              );

    Future<void> completeGuide() async {
      final complete = onCompleteGuide;
      if (complete == null) return;
      if (accountability != EventSuccessAccountability.sweep ||
          unresolvedAccountabilityAttendees.isEmpty) {
        await complete(false);
        return;
      }
      final finishAnyway = await showCatchAdaptiveDialog<bool>(
        context: context,
        title: context.l10n.eventSuccessAccountabilityWarningTitle,
        message: context.l10n.eventSuccessAccountabilityWarningMessage(
          count: unresolvedAccountabilityAttendees.length,
        ),
        actions: [
          CatchDialogAction(
            label: context.l10n.eventSuccessAccountabilityReviewAction,
            value: false,
          ),
          CatchDialogAction(
            label: context.l10n.eventSuccessAccountabilityFinishAnywayAction,
            value: true,
            isDefault: true,
          ),
        ],
      );
      if (finishAnyway == true) await complete(true);
    }

    late final Widget liveRevealCard = EventSuccessHostRevealSurface(
      event: event,
      plan: plan,
      podAssignments: assignments,
      rotationAssignments: rotationAssignments,
      preferences: preferences,
      standings: standings,
      outcomeUnits:
          outcomeUnits ??
          eventSuccessHostOutcomeUnits(
            event: event,
            plan: plan,
            assignments: assignments,
            rotationAssignments: rotationAssignments,
            operationalAttendees: accountabilityAttendees,
            profiles: [
              ...rotationParticipantProfiles,
              ...assignmentParticipantProfiles,
            ],
          ),
      participantProfiles: [
        ...rotationParticipantProfiles,
        ...assignmentParticipantProfiles,
      ],
      actionState: revealActionState,
      onStartCountdown: onStartRevealCountdown,
      onRevealRound: onRevealRound,
      onResetReveal: onResetReveal,
      outcomeActionState: outcomeActionState,
      onRecordOutcomes: onRecordOutcomes,
    );

    final spatialAssignments =
        activeStepHas(EventSuccessModuleCatalog.guidedRotations.id) &&
            rotationAssignments.isNotEmpty
        ? rotationAssignments
        : assignments;
    final spatialProfiles = identical(spatialAssignments, rotationAssignments)
        ? rotationParticipantProfiles
        : assignmentParticipantProfiles;
    final exclusionSnapshot = buildEventSuccessExclusionLedger(
      attendeeUids: roster.checkedInIds,
      assignments: [...assignments, ...rotationAssignments],
      trackingStartedAt: event.startTime,
      trackingStartedAtByUid: roster.checkedInAtByUid,
      trackingEndedAt: event.endTime,
      now: exclusionReferenceNow ?? referenceNow ?? DateTime.now(),
      alertThreshold: exclusionAlertThreshold,
    );
    late final Widget? spatialMapCard =
        spatialLayout == null || spatialAssignments.isEmpty
        ? null
        : EventSuccessRoomMap(
            layout: spatialLayout!,
            assignments: spatialAssignments,
            profiles: spatialProfiles,
            activityKind: event.activityKind,
            exclusionAlertUids: exclusionSnapshot.alertEntries
                .map((entry) => entry.uid)
                .toSet(),
            onPreview: onPreviewSpatial,
            onReassign: onReassignSpatial,
            onConfirmPosition: onConfirmSpatial,
            onReleasePinned: onReleaseSpatial,
            initialSelectedUid: initialSpatialSelectionUid,
          );

    if (showRoomWorkspace) {
      final effectiveSpatialLayoutState =
          spatialLayoutState.status ==
                  EventSuccessSpatialLayoutStatus.notApplicable &&
              plan.structureConfig.unitKind != EventSuccessUnitKind.wholeGroup
          ? spatialLayout == null
                ? const EventSuccessSpatialLayoutState.unconfigured()
                : EventSuccessSpatialLayoutState.ready(spatialLayout!)
          : spatialLayoutState;
      final roomBody = switch (effectiveSpatialLayoutState.status) {
        EventSuccessSpatialLayoutStatus.notApplicable => CatchBanner(
          icon: CatchIcons.grid,
          title: context.l10n.eventSuccessRoomWorkspaceWholeGroupTitle,
          message: context.l10n.eventSuccessRoomWorkspaceWholeGroupBody,
        ),
        EventSuccessSpatialLayoutStatus.unconfigured => CatchBanner(
          icon: CatchIcons.grid,
          tone: CatchBannerTone.warning,
          title: context.l10n.eventSuccessRoomWorkspaceUnconfiguredTitle,
          message: context.l10n.eventSuccessRoomWorkspaceUnconfiguredBody,
        ),
        EventSuccessSpatialLayoutStatus.loading => CatchBanner(
          icon: CatchIcons.sync,
          title: context.l10n.eventSuccessRoomWorkspaceLoadingTitle,
          message: context.l10n.eventSuccessRoomWorkspaceLoadingBody,
        ),
        EventSuccessSpatialLayoutStatus.error =>
          EventSuccessHostResourceErrorState(
            failure: EventSuccessHostResourceFailure(
              retryIntent: EventSuccessHostRetryIntent.spatialLayout,
              error: effectiveSpatialLayoutState.error!,
            ),
            onRetry: onRetryResource == null
                ? null
                : () => onRetryResource!(
                    EventSuccessHostRetryIntent.spatialLayout,
                  ),
          ),
        EventSuccessSpatialLayoutStatus.ready => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            EventSuccessRoomSummarySection(
              layout: effectiveSpatialLayoutState.layout!,
              assignments: spatialAssignments,
              attentionCount: exclusionSnapshot.alertEntries.length,
            ),
            gapH16,
            EventSuccessRoomMap(
              layout: effectiveSpatialLayoutState.layout!,
              assignments: spatialAssignments,
              profiles: spatialProfiles,
              activityKind: event.activityKind,
              exclusionAlertUids: exclusionSnapshot.alertEntries
                  .map((entry) => entry.uid)
                  .toSet(),
              onPreview: onPreviewSpatial,
              onReassign: onReassignSpatial,
              onConfirmPosition: onConfirmSpatial,
              onReleasePinned: onReleaseSpatial,
              initialSelectedUid: initialSpatialSelectionUid,
              showHeader: false,
            ),
            if (spatialAssignments.isEmpty) ...[
              gapH16,
              CatchBanner(
                icon: CatchIcons.people,
                title: context.l10n.eventSuccessRoomWorkspaceWaitingTitle,
                message: context.l10n.eventSuccessRoomWorkspaceWaitingBody,
              ),
            ],
          ],
        ),
      };
      return CatchSurface(
        duration: Duration.zero,
        radius: CatchRadius.none,
        backgroundColor: CatchTokens.of(context).bg,
        child: SingleChildScrollView(
          padding: CatchInsets.pageBody,
          child: roomBody,
        ),
      );
    }

    final outcomeUsesStandings =
        eventSuccessProfile.unitOutcome == EventSuccessUnitOutcome.score ||
        (eventSuccessProfile.unitOutcome == EventSuccessUnitOutcome.rank &&
            eventSuccessProfile.assignmentResolution.supported);
    final liveRevealAvailable =
        runtime.liveRevealEnabled &&
        (outcomeUsesStandings ||
            runtime.guidedRotationsEnabled ||
            runtime.microPodsEnabled);
    final currentStepCards = compactLiveControls
        ? <Widget>[
            ?accountabilityCard,
            ?movementSection,
            ?membershipSection,
            ?helpSection,
            ?deliverySection,
            ?presenceCard,
            ?spatialMapCard,
          ]
        : <Widget>[
            ?accountabilityCard,
            ?movementSection,
            ?membershipSection,
            ?helpSection,
            ?deliverySection,
            ?presenceCard,
            if (runtime.wingmanRequestsEnabled &&
                activeStepHas(EventSuccessModuleCatalog.wingmanRequests.id))
              wingmanCard,
            if (runtime.conversationCuesEnabled && conversationCueActive)
              conversationCueCard,
            if (runtime.microPodsEnabled &&
                activeStepHas(EventSuccessModuleCatalog.microPods.id))
              microPodsCard,
            if (runtime.guidedRotationsEnabled &&
                activeStepHas(EventSuccessModuleCatalog.guidedRotations.id))
              rotationsCard,
            if (liveRevealAvailable &&
                activeStepHas(EventSuccessModuleCatalog.liveReveal.id))
              liveRevealCard,
            ?spatialMapCard,
          ];
    final supportingCards = compactLiveControls
        ? <Widget>[]
        : <Widget>[
            if (runtime.compatibilityQuestionnaireEnabled)
              EventSuccessCompatibilitySection(plan: plan),
            if (runtime.wingmanRequestsEnabled &&
                !activeStepHas(EventSuccessModuleCatalog.wingmanRequests.id))
              wingmanCard,
            if (runtime.conversationCuesEnabled && !conversationCueActive)
              conversationCueCard,
            if (runtime.microPodsEnabled &&
                !activeStepHas(EventSuccessModuleCatalog.microPods.id))
              microPodsCard,
            if (runtime.guidedRotationsEnabled &&
                !activeStepHas(EventSuccessModuleCatalog.guidedRotations.id))
              rotationsCard,
            if (liveRevealAvailable &&
                !activeStepHas(EventSuccessModuleCatalog.liveReveal.id))
              liveRevealCard,
          ];

    final actionFailed =
        actionState.stepError != null || actionState.completeError != null;
    final exclusionAlert = EventSuccessExclusionAlertBanner(
      attendeeUids: roster.checkedInIds,
      trackingStartedAtByUid: roster.checkedInAtByUid,
      assignments: [...assignments, ...rotationAssignments],
      trackingStartedAt: event.startTime,
      trackingEndedAt: event.endTime,
      alertThreshold: exclusionAlertThreshold,
      referenceNow: exclusionReferenceNow,
    );
    final console = EventSuccessControlRoomPageBody(
      plan: livePlan,
      event: event,
      compactCopy: compactLiveControls,
      currentStepControls: currentStepCards,
      operationalRosterSummary: operationalRosterSummary,
      syncState: actionFailed
          ? EventSuccessControlRoomSyncState.failed
          : actionState.isChangingStep || actionState.isCompleting
          ? EventSuccessControlRoomSyncState.syncing
          : EventSuccessControlRoomSyncState.synced,
      isPrimaryLoading: actionState.isChangingStep || actionState.isCompleting,
      exclusionAlert: exclusionAlert,
      onOpenGuests: onOpenGuests,
      onPrevious:
          actionState.isChangingStep ||
              activeStepIndex == 0 ||
              onPreviousStep == null
          ? null
          : () => unawaited(onPreviousStep!(previousIndex)),
      onNext:
          actionState.isChangingStep ||
              activeStepIndex >= livePlan.steps.length - 1 ||
              onNextStep == null
          ? null
          : () => unawaited(onNextStep!(nextIndex)),
      onComplete:
          compactLiveControls &&
              !actionState.isCompleting &&
              onCompleteGuide != null
          ? () => unawaited(completeGuide())
          : null,
    );
    final errorBanners = <Widget>[
      for (final failure in resourceFailures)
        if (failure.retryIntent != EventSuccessHostRetryIntent.scorecard)
          EventSuccessHostResourceErrorState(
            failure: failure,
            onRetry: onRetryResource == null
                ? null
                : () => onRetryResource!(failure.retryIntent),
            compact: compactLiveControls,
          ),
      if (actionState.stepError != null)
        CatchLocalizedErrorBanner(
          actionState.stepError!,
          context: AppErrorContext.event,
        ),
      if (actionState.completeError != null)
        CatchLocalizedErrorBanner(
          actionState.completeError!,
          context: AppErrorContext.event,
        ),
    ];
    if (compactLiveControls) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (errorBanners.isNotEmpty)
            Padding(
              padding: CatchInsets.pageHorizontal.copyWith(
                top: CatchSpacing.s3,
                bottom: CatchSpacing.s2,
              ),
              child: CatchSectionList(
                emptyStateOmitted: true,
                gap: CatchSpacing.s2,
                children: errorBanners,
              ),
            ),
          Expanded(child: console),
        ],
      );
    }

    return EventSuccessHostTabPageBody(
      embedded: embedded,
      children: [
        ...errorBanners.expand((banner) => [banner, gapH16]),
        console,
        if (supportingCards.isNotEmpty) ...[
          gapH20,
          CatchSectionHeader(
            padding: EdgeInsets.zero,
            title: context
                .l10n
                .eventSuccessEventSuccessHostLiveTitleSupportingControls,
            subtitle: context
                .l10n
                .eventSuccessEventSuccessHostLiveSubtitleControlsThatStayAvailable,
          ),
          gapH10,
          CatchSectionList(
            emptyStateOmitted: true,
            gap: CatchSpacing.s4,
            children: supportingCards,
          ),
        ],
        if (!compactLiveControls) ...[
          gapH20,
          CatchButton(
            label: context
                .l10n
                .eventSuccessEventSuccessHostLiveLabelMarkLiveGuideComplete,
            variant: CatchButtonVariant.secondary,
            status: (actionState.isCompleting)
                ? CatchButtonStatus.loading
                : CatchButtonStatus.idle,
            onPressed: actionState.isCompleting || onCompleteGuide == null
                ? null
                : () => unawaited(completeGuide()),
            fullWidth: true,
          ),
        ],
      ],
    );
  }
}

EventRunOfShowStep? _activeRunOfShowStep(EventSuccessRuntime runtime) {
  final steps = runtime.runOfShowSteps;
  if (steps.isEmpty) return null;
  final index = runtime.plan.activeStepIndex;
  if (index <= 0) return steps.first;
  if (index >= steps.length) return steps.last;
  return steps[index];
}
