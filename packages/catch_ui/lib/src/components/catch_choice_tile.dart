import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_contract_field_constraints.dart';
import 'package:catch_ui/src/foundations/catch_icons.dart';
import 'package:catch_ui/src/foundations/catch_root.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:catch_ui/src/primitives/catch_dashed_outline_painter.dart';
import 'package:catch_ui/src/primitives/catch_legacy_surface.dart';
import 'package:catch_ui/src/primitives/catch_row_press_surface.dart';
import 'package:catch_ui/src/primitives/catch_text.dart';
import 'package:catch_ui/src/primitives/catch_text_variant.dart';
import 'package:flutter/material.dart';

/// The system ChoiceCard layouts. row: full width with a radio at the end.
/// tile: a card in a grid with a tick when selected. day: a weekday over its
/// date in a strip. add: dashed, to add one more (a photo, a step).
enum CatchChoiceTileVariant { row, tile, day, add }

/// How a system card stands out at rest. [attention] draws the games yellow
/// ring (this one needs the host); [vacant] a dashed edge for an empty slot
/// that can be taken (a free room).
enum CatchChoiceTileEmphasis { regular, attention, vacant }

/// One mutually exclusive choice with optional explanatory copy.
///
/// The whole tile is one checked target, including its subtitle. The owning
/// ChoiceInput supplies group selection; a null action disables this item.
///
/// With a [variant] it is the system ChoiceCard: an outlined card whose
/// selection takes an ink outline, or the [format] colour when one is given;
/// a selected day fills with ink. An add card is a dashed button and has no
/// checked state. Without a [variant] the tile keeps its leading radio, as
/// before. [emphasis] marks a system card that needs the host or is vacant;
/// the selected outline and the focus ring still win.
class CatchChoiceTile extends StatefulWidget {
  const CatchChoiceTile({
    super.key,
    required this.title,
    this.contract,
    this.contractValue,
    this.contractExemption,
    this.subtitle,
    this.selected = false,
    this.onTap,
    this.variant,
    this.format,
    this.icon,
    this.meta,
    this.emphasis = CatchChoiceTileEmphasis.regular,
  });

  final String title;
  final CatchContractFieldConstraints? contract;
  final String? contractValue;
  final String? contractExemption;
  final String? subtitle;
  final bool selected;
  final VoidCallback? onTap;

  /// Null keeps the leading-radio tile; a variant selects the system card.
  final CatchChoiceTileVariant? variant;

  /// Fills a selected card with this event colour instead of an ink outline.
  final CatchFormat? format;
  final IconData? icon;

  /// A small mark, such as "4 of 4": at the end of a row, in a tile's corner.
  final String? meta;

  /// A system card only: [CatchChoiceTileEmphasis.attention] or
  /// [CatchChoiceTileEmphasis.vacant] at rest.
  final CatchChoiceTileEmphasis emphasis;

  @override
  State<CatchChoiceTile> createState() => _CatchChoiceTileState();
}

class _CatchChoiceTileState extends State<CatchChoiceTile> {
  bool _focused = false;

  @override
  void didUpdateWidget(CatchChoiceTile oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.onTap == null) _focused = false;
  }

  @override
  Widget build(BuildContext context) {
    final allowedContractValues = widget.contract?.enumValues;
    assert(
      widget.contract == null ||
          widget.contractValue == null ||
          allowedContractValues == null ||
          allowedContractValues.contains(widget.contractValue),
      'CatchChoiceTile value must be allowed by its contract.',
    );
    final t = CatchTokens.of(context);
    final variant = widget.variant;
    if (variant != null) return _system(context, t, variant);

    final surface = CatchLegacySurface(
      onTap: widget.onTap,
      onFocusChange: (focused) {
        if (_focused != focused) setState(() => _focused = focused);
      },
      tone: CatchSurfaceTone.transparent,
      backgroundColor: widget.selected
          ? Color.alphaBlend(
              t.ink.withValues(alpha: CatchOpacity.controlOverlayHover),
              t.surface,
            )
          : t.surface,
      borderSpec: _focused
          ? CatchBorder.resolve(t, CatchBorderRole.focus)
          : widget.selected
          ? CatchBorder.resolve(t, CatchBorderRole.selected)
          : CatchBorder.interactive(t, CatchInteractiveBorderState.resting),
      radius: CatchRadius.md,
      padding: CatchInsets.tileContentCompact,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: CatchStroke.hairline),
            child: Icon(
              widget.selected ? CatchIcons.success : CatchIcons.unselected,
              size: CatchIconSize.lg,
              color: widget.selected ? t.ink : t.ink3,
            ),
          ),
          const SizedBox(width: CatchSpacing.s3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.title,
                  style: CatchTextStyles.titleS(
                    context,
                    color: CatchTokens.of(context).ink,
                  ),
                ),
                if (widget.subtitle != null && widget.subtitle!.isNotEmpty) ...[
                  const SizedBox(height: CatchSpacing.micro3),
                  Text(
                    widget.subtitle!,
                    style: CatchTextStyles.supporting(context),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
    return Semantics(
      container: true,
      excludeSemantics: true,
      button: true,
      checked: widget.selected,
      inMutuallyExclusiveGroup: true,
      enabled: widget.onTap != null,
      label: [
        widget.title,
        if (widget.subtitle?.isNotEmpty == true) widget.subtitle!,
      ].join('\n'),
      onTap: widget.onTap,
      child: surface,
    );
  }

  Widget _system(
    BuildContext context,
    CatchTokens t,
    CatchChoiceTileVariant variant,
  ) {
    final ground = CatchRootScope.groundOf(context);
    final selected = widget.selected && variant != CatchChoiceTileVariant.add;
    final format = widget.format;
    final formatFill = selected && format != null;
    final dayFill = selected && variant == CatchChoiceTileVariant.day;
    final onTile = ground == CatchGround.tile || ground == CatchGround.nested;
    final Color? fill = formatFill
        ? format.accent
        : dayFill
        ? t.primary
        : onTile
        ? t.nested
        : ground.isNight
        ? t.tile
        : selected
        ? t.tile
        : null;
    final foreground = formatFill
        ? format.ink
        : dayFill
        ? t.onPrimary
        : variant == CatchChoiceTileVariant.add
        ? t.ink2
        : t.ink;
    final radius = BorderRadius.circular(
      variant == CatchChoiceTileVariant.day ? CatchRadius.sm : CatchRadius.md,
    );
    final BoxBorder? border = formatFill || dayFill
        ? null
        : _focused
        ? Border.all(color: t.focus, width: CatchStroke.focus)
        : selected
        ? Border.all(color: t.ink, width: CatchStroke.selected)
        : widget.emphasis == CatchChoiceTileEmphasis.attention
        ? Border.all(color: t.formatGames, width: CatchStroke.selected)
        : variant == CatchChoiceTileVariant.add ||
              widget.emphasis == CatchChoiceTileEmphasis.vacant ||
              onTile
        ? null
        : ground.isNight
        ? Border.all(color: t.line)
        : Border.all(color: t.controlLine, width: CatchStroke.control);
    final title = widget.title;
    final subtitle = widget.subtitle;
    final hasSubtitle = subtitle != null && subtitle.isNotEmpty;
    final meta = widget.meta;
    final icon = widget.icon;
    final copy = Column(
      crossAxisAlignment: variant == CatchChoiceTileVariant.day
          ? CrossAxisAlignment.center
          : CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      spacing: variant == CatchChoiceTileVariant.day ? 0 : CatchSpacing.micro2,
      children: variant == CatchChoiceTileVariant.day
          ? [
              // The rail sets a day tile's width, so a weekday or date too
              // wide at a large text scale shrinks to fit on one line
              // instead of breaking mid-word; at normal size nothing changes.
              FittedBox(
                fit: BoxFit.scaleDown,
                child: CatchText(
                  title,
                  variant: CatchTextVariant.labelBadge,
                  maxLines: 1,
                ),
              ),
              if (hasSubtitle)
                FittedBox(
                  fit: BoxFit.scaleDown,
                  child: CatchText(
                    subtitle,
                    variant: CatchTextVariant.displayXs,
                    numeric: true,
                    maxLines: 1,
                  ),
                ),
            ]
          : [
              CatchText(title, variant: CatchTextVariant.titleRow),
              if (hasSubtitle)
                Opacity(
                  opacity: _secondaryOpacity,
                  child: CatchText(
                    subtitle,
                    variant: CatchTextVariant.bodySmall,
                  ),
                ),
            ],
    );
    final metaText = meta == null
        ? null
        : Opacity(
            opacity: _secondaryOpacity,
            child: CatchText(meta, variant: CatchTextVariant.labelAction),
          );
    final Widget content = switch (variant) {
      CatchChoiceTileVariant.row => ConstrainedBox(
        constraints: const BoxConstraints(minHeight: CatchSpacing.s16),
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: CatchSpacing.s4,
            vertical: CatchSpacing.s3,
          ),
          child: Row(
            spacing: CatchSpacing.s3,
            children: [
              if (icon != null) Icon(icon, size: CatchIconSize.control),
              Expanded(child: copy),
              ?metaText,
              _RadioMark(selected: selected, t: t),
            ],
          ),
        ),
      ),
      CatchChoiceTileVariant.tile => ConstrainedBox(
        constraints: const BoxConstraints(minHeight: _tileMinHeight),
        child: Padding(
          padding: const EdgeInsets.all(CatchSpacing.micro14),
          child: Stack(
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                spacing: CatchSpacing.s2,
                children: [
                  if (icon != null) Icon(icon, size: CatchIconSize.control),
                  if (metaText != null)
                    Align(
                      alignment: AlignmentDirectional.centerEnd,
                      child: metaText,
                    ),
                  copy,
                ],
              ),
              if (selected)
                const PositionedDirectional(
                  end: -CatchSpacing.s1,
                  bottom: -CatchSpacing.s1,
                  child: _Tick(),
                ),
            ],
          ),
        ),
      ),
      // A minimum, not a fixed height: large text grows the day tile.
      CatchChoiceTileVariant.day => ConstrainedBox(
        constraints: const BoxConstraints(minHeight: CatchSpacing.s16),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: CatchSpacing.micro6),
          child: Center(child: copy),
        ),
      ),
      CatchChoiceTileVariant.add => ConstrainedBox(
        constraints: const BoxConstraints(minHeight: _tileMinHeight),
        child: Padding(
          padding: const EdgeInsets.all(CatchSpacing.micro14),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            spacing: CatchSpacing.s1,
            children: [
              Icon(icon ?? CatchIcons.add, size: CatchIconSize.lg),
              CatchText(
                title,
                variant: CatchTextVariant.labelAction,
                align: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    };
    Widget card = DecoratedBox(
      decoration: BoxDecoration(
        color: fill,
        borderRadius: radius,
        border: border,
      ),
      child: DefaultTextStyle.merge(
        style: TextStyle(color: foreground),
        child: IconTheme.merge(
          data: IconThemeData(color: foreground),
          child: content,
        ),
      ),
    );
    final dashed =
        variant == CatchChoiceTileVariant.add ||
        (widget.emphasis == CatchChoiceTileEmphasis.vacant &&
            border == null &&
            !formatFill &&
            !dayFill);
    if (dashed) {
      card = CustomPaint(
        foregroundPainter: CatchDashedOutlinePainter(
          color: t.controlLine,
          radius: radius,
        ),
        child: card,
      );
    }
    final onTap = widget.onTap;
    return Semantics(
      container: true,
      excludeSemantics: true,
      button: true,
      checked: variant == CatchChoiceTileVariant.add ? null : widget.selected,
      inMutuallyExclusiveGroup: variant == CatchChoiceTileVariant.add
          ? null
          : true,
      enabled: onTap != null,
      label: [title, if (hasSubtitle) subtitle, ?meta].join('\n'),
      onTap: onTap,
      child: Opacity(
        opacity: onTap == null ? CatchOpacity.disabledControl : 1,
        child: Focus(
          canRequestFocus: onTap != null,
          onFocusChange: (focused) {
            if (_focused != focused) setState(() => _focused = focused);
          },
          child: ClipRRect(
            borderRadius: radius,
            child: CatchRowPressSurface(
              onTap: onTap,
              semanticButton: false,
              child: card,
            ),
          ),
        ),
      ),
    );
  }

  /// Subtitles, day names and meta at 78% of the card's ink.
  static const double _secondaryOpacity = 0.78;

  static const double _tileMinHeight = CatchSpacing.s16 + CatchSpacing.s3;
}

/// The radio at the end of a row card: a hollow ring, or an ink ring 7 px
/// thick once selected.
class _RadioMark extends StatelessWidget {
  const _RadioMark({required this.selected, required this.t});

  final bool selected;
  final CatchTokens t;

  @override
  Widget build(BuildContext context) => SizedBox.square(
    dimension: CatchIconSize.row,
    child: DecoratedBox(
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: t.nested,
        border: selected
            ? Border.all(
                color: t.ink,
                width: CatchSpacing.micro6 + CatchStroke.hairline,
              )
            : Border.all(color: t.fieldLine, width: CatchStroke.control),
      ),
    ),
  );
}

/// The ink tick in a selected tile's corner.
class _Tick extends StatelessWidget {
  const _Tick();

  @override
  Widget build(BuildContext context) => SizedBox.square(
    dimension: CatchIconSize.row,
    child: DecoratedBox(
      decoration: const BoxDecoration(
        shape: BoxShape.circle,
        color: CatchTokens.editorialBlack,
      ),
      child: Icon(
        CatchIcons.check,
        size: CatchIconSize.xs,
        color: CatchTokens.editorialWhite,
      ),
    ),
  );
}
