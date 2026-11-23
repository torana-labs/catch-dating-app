import 'dart:async';

import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_structure.dart';
import 'package:catch_dating_app/contexts/live/actions/event_success_controller.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_room_setup_section.dart';
import 'package:catch_dating_app/event_success/presentation/host_setup/event_success_readiness_field.dart';
import 'package:catch_dating_app/event_success/presentation/host_setup/event_success_target_attendees_field.dart';
import 'package:catch_dating_app/hosts/events/event_commands_controller.dart';
import 'package:catch_dating_app/hosts/events/event_plan_body.dart';
import 'package:catch_dating_app/hosts/events/event_plan_controller.dart';
import 'package:catch_dating_app/hosts/events/event_plan_state.dart';
import 'package:catch_dating_app/hosts/events/event_plan_step_controller.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_controller.dart';
import 'package:catch_dating_app/hosts/events/widgets/event_plan_step_sheet.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// The plan for the night: the format, its run of show, teams and tables
/// and the night's options, with Save the plan and Undo while the plan is
/// still being set up, and Rehearse in the top bar.
///
/// It watches [hostEventPlanControllerProvider], keeps the options the host
/// has changed but not saved, and saves them through the live guide's
/// existing plan save. Until the night is over a step opens its editor
/// sheet and Add a step opens a new one; each save or remove is one
/// `saveEventPlanStep` command with its own request id.
class HostEventPlanScreen extends ConsumerStatefulWidget {
  const HostEventPlanScreen({super.key, required this.request});

  final HostEventRequest request;

  @override
  ConsumerState<HostEventPlanScreen> createState() =>
      _HostEventPlanScreenState();
}

class _HostEventPlanScreenState extends ConsumerState<HostEventPlanScreen> {
  final Map<HostEventPlanOption, bool> _changed = {};

  /// Guests the plan is set for and its room layout, as changed here and
  /// not yet saved; null keeps the saved value.
  int? _target;
  String? _layoutId;

  /// The step in the editor sheet, and whether it is new; null when the
  /// sheet is down.
  ({EventSuccessPlanStep step, bool isNew, int index})? _editing;

  /// One request id per edit, so a retry cannot apply it twice.
  String? _stepRequestId;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final request = widget.request;
    final state = ref.watch(hostEventPlanControllerProvider(request));
    final saving = ref.watch(HostEventCommands.savePlanMutation).isPending;
    final savingStep = ref
        .watch(HostEventPlanCommands.saveStepMutation)
        .isPending;
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [
        HostEventCommands.savePlanMutation,
        HostEventPlanCommands.saveStepMutation,
        EventSuccessController.upsertLayoutMutation,
      ],
      errorContext: AppErrorContext.event,
    );
    final editing = _editing;
    final options = {...state.options, ..._changed};
    final plan = state.plan;
    final target = _target ?? state.targetAttendees;
    final layoutId = _layoutId ?? state.layoutId;
    final dirty =
        _changed.entries.any(
          (entry) => state.options[entry.key] != entry.value,
        ) ||
        (_target != null && _target != state.targetAttendees) ||
        (_layoutId != null && _layoutId != state.layoutId);
    final organizerId = state.organizerId;
    final layouts =
        organizerId == null || state.unitKind == EventSuccessUnitKind.wholeGroup
        ? null
        : catchAsyncStateFromAsyncValue(
            ref.watch(watchOrganizerEventSuccessLayoutsProvider(organizerId)),
          );
    final upsertLayout = ref.watch(EventSuccessController.upsertLayoutMutation);
    // Before the night: what the plan still lacks, how many guests it is
    // set for and, when guests sit at tables or in teams, the room layout,
    // all as the old event screen's setup drew them.
    final setup = <Widget>[
      if (plan != null &&
          (state.readinessIssues.isNotEmpty ||
              (target != null &&
                  state.capacityMin != null &&
                  state.capacityMax != null)))
        CatchSection(
          key: const ValueKey<String>('host-event-plan-setup'),
          title: l10n.eventSuccessEventSuccessSetupBodyTitleBeforeTheEvent,
          dividers: CatchSectionPlacement.none,
          children: [
            if (state.readinessIssues.isNotEmpty)
              EventSuccessReadinessField(issues: state.readinessIssues),
            if (target != null &&
                state.capacityMin != null &&
                state.capacityMax != null)
              EventSuccessTargetAttendeesField(
                value: target,
                recommendedMin: state.capacityMin!,
                recommendedMax: state.capacityMax!,
                enabled: state.editable,
                onChanged: (value) => setState(() => _target = value),
              ),
          ],
        ),
      if (layouts != null)
        EventSuccessRoomSetupSection(
          key: const ValueKey<String>('host-event-plan-room'),
          layoutsState: layouts,
          selectedLayoutId: layoutId,
          usesWholeGroup: false,
          enabled: state.editable,
          isSavingLayout: upsertLayout.isPending,
          onSelected: (id) => setState(() => _layoutId = id),
          onSaveLayout: (layout) =>
              EventSuccessController.upsertLayoutMutation.run(
                ref,
                (tx) => tx
                    .get(eventSuccessControllerProvider.notifier)
                    .upsertLayout(organizerId: organizerId!, layout: layout),
              ),
        ),
    ];
    return PopScope(
      canPop: editing == null,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && editing != null) setState(() => _editing = null);
      },
      child: CatchRoot(
        child: CatchScreen(
          key: const ValueKey<String>('host-event-plan-screen'),
          topBar: CatchTopBar(
            variant: CatchTopBarVariant.tool,
            back: CatchTopBarBack(label: l10n.hostEventsBack),
            title: l10n.hostEventsLinkPlan,
            kicker: state.eventTitle,
            action: CatchTopBarAction(
              label: l10n.hostEventsPlanRehearse,
              onPressed: () => context.pushNamed(
                Routes.hostEventRehearsalStartScreen.name,
                pathParameters: {'organizerId': request.organizerId},
                queryParameters: {'eventId': request.eventId},
              ),
            ),
          ),
          bodyScrolls: false,
          body: HostEventPlanBody(
            state: state,
            options: options,
            setup: setup,
            onOption: (option, on) => setState(() => _changed[option] = on),
            onRetry: () {
              ref.invalidate(watchEventProvider(request.eventId));
              ref.invalidate(watchEventSuccessPlanProvider(request.eventId));
            },
            onEditStep: (index) => _openStep(state, index),
            onAddStep: () => _openStep(state, null),
            onEditEvent: () => context.pushNamed(
              Routes.hostAppEditEventScreen.name,
              pathParameters: {
                'organizerId': request.organizerId,
                'eventId': request.eventId,
              },
            ),
          ),
          overlay: editing == null
              ? null
              : HostEventPlanStepSheet(
                  key: ValueKey<String>(
                    'host-event-plan-step-sheet-${editing.step.stepId}',
                  ),
                  step: editing.step,
                  isNew: editing.isNew,
                  saving: savingStep,
                  onSave: (step) => unawaited(
                    _saveStep(
                      editing.isNew
                          ? HostEventPlanStepAdd(step, atIndex: editing.index)
                          : HostEventPlanStepChange(step),
                    ),
                  ),
                  onRemove: state.steps.length > 1
                      ? () => unawaited(
                          _saveStep(
                            HostEventPlanStepRemove(editing.step.stepId),
                          ),
                        )
                      : null,
                ),
          dock: !state.editable || plan == null
              ? null
              : CatchDock(
                  primary: CatchDockAction(
                    label: l10n.hostEventsPlanSave,
                    loading: saving,
                    onPressed: dirty && !saving
                        ? () => unawaited(_save(options))
                        : null,
                  ),
                  secondary: CatchDockAction(
                    label: l10n.hostEventsPlanUndo,
                    onPressed: dirty
                        ? () => setState(() {
                            _changed.clear();
                            _target = null;
                            _layoutId = null;
                          })
                        : null,
                  ),
                ),
        ),
      ),
    );
  }

  /// Opens the editor on the step at [index], or on a new last step.
  void _openStep(HostEventPlanState state, int? index) {
    final steps = state.planSteps;
    setState(() {
      _stepRequestId = null;
      _editing = index == null
          ? (
              step: EventSuccessPlanStep(
                stepId: 'host-${DateTime.now().microsecondsSinceEpoch}',
                title: '',
                durationMinutes: 10,
              ),
              isNew: true,
              index: steps.length,
            )
          : (step: steps[index], isNew: false, index: index);
    });
  }

  Future<void> _saveStep(HostEventPlanStepEdit edit) async {
    final state = ref.read(hostEventPlanControllerProvider(widget.request));
    final plan = state.plan;
    if (plan == null) return;
    final saved = context.l10n.hostEventsPlanStepSaved;
    final requestId = _stepRequestId ??= hostEventRequestId();
    try {
      await HostEventPlanCommands.saveStepMutation.run(
        ref,
        (tx) => tx
            .get(hostEventPlanCommandsProvider.notifier)
            .saveStep(
              eventId: widget.request.eventId,
              requestId: requestId,
              expectedLiveControlRevision: state.liveControlRevision,
              currentSteps: state.planSteps,
              hasOverrides: plan.stepOverrides?.isNotEmpty ?? false,
              edit: edit,
            ),
      );
    } on Object {
      // The mutation's error shows as a notice.
      return;
    }
    if (!mounted) return;
    setState(() {
      _editing = null;
      _stepRequestId = null;
    });
    showCatchNotice(context, saved);
  }

  Future<void> _save(Map<HostEventPlanOption, bool> options) async {
    final plan = ref.read(hostEventPlanControllerProvider(widget.request)).plan;
    if (plan == null) return;
    final saved = context.l10n.hostEventsPlanSaved;
    try {
      await HostEventCommands.savePlanMutation.run(
        ref,
        (tx) => tx
            .get(hostEventCommandsProvider.notifier)
            .savePlan(
              plan.copyWith(
                targetAttendeeCount: _target ?? plan.targetAttendeeCount,
                layoutId: _layoutId ?? plan.layoutId,
              ),
              options,
            ),
      );
    } on Object {
      // The mutation's error shows as a notice.
      return;
    }
    if (!mounted) return;
    setState(() {
      _changed.clear();
      _target = null;
      _layoutId = null;
    });
    showCatchNotice(context, saved);
  }
}
