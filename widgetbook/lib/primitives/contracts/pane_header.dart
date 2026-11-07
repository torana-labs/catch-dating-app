import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/preview_layout_contracts.dart';
import 'package:widgetbook_workspace/primitives/contracts/shell_preview.dart';
import 'package:widgetbook_workspace/support/contract_preview.dart';

// The system PaneHeader as data: the row that heads each pane of the people
// desktop board.

Widget _state(
  BuildContext context, {
  required String label,
  required String description,
  required Widget child,
  double width = WidgetbookPreviewLayout.wideContractWidth,
}) => WidgetbookContractStateCard(
  label: label,
  description: description,
  child: SizedBox(
    width: width,
    child: CatchRoot(
      theme: widgetbookThemeOf(context),
      size: CatchWindowSize.expanded,
      child: child,
    ),
  ),
);

final _message = CatchButton(
  label: 'Message',
  onPressed: widgetbookNoop,
  size: CatchButtonSize.sm,
  leading: Icon(CatchIcons.chat),
);

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchPaneHeader,
  path: '[Core primitives]/Layout',
)
Widget catchPaneHeaderContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchPaneHeader',
    contractId: 'catch.pane_header',
    states: const ['list-pane', 'detail-pane', 'back', 'aligned-panes'],
    children: [
      _state(
        context,
        label: 'list-pane',
        description: 'The list pane: its title, a muted count and an action.',
        child: CatchPaneHeader(
          title: 'People',
          count: 1284,
          trailing: _message,
        ),
      ),
      _state(
        context,
        label: 'detail-pane',
        description: 'The detail pane: the breadcrumb, a note and actions.',
        child: CatchPaneHeader(
          title: 'Rhea Kapoor',
          kicker: 'People',
          note: 'coming since March',
          trailing: _message,
        ),
      ),
      _state(
        context,
        label: 'back',
        description: 'A plain back button first, on a narrow pane.',
        child: const CatchPaneHeader(
          title: 'Rhea Kapoor',
          back: CatchTopBarBack(label: 'Back to People'),
        ),
      ),
      _state(
        context,
        label: 'aligned-panes',
        description: 'Two panes side by side share one height and hairline.',
        width: WidgetbookPreviewLayout.tabletChromeWidth,
        child: CatchWorkspaceHeaderLayout(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Expanded(
                child: CatchPaneHeader(title: 'People', count: 1284),
              ),
              Expanded(
                child: CatchPaneHeader(
                  title: 'Rhea Kapoor',
                  kicker: 'People',
                  trailing: _message,
                ),
              ),
            ],
          ),
        ),
      ),
    ],
  );
}
