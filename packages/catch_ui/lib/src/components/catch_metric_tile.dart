import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_metric_value.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:catch_ui/src/primitives/catch_gap.dart';
import 'package:catch_ui/src/primitives/catch_surface.dart';
import 'package:flutter/material.dart';

enum CatchMetricTileVariant { display, mono }

enum CatchMetricTileMode { plain, surface }

/// One caller-formatted value and its label, with an optional icon or unit.
///
/// The compact recipe retains the metric rail's centered value/unit baseline
/// and bounded label behavior. Display values keep natural-height text. Data
/// completeness, status labels and explanatory captions have their own typed
/// contract in CatchDataQualityMetricTile.
class CatchMetricTile extends StatelessWidget {
  const CatchMetricTile({
    super.key,
    this.icon,
    this._value,
    required String this._label,
    this.highlight = false,
    this.center = false,
    this.variant = CatchMetricTileVariant.display,
    this.mode = CatchMetricTileMode.plain,
    this.padding,
    this.borderColor,
  }) : item = null,
       valueColor = null,
       unitColor = null,
       labelColor = null,
       expanded = false;

  const CatchMetricTile.compact({
    super.key,
    required CatchMetricValue this.item,
    this.valueColor,
    this.unitColor,
    this.labelColor,
    this.expanded = false,
  }) : _value = null,
       _label = null,
       icon = null,
       highlight = false,
       center = true,
       variant = CatchMetricTileVariant.mono,
       mode = CatchMetricTileMode.plain,
       padding = null,
       borderColor = null;

  final IconData? icon;
  final String? _value;
  final String? _label;
  final CatchMetricValue? item;
  final bool highlight;
  final bool center;
  final CatchMetricTileVariant variant;
  final CatchMetricTileMode mode;
  final EdgeInsetsGeometry? padding;
  final Color? borderColor;
  final Color? valueColor;
  final Color? unitColor;
  final Color? labelColor;
  final bool expanded;

  String? get value => item?.value ?? _value;
  String get label => item?.label ?? _label!;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final compact = item;
    final reflow = MediaQuery.textScalerOf(context).scale(1) >= 1.4;
    final displayValue = value;
    final content = Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: center
          ? CrossAxisAlignment.center
          : CrossAxisAlignment.start,
      children: [
        if (icon != null) ...[
          Icon(icon, color: t.primary, size: CatchIconSize.md),
          gapH6,
        ],
        if (compact != null)
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(
                  compact.value,
                  style: CatchTextStyles.mono(context, color: valueColor),
                ),
                if (compact.unit.isNotEmpty) ...[
                  gapW2,
                  Text(
                    compact.unit,
                    style: CatchTextStyles.mono(
                      context,
                      color: unitColor ?? t.ink2,
                    ),
                  ),
                ],
              ],
            ),
          )
        else if (displayValue != null)
          Text(
            displayValue,
            style: variant == CatchMetricTileVariant.mono
                ? CatchTextStyles.mono(
                    context,
                    color: highlight ? t.primary : t.ink,
                  )
                : CatchTextStyles.metric(
                    context,
                    color: highlight ? t.primary : t.ink,
                  ),
            textAlign: center ? TextAlign.center : null,
          ),
        if (compact != null) gapH2 else gapH4,
        Text(
          label,
          style: CatchTextStyles.supporting(
            context,
            color: compact != null
                ? labelColor ?? t.ink3
                : highlight
                ? t.primary
                : t.ink2,
          ),
          textAlign: center ? TextAlign.center : null,
          maxLines: compact == null
              ? null
              : reflow
              ? 2
              : 1,
          overflow: compact == null
              ? null
              : reflow
              ? TextOverflow.visible
              : TextOverflow.ellipsis,
        ),
      ],
    );
    final tile = mode == CatchMetricTileMode.surface
        ? CatchSurface(
            padding: padding ?? CatchInsets.contentDense,
            borderRole: borderColor == null ? CatchBorderRole.boundary : null,
            borderSpec: borderColor == null
                ? null
                : CatchBorder.resolve(
                    t,
                    CatchBorderRole.boundary,
                    color: borderColor,
                  ),
            child: content,
          )
        : content;
    return expanded ? Expanded(child: tile) : tile;
  }
}
