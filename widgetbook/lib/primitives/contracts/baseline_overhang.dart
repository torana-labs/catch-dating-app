import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/preview_layout_contracts.dart';
import 'package:widgetbook_workspace/support/contract_preview.dart';

Widget _section({required String title}) => CatchSection(
  title: title,
  action: const CatchSectionAction(
    label: 'New programme',
    onPressed: widgetbookNoop,
  ),
  children: const [
    CatchIndexRow(
      title: 'Sunday Run Club',
      subtitle: 'Every Sunday · 6:30 AM',
      onTap: null,
    ),
  ],
);

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchBaselineOverhangLayout,
  path: '[Core primitives]/Sections',
)
Widget catchBaselineOverhangLayoutContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchBaselineOverhangLayout',
    contractId: 'catch.section.baseline_overhang',
    states: const ['title-action', 'title-action-large-text'],
    children: [
      WidgetbookContractStateCard(
        label: 'title-action',
        description:
            "The quiet action's label sits on the title's baseline; its 48 px "
            'target overhangs the title line instead of making it taller.',
        child: SizedBox(
          width: WidgetbookPreviewLayout.standardContractWidth,
          child: _section(title: 'Programmes'),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'title-action-large-text',
        description:
            'At large text the action takes its own line under the title, so '
            'the title wraps only between words.',
        child: SizedBox(
          width: WidgetbookPreviewLayout.standardContractWidth,
          child: MediaQuery.withClampedTextScaling(
            minScaleFactor: 2,
            maxScaleFactor: 2,
            child: _section(title: 'Programmes'),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchOverhangStack,
  path: '[Core primitives]/Sections',
)
Widget catchOverhangStackContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchOverhangStack',
    contractId: 'catch.section.overhang_stack',
    states: const ['overhanging-target'],
    children: [
      WidgetbookContractStateCard(
        label: 'overhanging-target',
        description:
            'The section header row and column hit-test the action outside '
            'their bounds, so its whole target answers above and below the '
            'title line.',
        child: SizedBox(
          width: WidgetbookPreviewLayout.standardContractWidth,
          child: _section(title: 'This week'),
        ),
      ),
    ],
  );
}
