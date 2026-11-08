import 'dart:async';

import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/live/actions/formats_plan_actions.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_mix_body.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_mix_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_mix_state.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_ticker.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_top_bar.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Mixing the quiz teams at half-time, on the night theme, with the reveal
/// in an accent dock.
///
/// It watches [hostFormatsMixControllerProvider]. Shuffle again makes the
/// tables again with the existing `generateEventSuccessPods`; Reveal new
/// tables starts the existing `startRevealCountdown`, fenced by the plan's
/// live-control revision, and the dock counts down while phones do; the
/// first-hello switch is the guide's plan save. Not yet goes back.
class HostFormatsMixScreen extends ConsumerStatefulWidget {
  const HostFormatsMixScreen({super.key, required this.event, this.now});

  final Event event;

  /// A fixed clock for previews and tests; null follows the app clock.
  final DateTime? now;

  @override
  ConsumerState<HostFormatsMixScreen> createState() =>
      _HostFormatsMixScreenState();
}

class _HostFormatsMixScreenState extends ConsumerState<HostFormatsMixScreen>
    with HostFormatsTicker<HostFormatsMixScreen> {
  @override
  DateTime? get fixedNow => widget.now;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final event = widget.event;
    final state = ref.watch(hostFormatsMixControllerProvider(event));
    final shuffling = ref
        .watch(EventSuccessController.generateMicroPodsMutation)
        .isPending;
    final revealing = ref
        .watch(EventSuccessController.startRevealCountdownMutation)
        .isPending;
    final savingOpeners = ref
        .watch(HostFormatsCommands.openersMutation)
        .isPending;
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [
        EventSuccessController.generateMicroPodsMutation,
        EventSuccessController.startRevealCountdownMutation,
        HostFormatsCommands.openersMutation,
      ],
      errorContext: AppErrorContext.event,
    );
    final running = state.status == HostFormatsMixStatus.running;
    final seconds = state.countdownSeconds;
    return CatchRoot(
      theme: CatchThemeMode.night,
      format: CatchFormat.games,
      child: Builder(
        builder: (context) => CatchScreen(
          key: const ValueKey<String>('host-formats-mix-screen'),
          topBar: hostFormatsLiveTopBar(context, event: event, now: now),
          body: HostFormatsMixBody(
            state: state,
            shuffling: shuffling,
            savingOpeners: savingOpeners,
            onShuffle: () => unawaited(_shuffle()),
            onOpeners: (on) => unawaited(_openers(state, on)),
            onRetry: () =>
                ref.invalidate(watchEventSuccessPlanProvider(event.id)),
          ),
          dock: !running
              ? null
              : CatchDock(
                  header: state.countingDown && seconds > 0
                      ? CatchCountdownIndicator(
                          seconds: seconds,
                          label: l10n.hostFormatsRevealCounting,
                        )
                      : null,
                  primary: CatchDockAction(
                    label: state.revealed
                        ? l10n.hostFormatsRevealDone
                        : seconds > 0
                        ? l10n.hostFormatsReveal(seconds: seconds)
                        : l10n.hostFormatsRevealNow,
                    emphasis: CatchDockActionEmphasis.accent,
                    loading: revealing,
                    onPressed:
                        state.revealed ||
                            state.countingDown ||
                            state.tables.isEmpty ||
                            revealing
                        ? null
                        : () => unawaited(_reveal(state)),
                  ),
                  secondary: CatchDockAction(
                    label: l10n.hostFormatsNotYet,
                    onPressed: () => Navigator.of(context).maybePop(),
                  ),
                ),
        ),
      ),
    );
  }

  Future<void> _shuffle() async {
    try {
      await EventSuccessController.generateMicroPodsMutation.run(
        ref,
        (tx) => tx
            .get(eventSuccessControllerProvider.notifier)
            .generateMicroPods(eventId: widget.event.id),
      );
    } on Object {
      // The mutation's error shows as a notice.
    }
  }

  Future<void> _reveal(HostFormatsMixState state) async {
    final plan = state.plan;
    if (plan == null) return;
    try {
      await EventSuccessController.startRevealCountdownMutation.run(
        ref,
        (tx) => tx
            .get(eventSuccessControllerProvider.notifier)
            .startRevealCountdown(
              eventId: widget.event.id,
              roundIndex: state.revealRoundIndex,
              expectedRevision: plan.liveControlRevision,
              confirmed: true,
            ),
      );
    } on Object {
      // The mutation's error shows as a notice.
    }
  }

  Future<void> _openers(HostFormatsMixState state, bool on) async {
    final plan = state.plan;
    if (plan == null) return;
    try {
      await HostFormatsCommands.openersMutation.run(
        ref,
        (tx) => tx
            .get(hostFormatsCommandsProvider.notifier)
            .setOpeners(plan, on: on),
      );
    } on Object {
      // The mutation's error shows as a notice.
    }
  }
}
