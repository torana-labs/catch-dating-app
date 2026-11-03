import 'dart:math' as math;

import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:catch_ui/src/primitives/catch_legacy_surface.dart';
import 'package:flutter/material.dart';

/// Map radius annotation with fixed or available-space geometry.
///
/// The label recipe shares the same paint and interaction over native maps,
/// whose geographic circles and label projection remain platform-owned.
class CatchDistanceOverlay extends StatelessWidget {
  const CatchDistanceOverlay({
    super.key,
    this.size = CatchLayout.distanceRingDefaultSize,
    this.fitAvailable = false,
    this.label,
    this.semanticLabel,
    this.semanticHint,
    this.onTap,
  }) : _labelOnly = false;

  /// Edge annotation when the native map owns the radius geometry.
  const CatchDistanceOverlay.label({
    super.key,
    required String this.label,
    this.semanticLabel,
    this.semanticHint,
    this.onTap,
  }) : size = CatchLayout.distanceRingDefaultSize,
       fitAvailable = false,
       _labelOnly = true;

  final double size;
  final bool fitAvailable;
  final String? label;
  final String? semanticLabel;
  final String? semanticHint;
  final VoidCallback? onTap;
  final bool _labelOnly;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final displayLabel = _labelOnly ? label! : label?.trim();
    final hasLabel =
        _labelOnly || (displayLabel != null && displayLabel.isNotEmpty);
    final labelBody = hasLabel
        ? Semantics(
            button: onTap != null,
            label: semanticLabel ?? displayLabel,
            hint: semanticHint,
            onTap: onTap,
            child: ExcludeSemantics(
              child: CatchLegacySurface(
                onTap: onTap,
                radius: CatchRadius.pill,
                borderRole: CatchBorderRole.control,
                backgroundColor: t.surface.withValues(
                  alpha: CatchOpacity.distanceRingLabelFill,
                ),
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    minHeight: CatchPlatformTokens.minimumInteractiveExtent,
                    minWidth: CatchPlatformTokens.minimumInteractiveExtent,
                  ),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: CatchLayout.distanceRingLabelHorizontal,
                      vertical: CatchSpacing.s1,
                    ),
                    child: Center(
                      widthFactor: 1,
                      heightFactor: 1,
                      child: Text(
                        displayLabel!,
                        style: CatchTextStyles.control(context, color: t.ink),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          )
        : null;
    if (_labelOnly) return labelBody!;

    return LayoutBuilder(
      builder: (context, constraints) {
        final diameter = fitAvailable
            ? math.min(
                size,
                CatchLayout.distanceRingAvailableDiameterFor(
                  constraints.biggest,
                ),
              )
            : size;
        final labelOverhang = hasLabel
            ? CatchLayout.distanceRingLabelOverhang
            : 0.0;
        return SizedBox(
          width: diameter,
          height: diameter + labelOverhang,
          child: Stack(
            clipBehavior: Clip.none,
            alignment: Alignment.topCenter,
            children: [
              Positioned(
                top: labelOverhang,
                left: 0,
                right: 0,
                height: diameter,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: t.ink.withValues(alpha: CatchOpacity.distanceRing),
                      width: CatchLayout.distanceRingStrokeWidth,
                    ),
                  ),
                ),
              ),
              if (labelBody != null)
                Positioned(
                  top: 0,
                  child: ConstrainedBox(
                    constraints: BoxConstraints(maxWidth: diameter),
                    child: labelBody,
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}
