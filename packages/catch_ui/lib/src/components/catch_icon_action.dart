import 'dart:math' as math;

import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_count_badge.dart';
import 'package:catch_ui/src/components/catch_toolbar_metrics.dart';
import 'package:catch_ui/src/components/catch_toolbar_scope.dart';
import 'package:catch_ui/src/primitives/catch_surface.dart';
import 'package:flutter/material.dart';

enum CatchIconActionVariant { bordered, float, plain }

enum CatchIconActionStatus { enabled, disabled }

/// Adaptive follows active selection; outline leaves the glyph unfilled.
enum CatchIconActionEmphasis { adaptive, filled, outline }

/// Canonical icon-only action with one focus, feedback and count owner.
///
/// Defaults to the 44-point bordered visual. Top bars use [navSize], while
/// [targetExtentFor] separately owns the platform-sized hit/focus allocation.
/// Photo/map overlays use [CatchIconActionVariant.float]. Counted actions use
/// [counted] so callers provide a typed count instead of composing a string
/// badge around the button.
///
/// Usage:
/// ```dart
/// CatchIconAction(onPressed: () {}, child: Icon(CatchIcons.notificationsOutlined))
///
/// // Floating photo/map chrome.
/// CatchIconAction(variant: CatchIconActionVariant.float, child: Icon(CatchIcons.close))
///
/// // Solid custom variant.
/// CatchIconAction(backgroundColor: t.ink, child: Icon(CatchIcons.tune, color: t.surface))
/// ```
class CatchIconAction extends StatefulWidget {
  const CatchIconAction({
    super.key,
    required Widget this.child,
    this.onPressed,
    this.variant = CatchIconActionVariant.bordered,
    this.active = false,
    this.emphasis = CatchIconActionEmphasis.adaptive,
    this.accent,
    this.status = CatchIconActionStatus.enabled,
    this.backgroundColor,
    this.borderColor,
    this.size = defaultSize,
    this.borderRadius,
    this.tooltip,
    this.liveRegion = false,
  }) : _count = null,
       _toolbarIcon = null,
       foregroundColor = null;

  factory CatchIconAction.icon({
    Key? key,
    required IconData icon,
    VoidCallback? onPressed,
    CatchIconActionVariant variant = CatchIconActionVariant.bordered,
    bool active = false,
    CatchIconActionEmphasis emphasis = CatchIconActionEmphasis.adaptive,
    Color? accent,
    CatchIconActionStatus status = CatchIconActionStatus.enabled,
    Color? backgroundColor,
    Color? borderColor,
    double size = defaultSize,
    double? borderRadius,
    String? tooltip,
    bool liveRegion = false,
  }) {
    return CatchIconAction(
      key: key,
      onPressed: onPressed,
      variant: variant,
      active: active,
      emphasis: emphasis,
      accent: accent,
      status: status,
      backgroundColor: backgroundColor,
      borderColor: borderColor,
      size: size,
      borderRadius: borderRadius,
      tooltip: tooltip,
      liveRegion: liveRegion,
      child: Icon(icon),
    );
  }

  /// Icon-only action with the canonical count badge overlaid on the target.
  ///
  /// The count stays typed through the API. Zero hides the badge, and the
  /// shared [CatchCountBadge] owns count formatting and overflow behavior.
  factory CatchIconAction.counted({
    Key? key,
    required IconData icon,
    required int count,
    VoidCallback? onPressed,
    CatchIconActionVariant variant = CatchIconActionVariant.bordered,
    bool active = false,
    CatchIconActionEmphasis emphasis = CatchIconActionEmphasis.adaptive,
    Color? accent,
    CatchIconActionStatus status = CatchIconActionStatus.enabled,
    Color? backgroundColor,
    Color? borderColor,
    double size = defaultSize,
    double? borderRadius,
    String? tooltip,
    bool liveRegion = false,
  }) {
    assert(count >= 0, 'count must not be negative');
    return CatchIconAction._counted(
      key: key,
      count: count,
      onPressed: onPressed,
      variant: variant,
      active: active,
      emphasis: emphasis,
      accent: accent,
      status: status,
      backgroundColor: backgroundColor,
      borderColor: borderColor,
      size: size,
      borderRadius: borderRadius,
      tooltip: tooltip,
      liveRegion: liveRegion,
      child: Icon(icon),
    );
  }

  const CatchIconAction._counted({
    super.key,
    required int this._count,
    required Widget this.child,
    this.onPressed,
    this.variant = CatchIconActionVariant.bordered,
    this.active = false,
    this.emphasis = CatchIconActionEmphasis.adaptive,
    this.accent,
    this.status = CatchIconActionStatus.enabled,
    this.backgroundColor,
    this.borderColor,
    this.size = defaultSize,
    this.borderRadius,
    this.tooltip,
    this.liveRegion = false,
  }) : _toolbarIcon = null,
       foregroundColor = null;

  /// Required-tooltip toolbar action with the established navigation glyph.
  const CatchIconAction.toolbar({
    super.key,
    required IconData icon,
    required String this.tooltip,
    this.onPressed,
  }) : child = null,
       _toolbarIcon = icon,
       _count = null,
       size = CatchToolbarMetrics.visualExtent,
       variant = CatchIconActionVariant.bordered,
       backgroundColor = null,
       foregroundColor = null,
       active = false,
       emphasis = CatchIconActionEmphasis.adaptive,
       accent = null,
       status = CatchIconActionStatus.enabled,
       borderColor = null,
       borderRadius = null,
       liveRegion = false;

  static const double defaultSize = CatchLayout.iconButtonSize;
  static const double navSize = CatchLayout.iconButtonNavSize;

  /// Layout and hit extent, distinct from the visible circle's diameter.
  /// Ancestor chrome must reserve this extent rather than [navSize].
  static double targetExtentFor(double visualExtent) =>
      math.max(visualExtent, CatchPlatformTokens.minimumInteractiveExtent);

  final Widget? child;
  final IconData? _toolbarIcon;
  final Color? foregroundColor;
  final VoidCallback? onPressed;
  final CatchIconActionVariant variant;
  final bool active;
  final CatchIconActionEmphasis emphasis;
  final Color? accent;
  final CatchIconActionStatus status;

  /// Override fill color. Defaults to the variant's handoff surface.
  final Color? backgroundColor;

  /// Override border color. Defaults to the variant's handoff border.
  final Color? borderColor;

  /// Visible circle diameter. Cannot reduce the platform minimum hit area.
  final double size;

  /// Override shape radius. Defaults to [CatchRadius.pill] (full circle).
  final double? borderRadius;

  /// Accessible label and hover affordance for icon-only actions.
  final String? tooltip;

  /// Announces a changed semantic label for in-place busy states.
  final bool liveRegion;

  final int? _count;

  @override
  State<CatchIconAction> createState() => _CatchIconActionState();
}

class _CatchIconActionState extends State<CatchIconAction> {
  bool _focused = false;
  bool _hovered = false;
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final toolbar = CatchToolbarScope.contains(context);
    assert(() {
      if (!toolbar) return true;
      final glyph = widget.child;
      final invalidGlyph =
          glyph != null &&
          (glyph is! Icon ||
              glyph.color != null ||
              (glyph.size != null && glyph.size != CatchIconSize.md));
      if (invalidGlyph ||
          widget.accent != null ||
          widget.emphasis != CatchIconActionEmphasis.adaptive ||
          widget.size != CatchToolbarMetrics.visualExtent ||
          widget.variant != CatchIconActionVariant.bordered ||
          widget.backgroundColor != null ||
          widget.borderColor != null ||
          widget.borderRadius != null ||
          widget.foregroundColor != null) {
        throw FlutterError(
          'App-bar controls own their 44-point outline and paint. Use CatchIconAction.toolbar or a canonical counted action; configure contrast on CatchTopBar.',
        );
      }
      return true;
    }());
    final onTap = widget.onPressed;
    final variant = widget.variant;
    final active = widget.active;
    final accent = widget.accent;
    final backgroundColor = widget.backgroundColor;
    final borderColor = widget.borderColor;
    final disabled = widget.status == CatchIconActionStatus.disabled;
    final size = widget.size;
    final targetExtent = CatchIconAction.targetExtentFor(size);
    final radius = widget.borderRadius ?? CatchRadius.pill;
    final palette = _IconActionPalette.from(
      tokens: t,
      variant: variant,
      active: active,
      accent: accent,
      backgroundColor: backgroundColor,
      borderColor: borderColor,
    );
    final enabled = onTap != null && !disabled;
    final filled = switch (widget.emphasis) {
      CatchIconActionEmphasis.adaptive => active,
      CatchIconActionEmphasis.filled => true,
      CatchIconActionEmphasis.outline => false,
    };
    final border = _focused
        ? CatchBorder.resolve(t, CatchBorderRole.focus)
        : active
        ? CatchBorder.resolve(
            t,
            CatchBorderRole.selected,
            color: borderColor ?? accent,
          )
        : variant == CatchIconActionVariant.bordered
        ? CatchBorder.interactive(
            t,
            disabled
                ? CatchInteractiveBorderState.disabled
                : CatchInteractiveBorderState.resting,
          ).copyWith(color: borderColor)
        : palette.borderColor == null
        ? null
        : CatchBorder.resolve(
            t,
            CatchBorderRole.boundary,
            color: palette.borderColor,
          );
    final iconTheme = IconThemeData(
      color: palette.foreground,
      size: toolbar
          ? CatchIconSize.md
          : (size * CatchLayout.iconButtonGlyphScale).roundToDouble(),
      fill: filled ? 1.0 : null,
    );

    final button = Opacity(
      opacity: disabled ? CatchOpacity.disabledControl : 1,
      child: CatchSurface(
        width: size,
        height: size,
        backgroundColor: enabled && (_hovered || _pressed)
            ? Color.alphaBlend(
                palette.foreground.withValues(
                  alpha: _pressed
                      ? CatchOpacity.controlOverlayPressed
                      : CatchOpacity.controlOverlayHover,
                ),
                palette.backgroundColor,
              )
            : palette.backgroundColor,
        radius: radius,
        borderSpec: border,
        boxShadow: _focused ? CatchElevation.focusRing(t) : palette.shadow,
        padding: EdgeInsets.zero,
        child: Center(
          child: IconTheme.merge(
            data: iconTheme,
            child:
                widget.child ??
                Icon(
                  widget._toolbarIcon,
                  size: CatchIconSize.md,
                  color: widget.foregroundColor ?? (enabled ? t.ink : t.ink3),
                ),
          ),
        ),
      ),
    );
    final count = widget._count;
    final countedButton = count == null
        ? button
        : SizedBox.square(
            dimension: size,
            child: CatchCountBadge(count: count, child: button),
          );
    final message = widget.tooltip;
    final target = Semantics(
      button: true,
      enabled: enabled,
      label: message,
      liveRegion: widget.liveRegion,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: enabled ? onTap : null,
          onHover: (hovered) => setState(() => _hovered = hovered),
          onHighlightChanged: (pressed) => setState(() => _pressed = pressed),
          // The visible surface is opaque. Paint feedback there rather than
          // letting ink disappear behind it or fill only the target padding.
          splashFactory: NoSplash.splashFactory,
          hoverColor: Colors.transparent,
          focusColor: Colors.transparent,
          highlightColor: Colors.transparent,
          onFocusChange: (focused) {
            if (_focused != focused) setState(() => _focused = focused);
          },
          borderRadius: BorderRadius.circular(radius),
          child: SizedBox.square(
            dimension: targetExtent,
            child: Center(child: countedButton),
          ),
        ),
      ),
    );
    if (message == null || message.isEmpty) return target;
    return Tooltip(message: message, excludeFromSemantics: true, child: target);
  }
}

class _IconActionPalette {
  const _IconActionPalette({
    required this.backgroundColor,
    required this.foreground,
    required this.borderColor,
    required this.shadow,
  });

  final Color backgroundColor;
  final Color foreground;
  final Color? borderColor;
  final List<BoxShadow> shadow;

  static _IconActionPalette from({
    required CatchTokens tokens,
    required CatchIconActionVariant variant,
    required bool active,
    required Color? accent,
    required Color? backgroundColor,
    required Color? borderColor,
  }) {
    final activeColor = accent ?? tokens.ink;

    switch (variant) {
      case CatchIconActionVariant.bordered:
        return _IconActionPalette(
          backgroundColor: backgroundColor ?? tokens.surface,
          foreground: active ? activeColor : tokens.ink,
          borderColor: borderColor ?? tokens.line2,
          shadow: CatchElevation.none,
        );
      case CatchIconActionVariant.float:
        return _IconActionPalette(
          backgroundColor:
              backgroundColor ??
              tokens.surface.withValues(
                alpha: CatchOpacity.iconButtonFloatFill,
              ),
          foreground: active
              ? activeColor
              : CatchIconButtonColors.floatingForeground,
          borderColor: borderColor,
          shadow: CatchElevation.iconButtonFloat,
        );
      case CatchIconActionVariant.plain:
        return _IconActionPalette(
          backgroundColor: backgroundColor ?? Colors.transparent,
          foreground: active ? activeColor : tokens.ink,
          borderColor: borderColor,
          shadow: CatchElevation.none,
        );
    }
  }
}
