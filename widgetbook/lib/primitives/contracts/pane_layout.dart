import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/primitives/contracts/shell_preview.dart';
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
        'editor',
        'editor-steps',
        'operations',
        'browse',
        'unsplit',
        'detail-open',
      ],
      children: [
        for (final (label, pattern, width, open, panes) in const [
          ('queue', CatchPaneLayoutMode.queue, 1100.0, false, 2),
          ('list-detail', CatchPaneLayoutMode.listDetail, 900.0, false, 2),
          ('feed', CatchPaneLayoutMode.feed, 1100.0, false, 2),
          ('reading', CatchPaneLayoutMode.reading, 1100.0, false, 2),
          ('wide-table', CatchPaneLayoutMode.wideTable, 900.0, false, 2),
          ('editor', CatchPaneLayoutMode.editor, 1100.0, false, 2),
          ('editor-steps', CatchPaneLayoutMode.editor, 1400.0, false, 3),
          ('operations', CatchPaneLayoutMode.operations, 1400.0, false, 2),
          ('browse', CatchPaneLayoutMode.browse, 1100.0, false, 6),
          ('unsplit', CatchPaneLayoutMode.queue, 480.0, false, 2),
          ('detail-open', CatchPaneLayoutMode.queue, 480.0, true, 2),
        ])
          WidgetbookContractStateCard(
            label: label,
            child: WidgetbookShellWindow(
              width: width,
              height: 240,
              sizeClass: CatchWindowSize.expanded,
              child: CatchPaneLayout(
                pattern: pattern,
                detailOpen: open,
                children: [
                  for (var index = 0; index < panes; index++)
                    _Pane(
                      label: pattern == CatchPaneLayoutMode.browse
                          ? 'Cell ${index + 1}'
                          : const ['Main', 'Second pane', 'Steps'][index],
                    ),
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
  Widget build(BuildContext context) => CatchSurface(
    child: SizedBox(
      height: CatchSpacing.s16,
      child: CatchText(label, variant: CatchTextVariant.bodyMeta),
    ),
  );
}
