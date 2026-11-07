import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_chip_data.dart';
import 'package:catch_ui/src/components/catch_chip_emphasis.dart';
import 'package:catch_ui/src/components/catch_chip_mode.dart';
import 'package:catch_ui/src/components/catch_contract_field_constraints.dart';
import 'package:catch_ui/src/foundations/catch_icons.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:catch_ui/src/primitives/catch_text_variant.dart';
import 'package:flutter/material.dart';

enum _CatchChipVariant {
  tag,
  selectable,
  choice,
  activity,
  removable,
  link,
  filter,
}

/// A choice chip's height: md 38 by default, sm 32 with 13 px type.
enum CatchChipSize { md, sm }

/// Canonical compact-label primitive for facts, choices, activities, and
/// removable values.
///
/// Choose the constructor that matches the chip's interaction contract:
///
/// - [CatchChip.tag] is passive metadata.
/// - [CatchChip.link] goes somewhere: a saved group, with its count.
/// - [CatchChip.filter] is a plain action chip with no selected state, such
///   as "Add a tag". The system toggling filter chip is [CatchChip.choice]
///   with [CatchChipMode.multiple].
/// - [CatchChip.selectable] is a parent-owned independent binary choice or one
///   member of a multi-select set. Scalar scope, lifecycle, and mode rows use
///   `CatchChoiceInput` or `CatchSelectionMenu.control` instead.
/// - [CatchChip.choice] is a checked member of a form or disclosure input.
/// - [CatchChip.activity] renders caller-resolved text, glyph, and pigments.
/// - [CatchChip.removable] exposes one removal action across the whole chip.
class CatchChip extends StatefulWidget {
  /// A [dot] puts an event format colour before the label; [size] sm is the
  /// 32 px chip.
  const CatchChip.tag({
    Key? key,
    required String label,
    Widget? leading,
    Color? tintColor,
    Color? inkColor,
    String? semanticsLabel,
    CatchChipSize size = CatchChipSize.md,
    CatchFormat? dot,
  }) : this._(
         key: key,
         variant: _CatchChipVariant.tag,
         label: label,
         leading: leading,
         tintColor: tintColor,
         inkColor: inkColor,
         semanticsLabel: semanticsLabel,
         size: size,
         dot: dot,
       );

  /// The system Chip with `kind="link"`: it goes somewhere when pressed (a
  /// saved group), with an optional [leading] icon and a muted [count].
  const CatchChip.link({
    Key? key,
    required String label,
    required VoidCallback? onPressed,
    Widget? leading,
    int? count,
    CatchChipSize size = CatchChipSize.md,
    String? semanticsLabel,
  }) : this._(
         key: key,
         variant: _CatchChipVariant.link,
         label: label,
         leading: leading,
         onTap: onPressed,
         enabled: onPressed != null,
         count: count,
         size: size,
         semanticsLabel: semanticsLabel,
       );

  /// A plain action chip with no selected state: "Add a tag", "Short answer".
  const CatchChip.filter({
    Key? key,
    required String label,
    required VoidCallback? onPressed,
    Widget? leading,
    CatchChipSize size = CatchChipSize.md,
    String? semanticsLabel,
  }) : this._(
         key: key,
         variant: _CatchChipVariant.filter,
         label: label,
         leading: leading,
         onTap: onPressed,
         enabled: onPressed != null,
         size: size,
         semanticsLabel: semanticsLabel,
       );

  const CatchChip.selectable({
    Key? key,
    required String label,
    required bool selected,
    required ValueChanged<bool> onChanged,
    CatchContractFieldConstraints? contract,
    String? contractValue,
    String? contractExemption,
    bool enabled = true,
    Widget? leading,
    Color? accent,
    String? semanticsLabel,
  }) : this._(
         key: key,
         variant: _CatchChipVariant.selectable,
         label: label,
         leading: leading,
         selected: selected,
         onChanged: onChanged,
         contract: contract,
         contractValue: contractValue,
         contractExemption: contractExemption,
         enabled: enabled,
         accent: accent,
         semanticsLabel: semanticsLabel,
       );

  /// One checked choice in a caller-owned single or multiple selection input.
  /// A null action disables the choice without losing its checked semantics.
  ///
  /// The system Chip with `kind="choice"`: a [dot] puts an event format's
  /// colour before the label, and [colourWhenSelected] fills a selected chip
  /// with that colour instead of ink. [size] sm is the 32 px chip. A [count]
  /// follows the label, muted; [leading] goes before it when there is no dot.
  const CatchChip.choice({
    Key? key,
    required String label,
    required bool selected,
    required CatchChipMode mode,
    required VoidCallback? onPressed,
    Color? accent,
    String? semanticsLabel,
    CatchFormat? dot,
    bool colourWhenSelected = false,
    CatchChipSize size = CatchChipSize.md,
    int? count,
    Widget? leading,
  }) : this._(
         key: key,
         variant: _CatchChipVariant.choice,
         count: count,
         leading: leading,
         label: label,
         selected: selected,
         mode: mode,
         onTap: onPressed,
         enabled: onPressed != null,
         accent: accent,
         semanticsLabel: semanticsLabel,
         dot: dot,
         colourWhenSelected: colourWhenSelected,
         size: size,
       );

  const CatchChip.activity({
    Key? key,
    required CatchChipData data,
    CatchChipEmphasis emphasis = CatchChipEmphasis.soft,
    String? label,
    VoidCallback? onTap,
    bool enabled = true,
    String? semanticsLabel,
  }) : this._(
         key: key,
         variant: _CatchChipVariant.activity,
         data: data,
         emphasis: emphasis,
         label: label,
         onTap: onTap,
         enabled: enabled,
         semanticsLabel: semanticsLabel,
       );

  const CatchChip.removable({
    Key? key,
    required String label,
    required VoidCallback onRemove,
    bool enabled = true,
    Widget? leading,
    Color? tintColor,
    Color? inkColor,
    String? semanticsLabel,
  }) : this._(
         key: key,
         variant: _CatchChipVariant.removable,
         label: label,
         leading: leading,
         onRemove: onRemove,
         enabled: enabled,
         tintColor: tintColor,
         inkColor: inkColor,
         semanticsLabel: semanticsLabel,
       );

  const CatchChip._({
    super.key,
    required this._variant,
    this._label,
    this.leading,
    this._selected = false,
    this._enabled = true,
    this._accent,
    this._tintColor,
    this._inkColor,
    this._data,
    this._emphasis = CatchChipEmphasis.soft,
    this._mode,
    this._onChanged,
    this._onTap,
    this._onRemove,
    this._semanticsLabel,
    this._contract,
    this._contractValue,
    this._contractExemption,
    this._dot,
    this._colourWhenSelected = false,
    this._size = CatchChipSize.md,
    this._count,
  });

  final _CatchChipVariant _variant;
  final CatchFormat? _dot;
  final bool _colourWhenSelected;
  final CatchChipSize _size;
  final int? _count;
  final CatchChipMode? _mode;
  final String? _label;
  final Widget? leading;
  final bool _selected;
  final bool _enabled;
  final Color? _accent;
  final Color? _tintColor;
  final Color? _inkColor;
  final CatchChipData? _data;
  final CatchChipEmphasis _emphasis;
  final ValueChanged<bool>? _onChanged;
  final VoidCallback? _onTap;
  final VoidCallback? _onRemove;
  final String? _semanticsLabel;
  final CatchContractFieldConstraints? _contract;
  final String? _contractValue;
  final String? _contractExemption;

  /// Visible label for tag, selectable, and removable chips, or the optional
  /// label override for an activity chip.
  String? get label => _label;

  /// Parent-owned selection state. This is meaningful only for
  /// [CatchChip.selectable] and [CatchChip.choice].
  bool get selected => _selected;

  bool get enabled => _enabled;
  CatchChipMode? get mode => _mode;
  VoidCallback? get onPressed => _enabled ? _onTap : null;
  Color? get accent => _accent;
  Color? get tintColor => _tintColor;
  Color? get inkColor => _inkColor;
  CatchChipData? get data => _data;
  CatchChipEmphasis get emphasis => _emphasis;
  ValueChanged<bool>? get onChanged => _onChanged;
  VoidCallback? get onTap => _onTap;
  VoidCallback? get onRemove => _onRemove;
  String? get semanticsLabel => _semanticsLabel;
  String? get contractExemption => _contractExemption;

  /// The format whose colour dot leads a choice chip.
  CatchFormat? get dot => _dot;
  bool get colourWhenSelected => _colourWhenSelected;
  CatchChipSize get size => _size;

  /// The muted number after the label of a choice or link chip.
  int? get count => _count;

  @override
  State<CatchChip> createState() => _CatchChipState();
}

class _CatchChipState extends State<CatchChip> {
  static const double _pressedScale = 0.97;

  bool _pressed = false;
  bool _focused = false;
  bool _hovered = false;

  bool get _hasControlRole => switch (widget._variant) {
    _CatchChipVariant.selectable ||
    _CatchChipVariant.choice ||
    _CatchChipVariant.removable ||
    _CatchChipVariant.link ||
    _CatchChipVariant.filter => true,
    _CatchChipVariant.activity => widget._onTap != null,
    _CatchChipVariant.tag => false,
  };

  bool get _interactive => _hasControlRole && widget._enabled;

  VoidCallback? get _onPressed {
    if (!_interactive) return null;
    return switch (widget._variant) {
      _CatchChipVariant.selectable => () => widget._onChanged!(
        !widget._selected,
      ),
      _CatchChipVariant.activity ||
      _CatchChipVariant.choice ||
      _CatchChipVariant.link ||
      _CatchChipVariant.filter => widget._onTap,
      _CatchChipVariant.removable => widget._onRemove,
      _CatchChipVariant.tag => null,
    };
  }

  @override
  void didUpdateWidget(CatchChip oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!_interactive) {
      _pressed = false;
      _focused = false;
    }
  }

  void _setPressed(bool value) {
    if (!_interactive || value == _pressed) return;
    setState(() => _pressed = value);
  }

  Color _inkForFill(CatchTokens tokens, Color fill) {
    if (fill == tokens.primary) return tokens.primaryInk;
    return ThemeData.estimateBrightnessForColor(fill) == Brightness.dark
        ? CatchTokens.editorialWhite
        : CatchTokens.editorialBlack;
  }

  @override
  Widget build(BuildContext context) {
    final allowedContractValues =
        widget._contract?.enumValues ?? widget._contract?.itemEnumValues;
    assert(
      widget._contract == null ||
          widget._contractValue == null ||
          allowedContractValues == null ||
          allowedContractValues.contains(widget._contractValue),
      'CatchChip.selectable value must be allowed by its contract.',
    );
    final t = CatchTokens.of(context);
    final data = widget._data;
    final label = widget._label ?? data!.label;
    final radius = BorderRadius.circular(CatchRadius.pill);
    final duration = MediaQuery.maybeOf(context)?.disableAnimations == true
        ? Duration.zero
        : CatchMotion.fast;

    late final Color background;
    late final Color foreground;
    late final Color border;
    late final List<BoxShadow> shadow;
    late final Widget? leading;
    late final TextStyle textStyle;
    late final EdgeInsetsGeometry padding;

    final small = widget._size == CatchChipSize.sm;
    switch (widget._variant) {
      case _CatchChipVariant.tag:
      case _CatchChipVariant.removable:
      case _CatchChipVariant.link:
      case _CatchChipVariant.filter:
        final hasTint = widget._tintColor != null;
        final dot = widget._dot;
        background = widget._tintColor ?? t.surface;
        foreground = widget._inkColor ?? t.ink;
        border = hasTint ? Colors.transparent : t.line2;
        shadow = CatchElevation.none;
        leading = dot != null ? _ChipDot(color: dot.accent) : widget.leading;
        textStyle = small
            ? _smallLabel(foreground)
            : CatchTextStyles.titleS(context, color: foreground);
        padding = small
            ? _smallPadding
            : const EdgeInsets.symmetric(
                horizontal: CatchSpacing.micro14,
                vertical: CatchSpacing.s2,
              );
        break;
      case _CatchChipVariant.selectable:
      case _CatchChipVariant.choice:
        final dot = widget._dot;
        final formatFill =
            widget._colourWhenSelected && dot != null && widget._selected;
        final accent = formatFill ? dot.accent : widget._accent ?? t.primary;
        background = widget._selected ? accent : t.surface;
        foreground = formatFill
            ? dot.ink
            : widget._selected
            ? _inkForFill(t, accent)
            : t.ink;
        border = widget._selected ? Colors.transparent : t.line2;
        shadow = widget._selected
            ? CatchElevation.segmentedSelected(t)
            : CatchElevation.none;
        leading =
            widget._variant == _CatchChipVariant.choice &&
                widget._mode == CatchChipMode.multiple &&
                widget._selected
            ? Icon(
                CatchIcons.check,
                size: CatchFieldTokens.chipSelectedGlyphExtent,
              )
            : dot != null
            ? _ChipDot(
                color: dot.accent,
                ring: widget._selected && !formatFill ? foreground : null,
              )
            : widget.leading;
        textStyle = small
            ? _smallLabel(foreground)
            : CatchTextStyles.titleS(context, color: foreground);
        padding = small
            ? _smallPadding
            : const EdgeInsets.symmetric(
                horizontal: CatchSpacing.s4,
                vertical: CatchSpacing.micro10,
              );
        break;
      case _CatchChipVariant.activity:
        final solid = widget._emphasis == CatchChipEmphasis.solid;
        final dark = Theme.of(context).brightness == Brightness.dark;
        background = solid ? data!.deep : data!.soft;
        foreground = solid
            ? CatchTokens.editorialWhite
            : dark
            ? t.ink
            : data.deep;
        border = Colors.transparent;
        shadow = CatchElevation.none;
        leading = Icon(data.icon, color: !solid && dark ? data.accent : null);
        textStyle = CatchTextStyles.bodyLead(context, color: foreground);
        padding = const EdgeInsets.symmetric(
          horizontal: CatchSpacing.s4,
          vertical: CatchSpacing.micro10,
        );
        break;
    }

    final trailing = widget._variant == _CatchChipVariant.removable
        ? Icon(CatchIcons.close, color: foreground, size: CatchIconSize.sm)
        : null;
    final iconSize = widget._variant == _CatchChipVariant.activity
        ? CatchLayout.activityChipIconSize
        : CatchIconSize.sm;
    final iconGap = widget._variant == _CatchChipVariant.activity
        ? CatchLayout.activityChipIconGap
        : CatchSpacing.s2;
    final semanticBorder = _focused
        ? CatchBorder.resolve(t, CatchBorderRole.focus)
        : (widget._variant == _CatchChipVariant.selectable ||
                  widget._variant == _CatchChipVariant.choice) &&
              widget._selected
        ? CatchBorder.resolve(
            t,
            CatchBorderRole.selected,
            color: widget._colourWhenSelected
                ? widget._dot?.accent ?? widget._accent
                : widget._accent,
          )
        : _hasControlRole && border != Colors.transparent
        ? CatchBorder.interactive(
            t,
            !widget._enabled
                ? CatchInteractiveBorderState.disabled
                : _pressed
                ? CatchInteractiveBorderState.pressed
                : CatchInteractiveBorderState.resting,
          )
        : CatchBorder.resolve(t, CatchBorderRole.boundary, color: border);

    final content = Padding(
      padding: padding,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (leading != null) ...[
            IconTheme(
              data: IconThemeData(color: foreground, size: iconSize),
              child: leading,
            ),
            SizedBox(width: iconGap),
          ],
          Flexible(child: Text(label, style: textStyle)),
          if (widget._count case final count?) ...[
            const SizedBox(width: CatchSpacing.micro6),
            Opacity(
              opacity: CatchOpacity.onFillMuted,
              child: Text(
                '$count',
                style: textStyle.copyWith(
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
            ),
          ],
          if (trailing != null) ...[
            const SizedBox(width: CatchSpacing.s2),
            trailing,
          ],
        ],
      ),
    );

    final surface = AnimatedContainer(
      duration: duration,
      curve: CatchMotion.standardCurve,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: _interactive && (_pressed || _hovered)
            ? Color.alphaBlend(
                foreground.withValues(
                  alpha: _pressed
                      ? CatchOpacity.controlOverlayPressed
                      : CatchOpacity.controlOverlayHover,
                ),
                background,
              )
            : background,
        borderRadius: radius,
        boxShadow: _focused ? CatchElevation.focusRing(t) : shadow,
      ),
      foregroundDecoration: BoxDecoration(
        borderRadius: radius,
        border: semanticBorder.all,
      ),
      child: Padding(
        padding: const EdgeInsets.all(CatchStroke.hairline),
        child: content,
      ),
    );

    final chip = AnimatedScale(
      scale: _interactive && _pressed ? _pressedScale : 1,
      duration: duration,
      curve: CatchMotion.standardCurve,
      child: AnimatedOpacity(
        opacity: _hasControlRole && !widget._enabled
            ? CatchOpacity.disabledControl
            : CatchOpacity.visible,
        duration: duration,
        curve: CatchMotion.standardCurve,
        child: surface,
      ),
    );

    final defaultSemanticsLabel = widget._variant == _CatchChipVariant.removable
        ? '${MaterialLocalizations.of(context).deleteButtonTooltip}: $label'
        : label;

    return Semantics(
      container: true,
      excludeSemantics: true,
      button: _hasControlRole ? true : null,
      selected: widget._variant == _CatchChipVariant.selectable
          ? widget._selected
          : null,
      checked: widget._variant == _CatchChipVariant.choice
          ? widget._selected
          : null,
      inMutuallyExclusiveGroup: widget._variant == _CatchChipVariant.choice
          ? widget._mode == CatchChipMode.single
          : null,
      enabled: _hasControlRole ? widget._enabled : null,
      label:
          widget._semanticsLabel ??
          (widget._count == null
              ? defaultSemanticsLabel
              : '$defaultSemanticsLabel, ${widget._count}'),
      onTap: _onPressed,
      child: _hasControlRole
          ? Material(
              color: Colors.transparent,
              child: InkWell(
                excludeFromSemantics: true,
                onTap: _onPressed,
                onHover: (hovered) => setState(() => _hovered = hovered),
                onHighlightChanged: _setPressed,
                onFocusChange: (focused) {
                  if (_focused != focused) setState(() => _focused = focused);
                },
                borderRadius: radius,
                splashFactory: NoSplash.splashFactory,
                hoverColor: Colors.transparent,
                focusColor: Colors.transparent,
                highlightColor: Colors.transparent,
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    minHeight: CatchPlatformTokens.minimumInteractiveExtent,
                    minWidth: CatchPlatformTokens.minimumInteractiveExtent,
                  ),
                  child: Align(widthFactor: 1, heightFactor: 1, child: chip),
                ),
              ),
            )
          : chip,
    );
  }
}

const EdgeInsets _smallPadding = EdgeInsets.symmetric(
  horizontal: CatchSpacing.s3,
  vertical: CatchSpacing.micro6,
);

TextStyle _smallLabel(Color color) => CatchTextVariant.labelAction
    .style(CatchWindowSize.compact)
    .copyWith(color: color);

/// The 8 px format dot before the label of a chip, ringed in the ink of the
/// chip when the chip is selected in ink.
class _ChipDot extends StatelessWidget {
  const _ChipDot({required this.color, this.ring});

  final Color color;
  final Color? ring;

  @override
  Widget build(BuildContext context) {
    final ring = this.ring;
    return SizedBox.square(
      dimension: CatchSpacing.s2,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          boxShadow: ring == null
              ? null
              : [BoxShadow(color: ring, spreadRadius: CatchStroke.emphasis)],
        ),
      ),
    );
  }
}
