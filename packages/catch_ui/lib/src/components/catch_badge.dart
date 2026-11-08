import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:catch_ui/src/primitives/catch_dashed_outline_painter.dart';
import 'package:catch_ui/src/primitives/catch_status_indicator.dart';
import 'package:flutter/material.dart';

/// What a badge means. [info] is indigo and [social] pink, as in the system.
enum CatchBadgeTone {
  neutral,
  brand,
  success,
  warning,
  danger,
  gold,
  affinity,
  info,
  social,
}

enum CatchBadgeSize { sm, md, action }

/// [soft] is the pale tint. [solid] is the tone at full strength (ink for
/// neutral, the event colour for a format); [strong] is the ticket recipe's
/// dark pill and reads as [solid] on the default constructor. [outline] has
/// no fill and a dashed edge, for something still waiting (no reply yet).
enum CatchBadgeEmphasis { soft, strong, solid, outline }

enum _CatchBadgeRecipe {
  standard,
  solid,
  live,
  onDark,
  privacy,
  status,
  ticketSoft,
  ticketStrong,
  optional,
}

/// Canonical small badge for compact, non-interactive metadata and status.
///
/// The default constructor preserves authored sentence case. Functional
/// status must use [CatchBadge.functional], which owns uppercase mono type.
/// Fixed visual recipes are exposed only through their named constructors.
class CatchBadge extends StatelessWidget {
  ///
  /// The system Badge: [tone] with [emphasis] soft, solid or outline, a
  /// [format] (which wins over [tone] and fills the badge with the event
  /// colour) and a leading [dot] in the label colour. [semanticLabel] is read
  /// in place of a terse [label]: "No reply yet" for "?".
  const CatchBadge({
    super.key,
    required this.label,
    this.tone = CatchBadgeTone.neutral,
    this.size = CatchBadgeSize.sm,
    this.icon,
    this.emphasis = CatchBadgeEmphasis.soft,
    this.format,
    this.dot = false,
    this.semanticLabel,
    this.accentColor,
    this.backgroundColor,
    this.foregroundColor,
    this.borderColor,
  }) : _functional = false,
       _recipe = _CatchBadgeRecipe.standard;

  /// Sentence-case category/status with a quiet rounded rectangle. Unlike
  /// a selectable control this has no tap semantics or minimum touch target.
  const CatchBadge.status({
    super.key,
    required this.label,
    this.tone = CatchBadgeTone.neutral,
    this.icon,
  }) : size = CatchBadgeSize.sm,
       _functional = false,
       accentColor = null,
       backgroundColor = null,
       foregroundColor = null,
       borderColor = null,
       emphasis = CatchBadgeEmphasis.soft,
       format = null,
       dot = false,
       semanticLabel = null,
       _recipe = _CatchBadgeRecipe.status;

  const CatchBadge.functional({
    super.key,
    required this.label,
    this.tone = CatchBadgeTone.neutral,
    this.size = CatchBadgeSize.sm,
    this.icon,
    this.accentColor,
    this.backgroundColor,
    this.foregroundColor,
    this.borderColor,
  }) : _functional = true,
       emphasis = CatchBadgeEmphasis.soft,
       format = null,
       dot = false,
       semanticLabel = null,
       _recipe = _CatchBadgeRecipe.standard;

  /// Fixed editorial solid treatment for badges on light surfaces.
  const CatchBadge.solid({
    super.key,
    required this.label,
    this.size = CatchBadgeSize.md,
    this.icon,
  }) : tone = CatchBadgeTone.neutral,
       _functional = false,
       accentColor = null,
       backgroundColor = null,
       foregroundColor = null,
       borderColor = null,
       emphasis = CatchBadgeEmphasis.soft,
       format = null,
       dot = false,
       semanticLabel = null,
       _recipe = _CatchBadgeRecipe.solid;

  /// Fixed editorial solid treatment for compact functional status.
  const CatchBadge.solidStatus({
    super.key,
    required this.label,
    this.size = CatchBadgeSize.sm,
    this.icon,
  }) : tone = CatchBadgeTone.neutral,
       _functional = true,
       accentColor = null,
       backgroundColor = null,
       foregroundColor = null,
       borderColor = null,
       emphasis = CatchBadgeEmphasis.soft,
       format = null,
       dot = false,
       semanticLabel = null,
       _recipe = _CatchBadgeRecipe.solid;

  /// Canonical live-status treatment: live fill, status dot, functional copy.
  const CatchBadge.live({
    super.key,
    required this.label,
    this.size = CatchBadgeSize.sm,
  }) : tone = CatchBadgeTone.neutral,
       icon = null,
       _functional = true,
       accentColor = null,
       backgroundColor = null,
       foregroundColor = null,
       borderColor = null,
       emphasis = CatchBadgeEmphasis.soft,
       format = null,
       dot = false,
       semanticLabel = null,
       _recipe = _CatchBadgeRecipe.live;

  /// Fixed treatment for compact metadata over dark, media, or art surfaces.
  const CatchBadge.onDark({super.key, required this.label, this.icon})
    : tone = CatchBadgeTone.neutral,
      size = CatchBadgeSize.md,
      _functional = false,
      accentColor = null,
      backgroundColor = null,
      foregroundColor = null,
      borderColor = null,
      emphasis = CatchBadgeEmphasis.soft,
      format = null,
      dot = false,
      semanticLabel = null,
      _recipe = _CatchBadgeRecipe.onDark;

  /// Fixed on-dark chrome with normalized functional-status typography.
  const CatchBadge.onDarkStatus({super.key, required this.label, this.icon})
    : tone = CatchBadgeTone.neutral,
      size = CatchBadgeSize.md,
      _functional = true,
      accentColor = null,
      backgroundColor = null,
      foregroundColor = null,
      borderColor = null,
      emphasis = CatchBadgeEmphasis.soft,
      format = null,
      dot = false,
      semanticLabel = null,
      _recipe = _CatchBadgeRecipe.onDark;

  /// Canonical trust/privacy chrome. Domain adapters own localized copy.
  const CatchBadge.privacy({
    super.key,
    required this.label,
    required IconData this.icon,
  }) : tone = CatchBadgeTone.neutral,
       size = CatchBadgeSize.sm,
       _functional = true,
       accentColor = null,
       backgroundColor = null,
       foregroundColor = null,
       borderColor = null,
       emphasis = CatchBadgeEmphasis.soft,
       format = null,
       dot = false,
       semanticLabel = null,
       _recipe = _CatchBadgeRecipe.privacy;

  /// Uppercase ticket status with a caller-supplied pigment or dark emphasis.
  const CatchBadge.ticketStatus({
    super.key,
    required this.label,
    required Color color,
    CatchBadgeEmphasis emphasis = CatchBadgeEmphasis.soft,
  }) : tone = CatchBadgeTone.neutral,
       size = CatchBadgeSize.sm,
       icon = null,
       accentColor = color,
       backgroundColor = null,
       foregroundColor = null,
       borderColor = null,
       _functional = true,
       emphasis = CatchBadgeEmphasis.soft,
       format = null,
       dot = false,
       semanticLabel = null,
       _recipe = emphasis == CatchBadgeEmphasis.soft
           ? _CatchBadgeRecipe.ticketSoft
           : _CatchBadgeRecipe.ticketStrong;

  /// Compact optional-field annotation with the field's validation feedback.
  const CatchBadge.optional({
    super.key,
    required this.label,
    bool hasError = false,
  }) : tone = hasError ? CatchBadgeTone.danger : CatchBadgeTone.neutral,
       size = CatchBadgeSize.sm,
       icon = null,
       accentColor = null,
       backgroundColor = null,
       foregroundColor = null,
       borderColor = null,
       _functional = false,
       emphasis = CatchBadgeEmphasis.soft,
       format = null,
       dot = false,
       semanticLabel = null,
       _recipe = _CatchBadgeRecipe.optional;

  final String label;
  final CatchBadgeTone tone;
  final CatchBadgeSize size;
  final IconData? icon;
  final CatchBadgeEmphasis emphasis;

  /// The event colour that fills the badge; wins over [tone].
  final CatchFormat? format;

  /// A leading dot in the label colour: Live, Connected, Taking answers.
  final bool dot;

  /// Read aloud in place of [label]; the default constructor only.
  final String? semanticLabel;
  final Color? accentColor;
  final Color? backgroundColor;
  final Color? foregroundColor;
  final Color? borderColor;
  final bool _functional;
  final _CatchBadgeRecipe _recipe;

  @override
  Widget build(BuildContext context) {
    final palette = _BadgePalette.from(
      tone,
      CatchTokens.of(context),
      recipe: _recipe,
      accentColor: accentColor,
      emphasis: emphasis,
      format: format,
    );
    final metrics = _BadgeMetrics.from(
      size,
      functional: _functional,
      recipe: _recipe,
    );
    final displayLabel = _functional ? label.toUpperCase() : label;
    final foreground = foregroundColor ?? palette.foreground;
    final outline =
        _recipe == _CatchBadgeRecipe.standard &&
        emphasis == CatchBadgeEmphasis.outline;

    final badge = LayoutBuilder(
      builder: (context, constraints) {
        final labelWidget = Text(
          displayLabel,
          maxLines: metrics.singleLine ? 1 : null,
          overflow: metrics.singleLine
              ? TextOverflow.ellipsis
              : TextOverflow.visible,
          style: metrics.textStyle(context, foreground),
        );
        final content = Padding(
          padding: metrics.padding,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: metrics.centerContent
                ? MainAxisAlignment.center
                : MainAxisAlignment.start,
            children: [
              if (_recipe == _CatchBadgeRecipe.live) ...[
                CatchStatusIndicator(color: foreground, size: metrics.dotSize),
                SizedBox(width: metrics.gap),
              ] else if (dot) ...[
                SizedBox.square(
                  dimension: metrics.dotSize,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: foreground,
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
                SizedBox(width: metrics.gap),
              ],
              if (icon != null) ...[
                Icon(icon, size: metrics.iconSize, color: foreground),
                SizedBox(width: metrics.gap),
              ],
              if (constraints.hasBoundedWidth)
                Flexible(child: labelWidget)
              else
                labelWidget,
            ],
          ),
        );
        final decoration = BoxDecoration(
          color: backgroundColor ?? palette.background,
          borderRadius: BorderRadius.circular(metrics.radius),
          border: metrics.bordered
              ? Border.all(color: borderColor ?? palette.border)
              : null,
        );
        final ticket =
            _recipe == _CatchBadgeRecipe.ticketSoft ||
            _recipe == _CatchBadgeRecipe.ticketStrong;
        if (outline) {
          return ConstrainedBox(
            constraints: BoxConstraints(minHeight: metrics.minHeight),
            child: CustomPaint(
              foregroundPainter: CatchDashedOutlinePainter(
                color: CatchTokens.of(context).ink3,
                radius: BorderRadius.circular(metrics.radius),
              ),
              child: content,
            ),
          );
        }
        return ConstrainedBox(
          constraints: BoxConstraints(minHeight: metrics.minHeight),
          child: ticket
              ? AnimatedContainer(
                  duration:
                      MediaQuery.maybeOf(context)?.disableAnimations == true
                      ? Duration.zero
                      : CatchMotion.fast,
                  curve: CatchMotion.standardCurve,
                  decoration: decoration,
                  child: content,
                )
              : DecoratedBox(decoration: decoration, child: content),
        );
      },
    );
    final semanticLabel = this.semanticLabel;
    if (semanticLabel == null) return badge;
    return Semantics(
      container: true,
      label: semanticLabel,
      excludeSemantics: true,
      child: badge,
    );
  }
}

class _BadgeMetrics {
  const _BadgeMetrics({
    required this.padding,
    required this.minHeight,
    required this.gap,
    required this.iconSize,
    required this.dotSize,
    required this.centerContent,
    required this.textStyle,
    this.radius = CatchRadius.pill,
    this.bordered = true,
    this.singleLine = true,
  });

  final EdgeInsetsGeometry padding;
  final double minHeight;
  final double gap;
  final double iconSize;
  final double dotSize;
  final bool centerContent;
  final double radius;
  final bool bordered;
  final bool singleLine;
  final TextStyle Function(BuildContext context, Color color) textStyle;

  static _BadgeMetrics from(
    CatchBadgeSize size, {
    required bool functional,
    required _CatchBadgeRecipe recipe,
  }) {
    if (recipe == _CatchBadgeRecipe.ticketSoft ||
        recipe == _CatchBadgeRecipe.ticketStrong) {
      return _BadgeMetrics(
        padding: EdgeInsets.symmetric(
          horizontal: recipe == _CatchBadgeRecipe.ticketStrong
              ? CatchSpacing.s3
              : CatchSpacing.s2,
          vertical: CatchSpacing.s1,
        ),
        minHeight: 0,
        gap: 0,
        iconSize: 0,
        dotSize: 0,
        centerContent: false,
        bordered: false,
        textStyle: (context, color) =>
            CatchTextStyles.monoLabel(context, color: color),
      );
    }
    if (recipe == _CatchBadgeRecipe.optional) {
      return _BadgeMetrics(
        padding: const EdgeInsets.symmetric(
          horizontal: CatchSpacing.micro6,
          vertical: CatchSpacing.micro2,
        ),
        minHeight: 0,
        gap: 0,
        iconSize: 0,
        dotSize: 0,
        centerContent: false,
        radius: CatchRadius.sm,
        bordered: false,
        singleLine: false,
        textStyle: (context, color) => CatchTextStyles.supporting(
          context,
          color: color,
        ).copyWith(fontWeight: FontWeight.w600),
      );
    }
    if (recipe == _CatchBadgeRecipe.status) {
      return _BadgeMetrics(
        radius: CatchRadius.sm,
        bordered: false,
        singleLine: false,
        padding: const EdgeInsets.symmetric(
          horizontal: CatchRecordTokens.statusHorizontalPadding,
          vertical: CatchRecordTokens.statusVerticalPadding,
        ),
        minHeight: 0,
        gap: CatchSpacing.s1,
        iconSize: CatchIconSize.sm,
        dotSize: CatchSpacing.micro6,
        centerContent: false,
        textStyle: (context, color) =>
            CatchTextStyles.statusLabel(context, color: color),
      );
    }
    if (recipe == _CatchBadgeRecipe.onDark) {
      return _BadgeMetrics(
        padding: CatchInsets.compactControlContent,
        minHeight: 0,
        gap: CatchSpacing.s1,
        iconSize: CatchIconSize.sm,
        dotSize: CatchSpacing.micro6,
        centerContent: false,
        textStyle: functional
            ? (context, color) => CatchTextStyles.kicker(context, color: color)
            : (context, color) => CatchTextStyles.titleS(context, color: color),
      );
    }
    if (recipe == _CatchBadgeRecipe.privacy) {
      return _BadgeMetrics(
        padding: const EdgeInsets.symmetric(
          horizontal: CatchSpacing.micro10,
          vertical: CatchSpacing.s1,
        ),
        minHeight: 0,
        gap: CatchSpacing.s1,
        iconSize: CatchIconSize.micro,
        dotSize: CatchSpacing.micro6,
        centerContent: false,
        textStyle: (context, color) =>
            CatchTextStyles.badgeCaps(context, color: color),
      );
    }
    return switch (size) {
      CatchBadgeSize.sm => _BadgeMetrics(
        padding: const EdgeInsets.symmetric(
          horizontal: CatchSpacing.micro10,
          vertical: CatchSpacing.s1,
        ),
        minHeight: 0,
        gap: CatchSpacing.s1,
        iconSize: CatchIconSize.badge,
        dotSize: CatchSpacing.micro6,
        centerContent: false,
        textStyle: functional
            ? (context, color) =>
                  CatchTextStyles.badgeCaps(context, color: color)
            : (context, color) =>
                  CatchTextStyles.statusLabel(context, color: color),
      ),
      CatchBadgeSize.md => _BadgeMetrics(
        padding: const EdgeInsets.symmetric(
          horizontal: CatchSpacing.s3,
          vertical: CatchLayout.badgeMdVerticalPadding,
        ),
        minHeight: 0,
        gap: CatchSpacing.s1,
        iconSize: CatchIconSize.sm,
        dotSize: CatchLayout.badgeMdDotExtent,
        centerContent: false,
        textStyle: functional
            ? (context, color) => CatchTextStyles.kicker(context, color: color)
            : (context, color) => CatchTextStyles.titleS(context, color: color),
      ),
      CatchBadgeSize.action => _BadgeMetrics(
        padding: const EdgeInsets.symmetric(horizontal: CatchSpacing.micro14),
        minHeight: CatchLayout.badgeActionHeight,
        gap: CatchSpacing.s1,
        iconSize: CatchLayout.badgeActionIconSize,
        dotSize: CatchSpacing.micro6,
        centerContent: true,
        textStyle: functional
            ? (context, color) => CatchTextStyles.kicker(context, color: color)
            : (context, color) =>
                  CatchTextStyles.buttonSm(context, color: color),
      ),
    };
  }
}

class _BadgePalette {
  const _BadgePalette({
    required this.background,
    required this.foreground,
    required this.border,
  });

  final Color background;
  final Color foreground;
  final Color border;

  // Premultiplied sRGB mix, matching CSS color-mix even for alpha pigments.
  static Color _pigmentInk(Color pigment, CatchTokens t) => Color.alphaBlend(
    t.ink.withValues(alpha: GeneratedCatchOpacityTokens.badgePigmentInk),
    pigment,
  );

  /// The system's soft status pair: a pale tint under its deep ink (D22).
  static _BadgePalette? _tinted(CatchBadgeTone tone, CatchTokens t) =>
      switch (tone) {
        CatchBadgeTone.success => _BadgePalette(
          background: t.tintMint,
          foreground: t.deepMint,
          border: Colors.transparent,
        ),
        CatchBadgeTone.warning => _BadgePalette(
          background: t.tintYellow,
          foreground: t.deepYellow,
          border: Colors.transparent,
        ),
        CatchBadgeTone.danger => _BadgePalette(
          background: t.tintCoral,
          foreground: t.deepCoral,
          border: Colors.transparent,
        ),
        CatchBadgeTone.gold => _BadgePalette(
          background: t.tintYellow,
          foreground: t.deepYellow,
          border: Colors.transparent,
        ),
        CatchBadgeTone.affinity || CatchBadgeTone.social => _BadgePalette(
          background: t.tintPink,
          foreground: t.deepPink,
          border: Colors.transparent,
        ),
        CatchBadgeTone.info => _BadgePalette(
          background: t.tintIndigo,
          foreground: t.deepIndigo,
          border: Colors.transparent,
        ),
        CatchBadgeTone.neutral || CatchBadgeTone.brand => null,
      };

  static _BadgePalette from(
    CatchBadgeTone tone,
    CatchTokens t, {
    required _CatchBadgeRecipe recipe,
    Color? accentColor,
    CatchBadgeEmphasis emphasis = CatchBadgeEmphasis.soft,
    CatchFormat? format,
  }) {
    if (recipe == _CatchBadgeRecipe.ticketSoft ||
        recipe == _CatchBadgeRecipe.ticketStrong) {
      final strong = recipe == _CatchBadgeRecipe.ticketStrong;
      return _BadgePalette(
        background: strong
            ? t.darkPillFill
            : accentColor!.withValues(
                alpha: accentColor.a * CatchOpacity.subtleFill,
              ),
        foreground: strong ? t.darkPillInk : _pigmentInk(accentColor!, t),
        border: Colors.transparent,
      );
    }
    if (recipe == _CatchBadgeRecipe.optional) {
      final error = tone == CatchBadgeTone.danger;
      return _BadgePalette(
        background: error ? t.tintCoral : t.raised,
        foreground: error ? t.deepCoral : t.ink2,
        border: Colors.transparent,
      );
    }
    if (recipe == _CatchBadgeRecipe.status) {
      final tinted = _tinted(tone, t);
      if (tinted != null) return tinted;
      final color = tone == CatchBadgeTone.brand ? t.primary : t.ink2;
      return _BadgePalette(
        background: color.withValues(alpha: CatchOpacity.subtleFill),
        foreground: color,
        border: Colors.transparent,
      );
    }
    if (recipe == _CatchBadgeRecipe.onDark) {
      return _BadgePalette(
        background: CatchTokens.editorialWhite.withValues(
          alpha: CatchOpacity.badgeOnDarkFill,
        ),
        foreground: CatchTokens.editorialWhite,
        border: CatchTokens.editorialWhite.withValues(
          alpha: CatchOpacity.badgeOnDarkBorder,
        ),
      );
    }
    if (recipe == _CatchBadgeRecipe.privacy) {
      return _BadgePalette(
        background: Colors.transparent,
        foreground: t.ink2,
        border: t.line2,
      );
    }
    if (recipe == _CatchBadgeRecipe.solid) {
      return _BadgePalette(
        background: t.ink,
        foreground: t.surface,
        border: Colors.transparent,
      );
    }
    if (recipe == _CatchBadgeRecipe.live) {
      return _BadgePalette(
        background: t.primary,
        foreground: t.primaryInk,
        border: Colors.transparent,
      );
    }
    if (emphasis == CatchBadgeEmphasis.outline) {
      // The system's waiting badge: no fill, ink2, under a dashed ink3 edge.
      return _BadgePalette(
        background: Colors.transparent,
        foreground: t.ink2,
        border: Colors.transparent,
      );
    }
    if (format != null) {
      return _BadgePalette(
        background: format.accent,
        foreground: format.ink,
        border: Colors.transparent,
      );
    }
    if (emphasis != CatchBadgeEmphasis.soft) {
      // The system's solid badge: the tone at full strength, ink on colour.
      final fill = switch (tone) {
        CatchBadgeTone.neutral || CatchBadgeTone.brand => null,
        CatchBadgeTone.success => t.formatCourts,
        CatchBadgeTone.warning || CatchBadgeTone.gold => t.formatGames,
        CatchBadgeTone.danger => t.formatRun,
        CatchBadgeTone.info => t.indigo,
        CatchBadgeTone.social || CatchBadgeTone.affinity => t.formatDinner,
      };
      return _BadgePalette(
        background: fill ?? t.primary,
        foreground: fill == null ? t.primaryInk : CatchTokens.editorialBlack,
        border: Colors.transparent,
      );
    }
    if (accentColor != null) {
      return _BadgePalette(
        background: accentColor.withValues(alpha: CatchOpacity.subtleFill),
        foreground: accentColor,
        border: accentColor.withValues(alpha: CatchOpacity.subtleBorder),
      );
    }
    return switch (tone) {
      CatchBadgeTone.neutral => _BadgePalette(
        background: t.raised,
        foreground: t.ink2,
        border: t.line2,
      ),
      CatchBadgeTone.brand => _BadgePalette(
        background: t.primarySoft,
        foreground: t.primary,
        border: Colors.transparent,
      ),
      CatchBadgeTone.gold => _BadgePalette(
        background: t.tintYellow,
        foreground: t.deepYellow,
        border: t.deepYellow.withValues(alpha: CatchOpacity.subtleBorder),
      ),
      CatchBadgeTone.success ||
      CatchBadgeTone.warning ||
      CatchBadgeTone.danger ||
      CatchBadgeTone.affinity ||
      CatchBadgeTone.info ||
      CatchBadgeTone.social => _tinted(tone, t)!,
    };
  }
}
