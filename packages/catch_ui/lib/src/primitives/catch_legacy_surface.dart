import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';

enum CatchSurfaceTone { surface, raised, primarySoft, transparent }

/// Shadow prominence; the same four token presets are shared by all recipes.
enum CatchSurfaceEmphasis { flat, subtle, raised, floating }

/// The pre-redesign surface: tones, emphasis and free geometry for cards,
/// panels and tappable tiles.
@Deprecated(
  'Legacy: use CatchSurface with a block (tile, spotlight, floating); '
  'deleted in P7',
)
class CatchLegacySurface extends StatelessWidget {
  const CatchLegacySurface({
    super.key,
    required this.child,
    this.tone = CatchSurfaceTone.surface,
    this.emphasis = CatchSurfaceEmphasis.flat,
    this.padding,
    this.margin,
    this.width,
    this.height,
    this.radius = CatchRadius.lg,
    this.borderRadius,
    this.borderRole,
    this.borderSpec,
    this.backgroundColor,
    this.gradient,
    this.boxShadow,
    this.clipBehavior = Clip.none,
    this.onTap,
    this.onFocusChange,
    this.duration = CatchMotion.fast,
  }) : assert(borderRole == null || borderSpec == null);

  const CatchLegacySurface.card({
    super.key,
    required this.child,
    this.padding = CatchInsets.contentRelaxed,
    this.margin,
    this.width,
    this.height,
    this.borderRole,
    this.borderSpec,
    this.boxShadow,
    this.tone = CatchSurfaceTone.surface,
    this.onTap,
    this.onFocusChange,
    this.duration = CatchMotion.fast,
  }) : assert(borderRole == null || borderSpec == null),
       emphasis = CatchSurfaceEmphasis.subtle,
       radius = CatchRadius.md,
       borderRadius = null,
       backgroundColor = null,
       gradient = null,
       clipBehavior = Clip.none;

  const CatchLegacySurface.tinted({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.symmetric(
      horizontal: CatchSpacing.micro14,
      vertical: CatchSpacing.s3,
    ),
    this.margin,
    this.radius = CatchRadius.sm,
    this.borderRadius,
    this.backgroundColor,
    this.duration = CatchMotion.fast,
  }) : tone = CatchSurfaceTone.primarySoft,
       emphasis = CatchSurfaceEmphasis.flat,
       width = null,
       height = null,
       borderRole = null,
       borderSpec = null,
       gradient = null,
       boxShadow = null,
       clipBehavior = Clip.none,
       onTap = null,
       onFocusChange = null;

  final Widget child;
  final CatchSurfaceTone tone;
  final CatchSurfaceEmphasis emphasis;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final double? width;
  final double? height;
  final double radius;
  final BorderRadius? borderRadius;

  /// Semantic border role for standard surface containment.
  final CatchBorderRole? borderRole;

  /// Resolved semantic border for stateful or custom-pigment containment.
  final CatchBorderSpec? borderSpec;

  final Color? backgroundColor;
  final Gradient? gradient;
  final List<BoxShadow>? boxShadow;
  final Clip clipBehavior;
  final VoidCallback? onTap;
  final ValueChanged<bool>? onFocusChange;
  final Duration duration;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final effectiveDuration =
        MediaQuery.maybeOf(context)?.disableAnimations == true
        ? Duration.zero
        : duration;
    final effectiveBorderRadius = borderRadius ?? BorderRadius.circular(radius);
    final border =
        borderSpec ??
        (borderRole == null ? null : CatchBorder.resolve(t, borderRole!));
    final content = Padding(padding: padding ?? EdgeInsets.zero, child: child);
    final borderDecoration = border == null || border.width <= 0
        ? null
        : BoxDecoration(
            borderRadius: effectiveBorderRadius,
            border: Border.all(color: border.color, width: border.width),
          );
    final decorated = AnimatedContainer(
      duration: effectiveDuration,
      curve: CatchMotion.standardCurve,
      width: width,
      height: height,
      margin: margin,
      clipBehavior: clipBehavior,
      decoration: BoxDecoration(
        color: gradient == null ? backgroundColor ?? _color(t) : null,
        gradient: gradient,
        borderRadius: effectiveBorderRadius,
        boxShadow: boxShadow ?? _shadows,
      ),
      foregroundDecoration: borderDecoration,
      child: onTap == null
          ? content
          : Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: onTap,
                onFocusChange: onFocusChange,
                borderRadius: effectiveBorderRadius,
                child: content,
              ),
            ),
    );

    if (onTap == null) return decorated;
    return Semantics(button: true, child: decorated);
  }

  Color _color(CatchTokens t) {
    return switch (tone) {
      CatchSurfaceTone.surface => t.surface,
      CatchSurfaceTone.raised => t.raised,
      CatchSurfaceTone.primarySoft => t.primarySoft,
      CatchSurfaceTone.transparent => Colors.transparent,
    };
  }

  List<BoxShadow> get _shadows {
    return switch (emphasis) {
      CatchSurfaceEmphasis.flat => CatchElevation.none,
      CatchSurfaceEmphasis.subtle => CatchElevation.card,
      CatchSurfaceEmphasis.raised => CatchElevation.raised,
      CatchSurfaceEmphasis.floating => CatchElevation.overlay,
    };
  }
}
