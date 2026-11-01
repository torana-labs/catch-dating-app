import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/contract_preview.dart';

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchPaneLayout,
  path: '[Core patterns]/Viewport',
)
Widget catchPaneLayoutContractStates(BuildContext context) =>
    WidgetbookContractFrame(
      title: 'CatchPaneLayout',
      contractId: 'catch.pane_layout',
      states: const [
        'queue',
        'list-detail',
        'feed',
        'reading',
        'wide-table',
        'unsplit',
        'detail-open',
      ],
      children: [
        for (final (label, pattern, width, open) in const [
          ('queue', CatchPaneLayoutMode.queue, 1100.0, false),
          ('list-detail', CatchPaneLayoutMode.listDetail, 900.0, false),
          ('feed', CatchPaneLayoutMode.feed, 1100.0, false),
          ('reading', CatchPaneLayoutMode.reading, 1100.0, false),
          ('wide-table', CatchPaneLayoutMode.wideTable, 900.0, false),
          ('unsplit', CatchPaneLayoutMode.queue, 480.0, false),
          ('detail-open', CatchPaneLayoutMode.queue, 480.0, true),
        ])
          WidgetbookContractStateCard(
            label: label,
            child: SizedBox(
              width: width,
              height: 160,
              child: CatchPaneLayout(
                pattern: pattern,
                detailOpen: open,
                children: const [
                  _Pane(label: 'Main'),
                  _Pane(label: 'Second pane'),
                ],
              ),
            ),
          ),
      ],
    );

class _Pane extends StatelessWidget {
  const _Pane({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.all(CatchSpacing.s4),
    child: Text(label, style: CatchTextStyles.bodyM(context)),
  );
}
