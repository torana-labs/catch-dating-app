import 'dart:math' as math;

import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_toolbar_metrics.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:catch_ui/src/primitives/catch_surface.dart';
import 'package:flutter/material.dart';

/// Labelled action or current-value selector button in canonical app chrome.
class CatchToolbarButton extends StatefulWidget {
  const CatchToolbarButton.action({
    super.key,
    required this.label,
    required this.semanticLabel,
    required this.tooltip,
    required this.icon,
    required this.onPressed,
  }) : expanded = null;
  const CatchToolbarButton.selector({
    super.key,
    required this.label,
    required this.semanticLabel,
    required this.tooltip,
    required this.icon,
    required this.onPressed,
    this.expanded = false,
  });

  final String label;
  final String semanticLabel;
  final String tooltip;
  final IconData icon;
  final VoidCallback? onPressed;
  final bool? expanded;

  static Size sizeFor(
    BuildContext context, {
    required String label,
    double maxWidth = double.infinity,
  }) {
    final labelSize = _labelSize(context, label);
    final size = Size(
      math.min(
        maxWidth,
        labelSize.width +
            CatchIcon.md +
            CatchToolbarMetrics.gap +
            CatchSpacing.s3 * 2,
      ),
      math.max(
        CatchToolbarMetrics.targetExtent,
        labelSize.height + CatchSpacing.s2,
      ),
    );
    return size;
  }

  static Size _labelSize(BuildContext context, String label) {
    final painter = TextPainter(
      text: TextSpan(
        text: label,
        style: CatchTextStyles.titleS(
          context,
          color: CatchTokens.of(context).ink,
        ),
      ),
      textDirection: Directionality.of(context),
      textScaler: MediaQuery.textScalerOf(context),
      maxLines: 1,
    )..layout();
    final size = painter.size;
    painter.dispose();
    return size;
  }

  @override
  State<CatchToolbarButton> createState() => _CatchToolbarButtonState();
}

class _CatchToolbarButtonState extends State<CatchToolbarButton> {
  bool _focused = false;
  bool _hovered = false;
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final enabled = widget.onPressed != null;
    final style = CatchTextStyles.titleS(
      context,
      color: enabled ? t.ink : t.ink3,
    );
    final lineHeight = CatchToolbarButton._labelSize(
      context,
      widget.label,
    ).height;
    final visualHeight = math.max(
      CatchToolbarMetrics.visualExtent,
      lineHeight + CatchSpacing.s2,
    );
    final targetHeight = math.max(
      CatchToolbarMetrics.targetExtent,
      visualHeight,
    );
    return Semantics(
      button: true,
      enabled: enabled,
      expanded: widget.expanded,
      label: widget.semanticLabel,
      excludeSemantics: true,
      onTap: enabled ? widget.onPressed : null,
      child: Tooltip(
        message: widget.tooltip,
        excludeFromSemantics: true,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: widget.onPressed,
            onFocusChange: (value) => setState(() => _focused = value),
            onHover: (value) => setState(() => _hovered = value),
            onHighlightChanged: (value) => setState(() => _pressed = value),
            borderRadius: BorderRadius.circular(CatchRadius.pill),
            splashFactory: NoSplash.splashFactory,
            child: SizedBox(
              height: targetHeight,
              child: Center(
                widthFactor: 1,
                child: CatchSurface(
                  height: visualHeight,
                  radius: CatchRadius.pill,
                  backgroundColor: enabled && (_hovered || _pressed)
                      ? Color.alphaBlend(
                          t.ink.withValues(
                            alpha: _pressed
                                ? CatchOpacity.controlOverlayPressed
                                : CatchOpacity.controlOverlayHover,
                          ),
                          t.surface,
                        )
                      : t.surface,
                  borderSpec: _focused
                      ? CatchBorder.resolve(t, CatchBorderRole.focus)
                      : CatchBorder.interactive(
                          t,
                          enabled
                              ? CatchInteractiveBorderState.resting
                              : CatchInteractiveBorderState.disabled,
                        ),
                  boxShadow: _focused
                      ? CatchElevation.focusRing(t)
                      : CatchElevation.none,
                  padding: const EdgeInsets.symmetric(
                    horizontal: CatchSpacing.s3,
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        widget.icon,
                        size: CatchIcon.md,
                        color: enabled ? t.ink : t.ink3,
                      ),
                      const SizedBox(width: CatchToolbarMetrics.gap),
                      Flexible(
                        child: Text(
                          widget.label,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: style,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
