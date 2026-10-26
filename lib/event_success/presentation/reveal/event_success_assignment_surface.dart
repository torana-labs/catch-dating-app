import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessAssignmentSurface extends StatelessWidget {
  const EventSuccessAssignmentSurface({
    super.key,
    required this.title,
    required this.child,
  });

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return CatchSurface(
      padding: CatchInsets.contentDense,
      radius: CatchRadius.sm,
      backgroundColor: t.success.withValues(
        alpha: CatchOpacity.revealGradientStart,
      ),
      borderSpec: CatchBorder.resolve(
        t,
        CatchBorderRole.boundary,
        color: t.success.withValues(alpha: CatchOpacity.subtleBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CatchBadge(
            label: title,
            tone: CatchBadgeTone.success,
            icon: CatchIcons.magic,
          ),
          gapH10,
          child,
        ],
      ),
    );
  }
}

const EdgeInsets eventSuccessRevealAssignmentRowGap = EdgeInsets.only(
  bottom: CatchSpacing.s2,
);
