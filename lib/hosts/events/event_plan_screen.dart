import 'dart:async';

import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/hosts/events/event_commands_controller.dart';
import 'package:catch_dating_app/hosts/events/event_plan_body.dart';
import 'package:catch_dating_app/hosts/events/event_plan_controller.dart';
import 'package:catch_dating_app/hosts/events/event_plan_state.dart';
import 'package:catch_dating_app/hosts/events/event_plan_step_controller.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_controller.dart';
import 'package:catch_dating_app/hosts/events/widgets/event_plan_step_sheet.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
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
      ],
      errorContext: AppErrorContext.event,
    );
    final editing = _editing;
    final options = {...state.options, ..._changed};
    final dirty = _changed.entries.any(
      (entry) => state.options[entry.key] != entry.value,
    );
    final plan = state.plan;
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
            onOption: (option, on) => setState(() => _changed[option] = on),
            onRetry: () {
              ref.invalidate(watchEventProvider(request.eventId));
              ref.invalidate(watchEventSuccessPlanProvider(request.eventId));
            },
            onEditStep: (index) => _openStep(state, index),
            onAddStep: () => _openStep(state, null),
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
                    onPressed: dirty ? () => setState(_changed.clear) : null,
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
        (tx) =>
            tx.get(hostEventCommandsProvider.notifier).savePlan(plan, options),
      );
    } on Object {
      // The mutation's error shows as a notice.
      return;
    }
    if (!mounted) return;
    setState(_changed.clear);
    showCatchNotice(context, saved);
  }
}
