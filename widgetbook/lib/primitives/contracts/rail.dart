import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/contract_preview.dart';

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchRail,
  path: '[Core primitives]/Layout',
)
Widget catchRailContractStates(BuildContext context) => WidgetbookContractFrame(
  title: 'CatchRail',
  contractId: 'catch.rail',
  states: const ['scrolling', 'fitted-items', 'wrapped'],
  children: [
    for (final (label, width, wrap) in const [
      ('scrolling', 120.0, CatchRailMode.never),
      ('fitted-items', null, CatchRailMode.never),
      ('wrapped', 120.0, CatchRailMode.always),
    ])
      WidgetbookContractStateCard(
        label: label,
        child: CatchRail(
          label: label,
          itemWidth: width,
          wrap: wrap,
          children: [
            for (final title in const ['Runs', 'Dinners', 'Games', 'Courts'])
              Text(title, style: CatchTextStyles.supporting(context)),
          ],
        ),
      ),
  ],
);
