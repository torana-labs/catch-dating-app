import 'dart:math' as math;

import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_button_content_row.dart';
import 'package:catch_ui/src/components/catch_count_badge.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:catch_ui/src/primitives/catch_gap.dart';
import 'package:catch_ui/src/primitives/catch_loading_indicator.dart';
import 'package:catch_ui/src/primitives/catch_row_press_surface.dart';
import 'package:catch_ui/src/primitives/catch_surface.dart';
import 'package:flutter/material.dart';

enum CatchButtonVariant {
  primary,
  secondary,
  ghost,
  danger,
  dangerSecondary,
  light,
}

enum CatchButtonSize { sm, md, lg }

/// Retiring: since D20 both modes draw 4px corners; the D20 rename removes it.
enum CatchButtonMode { pill, rounded }

enum CatchButtonStatus { idle, loading }

enum CatchButtonTone { primary, neutral, danger }

/// Meaning determines footer emphasis; features do not choose its paint.
enum CatchButtonEmphasis { dismiss, alternative, commit }

/// Canonical labelled action with command, selection and floating recipes.
///
/// The default recipe owns CTA hierarchy, density, busy status and geometry.
/// Named recipes keep toolbar, current-value and counted floating behavior
/// explicit while preserving one labelled-action owner. Labels retain platform
/// text size; each recipe owns its wrapping and minimum interactive target.
class CatchButton extends StatefulWidget {
  const CatchButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.variant = CatchButtonVariant.primary,
    this.size = CatchButtonSize.md,
    this.mode = CatchButtonMode.pill,
    this.leading,
    this.status = CatchButtonStatus.idle,
    this.fullWidth = false,
    this.isInteractive = true,
    this.semanticsLabel,
    this.accentColor,
    this.backgroundColor,
    this.foregroundColor,
    this.borderColor,
  }) : _selectionTooltip = null,
       _selection = false,
       _text = false,
       tone = CatchButtonTone.primary,
       disabledForegroundColor = null,
       disabledBackgroundColor = null,
       side = null,
       shape = null,
       textStyle = null,
       leadingGap = CatchSpacing.micro6,
       focusNode = null,
       tapTargetSize = null,
       minimumSize = const Size.square(CatchSpacing.s10),
       padding = const EdgeInsets.symmetric(horizontal: CatchSpacing.s2),
       _command = false,
       trailing = null,
       _floatingIcon = null,
       value = null,
       count = null;

  /// Full-width sheet action whose hierarchy follows its declared purpose.
  const CatchButton.sheet({
    Key? key,
    required String label,
    required VoidCallback? onPressed,
    required CatchButtonEmphasis role,
    Widget? leading,
    CatchButtonStatus status = CatchButtonStatus.idle,
  }) : this(
         key: key,
         label: label,
         onPressed: onPressed,
         variant: role == CatchButtonEmphasis.commit
             ? CatchButtonVariant.primary
             : CatchButtonVariant.secondary,
         fullWidth: true,
         leading: leading,
         status: status,
       );

  /// Bounded current-value trigger with a full-value tooltip and semantics.
  const CatchButton.selection({
    super.key,
    required this.label,
    required this.onPressed,
    this.leading,
    this.semanticsLabel,
    String? tooltip,
    this.backgroundColor,
    this.foregroundColor,
    this.borderColor,
  }) : _selectionTooltip = tooltip,
       _selection = true,
       _text = false,
       tone = CatchButtonTone.primary,
       disabledForegroundColor = null,
       disabledBackgroundColor = null,
       side = null,
       shape = null,
       textStyle = null,
       leadingGap = CatchSpacing.micro6,
       focusNode = null,
       tapTargetSize = null,
       minimumSize = const Size.square(CatchSpacing.s10),
       padding = const EdgeInsets.symmetric(horizontal: CatchSpacing.s2),
       _command = false,
       trailing = null,
       _floatingIcon = null,
       value = null,
       count = null,
       variant = CatchButtonVariant.secondary,
       size = CatchButtonSize.sm,
       mode = CatchButtonMode.pill,
       status = CatchButtonStatus.idle,
       fullWidth = false,
       isInteractive = true,
       accentColor = null;

  /// Unboxed toolbar command with natural-height text and optional edge media.
  const CatchButton.command({
    super.key,
    required this.label,
    required this.onPressed,
    this.leading,
    this.trailing,
    this.semanticsLabel,
  }) : _selectionTooltip = null,
       _selection = false,
       _text = false,
       tone = CatchButtonTone.primary,
       disabledForegroundColor = null,
       disabledBackgroundColor = null,
       side = null,
       shape = null,
       textStyle = null,
       leadingGap = CatchSpacing.micro6,
       focusNode = null,
       tapTargetSize = null,
       minimumSize = const Size.square(CatchSpacing.s10),
       padding = const EdgeInsets.symmetric(horizontal: CatchSpacing.s2),
       _command = true,
       _floatingIcon = null,
       value = null,
       count = null,
       variant = CatchButtonVariant.ghost,
       size = CatchButtonSize.md,
       mode = CatchButtonMode.rounded,
       status = CatchButtonStatus.idle,
       fullWidth = false,
       isInteractive = true,
       accentColor = null,
       backgroundColor = null,
       foregroundColor = null,
       borderColor = null;

  /// Raised floating action with optional value text and a typed count badge.
  CatchButton.floating({
    super.key,
    IconData? icon,
    required this.label,
    this.value,
    int count = 0,
    required VoidCallback this.onPressed,
    this.semanticsLabel,
  }) : assert(label.trim().isNotEmpty, 'label must not be empty'),
       assert(count >= 0, 'count must not be negative'),
       assert(
         semanticsLabel == null || semanticsLabel.trim().isNotEmpty,
         'semanticsLabel must not be empty when provided',
       ),
       count = count,
       _floatingIcon = icon,
       _selectionTooltip = null,
       _selection = false,
       _text = false,
       tone = CatchButtonTone.primary,
       disabledForegroundColor = null,
       disabledBackgroundColor = null,
       side = null,
       shape = null,
       textStyle = null,
       leadingGap = CatchSpacing.micro6,
       focusNode = null,
       tapTargetSize = null,
       minimumSize = const Size.square(CatchSpacing.s10),
       padding = const EdgeInsets.symmetric(horizontal: CatchSpacing.s2),
       _command = false,
       leading = null,
       trailing = null,
       variant = CatchButtonVariant.secondary,
       size = CatchButtonSize.md,
       mode = CatchButtonMode.pill,
       status = CatchButtonStatus.idle,
       fullWidth = false,
       isInteractive = true,
       accentColor = null,
       backgroundColor = null,
       foregroundColor = null,
       borderColor = null;

  /// Inline or dialog action with native text-button feedback and focus.
  const CatchButton.text({
    super.key,
    required this.label,
    required this.onPressed,
    this.tone = CatchButtonTone.primary,
    this.foregroundColor,
    this.backgroundColor,
    this.disabledForegroundColor,
    this.disabledBackgroundColor,
    this.side,
    this.shape,
    this.textStyle,
    this.leading,
    this.leadingGap = CatchSpacing.micro6,
    this.focusNode,
    this.tapTargetSize,
    this.minimumSize = const Size.square(CatchSpacing.s10),
    this.padding = const EdgeInsets.symmetric(horizontal: CatchSpacing.s2),
  }) : _text = true,
       _selectionTooltip = null,
       _selection = false,
       _command = false,
       _floatingIcon = null,
       value = null,
       count = null,
       trailing = null,
       variant = CatchButtonVariant.ghost,
       size = CatchButtonSize.md,
       mode = CatchButtonMode.rounded,
       status = CatchButtonStatus.idle,
       fullWidth = false,
       isInteractive = true,
       semanticsLabel = null,
       accentColor = null,
       borderColor = null;

  final bool _text;
  final String? _selectionTooltip;
  final bool _selection;
  final bool _command;
  final IconData? _floatingIcon;

  /// Minimum width for a text-only standard action without breaking its label.
  /// Dialog action reflow uses the same typography and padding as this recipe.
  static double minimumLabelWidth(
    BuildContext context,
    String label, {
    CatchButtonSize size = CatchButtonSize.md,
  }) {
    final spec = _ButtonSizeSpec.from(size);
    final painter = TextPainter(
      text: TextSpan(text: label, style: spec.textStyle(context)),
      textDirection: Directionality.of(context),
      textScaler: MediaQuery.textScalerOf(context),
      locale: Localizations.maybeLocaleOf(context),
    )..layout();
    final width = painter.width.ceilToDouble() + spec.padding * 2;
    painter.dispose();
    return math.max(CatchPlatformTokens.minimumInteractiveExtent, width);
  }

  final String label;
  final VoidCallback? onPressed;
  final CatchButtonVariant variant;
  final CatchButtonSize size;
  final CatchButtonMode mode;
  final CatchButtonStatus status;
  final Widget? leading;
  final Widget? trailing;
  final bool fullWidth;
  final bool isInteractive;
  final String? semanticsLabel;

  /// Floating recipe's secondary text, preserving caller casing and wrapping.
  final String? value;

  /// Floating count; zero hides the badge, while other recipes carry no count.
  final int? count;

  final CatchButtonTone tone;
  final Color? disabledForegroundColor;
  final Color? disabledBackgroundColor;
  final BorderSide? side;
  final OutlinedBorder? shape;
  final TextStyle? textStyle;
  final double leadingGap;
  final FocusNode? focusNode;
  final MaterialTapTargetSize? tapTargetSize;
  final Size minimumSize;
  final EdgeInsetsGeometry padding;

  /// Whether this recipe is a text action suitable for a compact action row.
  bool get isTextAction => _text;

  bool get isLoading => status == CatchButtonStatus.loading;

  /// Activity pigment for a primary button, paired to white unless overridden.
  final Color? accentColor;
  final Color? backgroundColor;
  final Color? foregroundColor;
  final Color? borderColor;

  @override
  State<CatchButton> createState() => _CatchButtonState();
}

class _CatchButtonState extends State<CatchButton> {
  bool _hovered = false;
  bool _pressed = false;
  bool _focused = false;

  bool get _enabled =>
      widget.isInteractive && widget.onPressed != null && !widget.isLoading;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    if (widget._text) {
      final color =
          widget.foregroundColor ??
          switch (widget.tone) {
            CatchButtonTone.primary => t.primary,
            CatchButtonTone.neutral => t.ink2,
            CatchButtonTone.danger => t.danger,
          };
      final effectiveDisabledColor = widget.disabledForegroundColor ?? t.ink3;
      final effectiveColor = widget.onPressed == null
          ? effectiveDisabledColor
          : color;
      final effectiveTextStyle =
          widget.textStyle ?? CatchTextStyles.labelL(context);
      final labelText = Text(
        widget.label,
        textAlign: TextAlign.center,
        style: effectiveTextStyle.copyWith(color: effectiveColor),
      );

      return TextButton(
        onPressed: widget.onPressed,
        focusNode: widget.focusNode,
        style: TextButton.styleFrom(
          foregroundColor: color,
          backgroundColor: widget.backgroundColor,
          disabledForegroundColor: effectiveDisabledColor,
          disabledBackgroundColor: widget.disabledBackgroundColor,
          minimumSize: Size(
            math.max(
              widget.minimumSize.width,
              CatchPlatformTokens.minimumInteractiveExtent,
            ),
            math.max(
              widget.minimumSize.height,
              CatchPlatformTokens.minimumInteractiveExtent,
            ),
          ),
          // Compact density must not subtract pixels from the platform floor.
          visualDensity: VisualDensity.standard,
          padding: widget.padding,
          tapTargetSize: widget.tapTargetSize,
          side: widget.side,
          shape:
              widget.shape ??
              RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(CatchButtonTokens.radius),
              ),
          textStyle: effectiveTextStyle,
        ),
        child: widget.leading == null
            ? labelText
            : Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  widget.leading!,
                  SizedBox(width: widget.leadingGap),
                  Flexible(child: labelText),
                ],
              ),
      );
    }
    if (widget.count != null) {
      final icon = widget._floatingIcon;
      final label = widget.label;
      final value = widget.value;
      final count = widget.count!;
      final content = LayoutBuilder(
        builder: (context, constraints) {
          final labelText = Text(
            label,
            style: CatchTextStyles.control(context, color: t.ink),
          );
          final valueText = value == null || value.isEmpty
              ? null
              : Text(
                  value,
                  style: CatchTextStyles.control(context, color: t.ink),
                );
          return ConstrainedBox(
            constraints: BoxConstraints(
              minHeight: CatchPlatformTokens.minimumInteractiveExtent,
              minWidth: CatchPlatformTokens.minimumInteractiveExtent,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (icon != null)
                  Icon(icon, size: CatchLayout.countPillIconSize, color: t.ink),
                if (icon != null) gapW8,
                if (constraints.hasBoundedWidth)
                  Flexible(child: labelText)
                else
                  labelText,
                if (valueText != null) ...[
                  gapW6,
                  Text(
                    '·',
                    style: CatchTextStyles.buttonSm(context, color: t.ink3),
                  ),
                  gapW6,
                  if (constraints.hasBoundedWidth)
                    Flexible(child: valueText)
                  else
                    valueText,
                ],
              ],
            ),
          );
        },
      );

      final pill = CatchSurface(
        radius: CatchRadius.pill,
        emphasis: CatchSurfaceEmphasis.raised,
        backgroundColor: t.floatingPillFill,
        borderRole: _focused ? CatchBorderRole.focus : CatchBorderRole.control,
        padding: EdgeInsets.only(
          left: CatchSpacing.s4,
          right: count > 0
              ? CatchCountBadge.labelWidth(context, count) + CatchSpacing.s1
              : CatchSpacing.s4,
        ),
        onTap: widget.onPressed,
        onFocusChange: (focused) {
          if (_focused != focused) setState(() => _focused = focused);
        },
        child: content,
      );

      final countedPill = CatchCountBadge(
        count: count,
        offset: const Offset(CatchSpacing.s1, -CatchSpacing.s1),
        child: pill,
      );

      if (widget.semanticsLabel == null) return countedPill;
      return Semantics(
        container: true,
        button: true,
        enabled: true,
        label: widget.semanticsLabel,
        excludeSemantics: true,
        onTap: widget.onPressed,
        child: countedPill,
      );
    }
    if (widget._command) {
      return Semantics(
        button: true,
        enabled: _enabled,
        label: widget.semanticsLabel,
        child: CatchRowPressSurface(
          onTap: _enabled ? widget.onPressed : null,
          expandToMaxWidth: false,
          child: ConstrainedBox(
            constraints: BoxConstraints(
              minHeight: CatchPlatformTokens.minimumInteractiveExtent,
              minWidth: CatchPlatformTokens.minimumInteractiveExtent,
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: CatchSpacing.s2),
              child: IconTheme(
                data: IconThemeData(
                  size: CatchIcon.sm,
                  color: _enabled ? t.ink : t.ink3,
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (widget.leading != null) ...[
                      widget.leading!,
                      const SizedBox(width: CatchSpacing.s2),
                    ],
                    Flexible(
                      child: Text(
                        widget.label,
                        // Commands own a complete function style. Inheriting
                        // a packaged header style would namespace its system
                        // font as a nonexistent catch_ui font asset.
                        style: CatchTextStyles.control(
                          context,
                          color: _enabled ? t.ink : t.ink3,
                        ).copyWith(inherit: false),
                      ),
                    ),
                    if (widget.trailing != null) ...[
                      const SizedBox(width: CatchSpacing.s2),
                      widget.trailing!,
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      );
    }
    final spec = _ButtonSizeSpec.from(widget.size);
    final reduceMotion = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    final transitionDuration = reduceMotion
        ? CatchMotion.none
        : CatchMotion.fast;
    const radius = CatchButtonTokens.radius;
    var palette = _ButtonPalette.from(widget.variant, t);
    final accent = widget.accentColor;
    if (accent != null && widget.variant == CatchButtonVariant.primary) {
      palette = palette.copyWith(
        background: accent,
        foreground: CatchTokens.editorialWhite,
        border: Colors.transparent,
      );
    }
    palette = palette.copyWith(
      background: widget.backgroundColor,
      foreground: widget.foregroundColor,
      border: widget.borderColor,
    );
    final outlined =
        widget.variant == CatchButtonVariant.secondary ||
        widget.variant == CatchButtonVariant.dangerSecondary;
    final engaged = _enabled && (_hovered || _pressed);
    // Outlines share the control border and turn full ink while engaged.
    final border = CatchBorder.resolve(
      t,
      outlined ? CatchBorderRole.control : CatchBorderRole.boundary,
      color: outlined && engaged && widget.borderColor == null
          ? t.ink
          : palette.border,
    );
    final overlayAlpha = _pressed
        ? CatchButtonTokens.pressedAlpha
        : palette.background.a > 0
        ? CatchButtonTokens.hoverFilledAlpha
        : CatchButtonTokens.hoverOutlineAlpha;

    final buttonContent = Stack(
      alignment: Alignment.center,
      children: [
        // Feedback tints in the label colour, so it reads on every fill.
        if (engaged)
          Positioned.fill(
            child: ColoredBox(
              color: palette.foreground.withValues(alpha: overlayAlpha),
            ),
          ),
        Padding(
          padding: EdgeInsets.symmetric(
            horizontal: spec.padding,
            vertical: CatchSpacing.s2,
          ),
          child: AnimatedSwitcher(
            duration: transitionDuration,
            switchInCurve: CatchMotion.standardCurve,
            switchOutCurve: CatchMotion.standardCurve,
            child: widget.isLoading
                ? CatchLoadingIndicator.dots(color: palette.foreground)
                : CatchButtonContentRow(
                    label: widget.label,
                    color: palette.foreground,
                    leading: widget.leading,
                    gap: CatchSpacing.micro6,
                    fullWidth: widget.fullWidth,
                    allowMultiline: !widget._selection,
                    textStyle: spec.textStyle(context),
                  ),
          ),
        ),
      ],
    );

    const ringInset = -CatchButtonTokens.focusRingOutset;
    final decoratedButton = Stack(
      clipBehavior: Clip.none,
      children: [
        ConstrainedBox(
          constraints: BoxConstraints(minHeight: spec.height),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: palette.background,
              borderRadius: BorderRadius.circular(radius),
              border: border.all,
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(radius),
              child: buttonContent,
            ),
          ),
        ),
        // The focus ring sits outside the button, so focus never moves layout.
        if (_focused)
          Positioned(
            left: ringInset,
            top: ringInset,
            right: ringInset,
            bottom: ringInset,
            child: IgnorePointer(
              child: DecoratedBox(
                key: const ValueKey('catch_button.focus_ring'),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(radius - ringInset),
                  border: Border.all(
                    color: t.ink,
                    width: CatchButtonTokens.focusRingWidth,
                  ),
                ),
              ),
            ),
          ),
      ],
    );

    final child = AnimatedScale(
      scale: _enabled && _pressed && !reduceMotion
          ? CatchButtonTokens.pressedScale
          : 1,
      duration: transitionDuration,
      curve: CatchMotion.standardCurve,
      child: AnimatedOpacity(
        opacity: widget.isInteractive && !_enabled
            ? CatchButtonTokens.disabledOpacity
            : 1,
        duration: transitionDuration,
        curve: CatchMotion.standardCurve,
        child: decoratedButton,
      ),
    );

    final interactive = Semantics(
      button: widget.isInteractive,
      enabled: widget.isInteractive ? _enabled : null,
      label: widget.semanticsLabel ?? widget.label,
      child: widget.isInteractive
          ? Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: _enabled ? widget.onPressed : null,
                onHover: (hovered) => setState(() => _hovered = hovered),
                onFocusChange: (focused) => setState(() => _focused = focused),
                onHighlightChanged: (pressed) =>
                    setState(() => _pressed = pressed),
                // Feedback is painted on the visual button, not its invisible
                // target padding. There is only one gesture/focus owner.
                splashFactory: NoSplash.splashFactory,
                highlightColor: Colors.transparent,
                hoverColor: Colors.transparent,
                focusColor: Colors.transparent,
                borderRadius: BorderRadius.circular(radius),
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    minHeight: CatchPlatformTokens.minimumInteractiveExtent,
                    minWidth: CatchPlatformTokens.minimumInteractiveExtent,
                  ),
                  child: Align(
                    widthFactor: widget.fullWidth ? null : 1,
                    heightFactor: 1,
                    child: widget.fullWidth
                        ? SizedBox(width: double.infinity, child: child)
                        : child,
                  ),
                ),
              ),
            )
          : widget.fullWidth
          ? SizedBox(width: double.infinity, child: child)
          : child,
    );
    return widget._selection
        ? Tooltip(
            message: widget._selectionTooltip ?? widget.label,
            excludeFromSemantics: true,
            child: interactive,
          )
        : interactive;
  }
}

class _ButtonSizeSpec {
  const _ButtonSizeSpec({
    required this.height,
    required this.padding,
    required this.textStyle,
  });

  final double height;
  final double padding;
  final TextStyle Function(BuildContext context) textStyle;

  static _ButtonSizeSpec from(CatchButtonSize size) {
    // D20: sm draws medium and md large; the rename folds lg in, adds small.
    return switch (size) {
      CatchButtonSize.sm => const _ButtonSizeSpec(
        height: CatchButtonTokens.mediumHeight,
        padding: CatchButtonTokens.mediumPaddingX,
        textStyle: CatchTextStyles.buttonSm,
      ),
      CatchButtonSize.md => const _ButtonSizeSpec(
        height: CatchButtonTokens.largeHeight,
        padding: CatchButtonTokens.largePaddingX,
        textStyle: CatchTextStyles.buttonMd,
      ),
      CatchButtonSize.lg => const _ButtonSizeSpec(
        height: CatchLayout.buttonLgHeight,
        padding: CatchSpacing.s6,
        textStyle: CatchTextStyles.buttonLg,
      ),
    };
  }
}

class _ButtonPalette {
  const _ButtonPalette({
    required this.background,
    required this.foreground,
    required this.border,
  });

  final Color background;
  final Color foreground;
  final Color border;

  _ButtonPalette copyWith({
    Color? background,
    Color? foreground,
    Color? border,
  }) {
    return _ButtonPalette(
      background: background ?? this.background,
      foreground: foreground ?? this.foreground,
      border: border ?? this.border,
    );
  }

  static _ButtonPalette from(CatchButtonVariant variant, CatchTokens t) {
    return switch (variant) {
      CatchButtonVariant.primary => _ButtonPalette(
        background: t.primary,
        foreground: t.primaryInk,
        border: Colors.transparent,
      ),
      // D20 folds dangerSecondary in: the confirm step carries the danger.
      CatchButtonVariant.secondary ||
      CatchButtonVariant.dangerSecondary => _ButtonPalette(
        background: Colors.transparent,
        foreground: t.ink,
        border: CatchBorder.resolve(t, CatchBorderRole.control).color,
      ),
      CatchButtonVariant.ghost => _ButtonPalette(
        background: Colors.transparent,
        foreground: t.ink,
        border: Colors.transparent,
      ),
      CatchButtonVariant.danger => _ButtonPalette(
        background: t.danger,
        foreground: CatchTokens.editorialWhite,
        border: Colors.transparent,
      ),
      CatchButtonVariant.light => _ButtonPalette(
        background: CatchTokens.editorialWhite,
        foreground: CatchTokens.editorialLight.ink,
        border: Colors.transparent,
      ),
    };
  }
}
