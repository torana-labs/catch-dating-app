import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/contract_preview.dart';

import '../../preview_layout_contracts.dart';

const widgetbookTableColumns = [
  CatchTableColumn(label: 'Item', flex: 5),
  CatchTableColumn(label: 'Status', flex: 3),
  CatchTableColumn(label: 'Owner', flex: 3, placement: CatchTablePlacement.end),
];

List<Widget> widgetbookTableRows(
  BuildContext context, {
  bool longCopy = false,
}) {
  final t = CatchTokens.of(context);
  CatchText cell(String value) => CatchText(
    value,
    maxLines: 1,
    variant: CatchTextVariant.sectionTitle,
    color: CatchTokens.of(context).ink,
  );
  Text meta(String value) =>
      Text(value, style: CatchTextStyles.supporting(context, color: t.ink2));
  return [
    CatchTableRow(
      children: [
        cell(
          longCopy
              ? 'A very long record title that should ellipsize cleanly'
              : 'Venue deposit',
        ),
        const CatchBadge(label: 'Paid', tone: CatchBadgeTone.success),
        meta('Finance'),
      ],
    ),
    CatchTableRow(
      children: [
        cell('Sound check'),
        const CatchBadge(label: 'Review', tone: CatchBadgeTone.warning),
        meta('Ops'),
      ],
    ),
  ];
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchTable,
  path: '[Core primitives]/Data display',
)
Widget catchTableContractStates(BuildContext context) {
  final t = CatchTokens.of(context);
  return WidgetbookContractFrame(
    title: 'CatchTable',
    contractId: 'catch.table',
    states: const [
      'populated',
      'empty',
      'partial-columns',
      'long-copy',
      'end-placement',
      'large-text',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'populated',
        child: SizedBox(
          width: WidgetbookPreviewLayout.wideContractWidth,
          child: CatchTable(
            columns: widgetbookTableColumns,
            children: widgetbookTableRows(context),
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'empty',
        child: SizedBox(
          width: WidgetbookPreviewLayout.wideContractWidth,
          child: CatchTable(
            columns: widgetbookTableColumns,
            emptyBuilder: (context) => Text(
              'Nothing to list yet',
              style: CatchTextStyles.supporting(context, color: t.ink2),
            ),
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'partial-columns',
        child: SizedBox(
          width: WidgetbookPreviewLayout.wideContractWidth,
          child: CatchTable(
            columns: const [
              CatchTableColumn(label: 'Item', flex: 5),
              CatchTableColumn(label: 'Status', flex: 3),
              CatchTableColumn(label: '', flex: 3),
            ],
            children: widgetbookTableRows(context),
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'long-copy',
        child: SizedBox(
          width: WidgetbookPreviewLayout.wideContractWidth,
          child: CatchTable(
            columns: widgetbookTableColumns,
            children: widgetbookTableRows(context, longCopy: true),
          ),
        ),
      ),
    ],
  );
}
