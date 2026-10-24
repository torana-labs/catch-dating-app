import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessCountdownText extends StatelessWidget {
  const EventSuccessCountdownText({
    super.key,
    required this.value,
    required this.caption,
  });

  final String value;
  final String caption;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return ConstrainedBox(
      constraints: const BoxConstraints(minWidth: 112),
      child: CatchSurface(
        backgroundColor: t.surface.withValues(
          alpha: CatchOpacity.revealSurfaceFill,
        ),
        borderSpec: CatchBorder.resolve(
          t,
          CatchBorderRole.boundary,
          color: t.surface.withValues(alpha: CatchOpacity.revealSurfaceBorder),
        ),
        padding: CatchInsets.listBody,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedSwitcher(
              duration: CatchMotion.fast,
              transitionBuilder: (child, animation) => ScaleTransition(
                scale: Tween<double>(begin: 0.88, end: 1).animate(animation),
                child: FadeTransition(opacity: animation, child: child),
              ),
              child: Text(
                value,
                key: ValueKey(value),
                style: CatchTextStyles.display(context, color: t.surface),
              ),
            ),
            gapH4,
            CatchText(
              caption,
              variant: CatchTextVariant.statusLabel,
              color: t.surface.withValues(
                alpha: CatchOpacity.revealMutedForeground,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
