import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessRevealRoundStepper extends StatelessWidget {
  const EventSuccessRevealRoundStepper({
    super.key,
    required this.roundCount,
    required this.activeRoundIndex,
    required this.revealedThrough,
    this.foreground,
  });

  final int roundCount;
  final int activeRoundIndex;
  final int revealedThrough;
  final Color? foreground;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final color = foreground ?? t.surface;
    return Wrap(
      spacing: CatchSpacing.s2,
      runSpacing: CatchSpacing.s2,
      children: [
        for (var index = 0; index < roundCount; index++)
          CatchBadge(
            label: context.l10n
                .eventSuccessEventSuccessLiveRevealWidgetsLabelRValue1(
                  value1: index + 1,
                ),
            tone: index <= revealedThrough
                ? CatchBadgeTone.success
                : index == activeRoundIndex
                ? CatchBadgeTone.warning
                : CatchBadgeTone.neutral,
            backgroundColor: foreground == null
                ? color.withValues(
                    alpha: index <= revealedThrough
                        ? CatchOpacity.revealSurfaceBorder
                        : CatchOpacity.revealBeatFillInactive,
                  )
                : null,
            foregroundColor: foreground == null ? color : null,
            borderColor: foreground == null
                ? color.withValues(alpha: CatchOpacity.warningFill)
                : null,
          ),
      ],
    );
  }
}
