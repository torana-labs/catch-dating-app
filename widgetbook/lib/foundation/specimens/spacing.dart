import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/contract_preview.dart';
import 'metrics.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Spacing and layout',
  type: FoundationSpacingTokens,
  path: '[Foundation tokens]/Core',
)
Widget foundationSpacingAndLayout(BuildContext context) {
  return const FoundationSpacingTokens();
}

class FoundationSpacingTokens extends StatelessWidget {
  const FoundationSpacingTokens({super.key});

  @override
  Widget build(BuildContext context) {
    return WidgetbookContractFrame.foundation(
      title: 'Spacing and layout',
      contractId: 'foundation.spacing',
      states: const ['scale', 'semantic-gaps', 'insets', 'layout-ratios'],
      children: [
        WidgetbookFoundationSpecSection(
          title: 'Spacing scale',
          child: WidgetbookFoundationMetricStack(
            rows: const [
              WidgetbookFoundationMetricSpec('s0', CatchSpacing.s0),
              WidgetbookFoundationMetricSpec('s1', CatchSpacing.s1),
              WidgetbookFoundationMetricSpec('s2', CatchSpacing.s2),
              WidgetbookFoundationMetricSpec('s3', CatchSpacing.s3),
              WidgetbookFoundationMetricSpec('s4', CatchSpacing.s4),
              WidgetbookFoundationMetricSpec('s5', CatchSpacing.s5),
              WidgetbookFoundationMetricSpec('s6', CatchSpacing.s6),
              WidgetbookFoundationMetricSpec('s7', CatchSpacing.s7),
              WidgetbookFoundationMetricSpec('s8', CatchSpacing.s8),
              WidgetbookFoundationMetricSpec('s9', CatchSpacing.s9),
              WidgetbookFoundationMetricSpec('s10', CatchSpacing.s10),
              WidgetbookFoundationMetricSpec('s11', CatchSpacing.s11),
              WidgetbookFoundationMetricSpec('s12', CatchSpacing.s12),
              WidgetbookFoundationMetricSpec('s16', CatchSpacing.s16),
              WidgetbookFoundationMetricSpec('micro2', CatchSpacing.micro2),
              WidgetbookFoundationMetricSpec('micro3', CatchSpacing.micro3),
              WidgetbookFoundationMetricSpec('micro6', CatchSpacing.micro6),
              WidgetbookFoundationMetricSpec('micro10', CatchSpacing.micro10),
              WidgetbookFoundationMetricSpec('micro14', CatchSpacing.micro14),
              WidgetbookFoundationMetricSpec('micro18', CatchSpacing.micro18),
            ],
          ),
        ),
        WidgetbookFoundationSpecSection(
          title: 'Semantic gaps',
          child: WidgetbookFoundationMetricStack(
            rows: const [
              WidgetbookFoundationMetricSpec('inline', CatchGaps.inline),
              WidgetbookFoundationMetricSpec(
                'headerTitleToSubtitle',
                CatchGaps.headerTitleToSubtitle,
              ),
              WidgetbookFoundationMetricSpec('related', CatchGaps.related),
              WidgetbookFoundationMetricSpec('formField', CatchGaps.formField),
              WidgetbookFoundationMetricSpec('section', CatchGaps.section),
              WidgetbookFoundationMetricSpec(
                'majorSection',
                CatchGaps.majorSection,
              ),
            ],
          ),
        ),
        WidgetbookFoundationSpecSection(
          title: 'Inset roles',
          child: _InsetGrid(
            rows: const [
              _InsetSpec('pageBody', CatchInsets.pageBody),
              _InsetSpec('pageBodyTight', CatchInsets.pageBodyTight),
              _InsetSpec(
                'pageBodyUnderHeader',
                CatchInsets.pageBodyUnderHeader,
              ),
              _InsetSpec('content', CatchInsets.content),
              _InsetSpec('contentDense', CatchInsets.contentDense),
              _InsetSpec('cardContent', CatchInsets.cardContent),
            ],
          ),
        ),
      ],
    );
  }
}

class _InsetGrid extends StatelessWidget {
  const _InsetGrid({required this.rows});

  final List<_InsetSpec> rows;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: CatchSpacing.s3,
      runSpacing: CatchSpacing.s3,
      children: [for (final row in rows) _InsetTile(row: row)],
    );
  }
}

class _InsetTile extends StatelessWidget {
  const _InsetTile({required this.row});

  final _InsetSpec row;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return SizedBox(
      width: WidgetbookPreviewLayout.foundationInsetTileWidth,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: t.raised,
          border: Border.all(color: t.line),
          borderRadius: BorderRadius.circular(CatchRadius.md),
        ),
        child: Padding(
          padding: CatchInsets.contentDense,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(row.name, style: CatchTextStyles.statusLabel(context)),
              gapH10,
              Container(
                height: WidgetbookPreviewLayout.foundationInsetSampleHeight,
                padding: row.insets,
                decoration: BoxDecoration(
                  color: t.surface,
                  border: Border.all(color: t.line2),
                  borderRadius: BorderRadius.circular(CatchRadius.sm),
                ),
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: t.primarySoft,
                    borderRadius: BorderRadius.circular(CatchRadius.xs),
                  ),
                  child: const SizedBox.expand(),
                ),
              ),
              gapH8,
              Text(
                _edgeInsetsLabel(row.insets),
                style: CatchTextStyles.monoLabelS(context, color: t.ink2),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InsetSpec {
  const _InsetSpec(this.name, this.insets);

  final String name;
  final EdgeInsets insets;
}

String _edgeInsetsLabel(EdgeInsets insets) {
  return 'L${widgetbookFoundationNumber(insets.left)} T${widgetbookFoundationNumber(insets.top)} '
      'R${widgetbookFoundationNumber(insets.right)} B${widgetbookFoundationNumber(insets.bottom)}';
}
