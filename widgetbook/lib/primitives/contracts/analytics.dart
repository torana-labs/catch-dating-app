import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/contract_preview.dart';

import '../../preview_layout_contracts.dart';

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchBarIndicator,
  path: '[Core primitives]/Data display',
)
Widget catchMiniBarChartContractStates(BuildContext context) =>
    WidgetbookContractFrame(
      title: 'CatchBarIndicator',
      contractId: 'catch.mini_bar_chart',
      states: const ['default', 'zero-values', 'color-override'],
      children: [
        for (final value in [0, 2, 8, 12])
          WidgetbookContractStateCard(
            label: value == 0 ? 'zero-values' : 'default',
            child: SizedBox(
              width: 40,
              height: 100,
              child: CatchBarIndicator(value: value, maxValue: 8),
            ),
          ),
        WidgetbookContractStateCard(
          label: 'color-override',
          child: SizedBox(
            width: 40,
            height: 100,
            child: CatchBarIndicator(
              value: 4,
              maxValue: 8,
              filledColor: CatchTokens.of(context).primary,
              emptyColor: CatchTokens.of(context).primarySoft,
            ),
          ),
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchDataQualityMetricTile,
  path: '[Core primitives]/Analytics kit',
)
Widget catchAnalyticsMetricContractStates(BuildContext context) =>
    WidgetbookContractFrame(
      title: 'Analytics metric',
      contractId: 'catch.analytics_metric',
      states: const [
        'ready',
        'partial',
        'missing',
        'with-caption',
        'without-caption',
        'large-text',
      ],
      children: [
        for (final status in CatchMetricDataStatus.values)
          WidgetbookContractStateCard(
            label: status.name,
            child: CatchDataQualityMetricTile(
              data: CatchMetricData(
                icon: CatchIcons.ticket,
                value: status == CatchMetricDataStatus.missing ? '--' : '126',
                label: 'Bookings',
                caption: status == CatchMetricDataStatus.ready
                    ? 'Confirmed seats'
                    : null,
                status: status,
                partialBadgeLabel: 'Partial',
                missingBadgeLabel: 'Missing',
              ),
            ),
          ),
      ],
    );

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchMetricSection,
  path: '[Core primitives]/Data display',
)
Widget catchMetricStripContractStates(BuildContext context) {
  final t = CatchTokens.of(context);

  return WidgetbookContractFrame(
    title: 'CatchMetricSection',
    contractId: 'catch.metric_strip',
    states: const [
      'default',
      'with-unit',
      'four-items',
      'long-copy',
      'surface-overrides',
      'large-text-reflow',
      'empty-grid',
      'two-column',
      'limited-items',
      'large-text-grid',
      'independent-grid',
      'independent-large-text',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'default',
        child: CatchMetricSection(
          items: [
            CatchMetricValue(value: '24', label: 'going'),
            CatchMetricValue(value: '4', label: 'left'),
            CatchMetricValue(value: '8:30', label: 'starts'),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'with-unit',
        child: CatchMetricSection(
          items: [
            CatchMetricValue(value: '2.4', unit: 'km', label: 'away'),
            CatchMetricValue(value: '12', unit: 'min', label: 'walk'),
            CatchMetricValue(value: '6', unit: 'pm', label: 'meet'),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'four-items',
        child: CatchMetricSection(
          items: [
            CatchMetricValue(value: '126', label: 'members'),
            CatchMetricValue(value: '4.8', label: 'rating'),
            CatchMetricValue(value: '12', label: 'reviews'),
            CatchMetricValue(value: 'JAN 25', label: 'est.'),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'long-copy',
        child: SizedBox(
          width: WidgetbookPreviewLayout.metricStripLongCopyWidth,
          child: CatchMetricSection(
            items: const [
              CatchMetricValue(
                value: '128',
                label: 'confirmed members attending',
              ),
              CatchMetricValue(value: '98%', label: 'historical show rate'),
              CatchMetricValue(value: '12', label: 'waitlist seats remaining'),
            ],
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'surface-overrides',
        child: CatchMetricSection(
          backgroundColor: t.primary,
          borderColor: t.primary,
          dividerColor: t.primaryInk.withValues(alpha: 0.32),
          valueColor: t.primaryInk,
          unitColor: t.primaryInk.withValues(alpha: 0.78),
          labelColor: t.primaryInk.withValues(alpha: 0.72),
          items: [
            CatchMetricValue(value: '8', label: 'matched'),
            CatchMetricValue(value: '2', label: 'pending'),
            CatchMetricValue(value: '1', label: 'open'),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'large-text-reflow',
        child: MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: const TextScaler.linear(2)),
          child: CatchMetricSection(
            items: const [
              CatchMetricValue(value: '12', label: 'responses'),
              CatchMetricValue(value: '6', label: 'questions'),
              CatchMetricValue(value: '1', label: 'published version'),
            ],
          ),
        ),
      ),
      for (final scale in [1.0, 2.0])
        WidgetbookContractStateCard(
          label: scale == 1 ? 'independent-grid' : 'independent-large-text',
          child: MediaQuery(
            data: MediaQuery.of(
              context,
            ).copyWith(textScaler: TextScaler.linear(scale)),
            child: const CatchMetricSection.grid(
              items: [
                CatchMetricValue(value: '126', label: 'Followers'),
                CatchMetricValue(value: '4.8', label: 'Average rating'),
                CatchMetricValue(value: '12', label: 'Published reviews'),
                CatchMetricValue(value: 'May 2026', label: 'Established'),
              ],
            ),
          ),
        ),
      const WidgetbookContractStateCard(
        label: 'empty-grid',
        child: CatchMetricSection.dataQuality(metrics: []),
      ),
      for (final limited in [false, true])
        WidgetbookContractStateCard(
          label: limited ? 'limited-items' : 'two-column',
          child: CatchMetricSection.dataQuality(
            maxItems: limited ? 1 : null,
            metrics: [
              for (final status in CatchMetricDataStatus.values)
                CatchMetricData(
                  icon: CatchIcons.people,
                  value: '24',
                  label: 'Guests',
                  status: status,
                  partialBadgeLabel: 'Partial',
                  missingBadgeLabel: 'Missing',
                ),
            ],
          ),
        ),
      WidgetbookContractStateCard(
        label: 'large-text-grid',
        child: MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: const TextScaler.linear(2)),
          child: CatchMetricSection.dataQuality(
            metrics: [
              CatchMetricData(
                icon: CatchIcons.people,
                value: '24',
                label: 'Guests',
                partialBadgeLabel: 'Partial',
                missingBadgeLabel: 'Missing',
              ),
            ],
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchMetricTile,
  path: '[Core primitives]/Data display',
)
Widget catchMetricStripCellContractStates(BuildContext context) {
  final t = CatchTokens.of(context);

  return WidgetbookContractFrame(
    title: 'CatchMetricTile',
    contractId: 'catch.metric_strip.stat_column',
    states: const [
      'plain',
      'highlighted',
      'centered',
      'with-icon',
      'mono-value',
      'surfaced',
      'default',
      'with-unit',
      'long-label',
      'color-overrides',
    ],
    children: [
      const WidgetbookContractStateCard(
        label: 'plain',
        child: CatchMetricTile(value: '24', label: 'Guests'),
      ),
      const WidgetbookContractStateCard(
        label: 'highlighted',
        child: CatchMetricTile(value: '24', label: 'Guests', highlight: true),
      ),
      const WidgetbookContractStateCard(
        label: 'centered',
        child: CatchMetricTile(value: '24', label: 'Guests', center: true),
      ),
      WidgetbookContractStateCard(
        label: 'with-icon',
        child: CatchMetricTile(
          value: '24',
          label: 'Guests',
          icon: CatchIcons.people,
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'mono-value',
        child: CatchMetricTile(
          value: '24',
          label: 'Guests',
          variant: CatchMetricTileVariant.mono,
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'surfaced',
        child: CatchMetricTile(
          value: '24',
          label: 'Guests',
          mode: CatchMetricTileMode.surface,
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'default',
        child: SizedBox(
          width: WidgetbookPreviewLayout.metricStripCellWidth,
          child: CatchMetricTile.compact(
            item: CatchMetricValue(value: '24', label: 'going'),
          ),
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'with-unit',
        child: SizedBox(
          width: WidgetbookPreviewLayout.metricStripCellWidth,
          child: CatchMetricTile.compact(
            item: CatchMetricValue(value: '2.4', unit: 'km', label: 'away'),
          ),
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'long-label',
        child: SizedBox(
          width: WidgetbookPreviewLayout.metricStripCellWidth,
          child: CatchMetricTile.compact(
            item: CatchMetricValue(value: '98%', label: 'historical show rate'),
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'color-overrides',
        child: SizedBox(
          width: WidgetbookPreviewLayout.metricStripCellWidth,
          child: CatchMetricTile.compact(
            valueColor: t.primary,
            unitColor: t.accent,
            labelColor: t.ink2,
            item: const CatchMetricValue(
              value: '12',
              unit: 'min',
              label: 'walk',
            ),
          ),
        ),
      ),
    ],
  );
}
