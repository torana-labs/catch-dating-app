import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/contract_preview.dart';
import 'metrics.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Radius elevation opacity',
  type: FoundationShapeTokens,
  path: '[Foundation tokens]/Core',
)
Widget foundationShapeTokens(BuildContext context) {
  return const FoundationShapeTokens();
}

class FoundationShapeTokens extends StatelessWidget {
  const FoundationShapeTokens({super.key});

  @override
  Widget build(BuildContext context) {
    return WidgetbookContractFrame.foundation(
      title: 'Radius elevation opacity',
      contractId: 'foundation.shape',
      states: const ['radius', 'elevation', 'opacity'],
      children: [
        WidgetbookFoundationSpecSection(
          title: 'Radius scale',
          child: _RadiusGrid(
            rows: const [
              WidgetbookFoundationMetricSpec('none', CatchRadius.none),
              WidgetbookFoundationMetricSpec('xs', CatchRadius.xs),
              WidgetbookFoundationMetricSpec('sm', CatchRadius.sm),
              WidgetbookFoundationMetricSpec('md', CatchRadius.md),
              WidgetbookFoundationMetricSpec('lg', CatchRadius.lg),
              WidgetbookFoundationMetricSpec('infoTile', CatchRadius.infoTile),
              WidgetbookFoundationMetricSpec(
                'interactiveTile',
                CatchRadius.interactiveTile,
              ),
              WidgetbookFoundationMetricSpec('heroCard', CatchRadius.heroCard),
              WidgetbookFoundationMetricSpec(
                'profilePhotoBottom',
                CatchRadius.profilePhotoBottom,
              ),
              WidgetbookFoundationMetricSpec(
                'attendedEventTile',
                CatchRadius.attendedEventTile,
              ),
              WidgetbookFoundationMetricSpec('pill', CatchRadius.pill),
            ],
          ),
        ),
        WidgetbookFoundationSpecSection(
          title: 'Elevation shadows',
          child: const _ElevationGrid(),
        ),
        WidgetbookFoundationSpecSection(
          title: 'Opacity roles',
          child: WidgetbookFoundationMetricStack(
            maxBarWidth: 180,
            rows: const [
              WidgetbookFoundationMetricSpec('visible', CatchOpacity.visible),
              WidgetbookFoundationMetricSpec(
                'disabledControl',
                CatchOpacity.disabledControl,
              ),
              WidgetbookFoundationMetricSpec(
                'subtleFill',
                CatchOpacity.subtleFill,
              ),
              WidgetbookFoundationMetricSpec(
                'subtleBorder',
                CatchOpacity.subtleBorder,
              ),
              WidgetbookFoundationMetricSpec(
                'controlOverlayHover',
                CatchOpacity.controlOverlayHover,
              ),
              WidgetbookFoundationMetricSpec(
                'controlOverlayPressed',
                CatchOpacity.controlOverlayPressed,
              ),
              WidgetbookFoundationMetricSpec(
                'scrimFill',
                CatchOpacity.scrimFill,
              ),
              WidgetbookFoundationMetricSpec(
                'onFillMuted',
                CatchOpacity.onFillMuted,
              ),
              WidgetbookFoundationMetricSpec(
                'hiddenInput',
                CatchOpacity.hiddenInput,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _RadiusGrid extends StatelessWidget {
  const _RadiusGrid({required this.rows});

  final List<WidgetbookFoundationMetricSpec> rows;

  @override
  Widget build(BuildContext context) {
    final visibleRows = rows.where((row) => row.value < 100).toList();
    return Wrap(
      spacing: CatchSpacing.s3,
      runSpacing: CatchSpacing.s3,
      children: [for (final row in visibleRows) _RadiusTile(row: row)],
    );
  }
}

class _RadiusTile extends StatelessWidget {
  const _RadiusTile({required this.row});

  final WidgetbookFoundationMetricSpec row;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return SizedBox(
      width: WidgetbookPreviewLayout.foundationRadiusTileWidth,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: WidgetbookPreviewLayout.foundationRadiusSampleWidth,
            height: WidgetbookPreviewLayout.foundationRadiusSampleHeight,
            decoration: BoxDecoration(
              color: t.primarySoft,
              border: Border.all(color: t.line2),
              borderRadius: BorderRadius.circular(row.value),
            ),
          ),
          gapH8,
          Text(row.name, style: CatchTextStyles.statusLabel(context)),
          Text(
            '${widgetbookFoundationNumber(row.value)} px',
            style: CatchTextStyles.monoLabelS(context, color: t.ink2),
          ),
        ],
      ),
    );
  }
}

class _ElevationGrid extends StatelessWidget {
  const _ElevationGrid();

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: CatchSpacing.s4,
      runSpacing: CatchSpacing.s4,
      children: const [
        _ElevationTile(name: 'none', shadows: CatchElevation.none),
        _ElevationTile(name: 'card', shadows: CatchElevation.card),
        _ElevationTile(name: 'raised', shadows: CatchElevation.raised),
        _ElevationTile(name: 'overlay', shadows: CatchElevation.overlay),
        _ElevationTile(
          name: 'iconButtonFloat',
          shadows: CatchElevation.iconButtonFloat,
        ),
        _ElevationTile(name: 'toggleKnob', shadows: CatchElevation.toggleKnob),
      ],
    );
  }
}

class _ElevationTile extends StatelessWidget {
  const _ElevationTile({required this.name, required this.shadows});

  final String name;
  final List<BoxShadow> shadows;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return SizedBox(
      width: WidgetbookPreviewLayout.foundationTileWidth,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: WidgetbookPreviewLayout.foundationIconCellWidth,
            height: WidgetbookPreviewLayout.foundationElevationSampleHeight,
            decoration: BoxDecoration(
              color: t.surface,
              border: Border.all(color: t.line),
              borderRadius: BorderRadius.circular(CatchRadius.md),
              boxShadow: shadows,
            ),
          ),
          gapH10,
          Text(name, style: CatchTextStyles.statusLabel(context)),
          Text(
            '${shadows.length} shadow${shadows.length == 1 ? '' : 's'}',
            style: CatchTextStyles.monoLabelS(context, color: t.ink2),
          ),
        ],
      ),
    );
  }
}
