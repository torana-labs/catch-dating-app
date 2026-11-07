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
          (
            'queue',
            CatchPaneLayoutMode.queue,
            WidgetbookShellLayout.laptop,
            false,
            2,
          ),
          (
            'list-detail',
            CatchPaneLayoutMode.listDetail,
            WidgetbookShellLayout.wideBar,
            false,
            2,
          ),
          (
            'feed',
            CatchPaneLayoutMode.feed,
            WidgetbookShellLayout.laptop,
            false,
            2,
          ),
          (
            'reading',
            CatchPaneLayoutMode.reading,
            WidgetbookShellLayout.laptop,
            false,
            2,
          ),
          (
            'wide-table',
            CatchPaneLayoutMode.wideTable,
            WidgetbookShellLayout.wideBar,
            false,
            2,
          ),
          (
            'editor',
            CatchPaneLayoutMode.editor,
            WidgetbookShellLayout.laptop,
            false,
            2,
          ),
          (
            'editor-steps',
            CatchPaneLayoutMode.editor,
            WidgetbookShellLayout.wideDesktop,
            false,
            3,
          ),
          (
            'operations',
            CatchPaneLayoutMode.operations,
            WidgetbookShellLayout.wideDesktop,
            false,
            2,
          ),
          (
            'browse',
            CatchPaneLayoutMode.browse,
            WidgetbookShellLayout.laptop,
            false,
            6,
          ),
          (
            'unsplit',
            CatchPaneLayoutMode.queue,
            WidgetbookShellLayout.narrow,
            false,
            2,
          ),
          (
            'detail-open',
            CatchPaneLayoutMode.queue,
            WidgetbookShellLayout.narrow,
            true,
            2,
          ),
        ])
          WidgetbookContractStateCard(
            label: label,
            child: WidgetbookShellWindow(
              width: width,
              height: WidgetbookShellLayout.paneHeight,
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
