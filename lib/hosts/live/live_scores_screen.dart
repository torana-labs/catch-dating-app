import 'dart:async';

import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_standings.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_controller.dart';
import 'package:catch_dating_app/hosts/live/live_controller.dart';
import 'package:catch_dating_app/hosts/live/live_scores_body.dart';
import 'package:catch_dating_app/hosts/live/live_scores_state.dart';
import 'package:catch_dating_app/hosts/live/live_screen.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Entering and revealing a round on the night theme. It holds the points
/// typed for this round until they are saved, and runs the existing record
/// and reveal commands; the scoreboard listener brings the result back.
class HostLiveScoresScreen extends ConsumerStatefulWidget {
  const HostLiveScoresScreen({
    super.key,
    required this.organizer,
    required this.event,
    required this.onOpenGuests,
    this.now,
  });

  final Organizer organizer;
  final Event event;
  final VoidCallback onOpenGuests;

  /// A fixed clock for previews and tests; null reads the app clock.
  final DateTime? now;

  @override
  ConsumerState<HostLiveScoresScreen> createState() =>
      _HostLiveScoresScreenState();
}

class _HostLiveScoresScreenState extends ConsumerState<HostLiveScoresScreen> {
  final _points = <String, int>{};

  @override
  Widget build(BuildContext context) {
    final event = widget.event;
    final state = ref.watch(hostLiveScoresControllerProvider(event));
    final saving = ref
        .watch(EventSuccessController.recordUnitOutcomesMutation)
        .isPending;
    final revealing =
        ref
            .watch(EventSuccessController.startRevealCountdownMutation)
            .isPending ||
        ref.watch(EventSuccessController.revealRoundMutation).isPending;
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [
        EventSuccessController.recordUnitOutcomesMutation,
        EventSuccessController.startRevealCountdownMutation,
        EventSuccessController.revealRoundMutation,
      ],
      errorContext: AppErrorContext.event,
    );
    final actions = HostLiveActions(
      context: context,
      ref: ref,
      organizer: widget.organizer,
      event: event,
      onOpenGuests: widget.onOpenGuests,
      now: widget.now,
    );
    return CatchRoot(
      theme: CatchThemeMode.night,
      child: CatchScreen(
        key: const ValueKey<String>('host-live-scores-screen'),
        topBar: hostLiveTopBar(
          context,
          event: event,
          now: widget.now ?? ref.read(appClockProvider).now(),
        ),
        body: HostLiveScoresBody(
          state: state,
          points: Map.unmodifiable(_points),
          saving: saving,
          revealing: revealing,
          onPoints: (unitId, points) =>
              setState(() => _points[unitId] = points),
          onSave: () => unawaited(_save(state)),
          onReveal: () => unawaited(_reveal(state)),
          onView: actions.openView,
          onRetry: () => retryHostLiveReads(ref, event),
        ),
      ),
    );
  }

  Future<void> _save(HostLiveScoresState state) async {
    final saved = EventSuccessController.recordUnitOutcomesMutation.run(
      ref,
      (tx) => tx
          .get(eventSuccessControllerProvider.notifier)
          .recordUnitOutcomes(
            eventId: widget.event.id,
            expectedRevision: state.standingsRevision,
            roundIndex: state.roundIndex,
            entries: [
              for (final unit in state.units)
                EventSuccessScoreOutcomeInput(
                  unitId: unit.id,
                  unitLabel: unit.label,
                  score: _points[unit.id] ?? 0,
                ),
            ],
          ),
    );
    try {
      await saved;
    } on Object {
      // The mutation listener shows the error; the points stay to retry.
      return;
    }
    if (mounted) setState(_points.clear);
  }

  Future<void> _reveal(HostLiveScoresState state) async {
    final round = state.revealRoundIndex;
    if (round == null) return;
    final l10n = context.l10n;
    final confirmed = await showCatchAdaptiveDialog<bool>(
      context: context,
      title: l10n.hostLiveScoresRevealConfirmTitle(round: round + 1),
      message: l10n.hostLiveScoresRevealConfirmBody,
      actions: [
        CatchDialogAction(label: l10n.hostLiveScoresRevealCancel, value: false),
        CatchDialogAction(
          label: l10n.hostLiveScoresReveal,
          value: true,
          isDefault: true,
        ),
      ],
    );
    if (confirmed != true || !mounted) return;
    final controller = eventSuccessControllerProvider.notifier;
    if (state.countdownSeconds > 0) {
      runHostLiveCommand(
        EventSuccessController.startRevealCountdownMutation.run(
          ref,
          (tx) => tx
              .get(controller)
              .startRevealCountdown(
                eventId: widget.event.id,
                roundIndex: round,
                expectedRevision: state.liveControlRevision,
                confirmed: true,
              ),
        ),
      );
    } else {
      runHostLiveCommand(
        EventSuccessController.revealRoundMutation.run(
          ref,
          (tx) => tx
              .get(controller)
              .revealRound(
                eventId: widget.event.id,
                roundIndex: round,
                expectedRevision: state.liveControlRevision,
                confirmed: true,
              ),
        ),
      );
    }
  }
}
