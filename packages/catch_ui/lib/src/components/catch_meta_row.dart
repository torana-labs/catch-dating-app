import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_meta_entry.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:catch_ui/src/primitives/catch_gap.dart';
import 'package:flutter/material.dart';

enum CatchMetaRowVariant { label, entry, flow, group }

/// Compact factual metadata, from a single icon/label to a separated group.
///
/// The default recipe retains the full-width label treatment. [CatchMetaRow.entry]
/// renders a compact numeric-text entry; [CatchMetaRow.flow] separates entries
/// with dots. [CatchMetaRow.group] reserves a strong trailing value and clips the
/// flexible entry flow. These are passive information rows, without navigation.
class CatchMetaRow extends StatelessWidget {
  const CatchMetaRow({
    super.key,
    required IconData this._icon,
    required String this._label,
    this.color,
    this.labelColor,
    this.maxLines = 1,
  }) : variant = CatchMetaRowVariant.label,
       _entry = null,
       entries = const [],
       trailing = null,
       iconSize = CatchIcon.sm,
       isStrong = false;

  const CatchMetaRow.entry({
    super.key,
    required CatchMetaEntry this._entry,
    this.color,
    this.iconSize = CatchIcon.sm,
    this.maxLines = 1,
    this.isStrong = false,
  }) : variant = CatchMetaRowVariant.entry,
       _icon = null,
       _label = null,
       labelColor = null,
       entries = const [],
       trailing = null;

  const CatchMetaRow.flow({
    super.key,
    required this.entries,
    this.color,
    this.iconSize = CatchIcon.sm,
    this.maxLines = 1,
  }) : variant = CatchMetaRowVariant.flow,
       _entry = null,
       _icon = null,
       _label = null,
       labelColor = null,
       trailing = null,
       isStrong = false;

  const CatchMetaRow.group({
    super.key,
    required this.entries,
    this.trailing,
    this.color,
    this.iconSize = CatchIcon.sm,
    this.maxLines = 1,
  }) : variant = CatchMetaRowVariant.group,
       _entry = null,
       _icon = null,
       _label = null,
       labelColor = null,
       isStrong = false;

  final CatchMetaRowVariant variant;
  final IconData? _icon;
  final String? _label;
  final CatchMetaEntry? _entry;
  final List<CatchMetaEntry> entries;
  final CatchMetaEntry? trailing;
  final Color? color;
  final Color? labelColor;
  final double iconSize;
  final int maxLines;
  final bool isStrong;

  IconData? get icon => _entry?.icon ?? _icon;
  String? get label => _entry?.label ?? _label;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final inkColor = color ?? t.ink2;
    if (variant == CatchMetaRowVariant.group) {
      return Row(
        children: [
          Expanded(
            child: ClipRect(
              child: CatchMetaRow.flow(
                entries: entries,
                color: inkColor,
                iconSize: iconSize,
                maxLines: maxLines,
              ),
            ),
          ),
          if (trailing case final entry?) ...[
            gapW8,
            CatchMetaRow.entry(
              entry: entry,
              color: inkColor,
              iconSize: iconSize,
              maxLines: maxLines,
              isStrong: true,
            ),
          ],
        ],
      );
    }
    if (variant == CatchMetaRowVariant.flow) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var i = 0; i < entries.length; i++) ...[
            if (i > 0)
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: CatchSpacing.micro6,
                ),
                child: Text(
                  '·',
                  style: CatchTextStyles.numericMeta(context, color: inkColor),
                ),
              ),
            Flexible(
              child: CatchMetaRow.entry(
                entry: entries[i],
                color: inkColor,
                iconSize: iconSize,
                maxLines: maxLines,
              ),
            ),
          ],
        ],
      );
    }

    final fullWidthLabel = variant == CatchMetaRowVariant.label;
    final textColor = fullWidthLabel
        ? labelColor ?? t.ink2
        : _entry?.color ?? inkColor;
    final style = fullWidthLabel
        ? CatchTextStyles.statusLabel(context, color: textColor)
        : isStrong
        ? CatchTextStyles.numericMeta(
            context,
            color: textColor,
          ).copyWith(fontWeight: FontWeight.w700)
        : CatchTextStyles.numericMeta(context, color: textColor);
    final text = Text(
      label!,
      maxLines: maxLines,
      overflow: TextOverflow.ellipsis,
      style: style,
    );
    return Row(
      mainAxisSize: fullWidthLabel ? MainAxisSize.max : MainAxisSize.min,
      children: [
        if (icon case final glyph?) ...[
          Icon(
            glyph,
            size: iconSize,
            color: fullWidthLabel
                ? color ?? t.primary
                : _entry?.iconColor ?? inkColor,
          ),
          if (fullWidthLabel) gapW6 else gapW4,
        ],
        if (fullWidthLabel) Expanded(child: text) else Flexible(child: text),
      ],
    );
  }
}
