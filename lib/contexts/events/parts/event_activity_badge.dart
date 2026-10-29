import 'package:catch_dating_app/contexts/events/parts/event_activity_visuals.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventActivityBadge extends StatelessWidget {
  const EventActivityBadge({
    super.key,
    required this.visual,
    this.size = CatchLayout.eventActivityStampExtent,
    this.iconSize = CatchLayout.eventActivityStampIconSize,
  });

  final EventActivityVisualSpec visual;
  final double size;
  final double iconSize;

  @override
  Widget build(BuildContext context) {
    return CatchSurface(
      width: size,
      height: size,
      radius: CatchRadius.pill,
      backgroundColor: visual.soft.withValues(alpha: CatchOpacity.scrimFill),
      borderSpec: CatchBorder.resolve(
        CatchTokens.of(context),
        CatchBorderRole.boundary,
        color: visual.accent.withValues(alpha: CatchOpacity.mutedBorder),
      ),
      child: Center(
        child: Icon(visual.icon, size: iconSize, color: visual.deep),
      ),
    );
  }
}
