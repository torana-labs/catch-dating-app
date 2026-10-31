import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/contract_preview.dart';

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchWorkspaceHeader,
  path: '[Core patterns]/Viewport',
)
Widget catchWorkspaceHeaderContractStates(BuildContext context) =>
    WidgetbookContractFrame(
      title: 'CatchWorkspaceHeader',
      contractId: 'catch.workspace_header',
      states: const [
        'content-growth',
        'content-shrink',
        'single-pane',
        'hidden-ancestor',
        'text-scale-2',
      ],
      children: [
        const WidgetbookContractStateCard(
          label: 'content-growth',
          child: _Panes(second: ['Harbor Social', '1 of 23 · waiting 3 days']),
        ),
        const WidgetbookContractStateCard(
          label: 'content-shrink',
          child: _Panes(second: ['Harbor Social']),
        ),
        const WidgetbookContractStateCard(
          label: 'single-pane',
          child: CatchWorkspacePaneScope(
            isSinglePane: true,
            child: CatchWorkspaceHeader(child: _Title(lines: ['Inbox'])),
          ),
        ),
        const WidgetbookContractStateCard(
          label: 'hidden-ancestor',
          child: CatchWorkspaceHeader(child: _Title(lines: ['No header row'])),
        ),
        WidgetbookContractStateCard(
          label: 'text-scale-2',
          child: MediaQuery(
            data: MediaQuery.of(
              context,
            ).copyWith(textScaler: const TextScaler.linear(2)),
            child: const _Panes(second: ['Harbor Social']),
          ),
        ),
      ],
    );

class _Panes extends StatelessWidget {
  const _Panes({required this.second});

  final List<String> second;

  @override
  Widget build(BuildContext context) => CatchWorkspaceHeaderLayout(
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Expanded(
          child: CatchWorkspaceHeader(child: _Title(lines: ['Inbox'])),
        ),
        Expanded(
          child: CatchWorkspaceHeader(child: _Title(lines: second)),
        ),
      ],
    ),
  );
}

class _Title extends StatelessWidget {
  const _Title({required this.lines});

  final List<String> lines;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.all(CatchSpacing.s3),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final line in lines)
          Text(line, style: CatchTextStyles.supporting(context)),
      ],
    ),
  );
}
