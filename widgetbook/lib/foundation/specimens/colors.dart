import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/core/theme/activity_palette.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/contract_preview.dart';
import 'color_samples.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Color roles',
  type: FoundationColorTokens,
  path: '[Foundation tokens]/Core',
)
Widget foundationColorRoles(BuildContext context) {
  return const FoundationColorTokens();
}

class FoundationColorTokens extends StatelessWidget {
  const FoundationColorTokens({super.key});

  @override
  Widget build(BuildContext context) {
    return WidgetbookContractFrame.foundation(
      title: 'Color roles',
      contractId: 'foundation.color',
      states: const ['light', 'dark', 'activity-pigments'],
      children: [
        WidgetbookFoundationDualThemeSection(
          title: 'Semantic roles',
          builder: (context) {
            final t = CatchTokens.of(context);
            return WidgetbookFoundationColorGrid(
              colors: [
                WidgetbookFoundationColorSpec('bg', t.bg),
                WidgetbookFoundationColorSpec('surface', t.surface),
                WidgetbookFoundationColorSpec('raised', t.raised),
                WidgetbookFoundationColorSpec('overlay', t.overlay),
                WidgetbookFoundationColorSpec('ink', t.ink),
                WidgetbookFoundationColorSpec('ink2', t.ink2),
                WidgetbookFoundationColorSpec('ink3', t.ink3),
                WidgetbookFoundationColorSpec('line', t.line),
                WidgetbookFoundationColorSpec('line2', t.line2),
                WidgetbookFoundationColorSpec('primary', t.primary),
                WidgetbookFoundationColorSpec('primaryInk', t.primaryInk),
                WidgetbookFoundationColorSpec('primarySoft', t.primarySoft),
                WidgetbookFoundationColorSpec('success', t.success),
                WidgetbookFoundationColorSpec('warning', t.warning),
                WidgetbookFoundationColorSpec('danger', t.danger),
                WidgetbookFoundationColorSpec('gold', t.gold),
              ],
            );
          },
        ),
        WidgetbookFoundationSpecSection(
          title: 'Activity pigments',
          child: _ActivityPigmentGrid(
            kinds: ActivityPalette.activityOrder,
            brightness: Theme.of(context).brightness,
          ),
        ),
      ],
    );
  }
}

class _ActivityPigmentGrid extends StatelessWidget {
  const _ActivityPigmentGrid({required this.kinds, required this.brightness});

  final List<ActivityKind> kinds;
  final Brightness brightness;

  @override
  Widget build(BuildContext context) {
    final palette = ActivityPalette.forBrightness(brightness);
    return Wrap(
      spacing: CatchSpacing.s3,
      runSpacing: CatchSpacing.s3,
      children: [
        for (final kind in kinds)
          _ActivityColorTile(activity: palette.getActivity(kind)),
      ],
    );
  }
}

class _ActivityColorTile extends StatelessWidget {
  const _ActivityColorTile({required this.activity});

  final ActivityStyle activity;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return SizedBox(
      width: WidgetbookPreviewLayout.foundationActivityTileWidth,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: activity.soft,
          border: Border.all(color: activity.deep.withValues(alpha: 0.22)),
          borderRadius: BorderRadius.circular(CatchRadius.md),
        ),
        child: Padding(
          padding: CatchInsets.contentDense,
          child: Row(
            children: [
              Icon(activity.glyph, color: activity.deep, size: CatchIcon.md),
              gapW10,
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      activity.label,
                      style: CatchTextStyles.statusLabel(context),
                    ),
                    gapH2,
                    Text(
                      widgetbookFoundationColorHex(activity.accent),
                      style: CatchTextStyles.monoLabelS(context, color: t.ink2),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
