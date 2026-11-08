import 'dart:async';

import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/hosts/events/event_commands_controller.dart';
import 'package:catch_dating_app/hosts/events/event_plan_body.dart';
import 'package:catch_dating_app/hosts/events/event_plan_controller.dart';
import 'package:catch_dating_app/hosts/events/event_plan_state.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_controller.dart';
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
/// existing plan save.
class HostEventPlanScreen extends ConsumerStatefulWidget {
  const HostEventPlanScreen({super.key, required this.request});

  final HostEventRequest request;

  @override
  ConsumerState<HostEventPlanScreen> createState() =>
      _HostEventPlanScreenState();
}

class _HostEventPlanScreenState extends ConsumerState<HostEventPlanScreen> {
  final Map<HostEventPlanOption, bool> _changed = {};

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final request = widget.request;
    final state = ref.watch(hostEventPlanControllerProvider(request));
    final saving = ref.watch(HostEventCommands.savePlanMutation).isPending;
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [HostEventCommands.savePlanMutation],
      errorContext: AppErrorContext.event,
    );
    final options = {...state.options, ..._changed};
    final dirty = _changed.entries.any(
      (entry) => state.options[entry.key] != entry.value,
    );
    final plan = state.plan;
    return CatchRoot(
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
    );
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
