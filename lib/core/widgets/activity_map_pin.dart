import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/core/theme/activity_palette.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Activity-pigment map pin with an optional selected data flag.
class ActivityMapPin extends StatelessWidget {
  const ActivityMapPin({
    super.key,
    required this.activityKind,
    this.selected = false,
    this.label,
    this.size,
  });

  final ActivityKind activityKind;
  final bool selected;
  final String? label;
  final double? size;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final activity = ActivityPalette.resolve(context, activityKind);
    final pinSize =
        size ??
        (selected
            ? CatchLayout.activityMapPinSelectedSize
            : CatchLayout.activityMapPinRestingSize);
    final flagLabel = label?.trim().toUpperCase();

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (selected && flagLabel != null && flagLabel.isNotEmpty) ...[
          CatchSurface(
            duration: Duration.zero,
            tone: CatchSurfaceTone.transparent,
            radius: CatchRadius.pill,
            backgroundColor: t.ink,
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: CatchSpacing.s2,
                vertical: CatchSpacing.s1,
              ),
              child: Text(
                flagLabel,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: CatchTextStyles.badge(context, color: t.primaryInk),
              ),
            ),
          ),
          const SizedBox(height: CatchSpacing.micro2),
        ],
        Icon(
          CatchIcons.pin,
          size: pinSize,
          color: activity.accent,
          shadows: [
            Shadow(
              color: t.ink.withValues(alpha: CatchOpacity.activityMapPinShadow),
              blurRadius: CatchLayout.activityMapPinShadowBlur,
              offset: const Offset(0, CatchLayout.activityMapPinShadowDy),
            ),
          ],
        ),
      ],
    );
  }
}
