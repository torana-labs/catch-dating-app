import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/event_rehearsal/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/event_rehearsal/domain/event_rehearsal.dart';
import 'package:catch_dating_app/event_rehearsal/domain/event_rehearsal_operations.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_controller.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_practice_role_controller.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_runtime_adapter.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_runtime_operation_controller.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_delivery_section.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_groups_section.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_guest_link_section.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_help_section.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_movement_section.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_practice_role_section.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_settings_section.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_setup_section.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_simulator_body.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_staff_section.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_sweep_section.dart';
import 'package:catch_dating_app/event_success/event_success.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

part 'host_event_rehearsal_coach_task.dart';
part 'host_event_rehearsal_screen_actions.dart';

class HostEventRehearsalScreen extends ConsumerStatefulWidget {
  const HostEventRehearsalScreen({
    super.key,
    required this.clubId,
    required this.sessionId,
  });

  final String clubId;
  final String sessionId;

  @override
  ConsumerState<HostEventRehearsalScreen> createState() =>
      _HostEventRehearsalScreenState();
}

class _HostEventRehearsalScreenState
    extends ConsumerState<HostEventRehearsalScreen>
    with _HostEventRehearsalScreenActions {
  var _coachCollapsed = false;
  var _coachTextScaleInitialized = false;
  String? _lastCoachTaskKey;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_coachTextScaleInitialized) return;
    _coachTextScaleInitialized = true;
    if (MediaQuery.textScalerOf(context).scale(1) >= 1.4) {
      _coachCollapsed = true;
    }
  }

  @override
  Widget build(BuildContext context) {
    final rehearsalAsync = ref.watch(eventRehearsalProvider(widget.sessionId));
    final rehearsalState = catchAsyncStateFromAsyncValue(rehearsalAsync);
    final staff = rehearsalState.value?.staffReview;
    final selectedRole = staff == null
        ? null
        : ref.watch(
            eventRehearsalPracticeRoleControllerProvider((
              sessionId: widget.sessionId,
              clockId: staff.clockId,
            )),
          );
    final setupMutation = ref.watch(EventRehearsalController.setupMutation);
    final controlMutation = ref.watch(EventRehearsalController.controlMutation);
    final behaviorMutation = ref.watch(
      EventRehearsalController.behaviorMutation,
    );
    final spatialMutation = ref.watch(EventRehearsalController.spatialMutation);
    final resetMutation = ref.watch(EventRehearsalController.resetMutation);
    final forkMutation = ref.watch(EventRehearsalController.forkMutation);
    final guestLinkMutation = ref.watch(
      EventRehearsalController.guestLinkMutation,
    );
    final exportMutation = ref.watch(EventRehearsalController.exportMutation);
    final shareMutation = ref.watch(EventRehearsalController.shareMutation);
    final runtimeOperation = ref.watch(
      eventRehearsalRuntimeOperationControllerProvider(widget.sessionId),
    );
    final busy =
        setupMutation.isPending ||
        controlMutation.isPending ||
        behaviorMutation.isPending ||
        spatialMutation.isPending ||
        resetMutation.isPending ||
        forkMutation.isPending ||
        guestLinkMutation.isPending ||
        exportMutation.isPending ||
        shareMutation.isPending ||
        runtimeOperation.isSubmitting;
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [
        EventRehearsalController.setupMutation,
        EventRehearsalController.controlMutation,
        EventRehearsalController.behaviorMutation,
        EventRehearsalController.spatialMutation,
        EventRehearsalController.resetMutation,
        EventRehearsalController.forkMutation,
        EventRehearsalController.guestLinkMutation,
        EventRehearsalController.exportMutation,
        EventRehearsalController.shareMutation,
      ],
      errorContext: AppErrorContext.event,
    );
    return CatchRouteScaffold(
      statuses: [
        if (rehearsalState.value case final rehearsal?)
          CatchBannerStatus(
            id: 'rehearsal.${rehearsal.session.id}',
            label: context.l10n.hostEventRehearsalBadge,
            message: selectedRole == null
                ? context.l10n.hostEventRehearsalSyntheticGuests
                : context.l10n.hostEventRehearsalAssistanceAs(
                    name:
                        staff?.operators[selectedRole]?.displayName ??
                        context.l10n.hostEventRehearsalUnavailableRole,
                  ),
            icon: CatchIcons.groupsOutlined,
            color: CatchTokens.of(context).danger,
            actions: [
              CatchBannerAction(
                label: context.l10n.hostEventRehearsalClockPill(
                  time: DateFormat.jm(
                    Localizations.localeOf(context).toLanguageTag(),
                  ).format(rehearsal.session.virtualNow),
                ),
                onPressed: () => _showRunControls(rehearsal, busy),
              ),
              CatchBannerAction(
                label: context.l10n.hostEventRehearsalPracticeTools,
                icon: CatchIcons.more,
                onPressed: () => _showPracticeTools(rehearsal, busy),
              ),
            ],
          ),
      ],
      topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
        title: context.l10n.hostEventRehearsalManageSubtitle,
        subtitle:
            rehearsalState.value?.session.setup.title ??
            context.l10n.hostEventRehearsalTitle,
        navigation: const CatchTopBarNavigation(
          mode: CatchTopBarNavigationMode.back,
        ),
        leading: CatchIconAction.toolbar(
          tooltip: MaterialLocalizations.of(context).backButtonTooltip,
          icon: CatchIcons.arrowBackIosNewRounded,
          onPressed: () => _leaveRehearsal(rehearsalState.value?.session),
        ),
        emphasis: scrolledUnder
            ? CatchTopBarEmphasis.divided
            : CatchTopBarEmphasis.plain,
      ),
      body: CatchRouteBody.fullBleed(
        child: SafeArea(
          top: false,
          bottom: false,
          child: CatchAsyncBoundary<EventRehearsalBootstrap>(
            value: rehearsalAsync,
            onRetry: () =>
                ref.invalidate(eventRehearsalProvider(widget.sessionId)),
            initialLoadTimeout: null,
            loadingBuilder: (_) => const CatchStateViewport.loading(
              accountForBottomOverlay: false,
            ),
            errorBuilder: (_, error, _, onBoundaryRetry) => CatchPageBody(
              child: CatchLocalizedErrorState(
                error,
                context: AppErrorContext.event,
                onRetry: onBoundaryRetry,
              ),
            ),
            builder: (context, rehearsal) {
              final runtime = buildEventRehearsalRuntimeProjection(
                rehearsal,
                practiceGuestLabel:
                    context.l10n.hostEventRehearsalPracticeGuest,
                latePracticeGuestLabel:
                    context.l10n.hostEventRehearsalLatePracticeGuest,
              );
              final coachTask = _buildCoachTask(context, rehearsal);
              final revealOperationAvailable =
                  runtimeOperation.canSubmit ||
                  runtimeOperation.kind ==
                          RehearsalRuntimeOperationKind.reveal &&
                      (runtimeOperation.canRetry ||
                          runtimeOperation.isSubmitting);
              final outcomeOperationAvailable =
                  runtimeOperation.canSubmit ||
                  runtimeOperation.kind ==
                          RehearsalRuntimeOperationKind.outcomes &&
                      (runtimeOperation.canRetry ||
                          runtimeOperation.isSubmitting);
              _syncCoachTask(coachTask);
              return Column(
                children: [
                  Expanded(
                    child: EventSuccessHostWorkspacePageBody(
                      key: ValueKey(
                        'rehearsal-runtime-${rehearsal.session.id}',
                      ),
                      event: runtime.event,
                      plan: runtime.plan,
                      planIsPersisted: true,
                      spatialLayout: runtime.layout,
                      spatialLayoutState: EventSuccessSpatialLayoutState.ready(
                        runtime.layout,
                      ),
                      roster: runtime.roster,
                      assignments: runtime.assignments,
                      assignmentParticipantProfiles: runtime.profiles,
                      standings: runtime.standings,
                      outcomeUnits: runtime.outcomeUnits,
                      presenceSummary: runtime.presence,
                      accountabilityAttendees: runtime.accountabilityAttendees,
                      accountabilityMode:
                          rehearsal.session.setup.modules.contains(
                            EventRehearsalModule.accountability,
                          )
                          ? EventSuccessAccountability.sweep
                          : EventSuccessAccountability.none,
                      assistanceSettingsSection:
                          rehearsal.settingsReview != null &&
                              selectedRole == null
                          ? EventRehearsalSettingsSection(
                              sessionId: rehearsal.session.id,
                              review: rehearsal.settingsReview!,
                            )
                          : null,
                      movementSection:
                          rehearsal.movementReview?.groups.isNotEmpty == true &&
                              (rehearsal
                                      .session
                                      .setup
                                      .movementSimulation
                                      ?.itinerary
                                      .any((stop) => stop.location != null) ??
                                  false)
                          ? EventRehearsalMovementSection(
                              rehearsal: rehearsal,
                              practiceOperatorId: selectedRole,
                            )
                          : null,
                      membershipSection:
                          (rehearsal.membershipReviews?.rows.any(
                                (row) => row.facts.groups.isNotEmpty,
                              ) ??
                              false)
                          ? EventRehearsalGroupsSection(
                              rehearsal: rehearsal,
                              practiceOperatorId: selectedRole,
                            )
                          : null,
                      deliverySection: EventRehearsalDeliverySection(
                        sessionId: rehearsal.session.id,
                        practiceOperatorId: selectedRole,
                      ),
                      helpSection: EventRehearsalHelpSection(
                        sessionId: rehearsal.session.id,
                        practiceOperatorId: selectedRole,
                      ),
                      accountabilitySection: EventRehearsalSweepSection(
                        rehearsal: rehearsal,
                        practiceOperatorId: selectedRole,
                      ),
                      initialTab: switch (rehearsal.session.status) {
                        EventRehearsalStatus.draft ||
                        EventRehearsalStatus.ready => EventSuccessHostTab.setup,
                        EventRehearsalStatus.running ||
                        EventRehearsalStatus.paused => EventSuccessHostTab.live,
                        EventRehearsalStatus.complete ||
                        EventRehearsalStatus.expired =>
                          EventSuccessHostTab.report,
                      },
                      showTabs: false,
                      compactLiveControls: true,
                      initialLiveWorkspace: coachTask.workspace,
                      initialSpatialSelectionUid: coachTask.actorId,
                      referenceNow: rehearsal.session.virtualNow,
                      exclusionReferenceNow: rehearsal.session.virtualNow,
                      liveActionState: EventSuccessLiveActionState(
                        isChangingStep: controlMutation.isPending,
                        isCompleting: controlMutation.isPending,
                      ),
                      onOpenGuests: () => _showGuests(rehearsal),
                      onSetLiveStep: (stepIndex) =>
                          _setCanonicalLiveStep(rehearsal.session, stepIndex),
                      onCompleteLiveGuide: (_) => _control(
                        rehearsal.session,
                        EventRehearsalControlAction.complete,
                        null,
                      ),
                      onResolveLateArrival: (actorId) => _injectBehavior(
                        rehearsal.session,
                        actorId,
                        EventRehearsalBehavior.arrive,
                      ),
                      onPreviewSpatial: (assignment) =>
                          _previewSpatial(runtime, rehearsal, assignment),
                      onReassignSpatial: (assignment, unitId, scope) =>
                          _controlSpatial(
                            rehearsal.session,
                            assignment.uid,
                            EventRehearsalSpatialAction.reassign,
                            destinationUnitId: unitId,
                            scope: _rehearsalSpatialScope(scope),
                          ),
                      onConfirmSpatial: (assignment) => _controlSpatial(
                        rehearsal.session,
                        assignment.uid,
                        EventRehearsalSpatialAction.confirmPosition,
                      ),
                      onReleaseSpatial: (assignment) => _controlSpatial(
                        rehearsal.session,
                        assignment.uid,
                        EventRehearsalSpatialAction.releasePinned,
                      ),
                      revealActionState: EventSuccessRevealActionState(
                        isLoading:
                            runtimeOperation.isSubmitting &&
                            runtimeOperation.kind ==
                                RehearsalRuntimeOperationKind.reveal,
                        error:
                            runtimeOperation.kind == null ||
                                runtimeOperation.kind ==
                                    RehearsalRuntimeOperationKind.reveal
                            ? runtimeOperation.error
                            : null,
                      ),
                      onStartRevealCountdown:
                          selectedRole == null &&
                              rehearsal.revealReview != null &&
                              revealOperationAvailable
                          ? (roundIndex, countdownSeconds) =>
                                runtimeOperation.canRetry
                                ? _retryRuntimeOperation(rehearsal.session.id)
                                : _changeReveal(
                                    rehearsal,
                                    RehearsalRevealAction.startCountdown,
                                    expectedRound: roundIndex,
                                    countdownSeconds: countdownSeconds,
                                  )
                          : null,
                      onRevealRound:
                          selectedRole == null &&
                              rehearsal.revealReview != null &&
                              revealOperationAvailable
                          ? (roundIndex) => runtimeOperation.canRetry
                                ? _retryRuntimeOperation(rehearsal.session.id)
                                : _changeReveal(
                                    rehearsal,
                                    RehearsalRevealAction.publish,
                                    expectedRound: roundIndex,
                                  )
                          : null,
                      onResetReveal:
                          selectedRole == null &&
                              revealOperationAvailable &&
                              rehearsal.revealReview?.status ==
                                  RehearsalRevealStatus.countingDown
                          ? () => runtimeOperation.canRetry
                                ? _retryRuntimeOperation(rehearsal.session.id)
                                : _changeReveal(
                                    rehearsal,
                                    RehearsalRevealAction.cancelPending,
                                  )
                          : null,
                      outcomeActionState: EventSuccessOutcomeActionState(
                        isLoading:
                            runtimeOperation.isSubmitting &&
                            runtimeOperation.kind ==
                                RehearsalRuntimeOperationKind.outcomes,
                        error:
                            runtimeOperation.kind == null ||
                                runtimeOperation.kind ==
                                    RehearsalRuntimeOperationKind.outcomes
                            ? runtimeOperation.error
                            : null,
                      ),
                      onRecordOutcomes:
                          selectedRole == null &&
                              rehearsal.outcomeReview != null &&
                              outcomeOperationAvailable
                          ? ({
                              required expectedRevision,
                              required roundIndex,
                              required entries,
                            }) => runtimeOperation.canRetry
                                ? _retryRuntimeOperation(rehearsal.session.id)
                                : _recordOutcomes(
                                    rehearsal,
                                    expectedRevision: expectedRevision,
                                    roundIndex: roundIndex,
                                    entries: entries,
                                  )
                          : null,
                    ),
                  ),
                  _RehearsalCoachDock(
                    task: coachTask,
                    collapsed: _coachCollapsed,
                    onWhy: () => _showCoachWhy(rehearsal),
                    onToggle: () =>
                        setState(() => _coachCollapsed = !_coachCollapsed),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  void _syncCoachTask(_RehearsalCoachTask task) {
    if (_lastCoachTaskKey == task.key) return;
    final previousTaskKey = _lastCoachTaskKey;
    _lastCoachTaskKey = task.key;
    if (previousTaskKey == null) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && !_coachCollapsed) {
        setState(() => _coachCollapsed = true);
      }
    });
  }

  Future<void> _setCanonicalLiveStep(
    EventRehearsalSession session,
    int stepIndex,
  ) async {
    if (stepIndex == session.activeStepIndex) return;
    await _control(
      session,
      stepIndex > session.activeStepIndex
          ? EventRehearsalControlAction.advance
          : EventRehearsalControlAction.previous,
      null,
    );
  }

  Future<void> _showRunControls(EventRehearsalBootstrap rehearsal, bool busy) =>
      showCatchBottomSheet<void>(
        context: context,
        builder: (sheetContext) => CatchSheet.standard(
          title: context.l10n.hostEventRehearsalRunTitle,
          subtitle: context.l10n.hostEventRehearsalRunSheetBody,
          badge: context.l10n.hostEventRehearsalBadge,
          badgeTone: CatchBadgeTone.danger,
          child: EventRehearsalRunSection(
            session: rehearsal.session,
            isLoading: busy,
            onControl: (action, minutes) =>
                _control(rehearsal.session, action, minutes),
          ),
        ),
      );

  Future<void> _showPracticeTools(
    EventRehearsalBootstrap rehearsal,
    bool busy,
  ) => showCatchBottomSheet<void>(
    context: context,
    builder: (sheetContext) => CatchSheet.standard(
      title: context.l10n.hostEventRehearsalPracticeTools,
      subtitle: context.l10n.hostEventRehearsalPracticeToolsBody,
      glyph: CatchIcons.scienceOutlined,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          EventRehearsalSetupSection(
            session: rehearsal.session,
            isLoading: busy,
            onSave: (setup, scenario, actorCount) =>
                _saveSetup(rehearsal.session, setup, scenario, actorCount),
          ),
          gapH20,
          if (rehearsal.staffReview != null) ...[
            EventRehearsalPracticeRoleSection(
              scope: (
                sessionId: rehearsal.session.id,
                clockId: rehearsal.staffReview!.clockId,
              ),
            ),
            gapH20,
            EventRehearsalStaffSection(sessionId: rehearsal.session.id),
            gapH20,
          ],
          EventRehearsalGuestLinkSection(
            guestUrl: rehearsal.guestUrl,
            isLoading: busy,
            onCopy: () => _copyGuestLink(rehearsal.guestUrl),
            onShare: () => _shareGuestLink(rehearsal.guestUrl),
            onRotate: _rotateGuestLink,
          ),
          gapH20,
          EventRehearsalRunSection(
            session: rehearsal.session,
            isLoading: busy,
            onControl: (action, minutes) =>
                _control(rehearsal.session, action, minutes),
          ),
          gapH20,
          EventRehearsalSimulatorBody(
            rehearsal: rehearsal,
            isLoading: busy,
            onBehavior: (actorId, behavior) =>
                _injectBehavior(rehearsal.session, actorId, behavior),
            onFault: (fault) => _injectFault(rehearsal.session, fault),
          ),
          gapH20,
          EventRehearsalRosterSection(rehearsal: rehearsal),
          gapH20,
          EventRehearsalRecapSection(
            rehearsal: rehearsal,
            isLoading: busy,
            onReset: _reset,
            onFork: _fork,
            onExport: _export,
          ),
        ],
      ),
    ),
  );

  Future<void> _leaveRehearsal(EventRehearsalSession? session) async {
    if (session?.hasStarted == true) {
      final confirmed = await showCatchConfirmDialog(
        copy: catchDialogCopy(context.l10n),
        context: context,
        title: context.l10n.hostEventRehearsalLeaveTitle,
        message: context.l10n.hostEventRehearsalLeaveBody,
        confirmLabel: context.l10n.hostEventRehearsalLeaveAction,
      );
      if (confirmed != true || !mounted) return;
    }
    if (mounted) await Navigator.of(context).maybePop();
  }

  Future<void> _saveSetup(
    EventRehearsalSession session,
    EventRehearsalSetup setup,
    EventRehearsalScenario scenario,
    int actorCount,
  ) async {
    try {
      await EventRehearsalController.setupMutation.run(
        ref,
        (tx) => tx
            .get(eventRehearsalControllerProvider.notifier)
            .updateSetup(
              session: session,
              setup: setup,
              scenario: scenario,
              actorCount: actorCount,
            ),
      );
    } on Object {
      // The mutation listener owns user-visible action failure.
    }
  }

  Future<void> _control(
    EventRehearsalSession session,
    EventRehearsalControlAction action,
    int? minutes,
  ) async {
    try {
      await EventRehearsalController.controlMutation.run(
        ref,
        (tx) => tx
            .get(eventRehearsalControllerProvider.notifier)
            .control(session: session, action: action, minutes: minutes),
      );
    } on Object {
      // The mutation listener owns user-visible action failure.
    }
  }

  Future<void> _injectBehavior(
    EventRehearsalSession session,
    String actorId,
    EventRehearsalBehavior behavior,
  ) async {
    try {
      await EventRehearsalController.behaviorMutation.run(
        ref,
        (tx) => tx
            .get(eventRehearsalControllerProvider.notifier)
            .inject(
              session: session,
              actorId: actorId,
              behavior: behavior,
              fault: session.fault,
            ),
      );
    } on Object {
      // The mutation listener owns user-visible action failure.
    }
  }

  Future<void> _injectFault(
    EventRehearsalSession session,
    EventRehearsalFault fault,
  ) async {
    try {
      await EventRehearsalController.behaviorMutation.run(
        ref,
        (tx) => tx
            .get(eventRehearsalControllerProvider.notifier)
            .inject(session: session, fault: fault),
      );
    } on Object {
      // The mutation listener owns user-visible action failure.
    }
  }
}

class _RehearsalCoachDock extends StatelessWidget {
  const _RehearsalCoachDock({
    required this.task,
    required this.collapsed,
    required this.onWhy,
    required this.onToggle,
  });

  final _RehearsalCoachTask task;
  final bool collapsed;
  final VoidCallback onWhy;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final largeText = MediaQuery.textScalerOf(context).scale(1) >= 1.4;
    if (collapsed) {
      final coachIdentity = Row(
        children: [
          Icon(CatchIcons.scienceOutlined, color: t.danger),
          gapW8,
          Expanded(
            child: CatchText(
              context.l10n.hostEventRehearsalCoachCollapsed,
              variant: CatchTextVariant.statusLabel,
              color: CatchTokens.of(context).ink2,
            ),
          ),
        ],
      );
      final showCoach = CatchButton(
        label: context.l10n.hostEventRehearsalCoachShow,
        size: CatchButtonSize.sm,
        variant: CatchButtonVariant.secondary,
        fullWidth: largeText,
        onPressed: onToggle,
      );
      return CatchDock(
        padding: CatchInsets.tableRowContent,
        child: largeText
            ? Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [coachIdentity, gapH8, showCoach],
              )
            : Row(
                children: [
                  Expanded(child: coachIdentity),
                  showCoach,
                ],
              ),
      );
    }

    final taskCopy = Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CatchSurface(
          width: CatchIconAction.navSize,
          height: CatchIconAction.navSize,
          radius: CatchRadius.sm,
          backgroundColor: t.danger,
          child: Icon(CatchIcons.scienceOutlined, color: t.primaryInk),
        ),
        gapW12,
        Expanded(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                context.l10n.hostEventRehearsalCoachProgress(
                  current: task.number,
                  total: 8,
                ),
                style: CatchTextStyles.kicker(context, color: t.danger),
              ),
              gapH4,
              Text(
                task.title,
                maxLines: largeText ? null : 2,
                overflow: largeText ? null : TextOverflow.ellipsis,
                style: CatchTextStyles.sectionTitle(context),
              ),
              gapH2,
              Text(
                task.body,
                maxLines: largeText ? null : 1,
                overflow: largeText ? null : TextOverflow.ellipsis,
                style: CatchTextStyles.supporting(context, color: t.ink2),
              ),
            ],
          ),
        ),
      ],
    );
    final actions = Wrap(
      spacing: CatchSpacing.s2,
      runSpacing: CatchSpacing.s2,
      alignment: WrapAlignment.end,
      children: [
        CatchButton(
          label: context.l10n.hostEventRehearsalCoachWhy,
          size: CatchButtonSize.sm,
          variant: CatchButtonVariant.secondary,
          onPressed: onWhy,
        ),
        CatchButton(
          label: context.l10n.hostEventRehearsalCoachGotIt,
          size: CatchButtonSize.sm,
          onPressed: onToggle,
        ),
      ],
    );
    return CatchDock(
      padding: largeText ? CatchInsets.content : CatchInsets.tableRowContent,
      child: largeText
          ? Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [taskCopy, gapH10, actions],
            )
          : Row(
              children: [
                Expanded(child: taskCopy),
                gapW8,
                actions,
              ],
            ),
    );
  }
}
