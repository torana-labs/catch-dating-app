import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessRevealProgressIndicator extends StatelessWidget {
  const EventSuccessRevealProgressIndicator({
    super.key,
    required this.progress,
  });

  final double progress;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return CatchSurface(
      duration: Duration.zero,
      tone: CatchSurfaceTone.transparent,
      radius: CatchRadius.pill,
      clipBehavior: Clip.antiAlias,
      child: LinearProgressIndicator(
        minHeight: 7,
        value: progress.clamp(0, 1).toDouble(),
        backgroundColor: t.surface.withValues(alpha: CatchOpacity.warningFill),
        valueColor: AlwaysStoppedAnimation<Color>(t.gold),
      ),
    );
  }
}
