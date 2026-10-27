import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/catalog_preview.dart';
import 'package:widgetbook_workspace/support/contract_preview.dart';

import '../../preview_layout_contracts.dart';
import '../../support/widgetbook_harness.dart';

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchMetadataText,
  path: '[Core catalog]/Typography',
)
Widget catchMetadataTextCatalogStates(BuildContext context) {
  final t = CatchTokens.of(context);
  return WidgetbookCatalogFrame(
    title: 'CatchMetadataText',
    catalogId: 'core.widgets.catch_metadata_text',
    children: [
      WidgetbookCatalogStateCard(
        label: 'metadata labels',
        child: WidgetbookContractWrap(
          children: [
            CatchMetadataText('6 going', color: t.ink2),
            CatchMetadataText('2.4 km away', color: t.primary),
            SizedBox(
              width: WidgetbookPreviewLayout.monoLabelTruncationWidth,
              child: CatchMetadataText(
                'A very long metadata label',
                color: t.ink3,
              ),
            ),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchMetricTile,
  path: '[Core catalog]/Data display',
)
Widget catchStatColumnCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CatchMetricTile',
    catalogId: 'core.widgets.catch_stat_column',
    children: [
      WidgetbookCatalogStateCard(
        label: 'plain / highlighted / centered / surfaced',
        child: WidgetbookContractWrap(
          children: [
            CatchMetricTile(value: '12', label: 'Going'),
            CatchMetricTile(
              value: '4',
              label: 'Left',
              highlight: true,
              variant: CatchMetricTileVariant.mono,
            ),
            CatchMetricTile(
              icon: CatchIcons.people,
              value: '86%',
              label: 'Return rate',
              center: true,
            ),
            CatchMetricTile(
              icon: CatchIcons.ticket,
              value: 'Rs 1,200',
              label: 'Base',
              center: true,
              variant: CatchMetricTileVariant.mono,
              mode: CatchMetricTileMode.surface,
            ),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Group states',
  type: CatchMetaRow,
  path: '[Core catalog]/Data display',
)
Widget catchMetaRowGroupStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CatchMetaRow.group',
    catalogId: 'core.widgets.catch_meta_dot_row',
    children: [
      WidgetbookCatalogStateCard(
        label: 'entries / trailing / truncation',
        child: SizedBox(
          width: WidgetbookPreviewLayout.standardContractWidth,
          child: CatchMetaRow.group(
            entries: [
              CatchMetaEntry(label: 'Tonight', icon: CatchIcons.addToCalendar),
              CatchMetaEntry(label: 'Bandra West', icon: CatchIcons.location),
              CatchMetaEntry(label: 'Easy pace'),
            ],
            trailing: CatchMetaEntry(label: '2.4 km'),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Flow states',
  type: CatchMetaRow,
  path: '[Core catalog]/Data display',
)
Widget catchMetaRowFlowStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CatchMetaRow.flow',
    catalogId: 'core.widgets.catch_meta_dot_row.flow',
    children: [
      WidgetbookCatalogStateCard(
        label: 'entries / truncation',
        child: SizedBox(
          width: WidgetbookPreviewLayout.compactComponentWidth,
          child: CatchMetaRow.flow(
            entries: [
              CatchMetaEntry(label: 'Tonight', icon: CatchIcons.addToCalendar),
              CatchMetaEntry(label: 'Bandra West', icon: CatchIcons.location),
              CatchMetaEntry(label: 'Easy pace'),
            ],
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Entry states',
  type: CatchMetaRow,
  path: '[Core catalog]/Data display',
)
Widget catchMetaRowEntryStates(BuildContext context) {
  final t = CatchTokens.of(context);

  return WidgetbookCatalogFrame(
    title: 'CatchMetaRow.entry',
    catalogId: 'core.widgets.catch_meta_dot_row.entry',
    children: [
      WidgetbookCatalogStateCard(
        label: 'plain / icon / strong',
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CatchMetaRow.entry(entry: CatchMetaEntry(label: 'Tonight')),
            const SizedBox(width: CatchSpacing.s4),
            CatchMetaRow.entry(
              entry: CatchMetaEntry(
                label: 'Bandra',
                icon: CatchIcons.location,
                iconColor: t.primary,
              ),
            ),
            const SizedBox(width: CatchSpacing.s4),
            const CatchMetaRow.entry(
              entry: CatchMetaEntry(label: '2.4 km'),
              isStrong: true,
            ),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchAttributionRow,
  path: '[Core catalog]/Sheets and footers',
)
Widget catchAttributionRowCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CatchAttributionRow',
    catalogId: 'catch.sheet.share_card_footer',
    children: [
      WidgetbookCatalogStateCard(
        label: 'default',
        child: CatchAttributionRow(
          brandLabel: context.l10n.coreCatchShareCardFooterTextCatch,
          trailing: 'Curated singles event',
        ),
      ),
      WidgetbookCatalogStateCard(
        label: 'long trailing',
        child: CatchAttributionRow(
          brandLabel: context.l10n.coreCatchShareCardFooterTextCatch,
          trailing: 'Hosted by The Longest Possible Club Collective',
        ),
      ),
    ],
  );
}
