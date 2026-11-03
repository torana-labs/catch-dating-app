import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_data_quality_metric_tile.dart';
import 'package:catch_ui/src/components/catch_metric_data.dart';
import 'package:catch_ui/src/components/catch_metric_tile.dart';
import 'package:catch_ui/src/components/catch_metric_value.dart';
import 'package:catch_ui/src/primitives/catch_divider.dart';
import 'package:catch_ui/src/primitives/catch_legacy_surface.dart';
import 'package:flutter/material.dart';

enum CatchMetricSectionVariant { rail, grid, dataQuality }

/// Local arrangement of metric values or data-quality-aware metric tiles.
///
/// The rail shares one surface and reflows into a vertical stack at large text.
/// Grid recipes give independent measurements equal-width, equal-height tiles
/// with 12 pt gutters. Narrow viewports and large text use a single column.
/// It receives formatted data; fetching, aggregation and status evaluation stay
/// with the caller. Generic titled content and field groups use CatchSection.
class CatchMetricSection extends StatelessWidget {
  const CatchMetricSection({
    super.key,
    required this.items,
    this.padding = const EdgeInsets.symmetric(
      vertical: CatchSpacing.s4,
      horizontal: CatchSpacing.s3,
    ),
    this.backgroundColor,
    this.borderColor,
    this.dividerColor,
    this.valueColor,
    this.unitColor,
    this.labelColor,
  }) : variant = CatchMetricSectionVariant.rail,
       metrics = const [],
       maxItems = null;

  const CatchMetricSection.grid({super.key, required this.items})
    : variant = CatchMetricSectionVariant.grid,
      metrics = const [],
      maxItems = null,
      padding = EdgeInsets.zero,
      backgroundColor = null,
      borderColor = null,
      dividerColor = null,
      valueColor = null,
      unitColor = null,
      labelColor = null;

  const CatchMetricSection.dataQuality({
    super.key,
    required this.metrics,
    this.maxItems,
  }) : variant = CatchMetricSectionVariant.dataQuality,
       items = const [],
       padding = EdgeInsets.zero,
       backgroundColor = null,
       borderColor = null,
       dividerColor = null,
       valueColor = null,
       unitColor = null,
       labelColor = null;

  final CatchMetricSectionVariant variant;
  final List<CatchMetricValue> items;
  final List<CatchMetricData> metrics;
  final int? maxItems;
  final EdgeInsetsGeometry padding;
  final Color? backgroundColor;
  final Color? borderColor;
  final Color? dividerColor;
  final Color? valueColor;
  final Color? unitColor;
  final Color? labelColor;

  @override
  Widget build(BuildContext context) {
    if (variant != CatchMetricSectionVariant.rail) {
      final tiles = variant == CatchMetricSectionVariant.grid
          ? <Widget>[
              for (final item in items)
                CatchMetricTile(
                  value: item.unit.isEmpty
                      ? item.value
                      : '${item.value} ${item.unit}',
                  label: item.label,
                  mode: CatchMetricTileMode.surface,
                  padding: CatchInsets.content,
                ),
            ]
          : <Widget>[
              for (final metric
                  in maxItems == null ? metrics : metrics.take(maxItems!))
                CatchDataQualityMetricTile(data: metric),
            ];
      return LayoutBuilder(
        builder: (context, constraints) {
          final columns =
              constraints.maxWidth < 320 ||
                  MediaQuery.textScalerOf(context).scale(1) >= 1.4
              ? 1
              : 2;
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (var i = 0; i < tiles.length; i += columns) ...[
                if (i > 0) const SizedBox(height: CatchSpacing.s3),
                IntrinsicHeight(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Expanded(child: tiles[i]),
                      if (columns == 2 && i + 1 < tiles.length) ...[
                        const SizedBox(width: CatchSpacing.s3),
                        Expanded(child: tiles[i + 1]),
                      ],
                    ],
                  ),
                ),
              ],
            ],
          );
        },
      );
    }
    assert(items.isNotEmpty);
    final t = CatchTokens.of(context);
    final reflow = MediaQuery.textScalerOf(context).scale(1) >= 1.4;
    return CatchLegacySurface(
      padding: padding,
      radius: CatchRadius.md,
      backgroundColor: backgroundColor,
      borderSpec: CatchBorder.resolve(
        t,
        CatchBorderRole.separator,
        color: borderColor,
      ),
      child: reflow
          ? Column(
              key: const ValueKey('catch_metric_strip.reflow'),
              children: [
                for (final item in items) ...[
                  Padding(
                    padding: CatchInsets.contentVerticalCompact,
                    child: CatchMetricTile.compact(
                      item: item,
                      valueColor: valueColor,
                      unitColor: unitColor,
                      labelColor: labelColor,
                    ),
                  ),
                  if (item != items.last)
                    CatchDivider.section(color: dividerColor ?? t.line),
                ],
              ],
            )
          : Row(
              children: [
                for (final item in items) ...[
                  CatchMetricTile.compact(
                    item: item,
                    valueColor: valueColor,
                    unitColor: unitColor,
                    labelColor: labelColor,
                    expanded: true,
                  ),
                  if (item != items.last)
                    CatchDivider.vertical(color: dividerColor ?? t.line),
                ],
              ],
            ),
    );
  }
}
