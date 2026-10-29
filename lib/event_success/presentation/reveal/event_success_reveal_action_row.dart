import 'dart:async';

import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessRevealActionRow extends StatelessWidget {
  const EventSuccessRevealActionRow({
    super.key,
    required this.roundCount,
    required this.nextRound,
    required this.activeRound,
    required this.countdownSeconds,
    required this.isCountingDown,
    required this.allRevealed,
    required this.isLoading,
    this.onStartCountdown,
    this.onRevealRound,
    this.onResetReveal,
  });

  final int roundCount;
  final int? nextRound;
  final int activeRound;
  final int countdownSeconds;
  final bool isCountingDown;
  final bool allRevealed;
  final bool isLoading;
  final Future<void> Function(int roundIndex, int countdownSeconds)?
  onStartCountdown;
  final Future<void> Function(int roundIndex)? onRevealRound;
  final Future<void> Function()? onResetReveal;

  @override
  Widget build(BuildContext context) {
    if (roundCount == 0) {
      return CatchButton(
        label: context
            .l10n
            .eventSuccessEventSuccessLiveRevealActionsLabelGenerateAssignmentsFirst,
        leading: Icon(CatchIcons.magic),
        onPressed: null,
        fullWidth: true,
      );
    }
    if (isCountingDown) {
      return Row(
        children: [
          Expanded(
            child: CatchButton(
              label: context
                  .l10n
                  .eventSuccessEventSuccessLiveRevealActionsLabelRevealNow,
              leading: Icon(CatchIcons.show),
              status: (isLoading)
                  ? CatchButtonStatus.loading
                  : CatchButtonStatus.idle,
              onPressed: isLoading || onRevealRound == null
                  ? null
                  : () => unawaited(
                      _confirmReveal(context, activeRound, onRevealRound!),
                    ),
              fullWidth: true,
            ),
          ),
          gapW10,
          Expanded(
            child: CatchButton(
              label: context.l10n.eventSuccessLiveControlCancelCountdownLabel,
              leading: Icon(CatchIcons.restart),
              variant: CatchButtonVariant.secondary,
              status: (isLoading)
                  ? CatchButtonStatus.loading
                  : CatchButtonStatus.idle,
              onPressed: isLoading || onResetReveal == null
                  ? null
                  : () => unawaited(onResetReveal!()),
              fullWidth: true,
            ),
          ),
        ],
      );
    }
    if (allRevealed) {
      return const SizedBox.shrink();
    }
    final roundIndex = nextRound ?? 0;
    final canUsePrimary = countdownSeconds == 0
        ? onRevealRound != null
        : onStartCountdown != null;
    return Row(
      children: [
        Expanded(
          child: CatchButton(
            label: countdownSeconds == 0
                ? context.l10n
                      .eventSuccessEventSuccessLiveRevealActionsLabelRevealRoundValue1(
                        value1: roundIndex + 1,
                      )
                : context.l10n
                      .eventSuccessEventSuccessLiveRevealActionsLabelDropCountdownsecondsSCountdown(
                        countdownSeconds: countdownSeconds,
                      ),
            leading: Icon(CatchIcons.timer),
            status: (isLoading)
                ? CatchButtonStatus.loading
                : CatchButtonStatus.idle,
            onPressed: isLoading || !canUsePrimary
                ? null
                : () {
                    if (countdownSeconds == 0) {
                      unawaited(
                        _confirmReveal(context, roundIndex, onRevealRound!),
                      );
                    } else {
                      unawaited(
                        _confirmCountdown(
                          context,
                          roundIndex,
                          countdownSeconds,
                          onStartCountdown!,
                        ),
                      );
                    }
                  },
            fullWidth: true,
          ),
        ),
        gapW10,
        Expanded(
          child: CatchButton(
            label: context
                .l10n
                .eventSuccessEventSuccessLiveRevealActionsLabelRevealNow,
            leading: Icon(CatchIcons.show),
            variant: CatchButtonVariant.secondary,
            status: (isLoading)
                ? CatchButtonStatus.loading
                : CatchButtonStatus.idle,
            onPressed: isLoading || onRevealRound == null
                ? null
                : () => unawaited(
                    _confirmReveal(context, roundIndex, onRevealRound!),
                  ),
            fullWidth: true,
          ),
        ),
      ],
    );
  }

  Future<void> _confirmReveal(
    BuildContext context,
    int roundIndex,
    Future<void> Function(int roundIndex) action,
  ) async {
    final confirmed = await showCatchConfirmDialog(
      copy: catchDialogCopy(context.l10n),
      context: context,
      title: context.l10n.eventSuccessLiveControlPublishRevealTitle,
      message: context.l10n.eventSuccessLiveControlPublishRevealMessage(
        roundNumber: roundIndex + 1,
      ),
      confirmLabel:
          context.l10n.eventSuccessLiveControlPublishRevealConfirmLabel,
      danger: true,
    );
    if (confirmed == true && context.mounted) await action(roundIndex);
  }

  Future<void> _confirmCountdown(
    BuildContext context,
    int roundIndex,
    int countdownSeconds,
    Future<void> Function(int roundIndex, int countdownSeconds) action,
  ) async {
    final confirmed = await showCatchConfirmDialog(
      copy: catchDialogCopy(context.l10n),
      context: context,
      title: context.l10n.eventSuccessLiveControlStartCountdownTitle,
      message: context.l10n.eventSuccessLiveControlStartCountdownMessage(
        roundNumber: roundIndex + 1,
        countdownSeconds: countdownSeconds,
      ),
      confirmLabel:
          context.l10n.eventSuccessLiveControlStartCountdownConfirmLabel,
      danger: true,
    );
    if (confirmed == true && context.mounted) {
      await action(roundIndex, countdownSeconds);
    }
  }
}
