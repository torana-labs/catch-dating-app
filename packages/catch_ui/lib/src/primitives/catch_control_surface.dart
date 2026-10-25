import 'dart:math' as math;

import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';

enum CatchControlSurfaceSize { floating, compact, md }

enum CatchControlSurfaceVariant { rounded, pill }

enum CatchControlSurfaceTone { surface, raised }

enum CatchControlSurfaceStatus { resting, focused, error }

abstract final class CatchControlMetrics {
  static const double floatingMinHeight = CatchSpacing.s11;
  static const double compactMinHeight = CatchLayout.controlCompactMinHeight;
  static const double mdMinHeight = CatchLayout.controlMdMinHeight;
  static const double floatingIconExtent = CatchSpacing.s10;
  static const double compactIconExtent = compactMinHeight;
  static const double mdIconExtent = mdMinHeight;
  static const double stepperIconExtent = CatchSpacing.s11;

  static double minHeight(CatchControlSurfaceSize size) =>
      math.max(CatchPlatformTokens.minimumInteractiveExtent, switch (size) {
        CatchControlSurfaceSize.floating => floatingMinHeight,
        CatchControlSurfaceSize.compact => compactMinHeight,
        CatchControlSurfaceSize.md => mdMinHeight,
      });

  static double iconExtent(CatchControlSurfaceSize size) =>
      math.max(CatchPlatformTokens.minimumInteractiveExtent, switch (size) {
        CatchControlSurfaceSize.floating => floatingIconExtent,
        CatchControlSurfaceSize.compact => compactIconExtent,
        CatchControlSurfaceSize.md => mdIconExtent,
      });

  static BoxConstraints squareConstraints(double extent) => BoxConstraints(
    minWidth: math.max(extent, CatchPlatformTokens.minimumInteractiveExtent),
    maxWidth: math.max(extent, CatchPlatformTokens.minimumInteractiveExtent),
    minHeight: math.max(extent, CatchPlatformTokens.minimumInteractiveExtent),
    maxHeight: math.max(extent, CatchPlatformTokens.minimumInteractiveExtent),
  );

  static double radius(CatchControlSurfaceVariant shape) => switch (shape) {
    // Boxed inputs use the design-system interactive-tile radius (12), not sm.
    CatchControlSurfaceVariant.rounded => CatchRadius.interactiveTile,
    CatchControlSurfaceVariant.pill => CatchRadius.pill,
  };

  static EdgeInsets contentPadding(CatchControlSurfaceSize size) =>
      switch (size) {
        CatchControlSurfaceSize.floating => const EdgeInsets.symmetric(
          horizontal: CatchSpacing.s3,
        ),
        CatchControlSurfaceSize.compact => const EdgeInsets.symmetric(
          horizontal: CatchSpacing.s3,
        ),
        CatchControlSurfaceSize.md => const EdgeInsets.symmetric(
          horizontal: CatchSpacing.micro14,
        ),
      };

  static EdgeInsets textFieldContentPadding(CatchControlSurfaceSize size) =>
      switch (size) {
        CatchControlSurfaceSize.floating => const EdgeInsets.symmetric(
          horizontal: CatchSpacing.s3,
        ),
        CatchControlSurfaceSize.compact => const EdgeInsets.symmetric(
          horizontal: CatchSpacing.s3,
        ),
        CatchControlSurfaceSize.md => const EdgeInsets.symmetric(
          horizontal: CatchSpacing.micro14,
          vertical: CatchSpacing.micro14,
        ),
      };
}

/// Token-backed control containment with stable geometry across visual states.
class CatchControlSurface extends StatelessWidget {
  const CatchControlSurface({
    super.key,
    required this.child,
    this.size = CatchControlSurfaceSize.md,
    this.variant = CatchControlSurfaceVariant.rounded,
    this.tone = CatchControlSurfaceTone.surface,
    this.enabled = true,
    this.status = CatchControlSurfaceStatus.resting,
    this.padding,
    this.onTap,
    this.semanticButton = false,
  });

  final Widget child;
  final CatchControlSurfaceSize size;
  final CatchControlSurfaceVariant variant;
  final CatchControlSurfaceTone tone;
  final bool enabled;
  final CatchControlSurfaceStatus status;
  final EdgeInsetsGeometry? padding;
  final VoidCallback? onTap;
  final bool semanticButton;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final radius = BorderRadius.circular(CatchControlMetrics.radius(variant));
    final border = CatchBorder.interactive(
      t,
      status == CatchControlSurfaceStatus.error
          ? CatchInteractiveBorderState.error
          : !enabled
          ? CatchInteractiveBorderState.disabled
          : status == CatchControlSurfaceStatus.focused
          ? CatchInteractiveBorderState.focused
          : CatchInteractiveBorderState.resting,
    );
    final contentPadding = padding ?? CatchControlMetrics.contentPadding(size);
    final content = AnimatedContainer(
      duration: CatchMotion.fast,
      curve: CatchMotion.standardCurve,
      constraints: BoxConstraints(
        minHeight: CatchControlMetrics.minHeight(size),
        minWidth: CatchPlatformTokens.minimumInteractiveExtent,
      ),
      // Reserve a stable emphasis-stroke footprint. The semantic border paints
      // in the foreground, so rest/error/focus widths never change layout.
      padding: contentPadding.add(const EdgeInsets.all(CatchStroke.emphasis)),
      decoration: BoxDecoration(
        color: _fillColor(t),
        borderRadius: radius,
        boxShadow: enabled && status == CatchControlSurfaceStatus.focused
            ? CatchElevation.focusRing(t)
            : CatchElevation.none,
      ),
      foregroundDecoration: BoxDecoration(
        borderRadius: radius,
        border: border.all,
      ),
      child: child,
    );

    final tappable = onTap == null
        ? content
        : Material(
            color: Colors.transparent,
            borderRadius: radius,
            clipBehavior: Clip.antiAlias,
            child: InkWell(
              onTap: enabled ? onTap : null,
              borderRadius: radius,
              child: content,
            ),
          );

    if (!semanticButton) return tappable;
    return Semantics(button: true, enabled: enabled, child: tappable);
  }

  Color _fillColor(CatchTokens t) {
    if (!enabled) return t.raised;
    return switch (tone) {
      CatchControlSurfaceTone.surface => t.surface,
      CatchControlSurfaceTone.raised => t.raised,
    };
  }
}
