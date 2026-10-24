import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/core/theme/activity_palette.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/contract_preview.dart';
import 'metrics.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Icons and media geometry',
  type: FoundationIconMediaTokens,
  path: '[Foundation tokens]/Core',
)
Widget foundationIconMediaTokens(BuildContext context) {
  return const FoundationIconMediaTokens();
}

class FoundationIconMediaTokens extends StatelessWidget {
  const FoundationIconMediaTokens({super.key});

  @override
  Widget build(BuildContext context) {
    return WidgetbookContractFrame.foundation(
      title: 'Icons and media geometry',
      contractId: 'foundation.media',
      states: const ['icon-scale', 'aspect-ratio', 'activity-glyphs'],
      children: [
        WidgetbookFoundationSpecSection(
          title: 'Icon scale',
          child: _IconSizeGrid(
            rows: const [
              WidgetbookFoundationMetricSpec('badge', CatchIcon.badge),
              WidgetbookFoundationMetricSpec('micro', CatchIcon.micro),
              WidgetbookFoundationMetricSpec('sm', CatchIcon.sm),
              WidgetbookFoundationMetricSpec('xs', CatchIcon.xs),
              WidgetbookFoundationMetricSpec('md', CatchIcon.md),
              WidgetbookFoundationMetricSpec('control', CatchIcon.control),
              WidgetbookFoundationMetricSpec('row', CatchIcon.row),
              WidgetbookFoundationMetricSpec('tile', CatchIcon.tile),
              WidgetbookFoundationMetricSpec('hero', CatchIcon.hero),
              WidgetbookFoundationMetricSpec(
                'emptyState',
                CatchIcon.emptyState,
              ),
              WidgetbookFoundationMetricSpec('avatarLg', CatchIcon.avatarLg),
              WidgetbookFoundationMetricSpec('lg', CatchIcon.lg),
            ],
          ),
        ),
        WidgetbookFoundationSpecSection(
          title: 'Media aspect ratios',
          child: _AspectRatioGrid(
            rows: const [
              WidgetbookFoundationMetricSpec('square', CatchAspectRatio.square),
              WidgetbookFoundationMetricSpec(
                'wide16x9',
                CatchAspectRatio.wide16x9,
              ),
              WidgetbookFoundationMetricSpec(
                'activityCard',
                CatchAspectRatio.activityCard,
              ),
              WidgetbookFoundationMetricSpec(
                'standardPhoto',
                CatchAspectRatio.standardPhoto,
              ),
              WidgetbookFoundationMetricSpec(
                'portrait4x5',
                CatchAspectRatio.portrait4x5,
              ),
              WidgetbookFoundationMetricSpec(
                'portrait3x4',
                CatchAspectRatio.portrait3x4,
              ),
              WidgetbookFoundationMetricSpec(
                'profileSlotFeedback',
                CatchAspectRatio.profileSlotFeedback,
              ),
              WidgetbookFoundationMetricSpec(
                'eventRecapVibeTile',
                CatchAspectRatio.eventRecapVibeTile,
              ),
            ],
          ),
        ),
        WidgetbookFoundationSpecSection(
          title: 'Activity glyphs',
          child: _ActivityGlyphGrid(kinds: ActivityPalette.activityOrder),
        ),
      ],
    );
  }
}

class _IconSizeGrid extends StatelessWidget {
  const _IconSizeGrid({required this.rows});

  final List<WidgetbookFoundationMetricSpec> rows;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: CatchSpacing.s4,
      runSpacing: CatchSpacing.s4,
      crossAxisAlignment: WrapCrossAlignment.end,
      children: [
        for (final row in rows)
          SizedBox(
            width: WidgetbookPreviewLayout.foundationIconCellWidth,
            child: Column(
              children: [
                Icon(CatchIcons.sparkle, size: row.value),
                gapH8,
                Text(row.name, style: CatchTextStyles.statusLabel(context)),
                Text(
                  widgetbookFoundationNumber(row.value),
                  style: CatchTextStyles.monoLabelS(context),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class _AspectRatioGrid extends StatelessWidget {
  const _AspectRatioGrid({required this.rows});

  final List<WidgetbookFoundationMetricSpec> rows;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Wrap(
      spacing: CatchSpacing.s4,
      runSpacing: CatchSpacing.s4,
      children: [
        for (final row in rows)
          SizedBox(
            width: WidgetbookPreviewLayout.foundationAspectRatioTileWidth,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AspectRatio(
                  aspectRatio: row.value,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: t.primarySoft,
                      border: Border.all(color: t.line2),
                      borderRadius: BorderRadius.circular(CatchRadius.sm),
                    ),
                  ),
                ),
                gapH8,
                Text(row.name, style: CatchTextStyles.statusLabel(context)),
                Text(
                  widgetbookFoundationNumber(row.value),
                  style: CatchTextStyles.monoLabelS(context, color: t.ink2),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class _ActivityGlyphGrid extends StatelessWidget {
  const _ActivityGlyphGrid({required this.kinds});

  final List<ActivityKind> kinds;

  @override
  Widget build(BuildContext context) {
    final palette = ActivityPalette.of(context);
    return Wrap(
      spacing: CatchSpacing.s3,
      runSpacing: CatchSpacing.s3,
      children: [
        for (final kind in kinds)
          _ActivityGlyphTile(activity: palette.getActivity(kind)),
      ],
    );
  }
}

class _ActivityGlyphTile extends StatelessWidget {
  const _ActivityGlyphTile({required this.activity});

  final ActivityStyle activity;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: WidgetbookPreviewLayout.foundationTileWidth,
      child: Column(
        children: [
          DecoratedBox(
            decoration: BoxDecoration(
              color: activity.soft,
              borderRadius: BorderRadius.circular(CatchRadius.pill),
            ),
            child: Padding(
              padding: const EdgeInsets.all(CatchSpacing.s3),
              child: Icon(
                activity.glyph,
                color: activity.deep,
                size: CatchIcon.lg,
              ),
            ),
          ),
          gapH8,
          Text(
            activity.label,
            textAlign: TextAlign.center,
            style: CatchTextStyles.statusLabel(context),
          ),
        ],
      ),
    );
  }
}
