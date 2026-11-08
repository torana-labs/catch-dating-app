import 'dart:async';

import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/live/actions/formats_plan_actions.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_courts_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_courts_setup_body.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_courts_setup_state.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_rules_screen.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_top_bar.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Setting up court rotations, on the day theme: courts, minutes a game,
/// what matters most and the grouping rules, with Save rotations and
/// Preview round 1 in the dock.
///
/// It keeps the host's unsaved draft. Save rotations writes it as the
/// plan's structure through the guide's plan save; Preview round 1 saves
/// a changed draft first, then makes the rotations with the existing
/// `generateEventSuccessRotations`, fenced by the live-control revision.
class HostFormatsCourtsSetupScreen extends ConsumerStatefulWidget {
  const HostFormatsCourtsSetupScreen({super.key, required this.event});

  final Event event;

  @override
  ConsumerState<HostFormatsCourtsSetupScreen> createState() =>
      _HostFormatsCourtsSetupScreenState();
}

class _HostFormatsCourtsSetupScreenState
    extends ConsumerState<HostFormatsCourtsSetupScreen> {
  HostFormatsCourtsDraft? _draft;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final event = widget.event;
    final state = ref.watch(hostFormatsCourtsSetupControllerProvider(event));
    final saving = ref.watch(HostFormatsCommands.saveCourtsMutation).isPending;
    final generating = ref
        .watch(EventSuccessController.generateGuidedRotationsMutation)
        .isPending;
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [
        HostFormatsCommands.saveCourtsMutation,
        EventSuccessController.generateGuidedRotationsMutation,
      ],
      errorContext: AppErrorContext.event,
    );
    final draft = _draft ?? state.saved;
    final dirty = draft != state.saved;
    final ready =
        state.status == HostFormatsCourtsSetupStatus.ready && state.editable;
    final busy = saving || generating;
    return CatchRoot(
      format: CatchFormat.courts,
      child: CatchScreen(
        key: const ValueKey<String>('host-formats-courts-setup-screen'),
        topBar: hostFormatsToolTopBar(
          context,
          event: event,
          title: l10n.hostFormatsCourtsSetupTitle,
        ),
        body: HostFormatsCourtsSetupBody(
          state: state,
          draft: draft,
          onDraft: (next) => setState(() => _draft = next),
          onRules: () => unawaited(
            Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => HostFormatsRulesScreen(event: event),
              ),
            ),
          ),
          onRetry: () =>
              ref.invalidate(watchEventSuccessPlanProvider(event.id)),
        ),
        dock: !ready
            ? null
            : CatchDock(
                primary: CatchDockAction(
                  label: l10n.hostFormatsSaveRotations,
                  loading: saving,
                  onPressed: dirty && !busy
                      ? () => unawaited(_save(state, draft))
                      : null,
                ),
                secondary: CatchDockAction(
                  label: l10n.hostFormatsPreviewFirstRound,
                  loading: generating,
                  onPressed: busy
                      ? null
                      : () => unawaited(_preview(state, draft, dirty: dirty)),
                ),
              ),
      ),
    );
  }

  Future<bool> _save(
    HostFormatsCourtsSetupState state,
    HostFormatsCourtsDraft draft,
  ) async {
    final plan = state.plan;
    if (plan == null) return false;
    final saved = context.l10n.hostFormatsRotationsSaved;
    try {
      await HostFormatsCommands.saveCourtsMutation.run(
        ref,
        (tx) => tx
            .get(hostFormatsCommandsProvider.notifier)
            .saveCourts(
              plan,
              hostFormatsCourtsStructure(plan.structureConfig, draft),
            ),
      );
    } on Object {
      // The mutation's error shows as a notice.
      return false;
    }
    if (!mounted) return false;
    setState(() => _draft = null);
    showCatchNotice(context, saved);
    return true;
  }

  Future<void> _preview(
    HostFormatsCourtsSetupState state,
    HostFormatsCourtsDraft draft, {
    required bool dirty,
  }) async {
    if (dirty && !await _save(state, draft)) return;
    if (!mounted) return;
    final plan = ref
        .read(hostFormatsCourtsSetupControllerProvider(widget.event))
        .plan;
    if (plan == null) return;
    final made = context.l10n.hostFormatsRotationsMade;
    try {
      await EventSuccessController.generateGuidedRotationsMutation.run(
        ref,
        (tx) => tx
            .get(eventSuccessControllerProvider.notifier)
            .generateGuidedRotations(
              eventId: widget.event.id,
              expectedRevision: plan.liveControlRevision,
            ),
      );
    } on Object {
      return;
    }
    if (mounted) showCatchNotice(context, made);
  }
}
