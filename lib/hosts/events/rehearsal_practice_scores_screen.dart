import 'dart:async';

import 'package:catch_dating_app/contexts/events/domain/event_extensions.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_operations.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_standings.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_runtime_operation_controller.dart';
import 'package:catch_dating_app/hosts/events/rehearsal_practice_actions.dart';
import 'package:catch_dating_app/hosts/events/rehearsal_practice_controller.dart';
import 'package:catch_dating_app/hosts/events/rehearsal_practice_state.dart';
import 'package:catch_dating_app/hosts/live/live_body.dart';
import 'package:catch_dating_app/hosts/live/live_scores_body.dart';
import 'package:catch_dating_app/hosts/live/live_scores_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Entering and revealing a practice round on the rebuilt scores screen.
/// It holds the points typed for this round until they are saved, and runs
/// the rehearsal's own outcome and reveal operations; the rehearsal read
/// brings the result back. Real guests never see a practice reveal.
class HostRehearsalPracticeScoresScreen extends ConsumerStatefulWidget {
  const HostRehearsalPracticeScoresScreen({
    super.key,
    required this.organizerId,
    required this.sessionId,
    required this.onGuests,
  });

  final String organizerId;
  final String sessionId;

  /// Opens the made-up guest list.
  final VoidCallback onGuests;

  @override
  ConsumerState<HostRehearsalPracticeScoresScreen> createState() =>
      _HostRehearsalPracticeScoresScreenState();
}

class _HostRehearsalPracticeScoresScreenState
    extends ConsumerState<HostRehearsalPracticeScoresScreen> {
  final _points = <String, int>{};

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final practice = ref.watch(
      hostRehearsalPracticeControllerProvider(widget.sessionId),
    );
    final operation = ref.watch(
      eventRehearsalRuntimeOperationControllerProvider(widget.sessionId),
    );
    ref.listen(
      eventRehearsalRuntimeOperationControllerProvider(widget.sessionId),
      (previous, next) {
        final error = next.error;
        if (error != null && !identical(error, previous?.error)) {
          showCatchNoticeError(
            context,
            error,
            errorContext: AppErrorContext.event,
          );
        }
      },
    );
    final actions = HostRehearsalPracticeActions(
      context: context,
      ref: ref,
      organizerId: widget.organizerId,
      sessionId: widget.sessionId,
    );
    final state = practice.scores;
    final now = practice.now ?? DateTime.now();
    final submitting = operation.isSubmitting;
    return CatchRoot(
      theme: CatchThemeMode.night,
      child: CatchScreen(
        key: const ValueKey<String>('host-rehearsal-practice-scores-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.live,
          title: practice.event?.title ?? l10n.hostEventsRehearsalScreenTitle,
          back: CatchTopBarBack(label: l10n.hostLiveBack),
          // Rehearsal names the practice; the tag is its virtual clock.
          kicker: l10n.hostEventsRehearsalScreenTitle,
          live: AppTimeFormatters.time(now),
        ),
        body: HostLiveScoresBody(
          state: state,
          points: Map.unmodifiable(_points),
          onPoints: (unitId, points) =>
              setState(() => _points[unitId] = points),
          onSave: () => unawaited(_save(actions, practice.scores)),
          onReveal: () => unawaited(_reveal(actions, practice.scores)),
          onStopCountdown: state.countingDown
              ? () => _run(
                  actions,
                  operation,
                  RehearsalRevealAction.cancelPending,
                )
              : null,
          onView: (view) => switch (view) {
            HostLiveView.now => Navigator.of(context).popUntil(
              (route) =>
                  route.settings.name != hostRehearsalPracticeViewRouteName,
            ),
            HostLiveView.guests => widget.onGuests(),
            _ => null,
          },
          onRetry: () =>
              ref.invalidate(eventRehearsalProvider(widget.sessionId)),
          saving:
              submitting &&
              operation.kind == RehearsalRuntimeOperationKind.outcomes,
          revealing:
              submitting &&
              operation.kind == RehearsalRuntimeOperationKind.reveal,
        ),
      ),
    );
  }

  Future<void> _save(
    HostRehearsalPracticeActions actions,
    HostLiveScoresState state,
  ) async {
    final rehearsal = ref
        .read(hostRehearsalPracticeControllerProvider(widget.sessionId))
        .rehearsal;
    if (rehearsal == null) return;
    final operation = ref.read(
      eventRehearsalRuntimeOperationControllerProvider(widget.sessionId),
    );
    if (operation.canRetry) {
      actions.retryRuntime();
      return;
    }
    final saved = await actions.recordOutcomes(
      rehearsal,
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
    );
    // A failed save keeps the points to retry.
    if (saved && mounted) setState(_points.clear);
  }

  Future<void> _reveal(
    HostRehearsalPracticeActions actions,
    HostLiveScoresState state,
  ) async {
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
    _run(
      actions,
      ref.read(
        eventRehearsalRuntimeOperationControllerProvider(widget.sessionId),
      ),
      state.countdownSeconds > 0
          ? RehearsalRevealAction.startCountdown
          : RehearsalRevealAction.publish,
      round: round,
      countdownSeconds: state.countdownSeconds,
    );
  }

  /// Runs one reveal decision, or resends the one the server has not
  /// confirmed.
  void _run(
    HostRehearsalPracticeActions actions,
    RehearsalRuntimeOperationState operation,
    RehearsalRevealAction decision, {
    int? round,
    int? countdownSeconds,
  }) {
    final rehearsal = ref
        .read(hostRehearsalPracticeControllerProvider(widget.sessionId))
        .rehearsal;
    if (rehearsal == null) return;
    if (operation.canRetry) {
      actions.retryRuntime();
      return;
    }
    actions.changeReveal(
      rehearsal,
      decision,
      expectedRound: round,
      countdownSeconds: decision == RehearsalRevealAction.startCountdown
          ? countdownSeconds
          : null,
    );
  }
}
